export interface WaylandContext {
    torqueQuery: any;
    securityPolicy: any;
    logger: any;
    sessionId: string;
}
export interface WaylandAdapter {
    id: string;
    description: string;
    type: 'shell' | 'file' | 'http' | 'model';
    execute(payload: unknown, ctx: WaylandContext): Promise<unknown>;
}
export declare class WaylandAdapterRegistry {
    private readonly adapters;
    register(adapter: WaylandAdapter): void;
    get(id: string): WaylandAdapter | undefined;
    list(): WaylandAdapter[];
    execute(id: string, payload: unknown, ctx: WaylandContext): Promise<unknown>;
}
export declare const createDefaultRegistry: () => WaylandAdapterRegistry;
