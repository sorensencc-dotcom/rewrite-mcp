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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryValidator = void 0;
const ajv_1 = __importDefault(require("ajv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const memory_store_errors_js_1 = require("../store/memory-store.errors.js");
class MemoryValidator {
    constructor() {
        this.schemas = {};
        this.ajv = new ajv_1.default({ strict: false, useDefaults: false });
        this.loadSchemas();
    }
    loadSchemas() {
        const schemaDir = path.join(__dirname, "schemas");
        const eventTypes = [
            "arps-delta",
            "pipeline-run",
            "agent-telemetry",
            "governance-signal",
            "apr-plan",
            "cro-run",
        ];
        for (const type of eventTypes) {
            const schemaPath = path.join(schemaDir, `${type}.schema.json`);
            if (fs.existsSync(schemaPath)) {
                const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
                this.schemas[type] = schema;
            }
        }
    }
    async validate(eventType, payload) {
        const schemaKey = eventType.toLowerCase().replace(/_/g, "-");
        const schema = this.schemas[schemaKey];
        if (!schema) {
            throw new memory_store_errors_js_1.ValidationError(`Unknown event type: ${eventType}`);
        }
        const validate = this.ajv.compile(schema);
        const valid = validate(payload);
        if (!valid) {
            const errors = validate.errors || [];
            const errorMsg = errors
                .map((e) => `${e.instancePath || "root"}: ${e.message}`)
                .join("; ");
            throw new memory_store_errors_js_1.ValidationError(`Schema validation failed: ${errorMsg}`);
        }
    }
    validateTemporal(timestamp, lastTimestamp) {
        try {
            const ts = new Date(timestamp).getTime();
            if (isNaN(ts)) {
                throw new memory_store_errors_js_1.TemporalError(`Invalid ISO8601 timestamp: ${timestamp}`);
            }
            const now = Date.now();
            const fiveSecondsAhead = now + 5000;
            if (ts > fiveSecondsAhead) {
                throw new memory_store_errors_js_1.TemporalError(`Future timestamp too far ahead: ${timestamp}`);
            }
            if (lastTimestamp) {
                const lastTs = new Date(lastTimestamp).getTime();
                if (ts < lastTs) {
                    throw new memory_store_errors_js_1.TemporalError(`Timestamp before previous event: ${timestamp} < ${lastTimestamp}`);
                }
            }
        }
        catch (err) {
            if (err instanceof memory_store_errors_js_1.TemporalError)
                throw err;
            throw new memory_store_errors_js_1.TemporalError(err instanceof Error ? err.message : "Temporal validation failed");
        }
    }
    validateIdentifiers(session_id, correlation_id) {
        const sessionPattern = /^session_\d{8}_\d{3,}$/;
        const correlationPattern = /^corr_[a-z0-9]{6,}$/;
        if (!sessionPattern.test(session_id)) {
            throw new memory_store_errors_js_1.ValidationError(`Invalid session_id format: ${session_id}. Expected: session_YYYYMMDD_NNN`);
        }
        if (!correlationPattern.test(correlation_id)) {
            throw new memory_store_errors_js_1.ValidationError(`Invalid correlation_id format: ${correlation_id}. Expected: corr_XXXXX`);
        }
    }
}
exports.MemoryValidator = MemoryValidator;
//# sourceMappingURL=memory-validator.js.map