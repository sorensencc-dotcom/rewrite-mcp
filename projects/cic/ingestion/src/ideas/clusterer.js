/**
 * Idea Clusterer - Deterministically assigns ideas to clusters.
 */

const KEYWORD_MAP = {
  "region": "cic/regions",
  "autoscale": "cic/autoscale",
  "orchestrator": "cic/orchestrator",
  "rewrite": "rewrite-labs/general",
  "design": "rewrite-labs/design",
  "fx": "finance/fx",
  "execution": "finance/execution"
};

const DEFAULT_CLUSTER = "misc/general";

export class IdeaClusterer {
  /**
   * Assigns a cluster path to an idea.
   * 
   * @param {Object} idea 
   * @param {string} idea.body
   * @param {string[]} idea.tags
   * @returns {string} Cluster path (e.g. "cic/autoscale")
   */
  cluster(idea) {
    const tags = (idea.tags || []).map(t => t.toLowerCase());
    const content = (idea.body || '').toLowerCase();

    // 1. Tag-based clustering (primary)
    // Exclude 'idea' and 'memos-source-*'
    const domainTags = tags.filter(t => t !== 'idea' && !t.startsWith('memos-source-'));
    if (domainTags.length > 0) {
      // Use the first 2 domain tags to form a path
      return domainTags.slice(0, 2).join('/');
    }

    // 2. Keyword-based fallback (secondary)
    for (const [keyword, path] of Object.entries(KEYWORD_MAP)) {
      if (content.includes(keyword)) {
        return path;
      }
    }

    // 3. Default cluster (fallback)
    return DEFAULT_CLUSTER;
  }
}
