/**
 * Idea Router - Decides if a memo should be processed as an idea.
 */

export class IdeaRouter {
  /**
   * Decides if a memo (IngestionEvent) should be processed as an idea.
   * 
   * @param {Object} event IngestionEvent
   * @param {string} event.primaryTag
   * @param {string[]} event.secondaryTags
   * @returns {boolean}
   */
  shouldProcess(event) {
    if (event.primaryTag === 'idea') return true;
    
    const lowerSecondary = (event.secondaryTags || []).map(t => t.toLowerCase());
    return lowerSecondary.includes('idea');
  }
}
