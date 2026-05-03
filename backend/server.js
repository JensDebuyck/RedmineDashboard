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

let myTicketsCache = null;
let myTicketsCacheTime = null;

const seenIssues = new Map();
const dailyStatsStore = {};

// -----------------------------
// REDMINE FETCH
// -----------------------------
async function fetchIssues(url, apiKey, offset = 0, limit = 100, extraParams = {}) {
    const fetchUrl = new URL(url);
    fetchUrl.searchParams.set('key', apiKey);
    fetchUrl.searchParams.set('limit', limit);
    fetchUrl.searchParams.set('offset', offset);

    for (const [key, value] of Object.entries(extraParams)) {
        fetchUrl.searchParams.set(key, value);
    }

    const response = await fetch(fetchUrl.toString());
    if (!response.ok) throw new Error(`Redmine error: ${response.statusText}`);

    return JSON.parse(await response.text());
}

// -----------------------------
// STATS BUILDER
// -----------------------------
function processIssuesForStats(issues) {
    for (const issue of issues) {
        if (!issue?.id || !issue?.created_on) continue;
        if (seenIssues.has(issue.id)) continue;

        seenIssues.set(issue.id, true);

        const dateKey = new Date(issue.created_on).toISOString().split('T')[0];
        dailyStatsStore[dateKey] = (dailyStatsStore[dateKey] || 0) + 1;
    }
}

// -----------------------------
// GET ALL ISSUES
// -----------------------------
app.get('/api/issues', async (req, res) => {
    try {
        if (cache && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
            console.log('📦 Serving from cache');
            return res.json({ issues: cache.issues, total: cache.total, dailyStats: dailyStatsStore });
        }

        console.log('📡 Fetching from Redmine...');

        const first = await fetchIssues(process.env.REDMINE_URL, process.env.REDMINE_API_KEY, 0, 100);
        const totalCount = first.total_count ?? first.issues.length;
        const pages = Math.ceil(totalCount / 100);
        let allIssues = [...first.issues];

        if (pages > 1) {
            const results = await Promise.all(
                Array.from({ length: pages - 1 }, (_, i) =>
                    fetchIssues(process.env.REDMINE_URL, process.env.REDMINE_API_KEY, (i + 1) * 100, 100)
                )
            );
            allIssues = [...allIssues, ...results.flatMap(r => r.issues)];
        }

        processIssuesForStats(allIssues);

        cache = { issues: allIssues, total: totalCount };
        cacheTime = Date.now();

        res.json({ issues: allIssues, total: totalCount, dailyStats: dailyStatsStore });
    } catch (err) {
        console.error('❌ Fetch error:', err.message);
        res.status(500).json({ error: 'Failed to reach Redmine API' });
    }
});

// -----------------------------
// GET MY TICKETS
// -----------------------------
app.get('/api/my-tickets', async (req, res) => {
    try {
        if (myTicketsCache && myTicketsCacheTime && Date.now() - myTicketsCacheTime < CACHE_TTL) {
            console.log('📦 My tickets from cache');
            return res.json({ issues: myTicketsCache });
        }

        console.log('📡 Fetching my tickets from Redmine...');

        const first = await fetchIssues(
            process.env.REDMINE_URL,
            process.env.REDMINE_API_KEY,
            0, 100,
            {
                'assigned_to_id': process.env.REDMINE_USER_ID,
                'status_id':      'open',
                'sort':           'status,priority:desc,updated_on:desc'
            }
        );

        const totalCount = first.total_count ?? first.issues.length;
        const pages = Math.ceil(totalCount / 100);
        let allIssues = [...first.issues];

        if (pages > 1) {
            const results = await Promise.all(
                Array.from({ length: pages - 1 }, (_, i) =>
                    fetchIssues(
                        process.env.REDMINE_URL,
                        process.env.REDMINE_API_KEY,
                        (i + 1) * 100, 100,
                        {
                            'assigned_to_id': process.env.REDMINE_USER_ID,
                            'status_id':      'open',
                        }
                    )
                )
            );
            allIssues = [...allIssues, ...results.flatMap(r => r.issues)];
        }

        myTicketsCache = allIssues;
        myTicketsCacheTime = Date.now();

        res.json({ issues: allIssues });
    } catch (err) {
        console.error('❌ My tickets fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch my tickets' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});