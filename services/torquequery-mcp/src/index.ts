import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SUBSTRATE_URL = process.env.SUBSTRATE_URL || 'http://localhost:3000';

class TorqueQueryMCPServer {
  private server: Server;
  private client: AxiosInstance;

  constructor() {
    this.server = new Server({
      name: 'torquequery-mcp',
      version: '1.0.0',
    });

    this.client = axios.create({
      baseURL: SUBSTRATE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.setupTools();
    this.setupErrorHandlers();
  }

  private setupTools() {
    const tools: Tool[] = [
      {
        name: 'store_chunk',
        description: 'Store a new chunk in TorqueQuery substrate with governance validation',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace identifier (e.g., "project/context")'
            },
            type: {
              type: 'string',
              enum: ['SYSTEM', 'STATE', 'LIVING', 'SCRATCH'],
              description: 'Chunk type - SYSTEM (permanent), STATE (30d TTL), LIVING (permanent), SCRATCH (7d TTL)'
            },
            title: {
              type: 'string',
              description: 'Chunk title'
            },
            body: {
              type: 'string',
              description: 'Chunk content (max 100KB)'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorization'
            },
            importance: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Importance score [0.0-1.0], default 0.5'
            },
            ttl_days: {
              type: 'number',
              description: 'TTL override (only for STATE/SCRATCH)'
            },
            provenance: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  description: 'Source identifier (required)'
                }
              },
              required: ['source'],
              description: 'Provenance metadata'
            },
            embedding: {
              type: 'array',
              items: { type: 'number' },
              description: 'Optional 1536-dimensional embedding vector'
            }
          },
          required: ['namespace', 'type', 'provenance']
        }
      },
      {
        name: 'search_chunks',
        description: 'Execute hybrid search (BM25 + Vector + RRF) across chunks',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to search in'
            },
            query: {
              type: 'string',
              description: 'Search query text'
            },
            embedding: {
              type: 'array',
              items: { type: 'number' },
              description: 'Optional 1536-dimensional embedding for vector search'
            },
            max_results: {
              type: 'number',
              default: 10,
              description: 'Maximum results to return'
            }
          },
          required: ['namespace', 'query']
        }
      },
      {
        name: 'get_task_context',
        description: 'Get optimized context for a task, packed within token budget',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to retrieve context from'
            },
            task: {
              type: 'string',
              description: 'Task description or query'
            },
            embedding: {
              type: 'array',
              items: { type: 'number' },
              description: 'Optional embedding for vector search'
            },
            max_context_tokens: {
              type: 'number',
              default: 4000,
              description: 'Maximum context tokens to pack'
            },
            preferred_types: {
              type: 'array',
              items: { type: 'string' },
              description: 'Preferred chunk types in order [SYSTEM, LIVING, STATE, SCRATCH]'
            }
          },
          required: ['namespace', 'task']
        }
      },
      {
        name: 'get_chunk',
        description: 'Retrieve a specific chunk by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Chunk UUID'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'list_chunks',
        description: 'List chunks in a namespace with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Namespace to list from'
            },
            limit: {
              type: 'number',
              default: 50,
              description: 'Results per page'
            },
            offset: {
              type: 'number',
              default: 0,
              description: 'Pagination offset'
            }
          },
          required: ['namespace']
        }
      },
      {
        name: 'update_chunk',
        description: 'Update a chunk (re-validates governance)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Chunk UUID'
            },
            namespace: {
              type: 'string',
              description: 'Namespace (cannot change)'
            },
            type: {
              type: 'string',
              enum: ['SYSTEM', 'STATE', 'LIVING', 'SCRATCH']
            },
            title: { type: 'string' },
            body: { type: 'string' },
            tags: {
              type: 'array',
              items: { type: 'string' }
            },
            importance: {
              type: 'number',
              minimum: 0,
              maximum: 1
            },
            ttl_days: { type: 'number' },
            provenance: { type: 'object' },
            embedding: {
              type: 'array',
              items: { type: 'number' }
            }
          },
          required: ['id', 'namespace', 'type', 'provenance']
        }
      },
      {
        name: 'delete_chunk',
        description: 'Soft-delete a chunk',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Chunk UUID'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'get_stats',
        description: 'Retrieve service statistics by type and namespace',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const result = await this.handleToolCall(request.params.name, request.params.arguments);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ],
          isError: false
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools };
    });
  }

  private async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'store_chunk':
        return this.storeChunk(args);
      case 'search_chunks':
        return this.searchChunks(args);
      case 'get_task_context':
        return this.getTaskContext(args);
      case 'get_chunk':
        return this.getChunk(args);
      case 'list_chunks':
        return this.listChunks(args);
      case 'update_chunk':
        return this.updateChunk(args);
      case 'delete_chunk':
        return this.deleteChunk(args);
      case 'get_stats':
        return this.getStats(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async storeChunk(args: any) {
    const response = await this.client.post('/chunks', args);
    return response.data;
  }

  private async searchChunks(args: any) {
    const response = await this.client.post('/search/hybrid', args);
    return response.data;
  }

  private async getTaskContext(args: any) {
    const response = await this.client.post('/context/task', args);
    return response.data;
  }

  private async getChunk(args: any) {
    const response = await this.client.get(`/chunks/${args.id}`);
    return response.data;
  }

  private async listChunks(args: any) {
    const response = await this.client.post('/chunks/list', args);
    return response.data;
  }

  private async updateChunk(args: any) {
    const { id, ...payload } = args;
    const response = await this.client.put(`/chunks/${id}`, payload);
    return response.data;
  }

  private async deleteChunk(args: any) {
    const response = await this.client.delete(`/chunks/${args.id}`);
    return response.data;
  }

  private async getStats(args: any) {
    const response = await this.client.get('/stats');
    return response.data;
  }

  private setupErrorHandlers() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('unhandledRejection', (reason) => {
      console.error('[Unhandled Rejection]', reason);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('TorqueQuery MCP server running on stdio');
  }
}

const server = new TorqueQueryMCPServer();
server.run().catch(console.error);
