import { formatEventLine } from './formatter.js';
import { EventWriter } from './writer.js';

export default class BlackBoxLogger {
  constructor() {
    this.writer = null;
    this.initialized = false;
  }

  init(joplinClient) {
    this.writer = new EventWriter({ joplinClient });
    this.initialized = true;
  }

  async logEvent(component, eventType, payload = {}) {
    if (!this.initialized) return;

    const line = formatEventLine({
      component,
      event: eventType,
      payload,
      timestamp: new Date().toISOString(),
    });

    await this.writer.write(line);
  }

  async getEventsForRange(start, end) {
    if (!this.initialized) return [];
    return this.writer.readRange(start, end);
  }
}
