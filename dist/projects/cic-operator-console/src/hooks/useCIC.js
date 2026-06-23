"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFlowExecution = exports.useMetrics = exports.useContext = exports.useHealth = void 0;
const react_query_1 = require("@tanstack/react-query");
const cicClient_1 = require("../lib/cicClient");
const useHealth = () => (0, react_query_1.useQuery)({
    queryKey: ['health'],
    queryFn: async () => {
        const res = await cicClient_1.CIC.health();
        return res.data.health;
    },
    refetchInterval: 30000
});
exports.useHealth = useHealth;
const useContext = (id) => (0, react_query_1.useQuery)({
    queryKey: ['context', id],
    queryFn: async () => {
        const res = await cicClient_1.CIC.getContext(id, `trace-${Date.now()}`);
        return res.data.context;
    },
    enabled: !!id
});
exports.useContext = useContext;
const useMetrics = () => (0, react_query_1.useQuery)({
    queryKey: ['metrics'],
    queryFn: async () => {
        const res = await cicClient_1.CIC.metrics();
        return res.data;
    },
    refetchInterval: 60000
});
exports.useMetrics = useMetrics;
const useFlowExecution = (executionId) => (0, react_query_1.useQuery)({
    queryKey: ['flow', executionId],
    queryFn: async () => {
        const res = await cicClient_1.CIC.getFlowExecution(executionId);
        return res.data.execution;
    },
    enabled: !!executionId,
    refetchInterval: (data) => data?.status === 'running' ? 2000 : false
});
exports.useFlowExecution = useFlowExecution;
//# sourceMappingURL=useCIC.js.map