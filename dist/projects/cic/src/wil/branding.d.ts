/**
 * CIC Branding Pack (Phase 46.8)
 *
 * Add branding to:
 * - Structured log events (brand field)
 * - Artifact metadata (accent_color, brand)
 * - Pipeline session payloads (session_brand, session_icon, session_color)
 * - Agent graph visualizer (optional)
 */
export interface BrandingConfig {
    brand: string;
    primary_color: string;
    accent_color: string;
    assets: {
        icon_16: string;
        icon_32: string;
        icon_64: string;
        icon_128: string;
        logo_horizontal: string;
        logo_stack: string;
    };
    session_appearance: {
        icon: string;
        color: string;
        theme: string;
    };
}
export interface BrandedLogEvent {
    timestamp: string;
    level: string;
    correlationId: string;
    event: string;
    brand: string;
    data?: Record<string, unknown>;
}
export interface BrandedArtifact {
    id: string;
    name: string;
    size_bytes: number;
    size_mb: number;
    accent_color: string;
    brand: string;
    watermark?: string;
    created_at: string;
}
export interface BrandedSessionPayload {
    session_id: string;
    pipeline_id: string;
    session_brand: string;
    session_icon: string;
    session_color: string;
    created_at: string;
}
export declare class BrandingManager {
    private config;
    constructor(config?: Partial<BrandingConfig>);
    /**
     * Add brand to log event
     */
    brandLogEvent(event: Record<string, unknown>): BrandedLogEvent;
    /**
     * Add branding metadata to artifact
     */
    brandArtifact(artifact: Record<string, unknown>): BrandedArtifact;
    /**
     * Add branding to session payload
     */
    brandSessionPayload(session: Record<string, unknown>): BrandedSessionPayload;
    /**
     * Generate agent graph node for visualizer
     */
    generateAgentGraphNode(): Record<string, unknown>;
    /**
     * Generate branding manifest for asset delivery
     */
    generateAssetManifest(): Record<string, unknown>;
    /**
     * Get branding config
     */
    getConfig(): BrandingConfig;
    /**
     * Update branding config
     */
    updateConfig(updates: Partial<BrandingConfig>): void;
}
export default BrandingManager;
//# sourceMappingURL=branding.d.ts.map