import { isDryRun } from '../utils/dry-run.js';
import { log } from '../logging/logger.js';
import { blackBox } from '../logging/blackbox.js';

/**
 * Joplin Web Clipper API Client
 */
export class JoplinClient {
  /**
   * @param {Object} config
   * @param {string} [config.baseUrl] - Default: http://localhost:41184
   * @param {string} config.apiToken
   */
  constructor(config) {
    this.baseUrl = (config.baseUrl || 'http://localhost:41184').replace(/\/$/, '');
    this.apiToken = config.apiToken;
  }

  /**
   * Internal interceptor for destructive operations.
   * 
   * @param {string} method 
   * @param {Object} data 
   * @returns {boolean} True if dry-run intercepted
   */
  _intercept(method, data) {
    if (isDryRun()) {
      log.info(`dry_run_intercept`, { method, data });
      blackBox.logEvent('JoplinClient', 'DRY_RUN_INTERCEPT', { method, data });
      return true;
    }
    return false;
  }

  /**
   * Creates a new note in Joplin.
   * @param {Object} note
   * @param {string} note.title
   * @param {string} note.body
   * @param {string} [note.parent_id] - The notebook ID
   * @param {string[]} [note.tags]
   * @returns {Promise<any>}
   */
  async createNote(note) {
    if (this._intercept('createNote', note)) {
      return { id: `dry-run-note-${Date.now()}`, ...note };
    }

    const url = new URL(`${this.baseUrl}/notes`);
    url.searchParams.append('token', this.apiToken);

    // Extract tags to handle them separately, as the Joplin /notes endpoint 
    // expects a string or no tags at all in the body.
    const { tags, ...noteData } = note;

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Joplin API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // If tags are provided, associate them via the /tags endpoint
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        await this.addTagToNote(data.id, tagName);
      }
    }

    return data;
  }

  /**
   * Adds a tag to a note.
   * @param {string} noteId 
   * @param {string} tagName 
   */
  async addTagToNote(noteId, tagName) {
    if (this._intercept('addTagToNote', { noteId, tagName })) {
      return;
    }

    // 1. Find or create tag
    const tag = await this.getOrCreateTag(tagName);
    
    // 2. Associate tag with note
    const url = new URL(`${this.baseUrl}/tags/${tag.id}/notes`);
    url.searchParams.append('token', this.apiToken);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: noteId })
    });

    if (!response.ok && response.status !== 409) { // 409 if already associated
      const errorText = await response.text();
      throw new Error(`Joplin API error (addTagToNote): ${response.status} - ${errorText}`);
    }
  }

  /**
   * Gets or creates a tag by name.
   * @param {string} name 
   * @returns {Promise<any>}
   */
  async getOrCreateTag(name) {
    // Search for tag
    const searchUrl = new URL(`${this.baseUrl}/search`);
    searchUrl.searchParams.append('token', this.apiToken);
    searchUrl.searchParams.append('query', name);
    searchUrl.searchParams.append('type', 'tag');

    const searchRes = await fetch(searchUrl.toString());
    const searchData = await searchRes.json();
    const existing = (searchData.items || []).find(t => t.title.toLowerCase() === name.toLowerCase());

    if (existing) return existing;

    if (this._intercept('getOrCreateTag', { name })) {
      return { id: `dry-run-tag-${Date.now()}`, title: name };
    }

    // Create tag
    const createUrl = new URL(`${this.baseUrl}/tags`);
    createUrl.searchParams.append('token', this.apiToken);
    const createRes = await fetch(createUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: name })
    });
    return createRes.json();
  }

  /**
   * Lists notebooks to find parent_id by name.
   * @returns {Promise<any[]>}
   */
  async listNotebooks() {
    const url = new URL(`${this.baseUrl}/folders`);
    url.searchParams.append('token', this.apiToken);
    const response = await fetch(url.toString());
    const data = await response.json();
    return data.items || [];
  }

  /**
   * Finds notes associated with a specific tag name.
   * @param {string} tagName 
   * @returns {Promise<any[]>}
   */
  async findNotesByTag(tagName) {
    // 1. Find tag first
    const searchUrl = new URL(`${this.baseUrl}/search`);
    searchUrl.searchParams.append('token', this.apiToken);
    searchUrl.searchParams.append('query', tagName);
    searchUrl.searchParams.append('type', 'tag');

    const searchRes = await fetch(searchUrl.toString());
    const searchData = await searchRes.json();
    const tag = (searchData.items || []).find(t => t.title.toLowerCase() === tagName.toLowerCase());

    if (!tag) return [];

    // 2. Get notes for tag
    const notesUrl = new URL(`${this.baseUrl}/tags/${tag.id}/notes`);
    notesUrl.searchParams.append('token', this.apiToken);
    notesUrl.searchParams.append('fields', 'id,title,parent_id');

    const notesRes = await fetch(notesUrl.toString());
    const notesData = await notesRes.json();
    return notesData.items || [];
  }

  /**
   * Gets or creates a notebook by name.
   * @param {string} title 
   * @param {string} [parentId]
   * @returns {Promise<any>}
   */
  async getOrCreateNotebook(title, parentId) {
    const notebooks = await this.listNotebooks();
    const existing = notebooks.find(n => 
      n.title.toLowerCase() === title.toLowerCase() && 
      (parentId ? n.parent_id === parentId : true)
    );
    if (existing) return existing;

    if (this._intercept('getOrCreateNotebook', { title, parentId })) {
      return { id: `dry-run-notebook-${Date.now()}`, title, parent_id: parentId };
    }

    const url = new URL(`${this.baseUrl}/folders`);
    url.searchParams.append('token', this.apiToken);
    
    const body = { title };
    if (parentId) body.parent_id = parentId;

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return response.json();
  }

  /**
   * Resolves a nested notebook path (e.g. "Ideas/cic/autoscale") to an ID.
   * Creates missing notebooks along the path.
   * 
   * @param {string} path 
   * @returns {Promise<string>}
   */
  async resolveNotebookPath(path) {
    const parts = path.split('/').filter(p => p.length > 0);
    let parentId = '';

    for (const part of parts) {
      const notebook = await this.getOrCreateNotebook(part, parentId);
      parentId = notebook.id;
    }

    return parentId;
  }

  /**
   * Performs a generic search for notes/todos.
   * 
   * @param {Object} params 
   * @param {string} params.query - Search query (e.g. "created:20260522")
   * @param {string} [params.fields] - Comma-separated fields to return
   * @returns {Promise<any[]>}
   */
  async search(params) {
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.append('token', this.apiToken);
    url.searchParams.append('query', params.query);
    if (params.fields) {
      url.searchParams.append('fields', params.fields);
    }

    const response = await fetch(url.toString());
    const data = await response.json();
    return data.items || [];
  }

  /**
   * Updates an existing note.
   * 
   * @param {string} noteId 
   * @param {Object} data 
   * @returns {Promise<any>}
   */
  async updateNote(noteId, data) {
    if (this._intercept('updateNote', { noteId, data })) {
      return { id: noteId, ...data };
    }

    const url = new URL(`${this.baseUrl}/notes/${noteId}`);
    url.searchParams.append('token', this.apiToken);

    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Joplin API error (updateNote): ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}
