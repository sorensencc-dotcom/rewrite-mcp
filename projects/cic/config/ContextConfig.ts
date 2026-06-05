/**
 * CIC Context Service Configuration
 */

export interface ContextConfig {
  // Server
  port: number;
  host: string;
  apiVersion: string;

  // Backends
  crg: {
    baseUrl: string;
    timeout: number;
  };

  cic: {
    baseUrl: string;
    timeout: number;
  };

  // Cache
  cache: {
    ttl: number; // seconds
    maxSize: number; // max items
    enabled: boolean;
  };

  // Timeouts
  timeouts: {
    request: number; // ms
    slice: number; // ms
    query: number; // ms
  };

  // Ruflo orchestration
  ruflo: {
    maxConcurrency: number;
    defaultTimeout: number;
    registry: {
      cacheEnabled: boolean;
    };
  };

  // Observability
  observability: {
    tracing: {
      enabled: boolean;
      sampleRate: number; // 0.0-1.0
    };
    metrics: {
      enabled: boolean;
      interval: number; // ms
    };
    health: {
      checkInterval: number; // ms
    };
  };

  // Logging
  logging: {
    level: "debug" | "info" | "warn" | "error";
    format: "json" | "text";
  };
}

/**
 * Load configuration from environment + defaults
 */
export function loadConfig(): ContextConfig {
  const env = process.env;

  return {
    port: parseInt(env.CONTEXT_API_PORT || "8080", 10),
    host: env.CONTEXT_API_HOST || "0.0.0.0",
    apiVersion: env.CONTEXT_API_VERSION || "1.0.0",

    crg: {
      baseUrl: env.CRG_BASE_URL || "http://localhost:8081",
      timeout: parseInt(env.CRG_TIMEOUT || "30000", 10),
    },

    cic: {
      baseUrl: env.CIC_BASE_URL || "http://localhost:8082",
      timeout: parseInt(env.CIC_TIMEOUT || "30000", 10),
    },

    cache: {
      ttl: parseInt(env.CACHE_TTL || "3600", 10),
      maxSize: parseInt(env.CACHE_MAX_SIZE || "10000", 10),
      enabled: env.CACHE_ENABLED !== "false",
    },

    timeouts: {
      request: parseInt(env.REQUEST_TIMEOUT || "30000", 10),
      slice: parseInt(env.SLICE_TIMEOUT || "10000", 10),
      query: parseInt(env.QUERY_TIMEOUT || "60000", 10),
    },

    ruflo: {
      maxConcurrency: parseInt(env.RUFLO_MAX_CONCURRENCY || "10", 10),
      defaultTimeout: parseInt(env.RUFLO_DEFAULT_TIMEOUT || "30000", 10),
      registry: {
        cacheEnabled: env.RUFLO_REGISTRY_CACHE_ENABLED !== "false",
      },
    },

    observability: {
      tracing: {
        enabled: env.TRACING_ENABLED !== "false",
        sampleRate: parseFloat(env.TRACING_SAMPLE_RATE || "1.0"),
      },
      metrics: {
        enabled: env.METRICS_ENABLED !== "false",
        interval: parseInt(env.METRICS_INTERVAL || "60000", 10),
      },
      health: {
        checkInterval: parseInt(env.HEALTH_CHECK_INTERVAL || "30000", 10),
      },
    },

    logging: {
      level: (env.LOG_LEVEL || "info") as "debug" | "info" | "warn" | "error",
      format: (env.LOG_FORMAT || "json") as "json" | "text",
    },
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: ContextConfig): string[] {
  const errors: string[] = [];

  if (config.port < 1 || config.port > 65535) {
    errors.push(`Invalid port: ${config.port}`);
  }

  if (!config.crg.baseUrl) {
    errors.push("Missing CRG_BASE_URL");
  }

  if (!config.cic.baseUrl) {
    errors.push("Missing CIC_BASE_URL");
  }

  if (config.observability.tracing.sampleRate < 0 || config.observability.tracing.sampleRate > 1) {
    errors.push(`Invalid tracing sample rate: ${config.observability.tracing.sampleRate}`);
  }

  return errors;
}

export default {
  loadConfig,
  validateConfig,
};
