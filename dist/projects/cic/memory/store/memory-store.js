"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const memory_store_errors_js_1 = require("./memory-store.errors.js");
const memory_validator_js_1 = require("../validation/memory-validator.js");
const memory_integrity_js_1 = require("../integrity/memory-integrity.js");
class MemoryStore {
    constructor(storePath = "C:\\dev\\rewrite-mcp\\memory_store.json") {
        this.writeBuffer = [];
        this.writeBufferSize = 100;
        this.storePath = storePath;
        this.lockPath = `${storePath}.lock`;
        this.validator = new memory_validator_js_1.MemoryValidator();
        this.integrity = new memory_integrity_js_1.MemoryIntegrity();
        this.ensureStorePath();
    }
    ensureStorePath() {
        const dir = path.dirname(this.storePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.storePath)) {
            fs.writeFileSync(this.storePath, "[]", "utf8");
        }
    }
    async append(event) {
        const id = (0, uuid_1.v4)();
        const version = 1;
        // Validate schema
        try {
            await this.validator.validate(event.event_type, event.payload);
        }
        catch (err) {
            console.error("EVENT_VALIDATION_FAILED", {
                event_type: event.event_type,
                source_agent: event.source_agent,
                error: err instanceof Error ? err.message : String(err),
            });
            throw new memory_store_errors_js_1.ValidationError(err instanceof Error ? err.message : "Schema validation failed");
        }
        // Validate identifiers
        try {
            this.validator.validateIdentifiers(event.session_id, event.correlation_id);
        }
        catch (err) {
            throw new memory_store_errors_js_1.ValidationError(err instanceof Error ? err.message : "Invalid identifiers");
        }
        // Validate temporal constraints
        try {
            const lastEvent = await this.getLastEvent();
            this.validator.validateTemporal(event.timestamp, lastEvent?.timestamp);
        }
        catch (err) {
            throw new memory_store_errors_js_1.ValidationError(err instanceof Error ? err.message : "Temporal validation failed");
        }
        // Compute checksum
        const eventWithoutChecksum = {
            id,
            version,
            ...event,
        };
        const checksum = this.integrity.computeChecksum(eventWithoutChecksum);
        const finalEvent = {
            ...eventWithoutChecksum,
            checksum,
        };
        this.writeBuffer.push(finalEvent);
        if (this.writeBuffer.length >= this.writeBufferSize) {
            await this.flush();
        }
        return finalEvent;
    }
    async flush() {
        if (this.writeBuffer.length === 0) {
            return;
        }
        await this.acquireLock();
        try {
            const current = this.readStore();
            const updated = [...current, ...this.writeBuffer];
            const tmpPath = `${this.storePath}.tmp`;
            fs.writeFileSync(tmpPath, JSON.stringify(updated, null, 2), "utf8");
            fs.renameSync(tmpPath, this.storePath);
            const fd = fs.openSync(this.storePath, "r");
            fs.fsyncSync(fd);
            fs.closeSync(fd);
            console.log(`✓ Flushed ${updated.length} events to store`);
            this.writeBuffer = [];
        }
        catch (err) {
            throw new memory_store_errors_js_1.WriteError(err instanceof Error ? err.message : "Write failed");
        }
        finally {
            await this.releaseLock();
        }
    }
    async flush_sync() {
        await this.flush();
    }
    readStore() {
        try {
            const content = fs.readFileSync(this.storePath, "utf8");
            const events = JSON.parse(content);
            const validEvents = events.filter((evt) => {
                try {
                    const isValid = this.integrity.validateChecksum(evt);
                    return isValid;
                }
                catch {
                    console.warn("CORRUPTED_EVENT", { event_id: evt.id });
                    return false;
                }
            });
            return validEvents;
        }
        catch (err) {
            console.error("STORE_READ_FAILURE", {
                path: this.storePath,
                error: err instanceof Error ? err.message : String(err),
            });
            throw new memory_store_errors_js_1.WriteError(err instanceof Error ? err.message : "Failed to read store");
        }
    }
    async query(eventType, dateFrom, dateTo) {
        const events = this.readStore();
        return events.filter((evt) => {
            if (eventType && evt.event_type !== eventType)
                return false;
            if (dateFrom && evt.timestamp < dateFrom)
                return false;
            if (dateTo && evt.timestamp > dateTo)
                return false;
            return true;
        });
    }
    async queryRecent(days = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoff = cutoffDate.toISOString();
        return this.query(undefined, cutoff);
    }
    async getLastEvent() {
        const events = this.readStore();
        return events.length > 0 ? events[events.length - 1] : null;
    }
    async acquireLock(maxWaitMs = 30000) {
        const startTime = Date.now();
        while (fs.existsSync(this.lockPath)) {
            if (Date.now() - startTime > maxWaitMs) {
                throw new memory_store_errors_js_1.LockError(`Failed to acquire lock after ${maxWaitMs}ms`);
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        fs.writeFileSync(this.lockPath, process.pid.toString(), "utf8");
    }
    async releaseLock() {
        try {
            if (fs.existsSync(this.lockPath)) {
                fs.unlinkSync(this.lockPath);
            }
        }
        catch {
            console.warn("LOCK_RELEASE_FAILED");
        }
    }
    async getStats() {
        const events = this.readStore();
        const by_type = {
            ARPS_DELTA: 0,
            PIPELINE_RUN: 0,
            AGENT_TELEMETRY: 0,
            GOVERNANCE_SIGNAL: 0,
            APR_PLAN: 0,
            CRO_RUN: 0,
        };
        for (const evt of events) {
            by_type[evt.event_type]++;
        }
        const stats = fs.statSync(this.storePath);
        return {
            total_events: events.length,
            by_type,
            oldest_event: events.length > 0 ? events[0].timestamp : null,
            newest_event: events.length > 0 ? events[events.length - 1].timestamp : null,
            store_size_mb: stats.size / (1024 * 1024),
        };
    }
}
exports.MemoryStore = MemoryStore;
//# sourceMappingURL=memory-store.js.map