# PHASE E WEEK 3 PLAN — CONFIG + HARDENING + RUNBOOKS
*(5-day plan to finalize Phase E and prepare for production)*

Week 3 is where the system becomes **operationally safe**, **configurable**, and **documented**.

---

## WEEK 3 GOAL
**Finalize configuration surfaces, harden the system, and produce operator runbooks.**

Outcome: Phase E complete and ready for production rollout.

---

## DAY 1 — Configuration Surfaces

### Deliverables
- `src/config/Config.ts` (new)
- Centralized configuration module
- Environment variable overrides
- Validation on startup

### Implementation Strategy
```typescript
// Config.ts
export interface RufloConfig {
  // Execution Store
  executionStore: {
    type: 'file' | 's3';
    path: string;  // file: /var/lib/ruflo/executions
  };

  // Caching
  cache: {
    enabled: boolean;
    ttlMs: Record<string, number>;
    maxSize: number;
  };

  // Retry
  retry: {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };

  // Circuit Breaker
  breaker: {
    failureThreshold: number;
    successThreshold: number;
    cooldownMs: number;
  };

  // Metrics
  metrics: {
    enabled: boolean;
    exporter: 'stdout' | 'otlp';
    samplingRate: number;
  };

  // MCP
  mcp: {
    endpoints: Record<string, string>;
    timeoutMs: number;
  };

  // Admin
  admin: {
    token: string;
    rateLimit: number;
  };
}

export class ConfigLoader {
  static load(): RufloConfig {
    return {
      executionStore: {
        type: (process.env.EXECUTION_STORE_TYPE as any) || 'file',
        path: process.env.EXECUTION_STORE_PATH || './executions'
      },
      cache: {
        enabled: process.env.CACHE_ENABLED !== 'false',
        ttlMs: this.parseTTLs(),
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000')
      },
      retry: {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
        initialDelayMs: parseInt(process.env.RETRY_INITIAL_DELAY_MS || '100'),
        maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '10000'),
        backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2')
      },
      breaker: {
        failureThreshold: parseInt(process.env.BREAKER_FAILURE_THRESHOLD || '5'),
        successThreshold: parseInt(process.env.BREAKER_SUCCESS_THRESHOLD || '2'),
        cooldownMs: parseInt(process.env.BREAKER_COOLDOWN_MS || '30000')
      },
      metrics: {
        enabled: process.env.METRICS_ENABLED !== 'false',
        exporter: (process.env.METRICS_EXPORTER as any) || 'stdout',
        samplingRate: parseFloat(process.env.METRICS_SAMPLING_RATE || '1.0')
      },
      mcp: {
        endpoints: this.parseMCPEndpoints(),
        timeoutMs: parseInt(process.env.MCP_TIMEOUT_MS || '2000')
      },
      admin: {
        token: process.env.ADMIN_TOKEN || '',
        rateLimit: parseInt(process.env.ADMIN_RATE_LIMIT || '100')
      }
    };
  }

  static validate(config: RufloConfig): void {
    if (!config.executionStore.path) {
      throw new Error('EXECUTION_STORE_PATH required');
    }
    if (!config.admin.token) {
      throw new Error('ADMIN_TOKEN required for production');
    }
    if (config.retry.maxAttempts < 1) {
      throw new Error('RETRY_MAX_ATTEMPTS must be >= 1');
    }
  }

  private static parseTTLs(): Record<string, number> {
    const ttls: Record<string, number> = {};
    const env = process.env.CACHE_TTLS_JSON;
    if (env) {
      Object.assign(ttls, JSON.parse(env));
    }
    return ttls;
  }

  private static parseMCPEndpoints(): Record<string, string> {
    const endpoints: Record<string, string> = {
      'summarizer': process.env.MCP_SUMMARIZER_ENDPOINT || 'http://localhost:7070',
      'drift': process.env.MCP_DRIFT_ENDPOINT || 'http://localhost:7071',
      'diagnostics': process.env.MCP_DIAGNOSTICS_ENDPOINT || 'http://localhost:7072',
      'docs-sync': process.env.MCP_DOCS_SYNC_ENDPOINT || 'http://localhost:7073',
      'orchestrator': process.env.MCP_ORCHESTRATOR_ENDPOINT || 'http://localhost:7074'
    };
    return endpoints;
  }
}
```

