const MetricsCollector = require('../src/metrics/collector');
const MetricsAnalyzer = require('../src/metrics/analyzer');
const MetricsWriter = require('../src/metrics/writer');
const MetricsConsumer = require('../src/metrics/consumer');

// Mock data and clients
const mockJoplinClient = {
  getOrCreateNote: jest.fn().mockResolvedValue({ id: 'note-id' }),
  updateNote: jest.fn().mockResolvedValue(),
};

const mockBlackBoxReader = {
  getEventsForRange: jest.fn().mockResolvedValue([]),
};

jest.mock('../src/joplin/client', () => {
    return jest.fn().mockImplementation(() => {
        return mockJoplinClient;
    });
});

jest.mock('../src/logging/blackbox', () => ({
    getBlackBoxReader: () => mockBlackBoxReader,
}));

jest.mock('../src/utils/dry-run', () => ({
    isDryRun: () => false,
}));


describe('Metrics Subsystem', () => {
    let collector;
    let analyzer;
    let writer;
    let consumer;

    const now = new Date('2026-05-22T20:00:00.000Z');
    
    const mockEvents = [
        { event: 'POLL_COMPLETE', source: 'IngestionWorker', timestamp: '2026-05-22T19:59:00.000Z', payload: { memosFetched: 2, duration_ms: 300 } },
        { event: 'MEMO_PROCESSED', source: 'MirroringConsumer', timestamp: '2026-05-22T19:59:01.000Z', payload: { joplin_write_duration_ms: 25 } },
        { event: 'TASK_CREATED', source: 'TaskExtractor', timestamp: '2026-05-22T19:59:02.000Z', payload: { task_extraction_duration_ms: 40 } },
        { event: 'MEMO_PROCESSED', source: 'MirroringConsumer', timestamp: '2026-05-22T19:59:03.000Z', payload: { joplin_write_duration_ms: 30 } },
        { event: 'IDEA_CREATED', source: 'IdeaClusterer', timestamp: '2026-05-22T19:59:04.000Z', payload: { idea_clustering_duration_ms: 50, notebookId: 'cluster-1' } },
        { event: 'DIGEST_WRITTEN', source: 'DigestConsumer', timestamp: '2026-05-22T19:59:05.000Z', payload: { digest_generation_duration_ms: 90 } },
        { event: 'INGESTION_SUCCESS', source: 'IngestionWorker', timestamp: '2026-05-22T19:59:05.000Z' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        analyzer = new MetricsAnalyzer();
        writer = new MetricsWriter(mockJoplinClient);
    });

    describe('Collector', () => {
        it('should read event logs and produce raw metrics', async () => {
            mockBlackBoxReader.getEventsForRange.mockResolvedValue(mockEvents);
            collector = new MetricsCollector(mockJoplinClient);
            const rawMetrics = await collector.collectRawMetrics();
            
            expect(mockBlackBoxReader.getEventsForRange).toHaveBeenCalled();
            expect(rawMetrics.memos.length).toBe(2);
            expect(rawMetrics.tasks.length).toBe(1);
            expect(rawMetrics.ideas.length).toBe(1);
            expect(rawMetrics.digests.length).toBe(1);
            expect(rawMetrics.lastSuccess).toBe('2026-05-22T19:59:05.000Z');
            expect(rawMetrics.timings.poll_cycle_ms).toBe(300);
        });
    });

    describe('Analyzer', () => {
        it('should compute throughput correctly', () => {
            const rawMetrics = { memos: mockEvents.filter(e => e.event === 'MEMO_PROCESSED'), tasks: [], ideas: [], digests: [], timings: {}, events: mockEvents };
            const metrics = analyzer.analyze(rawMetrics);
            expect(metrics.throughput.memos_24h).toBe(2);
        });
        
        it('should compute latency correctly', () => {
            const rawMetrics = { memos: [], tasks: [], ideas: [], digests: [], timings: { poll_cycle_ms: 300, task_extractor_ms: 40 }, events: mockEvents };
            const metrics = analyzer.analyze(rawMetrics);
            expect(metrics.latency.poll_cycle_ms).toBe(300);
            expect(metrics.latency.task_extractor_ms).toBe(40);
        });

        it('should detect ingestion gaps', () => {
            const oldPollEvent = [{ event: 'POLL_COMPLETE', timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString() }];
            const rawMetrics = { pollCompleteEvents: oldPollEvent, memos: [], tasks: [], ideas: [], digests: [], timings: {}, events: [] };
            const metrics = analyzer.analyze(rawMetrics);
            expect(metrics.anomalies.ingestion_gap_minutes).toBeGreaterThanOrEqual(59);
        });

        it('should detect backlog', () => {
            const backlogEvents = [
                { event: 'POLL_COMPLETE', payload: { memosFetched: 5 } },
                { event: 'MEMO_PROCESSED' },
                { event: 'MEMO_PROCESSED' },
            ];
            const rawMetrics = { events: backlogEvents, memos: [], tasks: [], ideas: [], digests: [], timings: {}, pollCompleteEvents: [] };
            const metrics = analyzer.analyze(rawMetrics);
            expect(metrics.anomalies.memo_backlog).toBe(3);
        });
    });

    describe('Writer', () => {
        it('should produce correct JSON', async () => {
            const metrics = { timestamp: now.toISOString(), throughput: { memos_24h: 1 }, latency: {}, health: {}, anomalies: {} };
            await writer.write(metrics);
            
            const jsonCall = mockJoplinClient.updateNote.mock.calls.find(call => call[1].includes('memos_24h'));
            expect(jsonCall).toBeDefined();
            const writtenJson = JSON.parse(jsonCall[1]);
            expect(writtenJson.throughput.memos_24h).toBe(1);
        });

        it('should produce correct Markdown', async () => {
            const metrics = {
              timestamp: now.toISOString(),
              throughput: { memos_24h: 48, tasks_24h: 9, ideas_24h: 7, digests_24h: 1 },
              latency: { poll_cycle_ms: 312, task_extractor_ms: 41, idea_clusterer_ms: 55, digest_consumer_ms: 88, joplin_write_ms: 27 },
              health: { last_success: '2026-05-22T19:17:59Z', last_error: null, consumers: { Mirroring: 'OK', TaskExtractor: 'OK', IdeaClusterer: 'OK', DailyDigest: 'OK' } },
              anomalies: { ingestion_gap_minutes: 0, memo_backlog: 0, cluster_drift: false }
            };
            await writer.write(metrics);
            
            const mdCall = mockJoplinClient.updateNote.mock.calls.find(call => call[1].startsWith('# Ingestion Health'));
            expect(mdCall).toBeDefined();
            const writtenMd = mdCall[1];
            expect(writtenMd).toContain('Memos: 48');
            expect(writtenMd).toContain('Poll Cycle: 312 ms');
            expect(writtenMd).toContain('Last Success: 2026-05-22T19:17:59Z');
            expect(writtenMd).toContain('Ingestion Gap: 0 minutes');
        });
    });

    describe('Consumer', () => {
        it('should orchestrate the collect-analyze-write flow', async () => {
            // This is more of an integration test
            mockBlackBoxReader.getEventsForRange.mockResolvedValue(mockEvents);
            consumer = new MetricsConsumer();
            
            const collectorSpy = jest.spyOn(consumer.collector, 'collectRawMetrics');
            const analyzerSpy = jest.spyOn(consumer.analyzer, 'analyze');
            const writerSpy = jest.spyOn(consumer.writer, 'write');

            await consumer.run();

            expect(collectorSpy).toHaveBeenCalled();
            expect(analyzerSpy).toHaveBeenCalled();
            expect(writerSpy).toHaveBeenCalled();
        });
    });
});
