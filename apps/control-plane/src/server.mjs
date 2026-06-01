/**
 * apps/control-plane/src/server.mjs
 * @version 1.0.0
 *
 * CIC Control Plane HTTP server — single entrypoint.
 * Orchestrates all control-plane services via clean routing.
 */

import express from 'express';
import { registerHealthRoutes } from './routes/health.mjs';
import { registerApiRoutes } from './routes/api/index.mjs';
import { runtimeConfig, validateConfig } from './runtime/config.mjs';
import { installRuntime } from './runtime/install.mjs';
import { logger } from '@cic/shared/logging';

export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '4mb' }));

  // Request logging
  app.use((req, res, next) => {
    const t0 = Date.now();
    res.on('finish', () => {
      logger.info('http_request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - t0,
      });
    });
    next();
  });

  // Public routes
  registerHealthRoutes(app);

  // API routes
  registerApiRoutes(app);

  // Placeholder for future UI routes
  app.get('/', (_req, res) => {
    res.status(200).json({
      message: 'CIC Control Plane runtime OK',
      service: 'cic-control-plane',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.use((req, res) => {
    logger.debug('404_not_found', { method: req.method, path: req.path });
    res.status(404).json({ error: `No route: ${req.method} ${req.path}` });
  });

  // Error handler
  app.use((err, req, res, _next) => {
    logger.error('unhandled_error', {
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
    });
    res.status(err.status ?? 500).json({ error: err.message });
  });

  return app;
}

export async function startServer() {
  try {
    validateConfig();

    logger.info('Starting CIC Control Plane', {
      host: runtimeConfig.host,
      port: runtimeConfig.port,
      nodeEnv: runtimeConfig.nodeEnv,
    });

    // Initialize runtime (orchestrator engines, regions, etc.)
    await installRuntime();

    // Start HTTP server
    const app = createApp();
    app.listen(runtimeConfig.port, runtimeConfig.host, () => {
      logger.info('server_started', {
        service: 'cic-control-plane',
        host: runtimeConfig.host,
        port: runtimeConfig.port,
        url: `http://${runtimeConfig.host}:${runtimeConfig.port}`,
      });
    });
  } catch (err) {
    logger.error('server_startup_failed', { error: err.message });
    process.exit(1);
  }
}
