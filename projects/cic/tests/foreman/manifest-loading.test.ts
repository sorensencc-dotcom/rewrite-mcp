import { test, expect, describe } from 'vitest';
import { Foreman, ForemanLoader } from '../../src/foreman/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');

describe('Phase 28.2 — Foreman Manifest Loading', () => {
  test('ForemanLoader parses valid YAML manifest', async () => {
    const loader = new ForemanLoader({ basePath: projectRoot });
    const manifest = await loader.load('cic_foreman.agent.yaml');

    expect(manifest.version).toBe('1.0.0');
    expect(manifest.name).toContain('CIC');
    expect(manifest.agents).toBeDefined();
    expect(manifest.adapters).toBeDefined();
    expect(manifest.skills).toBeDefined();
  });

  test('Foreman initializes agents from manifest', async () => {
    const foreman = new Foreman({ basePath: projectRoot });
    await foreman.startup('cic_foreman.agent.yaml');

    const agents = foreman.getAgents();
    expect(agents.length).toBeGreaterThan(0);
    expect(agents.some(a => a.id === 'agent:cro-executor')).toBe(true);
    expect(agents.some(a => a.type === 'executor')).toBe(true);
  });

  test('Foreman initializes adapters from manifest', async () => {
    const foreman = new Foreman({ basePath: projectRoot });
    await foreman.startup('cic_foreman.agent.yaml');

    const adapters = foreman.getAdapters();
    expect(adapters.length).toBeGreaterThan(0);
    expect(adapters.some(a => a.id === 'adapter:shell')).toBe(true);
    expect(adapters.some(a => a.type === 'file')).toBe(true);
  });

  test('Foreman initializes skills and maps to agents', async () => {
    const foreman = new Foreman({ basePath: projectRoot });
    await foreman.startup('cic_foreman.agent.yaml');

    const skills = foreman.getSkills();
    expect(skills.length).toBeGreaterThan(0);
    expect(skills.some(s => s.id === 'skill:list-files')).toBe(true);
    expect(skills.every(s => skills.find(ag => ag.id === s.id))).toBe(true);
  });

  test('Foreman retrieves individual agents by ID', async () => {
    const foreman = new Foreman({ basePath: projectRoot });
    await foreman.startup('cic_foreman.agent.yaml');

    const executor = foreman.getAgent('agent:cro-executor');
    expect(executor).toBeDefined();
    expect(executor?.type).toBe('executor');
    expect(executor?.enabled).toBe(true);
  });

  test('Foreman retrieves individual adapters by ID', async () => {
    const foreman = new Foreman({ basePath: projectRoot });
    await foreman.startup('cic_foreman.agent.yaml');

    const shellAdapter = foreman.getAdapter('adapter:shell');
    expect(shellAdapter).toBeDefined();
    expect(shellAdapter?.type).toBe('shell');
    expect(shellAdapter?.config?.allowedCommands).toBeDefined();
  });

  test('Foreman retrieves security policies', async () => {
    const foreman = new Foreman({ basePath: projectRoot });
    await foreman.startup('cic_foreman.agent.yaml');

    const defaultPolicy = foreman.getSecurityPolicy('policy:default');
    expect(defaultPolicy).toBeDefined();
    expect(defaultPolicy?.rules.length).toBeGreaterThan(0);
    expect(defaultPolicy?.rules.some(r => r.adapter === 'adapter:shell')).toBe(true);
  });

  test('Foreman retrieves task templates', async () => {
    const foreman = new Foreman({ basePath: projectRoot });
    await foreman.startup('cic_foreman.agent.yaml');

    const auditTemplate = foreman.getTaskTemplate('template:audit-log');
    expect(auditTemplate).toBeDefined();
    expect(auditTemplate?.operations.length).toBeGreaterThan(0);
  });

  test('Foreman reports ready status after initialization', async () => {
    const foreman = new Foreman({ basePath: projectRoot });
    expect(foreman.isReady()).toBe(false);

    await foreman.startup('cic_foreman.agent.yaml');
    expect(foreman.isReady()).toBe(true);
  });

  test('Foreman respects enabled flag for agents and adapters', async () => {
    const foreman = new Foreman({ basePath: projectRoot });
    await foreman.startup('cic_foreman.agent.yaml');

    const agents = foreman.getAgents();
    expect(agents.every(a => a.enabled !== false)).toBe(true);

    const adapters = foreman.getAdapters();
    expect(adapters.every(a => a.enabled !== false)).toBe(true);
  });

  test('Foreman exposes loaded manifest via getManifest()', async () => {
    const foreman = new Foreman({ basePath: projectRoot });
    await foreman.startup('cic_foreman.agent.yaml');

    const manifest = foreman.getManifest();
    expect(manifest?.metadata?.environment).toBe('production');
    expect(manifest?.metadata?.tags).toContain('wayland-integrated');
  });
});
