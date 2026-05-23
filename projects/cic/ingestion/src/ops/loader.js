const fs = require('fs/promises');
const path = require('path');
const { JoplinClient } = require('../joplin/client');
const { MemosClient } = require('../memos/client');
const { getBlackBoxReader } = require('../logging/blackbox');

const METRICS_JSON_PATH = 'System/Metrics/ingestion.json';
const STATE_FILES = ['memos_state.json']; // Add more as they are created

async function loadData() {
    const joplinClient = new JoplinClient({
        baseUrl: process.env.JOPLIN_BASE_URL || 'http://localhost:41184',
        apiToken: process.env.JOPLIN_API_TOKEN,
    });

    const memosClient = new MemosClient({
        baseUrl: process.env.MEMOS_BASE_URL,
        apiToken: process.env.MEMOS_API_TOKEN,
    });

    const blackBoxReader = getBlackBoxReader(joplinClient);
    const dataDir = path.join(__dirname, '../../../data');

    // Load all data in parallel
    const [metrics, lastEvents, state, joplinReachable, memosReachable] = await Promise.all([
        loadJsonQuiet(joplinClient, METRICS_JSON_PATH),
        blackBoxReader.getEventsForLast(24, 'hours'),
        loadStateFiles(dataDir),
        isJoplinReachable(joplinClient),
        isMemosReachable(memosClient),
    ]);

    return {
        metrics: metrics || {},
        lastEvents: lastEvents || [],
        state: state || {},
        dryRun: process.env.DRY_RUN === 'true',
        storage: {
            joplin: joplinReachable ? 'reachable' : 'unreachable',
            memos: memosReachable ? 'reachable' : 'unreachable',
        }
    };
}

async function getNoteByPath(joplinClient, notePath) {
    // This is a simplified implementation. A robust version would handle nested paths.
    const title = notePath.split('/').pop();
    try {
        const results = await joplinClient.search({ query: `title:"${title}" type:note`, fields: 'id,title,body' });
        return results[0] || null;
    } catch (error) {
        // console.error(`Note search failed for title "${title}":`, error);
        return null;
    }
}

async function loadJsonQuiet(joplinClient, notePath) {
    try {
        const note = await getNoteByPath(joplinClient, notePath);
        if (!note || !note.body) return null;
        return JSON.parse(note.body);
    } catch (error) {
        // console.error(`Failed to load or parse JSON from ${notePath}:`, error);
        return null;
    }
}

async function loadStateFiles(dataDir) {
    const stateData = {};
    for (const fileName of STATE_FILES) {
        try {
            const filePath = path.join(dataDir, fileName);
            const content = await fs.readFile(filePath, 'utf-8');
            stateData[fileName] = JSON.parse(content);
        } catch (error) {
            stateData[fileName] = { error: 'not found or unreadable' };
        }
    }
    return stateData;
}

async function isJoplinReachable(joplinClient) {
    try {
        // Use a lightweight, read-only command to check reachability
        await joplinClient.listNotebooks();
        return true;
    } catch {
        return false;
    }
}

async function isMemosReachable(memosClient) {
    try {
        // Assuming MemosClient has a similar ping or lightweight method
        await memosClient.fetchMemos({ limit: 1 });
        return true;
    } catch {
        return false;
    }
}


module.exports = { loadData };
