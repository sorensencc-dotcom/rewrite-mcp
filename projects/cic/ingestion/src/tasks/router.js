/**
 * Task Router - Decides if a memo should become a structured task.
 */

export class TaskRouter {
  /**
   * Decides if a memo (IngestionEvent) should be processed as a task.
   * 
   * @param {Object} event IngestionEvent
   * @param {string} event.primaryTag
   * @param {string[]} event.secondaryTags
   * @returns {boolean}
   */
  shouldProcess(event) {
    // Check if it's explicitly tagged as a task
    if (event.primaryTag === 'task') return true;
    
    const lowerSecondary = (event.secondaryTags || []).map(t => t.toLowerCase());
    return lowerSecondary.includes('task');
  }
}
