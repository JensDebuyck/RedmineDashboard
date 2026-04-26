import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import fetch from 'node-fetch';


let cache = null;
let cacheTime = null;
const CACHE_TTL = 60 * 1000; // 60 seconden

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

app.get('/api/issues', async (req, res) => {
    // Cache check
    if (cache && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
        console.log('Serving from cache');
        return res.json(cache);
    }

    try {
        // Eerste request om total_count te weten
        const first = await fetchIssues(
            process.env.REDMINE_URL,
            process.env.REDMINE_API_KEY,
            0,
            100
        );

        const totalCount = first.total_count ?? first.issues.length;
        const limit = 100;
        const pages = Math.ceil(totalCount / limit);

        if (pages <= 1) {
            return res.json({ issues: first.issues, total: totalCount });
        }

        // Alle overige pagina's parallel ophalen
        const requests = [];
        for (let i = 1; i < pages; i++) {
            requests.push(
                fetchIssues(process.env.REDMINE_URL, process.env.REDMINE_API_KEY, i * limit, limit)
            );
        }

        const results = await Promise.all(requests);
        const allIssues = [
            ...first.issues,
            ...results.flatMap(r => r.issues),
        ];
        cache = { issues: allIssues, total: totalCount };
        cacheTime = Date.now();
        res.json({ issues: allIssues, total: totalCount });
    } catch (err) {
        console.error('Fetch error:', err.message);
        res.status(500).json({ error: 'Failed to reach Redmine API' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});