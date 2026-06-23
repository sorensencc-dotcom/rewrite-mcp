// error.ts — CIC error taxonomy for production systems
// All analyzers + services must throw one of these types

export class CICError extends Error {
  readonly category: string;
  readonly context?: Record<string, unknown>;

  constructor(category: string, message: string, context?: Record<string, unknown>) {
    super(message);
    this.category = category;
    this.context = context;
    this.name = `CICError.${category}`;
  }

  static Validation(message: string, context?: Record<string, unknown>): CICError {
    return new CICError('Validation', message, context);
  }

  static BackendUnavailable(message: string, context?: Record<string, unknown>): CICError {
    return new CICError('BackendUnavailable', message, context);
  }

  static RemoteFailure(message: string, context?: Record<string, unknown>): CICError {
    return new CICError('RemoteFailure', message, context);
  }

  static LocalFailure(message: string, context?: Record<string, unknown>): CICError {
    return new CICError('LocalFailure', message, context);
  }

  static Timeout(message: string, context?: Record<string, unknown>): CICError {
    return new CICError('Timeout', message, context);
  }

  static Internal(message: string, context?: Record<string, unknown>): CICError {
    return new CICError('Internal', message, context);
  }

  toJSON(): { category: string; message: string; context?: Record<string, unknown> } {
    return {
      category: this.category,
      message: this.message,
      context: this.context,
    };
  }
}
