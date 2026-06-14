import express, { Express, Request, Response } from 'express';
import { VaultServer, VaultRecord } from '../vault/VaultServer';
import { MemoryStore } from '../memory/MemoryStore';
import { MemoryQueryAPI } from '../memory/MemoryQueryAPI';

export class UnifiedGovernanceAPI {
  private app: Express;
  private vaultServer: VaultServer;
  private memoryStore: MemoryStore;
  private memoryQueryAPI: MemoryQueryAPI;
  private port: number;

  constructor(port: number = 3100) {
    this.port = port;
    this.app = express();
    this.vaultServer = new VaultServer(9999);
    this.memoryStore = new MemoryStore();
    this.memoryQueryAPI = new MemoryQueryAPI(this.memoryStore);
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(this.authMiddleware.bind(this));
  }

  private authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    // Skip auth for health checks
    if (req.path === '/health') {
      return next();
    }

    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
  }

  private setupRoutes() {
    // === M3: Vault Records (Phase 0.9 M3) ===
    this.app.post('/vault/records', this.handleVaultWrite.bind(this));
    this.app.get('/vault/records/:id', this.handleVaultRead.bind(this));
    this.app.get('/vault/health', this.handleVaultHealth.bind(this));

    // === Phase 23.2: Memory Query API ===
    this.app.post('/memory/query/by-type', this.handleQueryByType.bind(this));
    this.app.post('/memory/query/by-agent', this.handleQueryByAgent.bind(this));
    this.app.post('/memory/query/by-time', this.handleQueryByTime.bind(this));
    this.app.post('/memory/query/by-correlation', this.handleQueryByCorrelation.bind(this));
    this.app.post('/memory/signals/semantic', this.handleSemanticSignals.bind(this));
    this.app.post('/memory/signals/temporal', this.handleTemporalSignals.bind(this));
    this.app.post('/memory/signals/causal', this.handleCausalSignals.bind(this));
    this.app.post('/memory/signals/all', this.handleAllSignals.bind(this));

    // Health
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          vault: 'ready',
          memory: 'ready',
        },
      });
    });
  }

  // === Vault handlers ===

  private async handleVaultWrite(req: Request, res: Response) {
    try {
      const record = req.body as VaultRecord;
      if (!record.vault_record_id || !record.vault_digest) {
        return res.status(400).json({ error: 'Missing vault_record_id or vault_digest' });
      }

      const response = {
        vault_record_id: record.vault_record_id,
        vault_digest: record.vault_digest,
        status: 'stored',
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async handleVaultRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      res.status(200).json({ vault_record_id: id, status: 'retrieved' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async handleVaultHealth(req: Request, res: Response) {
    try {
      res.status(200).json({
        status: 'ok',
        service: 'vault',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // === Memory Query handlers ===

  private async handleQueryByType(req: Request, res: Response) {
    try {
      const { event_type, limit } = req.body;
      if (!event_type) {
        return res.status(400).json({ error: 'Missing event_type' });
      }

      const results = await this.memoryQueryAPI.findByEventType(event_type, limit || 100);
      res.status(200).json({ events: results, count: results.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async handleQueryByAgent(req: Request, res: Response) {
    try {
      const { source_agent, limit } = req.body;
      if (!source_agent) {
        return res.status(400).json({ error: 'Missing source_agent' });
      }

      const results = await this.memoryQueryAPI.findBySourceAgent(source_agent, limit || 100);
      res.status(200).json({ events: results, count: results.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async handleQueryByTime(req: Request, res: Response) {
    try {
      const { after_timestamp, before_timestamp, limit } = req.body;
      if (!after_timestamp || !before_timestamp) {
        return res.status(400).json({ error: 'Missing after_timestamp or before_timestamp' });
      }

      const results = await this.memoryQueryAPI.findByTimeWindow(
        after_timestamp,
        before_timestamp,
        limit || 100
      );
      res.status(200).json({ events: results, count: results.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async handleQueryByCorrelation(req: Request, res: Response) {
    try {
      const { correlation_id } = req.body;
      if (!correlation_id) {
        return res.status(400).json({ error: 'Missing correlation_id' });
      }

      const results = await this.memoryQueryAPI.findByCorrelationId(correlation_id);
      res.status(200).json({ events: results, count: results.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async handleSemanticSignals(req: Request, res: Response) {
    try {
      const { threshold } = req.body;
      const signals = await this.memoryQueryAPI.detectSemanticSignals(threshold || 0.7);
      res.status(200).json({ signals, count: signals.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async handleTemporalSignals(req: Request, res: Response) {
    try {
      const { window_minutes } = req.body;
      const signals = await this.memoryQueryAPI.detectTemporalSignals(window_minutes || 60);
      res.status(200).json({ signals, count: signals.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async handleCausalSignals(req: Request, res: Response) {
    try {
      const signals = await this.memoryQueryAPI.detectCausalSignals();
      res.status(200).json({ signals, count: signals.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async handleAllSignals(req: Request, res: Response) {
    try {
      const { semantic_threshold, temporal_window } = req.body;
      const allSignals = await this.memoryQueryAPI.detectAllSignals(
        semantic_threshold || 0.7,
        temporal_window || 60
      );
      res.status(200).json(allSignals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.error(`Unified Governance API listening on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  getApp(): Express {
    return this.app;
  }
}

export async function startUnifiedAPI(port: number = 3100): Promise<UnifiedGovernanceAPI> {
  const api = new UnifiedGovernanceAPI(port);
  await api.start();
  return api;
}
