// CIC WIL — Wayland manifest validation
// Validates cic_foreman.agent.yaml before Foreman boots

export interface WaylandTool {
  name: string;
  type: 'shell' | 'file' | 'model' | 'http' | 'browser';
  description?: string;
}

export interface SecurityPolicyConfig {
  shellDenyPatterns?: string[];
  fileRootBoundary?: string;
  httpAllowDomains?: string[];
  modelMaxTokens?: number;
  browserDenyPatterns?: string[];
}

export interface SessionMappingConfig {
  enableSessionTracking: boolean;
  persistMapping: boolean;
  mappingBackend: 'memory' | 'file' | 'database';
}

export interface WaylandManifest {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    version: string;
    description: string;
  };
  spec: {
    tools: WaylandTool[];
    security: SecurityPolicyConfig;
    sessionMapping: SessionMappingConfig;
  };
}

export class ManifestValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  validate(manifest: any, checkEntrypoint: boolean = true): { valid: boolean; errors: string[]; warnings: string[] } {
    this.errors = [];
    this.warnings = [];

    // Validate structure
    this.validateMetadata(manifest);
    this.validateSpec(manifest.spec);
    this.validateTools(manifest.spec?.tools);
    this.validateSecurity(manifest.spec?.security);
    this.validateSessionMapping(manifest.spec?.sessionMapping);

    // Validate entrypoint file exists (optional)
    if (checkEntrypoint && manifest.spec?.entrypoint) {
      this.validateEntrypoint(manifest.spec.entrypoint);
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  private validateMetadata(manifest: any): void {
    if (!manifest) {
      this.errors.push('Manifest cannot be empty');
      return;
    }

    const { apiVersion, kind, metadata } = manifest;

    if (!apiVersion) {
      this.errors.push('Missing apiVersion (e.g., "cic.wayland/v1")');
    } else if (apiVersion !== 'cic.wayland/v1') {
      this.warnings.push(`apiVersion "${apiVersion}" is not the expected "cic.wayland/v1"`);
    }

    if (!kind) {
      this.errors.push('Missing kind (should be "CICForeman")');
    } else if (kind !== 'CICForeman') {
      this.errors.push(`Invalid kind "${kind}" (should be "CICForeman")`);
    }

    if (!metadata) {
      this.errors.push('Missing metadata section');
      return;
    }

    if (!metadata.name) {
      this.errors.push('Missing metadata.name');
    } else if (metadata.name !== 'cic_foreman') {
      this.warnings.push(`Unexpected agent name "${metadata.name}" (expected "cic_foreman")`);
    }

    if (!metadata.version) {
      this.warnings.push('Missing metadata.version');
    } else if (!this.isValidVersion(metadata.version)) {
      this.errors.push(`Invalid version format: "${metadata.version}" (should be semantic e.g. "1.0.0")`);
    }

    if (!metadata.description) {
      this.warnings.push('Missing metadata.description');
    }
  }

  private validateSpec(spec: any): void {
    if (!spec) {
      this.errors.push('Missing spec section');
      return;
    }

    if (!spec.tools || !Array.isArray(spec.tools) || spec.tools.length === 0) {
      this.errors.push('spec.tools must be a non-empty array');
    }

    if (!spec.security) {
      this.warnings.push('Missing security section (security defaults to permissive)');
    }

    if (!spec.sessionMapping) {
      this.warnings.push('Missing sessionMapping section (session tracking disabled)');
    }
  }

  private validateTools(tools: any): void {
    if (!tools || !Array.isArray(tools)) {
      return;
    }

    const validTypes = ['shell', 'file', 'model', 'http', 'browser'];
    const seenNames = new Set<string>();

    tools.forEach((tool, idx) => {
      if (!tool.name) {
        this.errors.push(`Tool [${idx}]: missing name`);
      } else {
        if (seenNames.has(tool.name)) {
          this.errors.push(`Tool [${idx}]: duplicate name "${tool.name}"`);
        }
        seenNames.add(tool.name);
      }

      if (!tool.type) {
        this.errors.push(`Tool [${idx}]: missing type`);
      } else if (!validTypes.includes(tool.type)) {
        this.errors.push(`Tool [${idx}]: invalid type "${tool.type}" (valid: ${validTypes.join(', ')})`);
      }

      if (!tool.description) {
        this.warnings.push(`Tool [${idx}] "${tool.name}": missing description`);
      }
    });

    // Require at least one of each adapter
    const requiredAdapters = ['shell', 'file', 'model', 'http', 'browser'];
    const providedAdapters = new Set(tools.map((t) => t.type));

    requiredAdapters.forEach((adapter) => {
      if (!providedAdapters.has(adapter)) {
        this.errors.push(`Missing required adapter: ${adapter}`);
      }
    });
  }

  private validateSecurity(security: any): void {
    if (!security) {
      return;
    }

    if (security.shellDenyPatterns !== undefined) {
      if (!Array.isArray(security.shellDenyPatterns)) {
        this.errors.push('security.shellDenyPatterns must be an array');
      } else {
        security.shellDenyPatterns.forEach((pattern: any, idx: number) => {
          if (typeof pattern !== 'string') {
            this.errors.push(`security.shellDenyPatterns[${idx}]: must be a string`);
          } else {
            try {
              new RegExp(pattern);
            } catch (e) {
              this.errors.push(`security.shellDenyPatterns[${idx}]: invalid regex: ${pattern}`);
            }
          }
        });
      }
    }

    if (security.fileRootBoundary !== undefined && typeof security.fileRootBoundary !== 'string') {
      this.errors.push('security.fileRootBoundary must be a string');
    }

    if (security.httpAllowDomains !== undefined) {
      if (!Array.isArray(security.httpAllowDomains)) {
        this.errors.push('security.httpAllowDomains must be an array');
      } else {
        security.httpAllowDomains.forEach((domain: any, idx: number) => {
          if (typeof domain !== 'string') {
            this.errors.push(`security.httpAllowDomains[${idx}]: must be a string`);
          }
        });
      }
    }

    if (security.modelMaxTokens !== undefined) {
      if (typeof security.modelMaxTokens !== 'number') {
        this.errors.push('security.modelMaxTokens must be a number');
      } else if (security.modelMaxTokens <= 0) {
        this.errors.push('security.modelMaxTokens must be positive');
      } else if (security.modelMaxTokens > 1000000) {
        this.warnings.push(`security.modelMaxTokens ${security.modelMaxTokens} is very high`);
      }
    }

    // Check nested model config
    if (security.model !== undefined) {
      if (typeof security.model !== 'object') {
        this.errors.push('security.model must be an object');
      } else {
        if (security.model.maxTokens !== undefined) {
          if (typeof security.model.maxTokens !== 'number') {
            this.errors.push('security.model.maxTokens must be a number');
          } else if (security.model.maxTokens <= 0) {
            this.errors.push('security.model.maxTokens must be positive');
          }
        }
        if (security.model.temperatureMax !== undefined) {
          if (typeof security.model.temperatureMax !== 'number') {
            this.errors.push('security.model.temperatureMax must be a number');
          } else if (security.model.temperatureMax < 0 || security.model.temperatureMax > 2) {
            this.errors.push('security.model.temperatureMax must be between 0 and 2');
          }
        }
      }
    }
  }

  private validateSessionMapping(sessionMapping: any): void {
    if (!sessionMapping) {
      return;
    }

    if (sessionMapping.enableSessionTracking !== undefined) {
      if (typeof sessionMapping.enableSessionTracking !== 'boolean') {
        this.errors.push('sessionMapping.enableSessionTracking must be a boolean');
      }
    }

    if (sessionMapping.persistMapping !== undefined) {
      if (typeof sessionMapping.persistMapping !== 'boolean') {
        this.errors.push('sessionMapping.persistMapping must be a boolean');
      }
    }

    const validBackends = ['memory', 'file', 'database'];
    if (sessionMapping.mappingBackend !== undefined) {
      if (!validBackends.includes(sessionMapping.mappingBackend)) {
        this.errors.push(
          `sessionMapping.mappingBackend must be one of: ${validBackends.join(', ')}`
        );
      }
    }
  }

  private isValidVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/.test(version);
  }

