export async function ideaInboxHarvester(params) {
  const startTime = Date.now();
  try {
    if (!params?.findings || !Array.isArray(params.findings)) throw new Error('findings required');
    const dedupMode = params.deduplicateMode || 'semantic';
    const seen = new Set();
    const deduped = params.findings.filter(f => {
      const key = dedupMode === 'off' ? null : dedupMode === 'exact' ? f.title?.toLowerCase() : (f.type || 'g') + '::' + (f.title?.toLowerCase().split(/\s+/).slice(0, 3).join(' ') || '');
      if (!key || !seen.has(key)) {
        seen.add(key);
        return true;
      }
      return false;
    });

    const threshold = params.priorityThreshold || 0.6;
    const inbox = deduped.filter(f => (f.assessment?.finalScore || 0) >= threshold);
    const archive = deduped.filter(f => (f.assessment?.finalScore || 0) < threshold);
    inbox.sort((a, b) => (b.assessment?.finalScore || 0) - (a.assessment?.finalScore || 0));

    const ideas = inbox.map((f, i) => ({
      id: `idea-${Date.now()}-${i}`,
      foundingId: f.id,
      title: f.title,
      description: f.description,
      type: f.type || 'general',
      score: f.assessment?.finalScore || 0,
      recommendation: f.assessment?.recommendation || 'review',
      metadata: { createdAt: new Date().toISOString(), source: params.context?.source || 'auto', tags: params.context?.tags || [], status: 'inbox' }
    }));

    return {
      success: true,
      harvestId: `harvest-${Date.now()}`,
      ideas,
      stats: { totalProcessed: params.findings.length, inboxCount: inbox.length, archiveCount: archive.length, deduplication: { original: params.findings.length, deduplicated: deduped.length, removed: params.findings.length - deduped.length }, ckgStorage: { stored: ideas.length, failed: 0 } },
      elapsedMs: Date.now() - startTime
    };
  } catch (error) {
    return { success: false, error: error.message, harvestId: 'error-' + Date.now(), elapsedMs: Date.now() - startTime };
  }
}
