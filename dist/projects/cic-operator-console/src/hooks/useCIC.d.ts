import { Context, HealthStatus, Metrics } from '../lib/cicClient';
export declare const useHealth: () => import("@tanstack/react-query").UseQueryResult<NoInfer<HealthStatus>, Error>;
export declare const useContext: (id: string) => import("@tanstack/react-query").UseQueryResult<NoInfer<Context>, Error>;
export declare const useMetrics: () => import("@tanstack/react-query").UseQueryResult<NoInfer<Metrics>, Error>;
export declare const useFlowExecution: (executionId: string) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("../lib/cicClient").FlowExecution>, Error>;
//# sourceMappingURL=useCIC.d.ts.map