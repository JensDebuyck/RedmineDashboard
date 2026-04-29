import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// -----------------------------
// CACHE + STATE
// -----------------------------
let cache = null;
let cacheTime = null;
const CACHE_TTL = 5 * 60 * 1000;

// 🧠 Seen issues (prevent double counting)
const seenIssues = new Map();

// 📊 Daily stats store
const dailyStatsStore = {};

// -----------------------------
// REDMINE FETCH
// -----------------------------
async function fetchIssues(url, apiKey, offset = 0, limit = 100) {
    const fetchUrl = new URL(url);
    fetchUrl.searchParams.set('key', apiKey);
    fetchUrl.searchParams.set('limit', limit);
    fetchUrl.searchParams.set('offset', offset);

    const response = await fetch(fetchUrl.toString());
    if (!response.ok) throw new Error(`Redmine error: ${response.statusText}`);

    const text = await response.text();
    return JSON.parse(text);
}

// -----------------------------
// STATS BUILDER (EVENT BASED)
// -----------------------------
function processIssuesForStats(issues) {
    for (const issue of issues) {
        if (!issue?.id || !issue?.created_on) continue;

        // ❌ al gezien → skip
        if (seenIssues.has(issue.id)) continue;

        // mark as seen
        seenIssues.set(issue.id, true);

        // extract date
        const dateKey = new Date(issue.created_on)
            .toISOString()
            .split('T')[0];

        // increment counter
        dailyStatsStore[dateKey] = (dailyStatsStore[dateKey] || 0) + 1;
    }
}

// -----------------------------
// MAIN API
// -----------------------------
app.get('/api/issues', async (req, res) => {
    try {
        // cache check (UI performance)
        if (cache && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
            console.log('📦 Serving from cache');
            return res.json({
                issues: cache.issues,
                total: cache.total,
                dailyStats: dailyStatsStore
            });
        }

        console.log('📡 Fetching from Redmine...');

        // first page
        const first = await fetchIssues(
            process.env.REDMINE_URL,
            process.env.REDMINE_API_KEY,
            0,
            100
        );

        const totalCount = first.total_count ?? first.issues.length;
        const limit = 100;
        const pages = Math.ceil(totalCount / limit);

        let allIssues = [...first.issues];

        // remaining pages
        if (pages > 1) {
            const requests = [];

            for (let i = 1; i < pages; i++) {
                requests.push(
                    fetchIssues(
                        process.env.REDMINE_URL,
                        process.env.REDMINE_API_KEY,
                        i * limit,
                        limit
                    )
                );
            }

            const results = await Promise.all(requests);

            allIssues = [
                ...allIssues,
                ...results.flatMap(r => r.issues),
            ];
        }

        // -----------------------------
        // PROCESS STATS (IMPORTANT)
        // -----------------------------
        processIssuesForStats(allIssues);

        // update cache (UI only)
        cache = {
            issues: allIssues,
            total: totalCount
        };

        cacheTime = Date.now();

        res.json({
            issues: allIssues,
            total: totalCount,
            dailyStats: dailyStatsStore
        });

    } catch (err) {
        console.error('❌ Fetch error:', err.message);
        res.status(500).json({ error: 'Failed to reach Redmine API' });
    }
});

// -----------------------------
app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});