import { test } from 'node:test';
import * as assert from 'node:assert';
import { ManifestValidator } from '../manifest/WaylandManifest';

test('WIL ManifestValidator — valid manifest', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    apiVersion: 'cic.wayland/v1',
    kind: 'CICForeman',
    metadata: {
      name: 'cic_foreman',
      version: '1.0.0',
      description: 'CIC Wayland Integration Layer',
    },
    spec: {
      entrypoint: 'dist/runtime/foreman.js',
      tools: [
        { name: 'shell', type: 'shell', description: 'Shell commands' },
        { name: 'file', type: 'file', description: 'File operations' },
        { name: 'model', type: 'model', description: 'Model invocation' },
        { name: 'http', type: 'http', description: 'HTTP requests' },
        { name: 'browser', type: 'browser', description: 'Browser operations' },
      ],
      security: {
        shell: { allowedCommands: ['ls'], deniedPatterns: ['^rm\\s+'] },
        file: { allowedRoots: ['./docs'] },
        http: { allowedDomains: ['github.com'] },
        model: { maxTokens: 50000 },
      },
      sessionMapping: {
        enableSessionTracking: true,
        persistMapping: true,
        mappingBackend: 'memory',
      },
    },
  };

  const result = validator.validate(manifest, false);
  assert.strictEqual(result.valid, true, 'Valid manifest should pass');
  assert.strictEqual(result.errors.length, 0, 'No errors expected');
});

test('WIL ManifestValidator — missing agent name', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    apiVersion: 'cic.wayland/v1',
    kind: 'CICForeman',
    metadata: {
      version: '1.0.0',
    },
    spec: {
      tools: [
        { name: 'shell', type: 'shell' },
        { name: 'file', type: 'file' },
        { name: 'model', type: 'model' },
        { name: 'http', type: 'http' },
        { name: 'browser', type: 'browser' },
      ],
    },
  };

  const result = validator.validate(manifest, false);
  assert.strictEqual(result.valid, false, 'Missing agent name should fail');
  assert.ok(
    result.errors.some((e) => e.includes('name')),
    'Should report missing name'
  );
});

test('WIL ManifestValidator — missing tools', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    apiVersion: 'cic.wayland/v1',
    kind: 'CICForeman',
    metadata: {
      name: 'cic_foreman',
      version: '1.0.0',
    },
    spec: {
      tools: [],
    },
  };

  const result = validator.validate(manifest, false);
  assert.strictEqual(result.valid, false, 'Empty tools should fail');
  assert.ok(
    result.errors.some((e) => e.includes('required adapter')),
    'Should report missing required adapters'
  );
});

test('WIL ManifestValidator — unsupported tool type', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    apiVersion: 'cic.wayland/v1',
    kind: 'CICForeman',
    metadata: {
      name: 'cic_foreman',
      version: '1.0.0',
    },
    spec: {
      tools: [
        { name: 'shell', type: 'shell' },
        { name: 'file', type: 'file' },
        { name: 'model', type: 'model' },
        { name: 'http', type: 'http' },
        { name: 'browser', type: 'browser' },
        { name: 'bad', type: 'unsupported' },
      ],
    },
  };

  const result = validator.validate(manifest, false);
  assert.strictEqual(result.valid, false, 'Unsupported tool type should fail');
  assert.ok(
    result.errors.some((e) => e.includes('invalid type')),
    'Should report invalid type'
  );
});

test('WIL ManifestValidator — missing required adapters', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    apiVersion: 'cic.wayland/v1',
    kind: 'CICForeman',
    metadata: {
      name: 'cic_foreman',
      version: '1.0.0',
    },
    spec: {
      tools: [
        { name: 'shell', type: 'shell' },
        { name: 'file', type: 'file' },
      ],
    },
  };

  const result = validator.validate(manifest, false);
  assert.strictEqual(result.valid, false, 'Missing required adapters should fail');
  assert.ok(
    result.errors.some((e) => e.includes('required adapter')),
    'Should report missing adapters'
  );
});

test('WIL ManifestValidator — invalid security config', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    apiVersion: 'cic.wayland/v1',
    kind: 'CICForeman',
    metadata: {
      name: 'cic_foreman',
      version: '1.0.0',
    },
    spec: {
      tools: [
        { name: 'shell', type: 'shell' },
        { name: 'file', type: 'file' },
        { name: 'model', type: 'model' },
        { name: 'http', type: 'http' },
        { name: 'browser', type: 'browser' },
      ],
      security: {
        model: {
          maxTokens: -100,
        },
      },
    },
  };

  const result = validator.validate(manifest, false);
  assert.strictEqual(result.valid, false, 'Invalid security config should fail');
  assert.ok(
    result.errors.some((e) => e.includes('maxTokens')),
    'Should report invalid token limit'
  );
});

test('WIL ManifestValidator — invalid session mapping', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    apiVersion: 'cic.wayland/v1',
    kind: 'CICForeman',
    metadata: {
      name: 'cic_foreman',
      version: '1.0.0',
    },
    spec: {
      tools: [
        { name: 'shell', type: 'shell' },
        { name: 'file', type: 'file' },
        { name: 'model', type: 'model' },
        { name: 'http', type: 'http' },
        { name: 'browser', type: 'browser' },
      ],
      sessionMapping: {
        enableSessionTracking: 'not-a-boolean',
        mappingBackend: 'invalid',
      },
    },
  };

  const result = validator.validate(manifest, false);
  assert.strictEqual(result.valid, false, 'Invalid session mapping should fail');
  assert.ok(
    result.errors.some((e) => e.includes('boolean') || e.includes('mappingBackend')),
    'Should report invalid session mapping'
  );
});

test('WIL ManifestValidator — empty manifest', async () => {
  const validator = new ManifestValidator();
  const result = validator.validate({}, false);

  assert.strictEqual(result.valid, false, 'Empty manifest should be invalid');
  assert.ok(result.errors.length > 0, 'Should have errors');
});
