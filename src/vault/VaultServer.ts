import express, { Express, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface VaultRecord {
  vault_record_id: string;
  schema_version: string;
  created_at: string;
  build_id: string;
  cic_pipeline_id: string;
  decision: string;
  vault_digest: string;
  [key: string]: any;
}

export interface VaultResponse {
  vault_record_id: string;
  vault_digest: string;
  status: 'stored';
  timestamp: string;
}

export class VaultServer {
  private app: Express;
  private records: Map<string, VaultRecord> = new Map();
  private storePath: string;
  private port: number;

  constructor(port: number = 9999, storePath?: string) {
    this.port = port;
    this.storePath = storePath || path.join(process.cwd(), 'vault-records.json');
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      const auth = req.headers['authorization'];
      if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      next();
    });
  }

  private setupRoutes() {
    this.app.post('/vault/records', this.handleVaultWrite.bind(this));
    this.app.get('/vault/records/:id', this.handleVaultRead.bind(this));
    this.app.get('/vault/health', (req, res) => {
      res.json({ status: 'ok', records: this.records.size, timestamp: new Date().toISOString() });
    });
  }

  private handleVaultWrite(req: Request, res: Response) {
    try {
      const record = req.body as VaultRecord;

      if (!record.vault_record_id || !record.vault_digest) {
        return res.status(400).json({ error: 'Missing vault_record_id or vault_digest' });
      }

      this.records.set(record.vault_record_id, record);
      const response: VaultResponse = {
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

  private handleVaultRead(req: Request, res: Response) {
    const { id } = req.params;
    const record = this.records.get(id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.status(200).json(record);
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.error(`Vault server listening on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      const server = this.app.listen(this.port);
      server.close(() => {
        console.error(`Vault server stopped`);
        resolve();
      });
    });
  }

  async save(): Promise<void> {
    const records = Array.from(this.records.values());
    await fs.writeFile(this.storePath, JSON.stringify(records, null, 2), 'utf-8');
  }

  getRecordCount(): number {
    return this.records.size;
  }
}

export async function startVaultServer(port: number = 9999): Promise<VaultServer> {
  const server = new VaultServer(port);
  await server.start();
  return server;
}
