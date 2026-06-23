/**
 * Artifact Integration & Management (Phase 46.5)
 *
 * Write CIC artifacts to Wayland-visible paths.
 * Enforce 25 MB artifact size limit.
 * Expose metadata via REST endpoints.
 */
export interface ArtifactMetadata {
    id: string;
    task_id: string;
    name: string;
    path: string;
    size_bytes: number;
    size_mb: number;
    created_at: string;
    mime_type: string;
    checksum?: string;
    tags?: string[];
    session_color?: string;
    session_icon?: string;
    session_brand?: string;
}
export declare class ArtifactManager {
    private baseDir;
    private artifacts;
    constructor(baseDir?: string);
    private ensureBaseDir;
    private validateSize;
    private calculateChecksum;
    writeArtifact(taskId: string, name: string, content: string | Buffer, mimeType?: string, tags?: string[]): Promise<ArtifactMetadata | null>;
    getArtifact(taskId: string, artifactId: string): ArtifactMetadata | undefined;
    getArtifactContent(taskId: string, artifactId: string): Buffer | null;
    listArtifacts(taskId: string): ArtifactMetadata[];
    deleteArtifact(taskId: string, artifactId: string): boolean;
    updateMetadata(taskId: string, artifactId: string, updates: Partial<ArtifactMetadata>): ArtifactMetadata | undefined;
    getTaskStats(taskId: string): Record<string, unknown>;
    cleanup(taskId: string): void;
}
export default ArtifactManager;
