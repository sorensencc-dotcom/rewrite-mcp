import { PRIMARY_TAGS } from './types.js';

/** @type {Record<import('./types.js').PrimaryTag, (tags: string[]) => string>} */
export const ROUTING_TABLE = {
  ingest: (tags) => {
    if (tags.includes('rl')) return 'cic.rewritelabs.ingest';
    if (tags.includes('cic')) return 'cic.core.ingest';
    return 'cic.generic.ingest';
  },
  idea: () => 'cic.ideas.inbox',
  task: () => 'cic.tasks.inbox',
  followup: () => 'cic.tasks.followup',
  personal: () => 'cic.personal.inbox',
  reference: () => 'cic.reference.inbox',
  log: () => 'cic.logs.journal'
};

/**
 * Extracts the first matching primary tag from a list of tags.
 * @param {string[]} tags 
 * @returns {import('./types.js').PrimaryTag | null}
 */
export function extractPrimaryTag(tags) {
  const lowerTags = tags.map(t => t.toLowerCase());
  return /** @type {import('./types.js').PrimaryTag | null} */ (
    PRIMARY_TAGS.find(pt => lowerTags.includes(pt)) || null
  );
}

/**
 * Filters out the primary tag from the list of tags.
 * @param {string[]} tags 
 * @param {import('./types.js').PrimaryTag | null} primaryTag 
 * @returns {string[]}
 */
export function extractSecondaryTags(tags, primaryTag) {
  if (!primaryTag) return tags;
  return tags.filter(t => t.toLowerCase() !== primaryTag.toLowerCase());
}

/**
 * Computes the routing key based on primary and secondary tags.
 * @param {import('./types.js').PrimaryTag} primaryTag 
 * @param {string[]} secondaryTags 
 * @returns {string}
 */
export function computeRoutingKey(primaryTag, secondaryTags) {
  const router = ROUTING_TABLE[primaryTag];
  return router ? router(secondaryTags) : `cic.${primaryTag}.unknown`;
}
