import test from 'node:test';
import assert from 'node:assert';
import { JoplinClient } from '../src/joplin/client.js';

test('JoplinClient - Dry-Run Intercepts', async (t) => {
  // 1. Enable Dry-Run
  process.env.DRY_RUN = 'true';

  const client = new JoplinClient({
    baseUrl: 'http://localhost:41184',
    apiToken: 'test-token'
  });

  // Mock global fetch to ensure it's NOT called for write operations
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error('Fetch should not be called in Dry-Run mode for write operations');
  };

  try {
    // 2. Test createNote
    const note = { title: 'Dry Run Note', body: 'Test body' };
    const createResult = await client.createNote(note);
    assert.ok(createResult.id.startsWith('dry-run-note-'));
    assert.strictEqual(createResult.title, note.title);

    // 3. Test updateNote
    const updateResult = await client.updateNote('note_123', { title: 'Updated' });
    assert.strictEqual(updateResult.id, 'note_123');
    assert.strictEqual(updateResult.title, 'Updated');

    // 4. Test addTagToNote
    // Should return undefined (no error thrown by fetch mock)
    await client.addTagToNote('note_123', 'test-tag');

    // 5. Test getOrCreateNotebook (mock listNotebooks to return empty)
    client.listNotebooks = async () => [];
    const notebookResult = await client.getOrCreateNotebook('New Notebook');
    assert.ok(notebookResult.id.startsWith('dry-run-notebook-'));
    assert.strictEqual(notebookResult.title, 'New Notebook');

  } finally {
    // Cleanup
    global.fetch = originalFetch;
    delete process.env.DRY_RUN;
  }
});

test('JoplinClient - Normal Mode (no intercept)', async (t) => {
  // Ensure Dry-Run is DISABLED
  delete process.env.DRY_RUN;

  const client = new JoplinClient({
    baseUrl: 'http://localhost:41184',
    apiToken: 'test-token'
  });

  // Mock fetch to return a successful response
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ id: 'real-note-id' })
  });

  try {
    const result = await client.createNote({ title: 'Real Note', body: '...' });
    assert.strictEqual(result.id, 'real-note-id');
  } finally {
    global.fetch = originalFetch;
  }
});
