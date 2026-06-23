/**
 * CIC Foreman HTTP Service (Phase 46.1)
 * with Wayland Registry Integration (Phase 46.3)
 *
 * Local HTTP server exposing CIC task interface to Wayland.
 * Endpoints: POST /task, GET /status/:id, GET /artifact/:id/:artifact_id, GET /health
 * Binds to 127.0.0.1:3035
 *
 * Registers with Wayland agent registry on startup.
 */
export interface Task {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    phase?: string;
    error?: string;
    artifacts: Array<{
        id: string;
        path: string;
        size: number;
    }>;
}
export declare class CICForeman {
    private tasks;
    private server?;
    private port;
    private host;
    private registryUrl;
    private agentId;
    private registrationId?;
    private heartbeatInterval?;
    private heartbeatIntervalMs;
    private sessionMapper;
    private artifactManager;
    private eventListeners;
    start(): Promise<void>;
    private registerWithWaylandRegistry;
    private startHeartbeat;
    private sendHeartbeat;
    private makeHttpRequest;
    stop(): Promise<void>;
    private handleRequest;
    private handlePostTask;
    private handleGetStatus;
    private handleGetArtifact;
    private handleWriteArtifact;
    private handleListArtifacts;
    private handleHealth;
    private handleCreateSession;
    private handleGetSession;
    private handleSessionEvent;
    private handleGetSessionStats;
    private handleEventsStream;
}
export default CICForeman;
