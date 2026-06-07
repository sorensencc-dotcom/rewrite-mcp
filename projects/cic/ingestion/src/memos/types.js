/**
 * @typedef {"task" | "idea" | "ingest" | "followup" | "personal" | "reference" | "log"} PrimaryTag
 */

/**
 * @typedef {Object} IngestionEvent
 * @property {string} id - Unique ID (cic:memos:<memoId>)
 * @property {"memos"} source - Event source
 * @property {string} sourceId - Original memo ID
 * @property {PrimaryTag} primaryTag - The routing tag
 * @property {string[]} secondaryTags - Context tags
 * @property {string} content - Memo content
 * @property {string} createdAt - ISO8601 timestamp
 * @property {string} updatedAt - ISO8601 timestamp
 * @property {string} authorId - Memos user ID
 * @property {string} routingKey - Computed routing key for the CIC bus
 * @property {any} raw - The original Memos payload
 */

export const PRIMARY_TAGS = ["task", "idea", "ingest", "followup", "personal", "reference", "log"];
