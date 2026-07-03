import axios, { AxiosInstance } from 'axios';

export type ChunkType = 'SYSTEM' | 'STATE' | 'LIVING' | 'SCRATCH';

export interface Chunk {
  id: string;
  namespace: string;
  type: ChunkType;
  title: string;
  body: string;
  tags: string[];
  importance: number;
  ttl_days: number | null;
  provenance: Record<string, any>;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  has_embedding?: boolean;
  fused_score?: number;
  bm25_score?: number;
  vector_score?: number;
}

export interface ChunkInput {
  namespace: string;
  type: ChunkType;
  title?: string;
  body?: string;
  tags?: string[];
  importance?: number;
  ttl_days?: number | null;
  provenance: {
    source: string;
    [key: string]: any;
  };
  embedding?: number[];
}

export interface HybridSearchOptions {
  namespace: string;
  query: string;
  embedding?: number[];
  max_results?: number;
}

export interface ContextTaskOptions {
  namespace: string;
  task: string;
  embedding?: number[];
  max_context_tokens?: number;
  preferred_types?: string[];
}

export class SubstrateClient {
  private client: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async storeChunk(input: ChunkInput): Promise<Chunk> {
    const response = await this.client.post('/chunks', input);
    return response.data;
  }

  async getChunk(id: string): Promise<Chunk> {
    const response = await this.client.get(`/chunks/${id}`);
    return response.data;
  }

  async updateChunk(id: string, input: Partial<ChunkInput>): Promise<Chunk> {
    const response = await this.client.put(`/chunks/${id}`, input);
    return response.data;
  }

  async deleteChunk(id: string): Promise<{ success: boolean; id: string }> {
    const response = await this.client.delete(`/chunks/${id}`);
    return response.data;
  }

  async listChunks(namespace: string, limit = 50, offset = 0): Promise<Chunk[]> {
    const response = await this.client.post('/chunks/list', {
      namespace,
      limit,
      offset
    });
    return response.data;
  }

  async searchHybrid(options: HybridSearchOptions): Promise<Chunk[]> {
    const response = await this.client.post('/search/hybrid', options);
    return response.data;
  }

  async getContextForTask(options: ContextTaskOptions): Promise<{
    chunks: Chunk[];
    token_count: number;
  }> {
    const response = await this.client.post('/context/task', options);
    return response.data;
  }

  async getStats(): Promise<any[]> {
    const response = await this.client.get('/stats');
    return response.data;
  }
}