  private validateEntrypoint(entrypoint: string): void {
    if (!entrypoint) {
      this.errors.push('Entrypoint cannot be empty');
      return;
    }

    // In Node.js environment, check if file exists
    try {
      // Use dynamic require to avoid hard dependency
      const fs = require('fs');
      if (!fs.existsSync(entrypoint)) {
        this.errors.push(`Entrypoint file not found: ${entrypoint}`);
      }
    } catch (e) {
      // If fs is not available, just warn
      this.warnings.push(`Could not verify entrypoint existence: ${entrypoint}`);
    }
  }
}

// Default manifest
export const DEFAULT_MANIFEST: WaylandManifest = {
  apiVersion: 'cic.wayland/v1',
  kind: 'CICForeman',
  metadata: {
    name: 'cic_foreman',
    version: '1.0.0',
    description: 'CIC ↔ Wayland Integration Layer (WIL) — Foreman orchestrates APR/CRO/MLA/CKG',
  },
  spec: {
    tools: [
      {
        name: 'shell',
        type: 'shell',
        description: 'Execute shell commands',
      },
      {
        name: 'file',
        type: 'file',
        description: 'Read, write, list files',
      },
      {
        name: 'model',
        type: 'model',
        description: 'Invoke language models',
      },
      {
        name: 'http',
        type: 'http',
        description: 'Make HTTP requests',
      },
      {
        name: 'browser',
        type: 'browser',
        description: 'Open URLs and search',
      },
    ],
    security: {
      shellDenyPatterns: ['^rm\\s+(-r|-f|--recursive|--force).*', '^dd\\s+', '^mkfs', '^(reboot|shutdown)'],
      fileRootBoundary: '/data',
      httpAllowDomains: ['localhost', 'internal', 'github.com'],
      modelMaxTokens: 100000,
      browserDenyPatterns: ['^exec', '^system', '^bash', '^cmd'],
    },
    sessionMapping: {
      enableSessionTracking: true,
      persistMapping: true,
      mappingBackend: 'memory',
    },
  },
};
