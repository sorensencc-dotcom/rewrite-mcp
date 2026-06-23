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
exports.MemoryIntegrity = void 0;
const crypto = __importStar(require("crypto"));
class MemoryIntegrity {
    computeChecksum(event) {
        const { checksum: _, ...eventData } = event;
        const sortedKeys = Object.keys(eventData).sort();
        const json = JSON.stringify(Object.fromEntries(sortedKeys.map((key) => [key, eventData[key]])));
        return "sha256:" + crypto.createHash("sha256").update(json).digest("hex");
    }
    validateChecksum(event) {
        if (!event.checksum) {
            console.warn("EVENT_MISSING_CHECKSUM", { event_id: event.id });
            return false;
        }
        const computed = this.computeChecksum(event);
        const matches = computed === event.checksum;
        if (!matches) {
            console.warn("CHECKSUM_MISMATCH", {
                event_id: event.id,
                expected: event.checksum,
                computed,
            });
        }
        return matches;
    }
}
exports.MemoryIntegrity = MemoryIntegrity;
//# sourceMappingURL=memory-integrity.js.map