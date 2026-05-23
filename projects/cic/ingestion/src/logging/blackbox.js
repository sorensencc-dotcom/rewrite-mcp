/**
 * Black Box Logger - Deterministic event logging for the CIC Control Plane.
 */
import { formatEventLine } from './formatter.js';
import { EventWriter } from './writer.js';

class BlackBoxLogger {
  constructor() {
    this.writer = null;
    this.initialized = false;
  }

  /**
   * Initializes the logger with a Joplin client.
   * 
   * @param {import('../joplin/client.js').JoplinClient} joplinClient 
   */
  init(joplinClient) {
    this.writer = new EventWriter({ joplinClient });
    this.initialized = true;
  }

  /**
   * Logs a deterministic event to the black box (Joplin).
   * 
   * @param {string} component 
   * @param {string} eventType 
   * @param {Object} [payload] 
   */
  async logEvent(component, eventType, payload = {}) {
    if (!this.initialized) {
      // If not initialized, just log to stderr for now
      // This might happen during early boot or in tests without Joplin
      const line = formatEventLine({
        timestamp: new Date().toISOString(),
        component,
        eventType,
        payload
      });
      process.stderr.write(`UNINITIALIZED_LOGGER: ${line}\n`);
      return;
    }

    const event = {
      timestamp: new Date().toISOString(),
      component,
      eventType,
      payload
    };

    const line = formatEventLine(event);

    // Non-blocking write: we don't await this to keep the pipeline fast
    this.writer.append(line).catch(err => {
      process.stderr.write(`BLACK_BOX_LOGGER_INTERNAL_ERROR: ${err.message}\n`);
    });
  }
}

export const blackBox = new BlackBoxLogger();
