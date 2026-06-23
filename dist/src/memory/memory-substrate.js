"use strict";
/**
 * Phase 23.1 — Memory Substrate
 * Append-only event store with schema validation, retention policy, and immutability guarantees
 */
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
exports.MemorySubstrate = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const DEFAULT_CONFIG = {
    store_path: "./memory_store.jsonl",
    max_file_size_mb: 100,
    auto_archive: true,
    archive_destination: "./memory_archive",
    retention_policy: {
        ARPS_DELTA: 90,
        PIPELINE_RUN: 90,
        AGENT_TELEMETRY: 90,
        GOVERNANCE_SIGNAL: 365,
        APR_PLAN: 365,
        CRO_RUN: 90,
        PLATFORM_EXTRACTION: 90,
    },
};
class MemorySubstrate {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.lockFile = this.config.store_path + ".lock";
        this.ensureStoreExists();
    }
    ensureStoreExists() {
        const dir = path.dirname(this.config.store_path);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.config.store_path)) {
            fs.writeFileSync(this.config.store_path, "");
        }
    }
    computeChecksum(event) {
        const { checksum, ...rest } = event;
        const payload = JSON.stringify(rest);
        return "sha256:" + crypto.createHash("sha256").update(payload).digest("hex");
    }
    validateEventSchema(event) {
        if (!event.id || typeof event.id !== "string") {
            throw new Error("Event must have valid id (UUID)");
        }
        if (!event.timestamp || typeof event.timestamp !== "string") {
            throw new Error("Event must have valid timestamp (ISO8601)");
        }
        if (!event.event_type || !this.isValidEventType(event.event_type)) {
            throw new Error(`Event type must be one of: ${Object.keys(DEFAULT_CONFIG.retention_policy).join(", ")}`);
        }
        if (!event.source_agent || typeof event.source_agent !== "string") {
            throw new Error("Event must have source_agent");
        }
        if (!event.session_id || !event.session_id.match(/^session_\d{8}_\d{3,}$/)) {
            throw new Error("Event must have valid session_id (session_YYYYMMDD_NNN)");
        }
        if (!event.correlation_id || !event.correlation_id.match(/^corr_[a-z0-9]{6,}$/)) {
            throw new Error("Event must have valid correlation_id (corr_xxxxxx)");
        }
        if (typeof event.payload !== "object" || event.payload === null) {
            throw new Error("Event must have payload object");
        }
        if (typeof event.retention_days !== "number" || event.retention_days <= 0) {
            throw new Error("Event must have positive retention_days");
        }
    }
    isValidEventType(type) {
        return Object.keys(DEFAULT_CONFIG.retention_policy).includes(type);
    }
    async append(event) {
        // Validate schema
        this.validateEventSchema(event);
        // Compute checksum
        const checksum = this.computeChecksum(event);
        // Create complete event
        const completeEvent = {
            ...event,
            checksum,
        };
        // Acquire lock
        await this.acquireLock();
        try {
            // Write to temporary file
            const tmpPath = this.config.store_path + ".tmp";
            const existing = this.readAllEvents();
            const allEvents = [...existing, completeEvent];
            fs.writeFileSync(tmpPath, allEvents.map(e => JSON.stringify(e)).join("\n") + "\n");
            // Atomic rename
            fs.renameSync(tmpPath, this.config.store_path);
            // Periodic archival check
            if (this.config.auto_archive && allEvents.length % 100 === 0) {
                await this.archiveOldEvents();
            }
        }
        finally {
            this.releaseLock();
        }
    }
    async query(filters = {}) {
        const events = this.readAllEvents();
        let filtered = events;
        if (filters.event_type) {
            filtered = filtered.filter(e => e.event_type === filters.event_type);
        }
        if (filters.source_agent) {
            filtered = filtered.filter(e => e.source_agent === filters.source_agent);
        }
        if (filters.from_date) {
            const fromTime = new Date(filters.from_date).getTime();
            filtered = filtered.filter(e => new Date(e.timestamp).getTime() >= fromTime);
        }
        if (filters.to_date) {
            const toTime = new Date(filters.to_date).getTime();
            filtered = filtered.filter(e => new Date(e.timestamp).getTime() <= toTime);
        }
        const offset = filters.offset ?? 0;
        const limit = filters.limit ?? 1000;
        return filtered.slice(offset, offset + limit);
    }
    readAllEvents() {
        if (!fs.existsSync(this.config.store_path)) {
            return [];
        }
        const content = fs.readFileSync(this.config.store_path, "utf-8");
        if (!content.trim()) {
            return [];
        }
        const events = [];
        const lines = content.split("\n").filter(line => line.trim());
        for (const line of lines) {
            try {
                const event = JSON.parse(line);
                // Verify checksum
                const recomputedChecksum = this.computeChecksum({ ...event, checksum: undefined });
                if (recomputedChecksum !== event.checksum) {
                    console.warn(`CHECKSUM_MISMATCH: Event ${event.id} may be corrupted`);
                }
                events.push(event);
            }
            catch (err) {
                console.warn(`PARSE_ERROR: Failed to parse event line: ${line.slice(0, 50)}...`);
            }
        }
        return events;
    }
    async archiveOldEvents() {
        const allEvents = this.readAllEvents();
        const now = new Date();
        const toArchive = [];
        const toKeep = [];
        for (const event of allEvents) {
            const eventDate = new Date(event.timestamp);
            const ageInDays = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
            const retentionDays = this.config.retention_policy[event.event_type] || 90;
            if (ageInDays > retentionDays) {
                toArchive.push(event);
            }
            else {
                toKeep.push(event);
            }
        }
        if (toArchive.length === 0) {
            return;
        }
        // Write archive
        if (!fs.existsSync(this.config.archive_destination)) {
            fs.mkdirSync(this.config.archive_destination, { recursive: true });
        }
        const archiveDate = now.toISOString().slice(0, 7); // YYYY-MM
        const archiveFile = path.join(this.config.archive_destination, `memory_archive_${archiveDate}.jsonl.gz`);
        // For now, write uncompressed (compression can be added later)
        const archiveContent = toArchive.map(e => JSON.stringify(e)).join("\n") + "\n";
        fs.writeFileSync(archiveFile, archiveContent);
        // Update main store with only kept events
        fs.writeFileSync(this.config.store_path, toKeep.map(e => JSON.stringify(e)).join("\n") + "\n");
        console.log(`ARCHIVED: ${toArchive.length} events to ${archiveFile}`);
    }
    async acquireLock() {
        // Simple file-based lock (can be upgraded to better locking mechanism)
        const maxAttempts = 100;
        let attempts = 0;
        while (fs.existsSync(this.lockFile) && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10));
            attempts++;
        }
        if (attempts >= maxAttempts) {
            throw new Error("Failed to acquire lock on memory store");
        }
        fs.writeFileSync(this.lockFile, process.pid.toString());
    }
    releaseLock() {
        if (fs.existsSync(this.lockFile)) {
            fs.unlinkSync(this.lockFile);
        }
    }
    getStats() {
        const events = this.readAllEvents();
        const stats = {
            total_events: events.length,
            events_by_type: {},
            oldest_event: null,
            newest_event: null,
            store_size_mb: 0,
        };
        for (const event of events) {
            stats.events_by_type[event.event_type] =
                (stats.events_by_type[event.event_type] || 0) + 1;
        }
        if (events.length > 0) {
            stats.oldest_event = events[0].timestamp;
            stats.newest_event = events[events.length - 1].timestamp;
        }
        if (fs.existsSync(this.config.store_path)) {
            const statInfo = fs.statSync(this.config.store_path);
            stats.store_size_mb = statInfo.size / (1024 * 1024);
        }
        return stats;
    }
}
exports.MemorySubstrate = MemorySubstrate;
//# sourceMappingURL=memory-substrate.js.map