### Environment File Template
```bash
# .env.template
EXECUTION_STORE_TYPE=file
EXECUTION_STORE_PATH=/var/lib/ruflo/executions
CACHE_ENABLED=true
CACHE_MAX_SIZE=1000
CACHE_TTLS_JSON='{"code-analyzer:analyze":3600000}'
RETRY_MAX_ATTEMPTS=3
RETRY_INITIAL_DELAY_MS=100
RETRY_MAX_DELAY_MS=10000
RETRY_BACKOFF_MULTIPLIER=2
BREAKER_FAILURE_THRESHOLD=5
BREAKER_SUCCESS_THRESHOLD=2
BREAKER_COOLDOWN_MS=30000
METRICS_ENABLED=true
METRICS_EXPORTER=stdout
METRICS_SAMPLING_RATE=1.0
MCP_TIMEOUT_MS=2000
MCP_SUMMARIZER_ENDPOINT=http://localhost:7070
MCP_DRIFT_ENDPOINT=http://localhost:7071
MCP_DIAGNOSTICS_ENDPOINT=http://localhost:7072
MCP_DOCS_SYNC_ENDPOINT=http://localhost:7073
MCP_ORCHESTRATOR_ENDPOINT=http://localhost:7074
ADMIN_TOKEN=change-me-in-production
ADMIN_RATE_LIMIT=100
```

### Tests
- [ ] `tests/config/Config.test.ts`
  - Missing config → defaults applied
  - Invalid config → fail fast
  - Env var overrides work
  - Multi-instance config consistency

### Success Criteria
- Config loads on startup
- All required fields validated
- Defaults sensible
- Easy to override per environment

---

## DAY 2 — Security + Rate Limiting

### Deliverables
- `src/security/AdminTokenMiddleware.ts` (new)
- `src/security/RateLimiter.ts` (new)
- Audit logging for admin actions

### Implementation Strategy
```typescript
// AdminTokenMiddleware.ts
export class AdminTokenMiddleware {
  constructor(private requiredToken: string) {}

  authenticate(req: Request): boolean {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return false;
    }
    const token = header.slice(7);
    return token === this.requiredToken;
  }
}

// RateLimiter.ts
export class RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  isAllowed(clientId: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(clientId);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(clientId, bucket);
    }

    if (bucket.count >= limit) {
      return false;
    }

    bucket.count++;
    return true;
  }
}
```

### Integration Points
- Admin API endpoints (`/admin/cache/clear`, `/admin/config/view`)
- Rate limit per client IP
- Audit log all admin actions

### Tests
- [ ] `tests/security/AdminTokenMiddleware.test.ts`
  - Valid token accepted
  - Invalid token rejected
  - Missing token rejected
- [ ] `tests/security/RateLimiter.test.ts`
  - Requests within limit allowed
  - Requests over limit rejected
  - Bucket resets after window

### Success Criteria
- Unauthorized access blocked
- Rate limit enforced
- Audit logs complete

---

## DAY 3 — Backup + Persistence Hardening

### Deliverables
- `scripts/backup-executions.ts` (new)
- S3 snapshot strategy
- Corruption detection + auto-repair

### Backup Strategy
```bash
# Daily backup to S3
0 2 * * * /usr/local/bin/backup-executions.sh

# Retention: 30 days
# Location: s3://ruflo-backups/executions/YYYY-MM-DD.tar.gz
```

