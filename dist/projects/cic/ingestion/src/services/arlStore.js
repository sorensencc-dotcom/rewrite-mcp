"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArlTrace = getArlTrace;
exports.getArlComposite = getArlComposite;
exports.getArlDrift = getArlDrift;
exports.storeArlTrace = storeArlTrace;
exports.storeArlComposite = storeArlComposite;
exports.storeArlDrift = storeArlDrift;
// Stub implementations — replace with real persistence/retrieval
const traceCache = new Map();
const compositeCache = new Map();
const driftCache = new Map();
async function getArlTrace(id) {
    return traceCache.get(id) ?? [];
}
async function getArlComposite(id) {
    return compositeCache.get(id) ?? null;
}
async function getArlDrift(id) {
    return driftCache.get(id) ?? null;
}
function storeArlTrace(id, trace) {
    traceCache.set(id, trace);
}
function storeArlComposite(id, composite) {
    compositeCache.set(id, composite);
}
function storeArlDrift(id, drift) {
    driftCache.set(id, drift);
}
//# sourceMappingURL=arlStore.js.map