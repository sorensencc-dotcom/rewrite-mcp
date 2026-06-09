// filename: wayland-adapter-registry.ts
// Wayland Adapter Registry
// Manages tool adapters with security policy enforcement

export interface WaylandContext {
  torqueQuery: any;
  securityPolicy: any;
  logger: any;
  sessionId: string;
}

export interface WaylandAdapter {
  id: string;
  description: string;
  type: 'shell' | 'file' | 'http' | 'model';
  execute(payload: unknown, ctx: WaylandContext): Promise<unknown>;
}

export class WaylandAdapterRegistry {
  private readonly adapters = new Map<string, WaylandAdapter>();

  register(adapter: WaylandAdapter): void {
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Wayland adapter already registered: ${adapter.id}`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): WaylandAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): WaylandAdapter[] {
    return Array.from(this.adapters.values());
  }

  async execute(id: string, payload: unknown, ctx: WaylandContext): Promise<unknown> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new Error(`Wayland adapter not found: ${id}`);
    }

    // Security check
    if (!ctx.securityPolicy.isToolAllowed(id)) {
      ctx.logger.warn('wayland.security.denied', {
        adapter: id,
        sessionId: ctx.sessionId,
      });
      throw new Error(`Tool not allowed by security policy: ${id}`);
    }

    ctx.logger.info('wayland.adapter.execute.start', {
      adapter: id,
      sessionId: ctx.sessionId,
    });

    try {
      const result = await adapter.execute(payload, ctx);
      ctx.logger.info('wayland.adapter.execute.end', {
        adapter: id,
        sessionId: ctx.sessionId,
        status: 'success',
      });
      return result;
    } catch (err: any) {
      ctx.logger.error('wayland.adapter.execute.error', {
        adapter: id,
        sessionId: ctx.sessionId,
        error: err.message,
      });
      throw err;
    }
  }
}

export const createDefaultRegistry = (): WaylandAdapterRegistry => {
  const registry = new WaylandAdapterRegistry();

  // Shell adapter (stub)
  registry.register({
    id: 'shell',
    description: 'Shell command execution adapter',
    type: 'shell',
    async execute(payload, ctx) {
      ctx.logger.info('shell.execute', { command: (payload as any)?.command });
      return { status: 'ok', output: '' };
    },
  });

  // File adapter (stub)
  registry.register({
    id: 'file',
    description: 'File system operations adapter',
    type: 'file',
    async execute(payload, ctx) {
      ctx.logger.info('file.execute', { operation: (payload as any)?.operation });
      return { status: 'ok' };
    },
  });

  // HTTP adapter (stub)
  registry.register({
    id: 'http',
    description: 'HTTP client adapter',
    type: 'http',
    async execute(payload, ctx) {
      ctx.logger.info('http.execute', { url: (payload as any)?.url });
      return { status: 'ok', data: {} };
    },
  });

  // Model adapter (stub)
  registry.register({
    id: 'model',
    description: 'Language model invocation adapter',
    type: 'model',
    async execute(payload, ctx) {
      ctx.logger.info('model.execute', { model: (payload as any)?.modelName });
      return { status: 'ok', response: '' };
    },
  });

  return registry;
};
