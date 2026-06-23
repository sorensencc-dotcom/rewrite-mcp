// filename: wayland-adapter-registry.ts
// Wayland Adapter Registry
// Manages tool adapters with security policy enforcement
export class WaylandAdapterRegistry {
    constructor() {
        this.adapters = new Map();
    }
    register(adapter) {
        if (this.adapters.has(adapter.id)) {
            throw new Error(`Wayland adapter already registered: ${adapter.id}`);
        }
        this.adapters.set(adapter.id, adapter);
    }
    get(id) {
        return this.adapters.get(id);
    }
    list() {
        return Array.from(this.adapters.values());
    }
    async execute(id, payload, ctx) {
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
        }
        catch (err) {
            ctx.logger.error('wayland.adapter.execute.error', {
                adapter: id,
                sessionId: ctx.sessionId,
                error: err.message,
            });
            throw err;
        }
    }
}
export const createDefaultRegistry = () => {
    const registry = new WaylandAdapterRegistry();
    // Shell adapter (stub)
    registry.register({
        id: 'shell',
        description: 'Shell command execution adapter',
        type: 'shell',
        async execute(payload, ctx) {
            ctx.logger.info('shell.execute', { command: payload?.command });
            return { status: 'ok', output: '' };
        },
    });
    // File adapter (stub)
    registry.register({
        id: 'file',
        description: 'File system operations adapter',
        type: 'file',
        async execute(payload, ctx) {
            ctx.logger.info('file.execute', { operation: payload?.operation });
            return { status: 'ok' };
        },
    });
    // HTTP adapter (real implementation)
    registry.register({
        id: 'http',
        description: 'HTTP client adapter',
        type: 'http',
        async execute(payload, ctx) {
            const req = payload;
            if (!req.url || !req.method) {
                throw new Error('HTTP adapter requires url and method in payload');
            }
            ctx.logger.info('http.execute.start', {
                method: req.method,
                url: req.url,
                sessionId: ctx.sessionId,
            });
            try {
                const controller = new AbortController();
                const timeout = req.timeoutMs || 15000;
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                const response = await fetch(req.url, {
                    method: req.method,
                    headers: req.headers || { 'content-type': 'application/json' },
                    body: req.body ? JSON.stringify(req.body) : undefined,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                let data;
                try {
                    data = await response.json();
                }
                catch (parseErr) {
                    throw new Error(`Invalid JSON from ${req.url}: ${parseErr.message}`);
                }
                ctx.logger.info('http.execute.success', {
                    method: req.method,
                    url: req.url,
                    status: response.status,
                    sessionId: ctx.sessionId,
                });
                return {
                    status: 'ok',
                    code: response.status,
                    data,
                };
            }
            catch (err) {
                ctx.logger.error('http.execute.error', {
                    method: req.method,
                    url: req.url,
                    error: err.message,
                    sessionId: ctx.sessionId,
                });
                throw err;
            }
        },
    });
    // Model adapter (stub)
    registry.register({
        id: 'model',
        description: 'Language model invocation adapter',
        type: 'model',
        async execute(payload, ctx) {
            ctx.logger.info('model.execute', { model: payload?.modelName });
            return { status: 'ok', response: '' };
        },
    });
    return registry;
};
//# sourceMappingURL=wayland-adapter-registry.js.map