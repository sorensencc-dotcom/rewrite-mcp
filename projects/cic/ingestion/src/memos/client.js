/**
 * Memos API Client
 */
export class MemosClient {
  /**
   * @param {Object} config
   * @param {string} config.baseUrl
   * @param {string} config.apiToken
   */
  constructor(config) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiToken = config.apiToken;
  }

  /**
   * Fetches memos from the Memos API.
   * @param {Object} [params]
   * @param {number} [params.afterTs] - Fetch memos updated after this timestamp (seconds)
   * @param {number} [params.limit] - Max number of memos to fetch
   * @returns {Promise<any[]>}
   */
  async fetchMemos(params = {}) {
    const url = new URL(`${this.baseUrl}/api/v1/memos`);
    
    // Memos v0.24.0 requires a parent. Defaulting to 'users/1' based on diagnostics.
    url.searchParams.append('parent', 'users/1');

    if (params.afterTs && params.afterTs > 0) {
      const dateStr = new Date(params.afterTs * 1000).toISOString();
      url.searchParams.append('filter', `update_time > "${dateStr}"`);
    }
    
    if (params.limit) {
      url.searchParams.append('pageSize', params.limit.toString());
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Memos API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Memos v1 returns { memos: [...] }
    return data.memos || data || [];
  }

  /**
   * Fetches a single memo by ID.
   * @param {string|number} memoId 
   * @returns {Promise<Object>}
   */
  async getMemo(memoId) {
    const url = new URL(`${this.baseUrl}/api/v1/memos/${memoId}`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Memos API error (getMemo): ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }
}
