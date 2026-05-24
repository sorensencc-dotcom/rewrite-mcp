/**
 * projects/cic/ingestion/src/extractors/registry.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Central Extractor Registry
 */

const extractors = new Set();

/**
 * Registers an extractor instance.
 * @param {Object} extractor 
 */
export function registerExtractor(extractor) {
  extractors.add(extractor);
}

/**
 * Returns all extractors that support the given envelope.
 * @param {Object} envelope 
 * @returns {Array<Object>}
 */
export function getApplicableExtractors(envelope) {
  return Array.from(extractors).filter(e => e.supports(envelope));
}

/**
 * Runs all applicable extractors for an asset.
 * @param {Object} envelope 
 * @param {Object} ctx 
 * @returns {Promise<Array<Object>>}
 */
export async function runExtractorsForAsset(envelope, ctx) {
  const applicable = getApplicableExtractors(envelope);

  const input = {
    envelope,
    text: envelope.content.text ?? null,
    media: envelope.content.media ?? [],
    metadata: envelope.content.metadata ?? {},
  };

  // Run in parallel
  const results = await Promise.all(
    applicable.map(async extractor => {
      try {
        return await extractor.run(input, ctx);
      } catch (err) {
        ctx.logError(`Extractor ${extractor.id.name} failed`, { 
          assetId: envelope.id, 
          err: err.message 
        });
        return {
          extractor: extractor.id,
          assetId: envelope.id,
          region: envelope.region,
          artifacts: [],
          warnings: [`Critical failure: ${err.message}`]
        };
      }
    })
  );

  return results;
}
