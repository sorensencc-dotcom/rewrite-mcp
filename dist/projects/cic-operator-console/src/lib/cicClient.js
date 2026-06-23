"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CIC = void 0;
const axios_1 = __importDefault(require("axios"));
const baseURL = import.meta.env.VITE_CIC_API_URL || 'http://localhost:8080';
const api = axios_1.default.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
});
exports.CIC = {
    health: () => api.get('/health'),
    getContext: (id, traceId) => api.get(`/context/${id}`, { headers: { 'X-Trace-ID': traceId } }),
    getSlice: (contextId, sliceId) => api.get(`/context/${contextId}/slices/${sliceId}`),
    queryContext: (query, contextId, limit = 10) => api.post('/context/query', { query, context_id: contextId, limit }),
    executeFlow: (flowId, input, traceId) => api.post('/flow/execute', { template_id: flowId, input }, {
        headers: { 'X-Trace-ID': traceId }
    }),
    getFlowExecution: (executionId) => api.get(`/flow/${executionId}`),
    metrics: () => api.get('/metrics'),
    listFlows: () => api.get('/flow/registry'),
    listAgents: () => api.get('/agents')
};
exports.default = api;
//# sourceMappingURL=cicClient.js.map