/**
 * Replay Simulator - Runs a memo through the pipeline logic without side effects.
 */
import { MemosIngestionWorker } from '../memos/worker.js';
import { TaskRouter } from '../tasks/router.js';
import { extractTask } from '../tasks/extractor.js';
import { IdeaRouter } from '../ideas/router.js';
import { extractIdea } from '../ideas/extractor.js';
import { IdeaClusterer } from '../ideas/clusterer.js';

export class ReplaySimulator {
  /**
   * @param {Object} config
   * @param {import('../joplin/client.js').JoplinClient} config.joplinClient
   */
  constructor(config) {
    this.joplinClient = config.joplinClient;
    this.worker = new MemosIngestionWorker({}); // Dummy worker for mapping
    this.taskRouter = new TaskRouter();
    this.ideaRouter = new IdeaRouter();
    this.clusterer = new IdeaClusterer();
  }

  /**
   * Simulates the pipeline for a single memo.
   * 
   * @param {Object} memo Raw memo object
   * @returns {Promise<Object>} Simulation result
   */
  async simulate(memo) {
    const event = this.worker.memoToIngestionEvent(memo);
    if (!event) {
      return {
        event: null,
        routing: [],
        task: null,
        idea: null,
        status: 'SKIPPED_NO_PRIMARY_TAG'
      };
    }

    const result = {
      event,
      routing: [],
      task: null,
      idea: null,
      status: 'PROCESSED'
    };

    const sourceTag = `memos-source-${memo.id}`;

    // 1. Task Simulation
    if (this.taskRouter.shouldProcess(event)) {
      result.routing.push('TaskExtractor');
      const task = extractTask(memo);
      
      // Check if it would create
      const existing = await this.joplinClient.findNotesByTag(sourceTag);
      const exists = existing.length > 0;
      
      result.task = {
        ...task,
        wouldCreate: !exists
      };
    }

    // 2. Idea Simulation
    if (this.ideaRouter.shouldProcess(event)) {
      result.routing.push('IdeaClusterer');
      const idea = extractIdea(memo);
      idea.cluster = this.clusterer.cluster(idea);
      
      // Check if it would create (re-use exists from task if already checked, 
      // but let's be safe and re-check or use a shared variable)
      const existing = await this.joplinClient.findNotesByTag(sourceTag);
      const exists = existing.length > 0;

      result.idea = {
        ...idea,
        wouldCreate: !exists
      };
    }

    // 3. Digest Simulation
    result.digest = {
      wouldAppear: true,
      sections: ['Memos']
    };
    if (result.task) result.digest.sections.push('Tasks');
    if (result.idea) result.digest.sections.push('Ideas');

    return result;
  }
}
