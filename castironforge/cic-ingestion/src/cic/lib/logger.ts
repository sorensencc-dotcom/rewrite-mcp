/**
 * CIC Structured Logger
 * JSON-based logging for all CIC subsystems
 */

interface LogEntry {
  timestamp: string;
  subsystem: string;
  event: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  payload?: unknown;
  error?: string;
}

class StructuredLogger {
  private subsystem: string;

  constructor(subsystem: string) {
    this.subsystem = subsystem;
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', event: string, payload?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      subsystem: this.subsystem,
      event,
      level,
      ...(payload && { payload }),
    };

    console.log(JSON.stringify(entry));
  }

  debug(event: string, payload?: unknown): void {
    this.log('debug', event, payload);
  }

  info(event: string, payload?: unknown): void {
    this.log('info', event, payload);
  }

  warn(event: string, payload?: unknown): void {
    this.log('warn', event, payload);
  }

  error(event: string, err?: Error | unknown): void {
    const payload = err instanceof Error ? { error: err.message } : { error: String(err) };
    this.log('error', event, payload);
  }
}

export function createLogger(subsystem: string): StructuredLogger {
  return new StructuredLogger(subsystem);
}
