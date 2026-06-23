/**
 * EpisodeBuilder coordinates multi-hop graph neighborhood retrievals,
 * chronological playback states, and PMS v2 templates to autonomously compile
 * documentary outlines, expanded scenes, and biographic syntheses.
 */
export interface Beat {
    title: string;
    description: string;
}
export interface Act {
    act: string;
    focus: string;
    beats: Beat[];
}
export interface EpisodeOutline {
    title: string;
    acts: Act[];
    timeline: {
        year: number;
        event: string;
        provenance: string;
    }[];
    timestamp: string;
}
export declare class EpisodeBuilder {
    buildEpisodeOutline(title: string, coreEntityIds: string[], tenantId?: string): Promise<EpisodeOutline>;
    expandNarrativeBeat(beatId: string, details: string, tenantId?: string): Promise<{
        beatId: string;
        expandedNarrative: string;
    }>;
    summarizeThematicThreads(topic: string, tenantId?: string): Promise<{
        topic: string;
        cinematicSummary: string;
    }>;
    private simulateCreativeActs;
    private simulateBeatExpansion;
    private simulateCinematicSummary;
}
export declare const episodeBuilder: EpisodeBuilder;