### Implementation
```typescript
// backup-executions.ts
export class ExecutionBackup {
  async backupToS3(
    executionStorePath: string,
    s3Bucket: string,
    s3Key: string
  ): Promise<void> {
    const tar = require('tar');
    const date = new Date().toISOString().split('T')[0];
    const tarFile = `executions-${date}.tar.gz`;

    await tar.create({
      gzip: true,
      file: tarFile,
      cwd: executionStorePath
    }, ['.']);

    await this.uploadToS3(tarFile, s3Bucket, s3Key);
  }

  async restoreFromS3(
    s3Bucket: string,
    s3Key: string,
    executionStorePath: string
  ): Promise<void> {
    const tar = require('tar');

    await this.downloadFromS3(s3Bucket, s3Key, 'restore.tar.gz');
    await tar.extract({
      gzip: true,
      file: 'restore.tar.gz',
      cwd: executionStorePath
    });
  }

  async detectCorruption(executionStorePath: string): Promise<string[]> {
    const corrupted: string[] = [];
    const files = await fs.promises.readdir(executionStorePath);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const data = await fs.promises.readFile(`${executionStorePath}/${file}`, 'utf-8');
        JSON.parse(data);
      } catch {
        corrupted.push(file);
      }
    }

    return corrupted;
  }

  async repair(executionStorePath: string, corruptedFile: string): Promise<void> {
    // Move corrupted file to quarantine
    const quarantine = `${executionStorePath}/.quarantine`;
    fs.mkdirSync(quarantine, { recursive: true });
    await fs.promises.rename(
      `${executionStorePath}/${corruptedFile}`,
      `${quarantine}/${corruptedFile}-${Date.now()}`
    );
  }
}
```

### Tests
- [ ] `tests/backup/ExecutionBackup.test.ts`
  - Backup/restore round-trip
  - Corruption detection
  - Corruption recovery
  - Multi-instance consistency post-restore

### Success Criteria
- Backup completes daily
- Restore works end-to-end
- Corruption auto-detected + quarantined

---

## DAY 4 — Operator Runbooks

### Deliverables
- `runbooks/DAILY_OPERATIONS.md`
- `runbooks/INCIDENT_RESPONSE.md`
- `runbooks/MCP_SERVER_FAILURE.md`
- `runbooks/CIRCUIT_BREAKER_RECOVERY.md`
- `runbooks/CACHE_MANAGEMENT.md`
- `runbooks/BACKUP_AND_RESTORE.md`

Each runbook includes:
- Preconditions
- Step-by-step actions
- Expected outputs
- Escalation paths
- Rollback procedures

### Runbook Structure
```markdown
# Runbook: Daily Operations

## Purpose
Daily health checks and maintenance.

## Preconditions
- [ ] Admin access to Ruflo
- [ ] Access to metrics dashboard
- [ ] SSH to production servers

## Checklist
1. Health checks
   - [ ] MCP servers reachable
   - [ ] ContextServer reachable
   - [ ] No circuit breakers open
2. Metrics review
   - [ ] Cache hit rate > 70%
   - [ ] Stage latency stable
   - [ ] Retry count normal
3. Log review
   - [ ] No error rate spike
   - [ ] No serialization errors
   - [ ] No retry storms
4. Backup verification
   - [ ] Yesterday's backup completed
   - [ ] Backup size reasonable
5. Config sync
   - [ ] Multi-instance configs match

## Actions
[Detailed steps with CLI commands]

## Expected Output
[What success looks like]

## Escalation
If any check fails, escalate to on-call engineer.

## Rollback
[How to revert if something goes wrong]
```

### Success Criteria
- All runbooks complete
- All runbooks tested
- All runbooks documented in runbook index

---

## DAY 5 — Phase E Final Validation

### Deliverables
- Full system validation
- Phase E Completion Summary
- Governance docs updated

### Validation Checklist
- [ ] Multi-instance execution works
- [ ] Caching reduces latency by 10×
- [ ] Resilience under failure injection (95%+ success)
- [ ] Metrics emitting correctly
- [ ] Backups functioning
- [ ] All runbooks executable
- [ ] Configuration surfaces stable
- [ ] Security controls in place

### Testing
```bash
npm run test:phase-e-complete
```

### Outcome
**Phase E ready for production rollout.**

### Documentation
- Update GOVERNANCE_APPROVAL_AUDIT.md
- Update ARTIFACT_WHITELIST.md (if changed)
- Create PHASE_E_COMPLETION_SUMMARY.md
- Archive all phase documents

---

## Week 3 Completion Gate

### Requirements
- [ ] Config module implemented + validated
- [ ] Admin token + rate limiting active
- [ ] Backup strategy tested + documented
- [ ] 6 runbooks complete + tested
- [ ] Phase E full validation passed
- [ ] Zero critical issues
- [ ] All governance docs updated

### Outcome
**Phase E COMPLETE — Ready for production rollout**

### Next
Transition to Phase F (Operator Console v2 + Distributed Tracing UI)
