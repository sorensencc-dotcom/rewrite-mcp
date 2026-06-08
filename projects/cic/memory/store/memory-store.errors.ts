export class MemoryStoreError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "MemoryStoreError";
  }
}

export class ValidationError extends MemoryStoreError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class IntegrityError extends MemoryStoreError {
  constructor(message: string) {
    super(message, "INTEGRITY_ERROR");
    this.name = "IntegrityError";
  }
}

export class TemporalError extends MemoryStoreError {
  constructor(message: string) {
    super(message, "TEMPORAL_ERROR");
    this.name = "TemporalError";
  }
}

export class LockError extends MemoryStoreError {
  constructor(message: string) {
    super(message, "LOCK_ERROR");
    this.name = "LockError";
  }
}

export class WriteError extends MemoryStoreError {
  constructor(message: string) {
    super(message, "WRITE_ERROR");
    this.name = "WriteError";
  }
}
