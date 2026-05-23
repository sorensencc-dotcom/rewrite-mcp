import 'dotenv/config';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JoplinClient } from '../joplin/client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function diagnose() {
  console.log('--- CIC Ingestion Diagnostics ---');
  console.log('Node Version:', process.version);
  
  const dataDir = path.join(__dirname, '../../data');
  const stateFile = path.join(dataDir, 'memos_state.json');
  
  console.log('Data Directory:', dataDir);
  console.log('State File:', stateFile);

  try {
    await mkdir(dataDir, { recursive: true });
    console.log('Data directory created/exists.');
  } catch (err) {
    console.error('Failed to create data directory:', err.message);
  }

  try {
    await writeFile(stateFile, JSON.stringify({ test: true, ts: Date.now() }));
    console.log('State file writable.');
    const content = await readFile(stateFile, 'utf-8');
    console.log('State file readable:', content);
  } catch (err) {
    console.error('State file error:', err.message);
  }

  console.log('--- Environment Check ---');
  console.log('MEMOS_BASE_URL:', process.env.MEMOS_BASE_URL ? 'set' : 'MISSING');
  console.log('MEMOS_API_TOKEN:', process.env.MEMOS_API_TOKEN ? 'set' : 'MISSING');
  console.log('JOPLIN_API_TOKEN:', process.env.JOPLIN_API_TOKEN ? 'set' : 'MISSING');

  const JOPLIN_BASE_URL = process.env.JOPLIN_BASE_URL || 'http://localhost:41184';

  console.log('--- API Connectivity ---');
  if (process.env.MEMOS_BASE_URL) {
    const headers = { 'Authorization': `Bearer ${process.env.MEMOS_API_TOKEN}` };
    
    // 1. Check Identity
    try {
      const meRes = await fetch(`${process.env.MEMOS_BASE_URL}/api/v1/users/me`, { headers });
      if (meRes.ok) {
        const me = await meRes.json();
        console.log('Authenticated as:', me.username || me.name, `(ID: ${me.id || me.name})`);
      } else {
        console.log('Identity check failed:', meRes.status);
      }
    } catch (err) {
      console.error('Identity check error:', err.message);
    }

    // 2. Try various listing strategies for v0.24.0
    const strategies = [
      { name: 'Default List', url: `${process.env.MEMOS_BASE_URL}/api/v1/memos` },
      { name: 'Wildcard Parent', url: `${process.env.MEMOS_BASE_URL}/api/v1/memos?parent=users/-` },
      { name: 'Owner Parent', url: `${process.env.MEMOS_BASE_URL}/api/v1/memos?parent=users/1` },
      { name: 'Filter: All States', url: `${process.env.MEMOS_BASE_URL}/api/v1/memos?filter=row_status=="NORMAL"||row_status=="ARCHIVED"` }
    ];

    for (const strategy of strategies) {
      try {
        console.log(`--- Testing Strategy: ${strategy.name} ---`);
        const res = await fetch(strategy.url, { headers });
        const data = await res.json();
        
        // Memos v1 sometimes wraps in a 'memos' array, sometimes returns directly
        const memos = data.memos || (Array.isArray(data) ? data : []);
        console.log(`Result: ${memos.length} memos found.`);
        if (memos.length > 0) {
          console.log('First Memo Sample:', JSON.stringify(memos[0], null, 2));
          break; 
        } else if (data.nextPageToken === undefined && !Array.isArray(data)) {
          console.log('Unexpected response structure:', JSON.stringify(data).substring(0, 100));
        }
      } catch (err) {
        console.error(`Strategy ${strategy.name} failed:`, err.message);
      }
    }
  }
    
  // 3. Check Joplin
  console.log('--- Joplin Connectivity ---');
  if (process.env.JOPLIN_API_TOKEN) {
    const token = process.env.JOPLIN_API_TOKEN.trim();
    console.log(`Token length: ${token.length}`);
    console.log(`Token starts with: ${token.substring(0, 3)}... ends with: ...${token.substring(token.length - 3)}`);
    
    const jClient = new JoplinClient({ baseUrl: JOPLIN_BASE_URL, apiToken: token });
    try {
      const notebooks = await jClient.listNotebooks();
      console.log('Joplin notebooks found:', notebooks.length);
      notebooks.forEach(n => console.log(` - ${n.title} (ID: ${n.id})`));

      // Test note creation
      console.log('Testing note creation...');
      const testNote = await jClient.createNote({ title: 'Diagnostic Test', body: 'Ignore this note.' });
      console.log('Note created successfully! ID:', testNote.id);
    } catch (err) {
      console.error('Joplin check failed:', err.message);
    }
  }

  console.log('Diagnostics complete.');
}

diagnose();
