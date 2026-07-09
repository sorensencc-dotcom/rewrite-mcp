/**
 * Audit Logger
 * Specification: CIC-SPEC-MCP-001 v1.2 §8
 */

export interface AuditLogEntry {
  event: string;
  category: string;
  timestamp: string;
  details: Record<string, any>;
}

export class AuditLogger {
  private static history: AuditLogEntry[] = [];

  /**
   * Records an event in the audit log.
   */
  public static record(event: string, category: string, details: Record<string, any>): void {
    const entry: AuditLogEntry = {
      event,
      category,
      timestamp: new Date().toISOString(),
      details,
    };
    
    this.history.push(entry);
    
    // Outputs structured JSON log
    console.log(JSON.stringify({
      log_type: "audit",
      ...entry
    }));
  }

  /**
   * Retrieves the logged history (mainly for test assertions).
   */
  public static getHistory(): AuditLogEntry[] {
    return [...this.history];
  }

  /**
   * Clears history.
   */
  public static clear(): void {
    this.history = [];
  }
}
