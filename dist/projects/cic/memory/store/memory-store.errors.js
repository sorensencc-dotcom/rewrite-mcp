"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WriteError = exports.LockError = exports.TemporalError = exports.IntegrityError = exports.ValidationError = exports.MemoryStoreError = void 0;
class MemoryStoreError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = "MemoryStoreError";
    }
}
exports.MemoryStoreError = MemoryStoreError;
class ValidationError extends MemoryStoreError {
    constructor(message) {
        super(message, "VALIDATION_ERROR");
        this.name = "ValidationError";
    }
}
exports.ValidationError = ValidationError;
class IntegrityError extends MemoryStoreError {
    constructor(message) {
        super(message, "INTEGRITY_ERROR");
        this.name = "IntegrityError";
    }
}
exports.IntegrityError = IntegrityError;
class TemporalError extends MemoryStoreError {
    constructor(message) {
        super(message, "TEMPORAL_ERROR");
        this.name = "TemporalError";
    }
}
exports.TemporalError = TemporalError;
class LockError extends MemoryStoreError {
    constructor(message) {
        super(message, "LOCK_ERROR");
        this.name = "LockError";
    }
}
exports.LockError = LockError;
class WriteError extends MemoryStoreError {
    constructor(message) {
        super(message, "WRITE_ERROR");
        this.name = "WriteError";
    }
}
exports.WriteError = WriteError;
//# sourceMappingURL=memory-store.errors.js.map