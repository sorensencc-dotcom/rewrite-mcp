import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { ForemanManifest } from './types.js';

export interface LoaderOptions {
  basePath?: string;
  strict?: boolean;
}

export class ForemanLoader {
  private basePath: string;
  private strict: boolean;

  constructor(options: LoaderOptions = {}) {
    this.basePath = options.basePath || process.cwd();
    this.strict = options.strict !== false;
  }

  async load(manifestPath: string): Promise<ForemanManifest> {
    const fullPath = path.resolve(this.basePath, manifestPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Foreman manifest not found: ${fullPath}`);
    }

    let manifest: ForemanManifest;

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      manifest = YAML.parse(content) as ForemanManifest;
    } catch (err: any) {
      throw new Error(`Failed to parse Foreman manifest: ${err.message}`);
    }

    if (this.strict) {
      this.validate(manifest);
    }

    return manifest;
  }

  private validate(manifest: ForemanManifest): void {
    const errors: string[] = [];

    if (!manifest.version) {
      errors.push('Missing required field: version');
    }

    if (!manifest.name) {
      errors.push('Missing required field: name');
    }

    if (!Array.isArray(manifest.agents)) {
      errors.push('Missing required field: agents (must be array)');
    } else {
      manifest.agents.forEach((agent, idx) => {
        if (!agent.id) errors.push(`agents[${idx}].id is required`);
        if (!agent.name) errors.push(`agents[${idx}].name is required`);
        if (!agent.type) errors.push(`agents[${idx}].type is required`);
      });
    }

    if (!Array.isArray(manifest.adapters)) {
      errors.push('Missing required field: adapters (must be array)');
    } else {
      manifest.adapters.forEach((adapter, idx) => {
        if (!adapter.id) errors.push(`adapters[${idx}].id is required`);
        if (!adapter.type) errors.push(`adapters[${idx}].type is required`);
      });
    }

    if (errors.length > 0) {
      throw new Error(`Manifest validation failed:\n${errors.join('\n')}`);
    }
  }
}
