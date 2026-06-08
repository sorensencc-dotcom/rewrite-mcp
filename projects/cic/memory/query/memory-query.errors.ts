export class MemoryQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemoryQueryError";
    Object.setPrototypeOf(this, MemoryQueryError.prototype);
  }
}

export class MemoryQueryValidationError extends MemoryQueryError {
  constructor(message: string) {
    super(message);
    this.name = "MemoryQueryValidationError";
    Object.setPrototypeOf(this, MemoryQueryValidationError.prototype);
  }
}

export class MemoryQueryNotFoundError extends MemoryQueryError {
  constructor(message: string) {
    super(message);
    this.name = "MemoryQueryNotFoundError";
    Object.setPrototypeOf(this, MemoryQueryNotFoundError.prototype);
  }
}
