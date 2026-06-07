const { loadData } = require('../../src/ops/loader');
const { evaluateHealth } = require('../../src/ops/status');
const { formatToHuman } = require('../../src/ops/formatter');

// Mock dependencies
jest.mock('fs/promises');
jest.mock('../../src/joplin/client');
jest.mock('../../src/memos/client');
jest.mock('../../src/logging/blackbox');

const fs = require('fs/promises');
const { JoplinClient } = require('../../src/joplin/client');
const { MemosClient } = require('../../src/memos/client');
const { getBlackBoxReader } = require('../../src/logging/blackbox');


describe('Ops Status CLI', () => {

    let mockJoplinClient;
    let mockMemosClient;
    let mockBlackBoxReader;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        mockJoplinClient = {
            getNoteByPath: jest.fn(),
            ping: jest.fn().mockResolvedValue(true),
        };
        JoplinClient.mockImplementation(() => mockJoplinClient);
        
        mockMemosClient = {
            fetchMemos: jest.fn().mockResolvedValue([]),
        };
        MemosClient.mockImplementation(() => mockMemosClient);
        
        mockBlackBoxReader = {
            getEventsForLast: jest.fn().mockResolvedValue([]),
        };
        getBlackBoxReader.mockImplementation(() => mockBlackBoxReader);

        fs.readFile.mockResolvedValue(JSON.stringify({ lastCursorTs: Date.now() / 1000 }));
    });

    it('should show all OK for healthy metrics', async () => {
        const mockMetrics = {
            health: { consumers: { IngestionWorker: 'OK', TaskExtractor: 'OK', IdeaClusterer: 'OK', DailyDigest: 'OK' } },
            anomalies: { ingestion_gap_minutes: 0, memo_backlog: 0, cluster_drift: false },
        };
        mockJoplinClient.getNoteByPath.mockResolvedValue({ body: JSON.stringify(mockMetrics) });

        const data = await loadData();
        const health = evaluateHealth(data);
        
        expect(health.exitCode).toBe(0);
        expect(health.overallStatus).toBe('OK');
        
        const output = formatToHuman(data, health);
        expect(output).toContain('✓ IngestionWorker: OK');
        expect(output).toContain('✓ TaskExtractor: OK');
    });

    it('should show WARN for anomalies', async () => {
        const mockMetrics = {
            health: { consumers: { IngestionWorker: 'OK', TaskExtractor: 'OK' } },
            anomalies: { ingestion_gap_minutes: 10, memo_backlog: 5, cluster_drift: false },
        };
        mockJoplinClient.getNoteByPath.mockResolvedValue({ body: JSON.stringify(mockMetrics) });
        
        const data = await loadData();
        const health = evaluateHealth(data);

        expect(health.exitCode).toBe(1);
        expect(health.overallStatus).toBe('WARN');
    });

    it('should show ERROR for high ingestion gap', async () => {
        const mockMetrics = {
            health: { consumers: { IngestionWorker: 'OK' } },
            anomalies: { ingestion_gap_minutes: 35 },
        };
        mockJoplinClient.getNoteByPath.mockResolvedValue({ body: JSON.stringify(mockMetrics) });
        
        const data = await loadData();
        const health = evaluateHealth(data);
        
        expect(health.exitCode).toBe(2);
        expect(health.overallStatus).toBe('ERROR');
        
        const output = formatToHuman(data, health);
        expect(output).toContain('! IngestionWorker: OK'); // Symbol is from consumer health, not overall
    });
    
    it('should show ERROR if storage is unreachable', async () => {
        mockJoplinClient.ping.mockRejectedValue(new Error('timeout'));
        const data = await loadData();
        const health = evaluateHealth(data);
        expect(health.exitCode).toBe(2);
        expect(data.storage.joplin).toBe('unreachable');
    });

    it('should correctly surface Dry-Run mode', async () => {
        process.env.DRY_RUN = 'true';
        const data = await loadData();
        expect(data.dryRun).toBe(true);
        const output = formatToHuman(data, evaluateHealth(data));
        expect(output).toContain('Dry-Run: ON');
        delete process.env.DRY_RUN; // cleanup
    });

    it('should never throw on missing files', async () => {
        mockJoplinClient.getNoteByPath.mockResolvedValue(null);
        fs.readFile.mockRejectedValue(new Error('not found'));

        await expect(loadData()).resolves.not.toThrow();
        const data = await loadData();
        expect(data.metrics).toEqual({});
        expect(data.state.memos_state_json.error).toContain('not found');
    });
});
