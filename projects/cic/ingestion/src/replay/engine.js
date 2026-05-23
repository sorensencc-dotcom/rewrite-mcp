/**
 * Replay Engine - Orchestrates the replay process.
 */
import { ReplayLoader } from './loader.js';
import { ReplaySimulator } from './simulator.js';
import { ReplayReporter } from './reporter.js';

export class ReplayEngine {
  /**
   * @param {Object} config
   * @param {import('../joplin/client.js').JoplinClient} config.joplinClient
   * @param {import('../memos/client.js').MemosClient} config.memosClient
   */
  constructor(config) {
    this.loader = new ReplayLoader({
      joplinClient: config.joplinClient,
      memosClient: config.memosClient
    });
    this.simulator = new ReplaySimulator({
      joplinClient: config.joplinClient
    });
    this.reporter = new ReplayReporter();
  }

  /**
   * Replays a memo by ID.
   * 
   * @param {string|number} memoId 
   * @returns {Promise<string>} Formatted report
   */
  async replay(memoId) {
    let id = memoId;
    if (memoId === 'latest') {
      id = await this.loader.getLatestMemoId();
    }

    const memo = await this.loader.load(id);
    const result = await this.simulator.simulate(memo);
    return this.reporter.report(id, result);
  }
}
