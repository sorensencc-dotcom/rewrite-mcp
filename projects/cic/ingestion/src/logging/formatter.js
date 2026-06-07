/**
 * Formats event data into a deterministic, human-scanable log line.
 * 
 * Format: TIMESTAMP | COMPONENT | EVENT_TYPE | key1=val1 key2=val2
 */

/**
 * Deterministically formats a payload object into a space-separated key=value string.
 * Keys are sorted alphabetically. Arrays are rendered as [a,b,c].
 * 
 * @param {Object} payload 
 * @returns {string}
 */
export function formatPayload(payload) {
  if (!payload || typeof payload !== 'object') return '';

  return Object.keys(payload)
    .sort()
    .map(key => {
      const val = payload[key];
      let valStr;
      
      if (Array.isArray(val)) {
        valStr = `[${val.join(',')}]`;
      } else if (typeof val === 'object' && val !== null) {
        valStr = JSON.stringify(val);
      } else {
        valStr = String(val);
      }
      
      return `${key}=${valStr}`;
    })
    .join(' ');
}

/**
 * Formats a full event into a log line.
 * 
 * @param {Object} event 
 * @param {string} event.timestamp
 * @param {string} event.component
 * @param {string} event.eventType
 * @param {Object} event.payload
 * @returns {string}
 */
export function formatEventLine(event) {
  const payloadStr = formatPayload(event.payload);
  const parts = [
    event.timestamp,
    event.component,
    event.eventType
  ];
  
  if (payloadStr) {
    parts.push(payloadStr);
  }
  
  return parts.join(' | ');
}
