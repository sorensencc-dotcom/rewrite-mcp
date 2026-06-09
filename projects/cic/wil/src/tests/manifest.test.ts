import { test } from 'node:test';
import * as assert from 'node:assert';
import { ManifestValidator, DEFAULT_MANIFEST } from '../manifest/WaylandManifest';

test('ManifestValidator — valid manifest', async () => {
  const validator = new ManifestValidator();
  const result = validator.validate(DEFAULT_MANIFEST);

  assert.strictEqual(result.valid, true, 'Default manifest should be valid');
  assert.strictEqual(result.errors.length, 0, 'Should have no errors');
});

test('ManifestValidator — missing metadata', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    apiVersion: 'cic.wayland/v1',
    kind: 'CICForeman',
  };

  const result = validator.validate(manifest);
  assert.strictEqual(result.valid, false, 'Manifest without metadata should be invalid');
  assert.ok(
    result.errors.some((e) => e.includes('metadata')),
    'Should report missing metadata'
  );
});

test('ManifestValidator — invalid apiVersion', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    ...DEFAULT_MANIFEST,
    apiVersion: 'invalid/v2',
  };

  const result = validator.validate(manifest);
  assert.ok(
    result.warnings.some((w) => w.includes('apiVersion')),
    'Should warn about non-standard apiVersion'
  );
});

test('ManifestValidator — invalid kind', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    ...DEFAULT_MANIFEST,
    kind: 'NotCICForeman',
  };

  const result = validator.validate(manifest);
  assert.strictEqual(result.valid, false, 'Invalid kind should fail validation');
  assert.ok(
    result.errors.some((e) => e.includes('kind')),
    'Should report invalid kind'
  );
});

test('ManifestValidator — invalid version format', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    ...DEFAULT_MANIFEST,
    metadata: {
      ...DEFAULT_MANIFEST.metadata,
      version: 'not-semver',
    },
  };

  const result = validator.validate(manifest);
  assert.strictEqual(result.valid, false, 'Invalid version format should fail');
  assert.ok(
    result.errors.some((e) => e.includes('version')),
    'Should report invalid version'
  );
});

test('ManifestValidator — missing tools', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    ...DEFAULT_MANIFEST,
    spec: {
      security: {},
      sessionMapping: {},
    },
  };

  const result = validator.validate(manifest);
  assert.strictEqual(result.valid, false, 'Missing tools should fail');
  assert.ok(
    result.errors.some((e) => e.includes('tools')),
    'Should report missing tools'
  );
});

test('ManifestValidator — invalid tool type', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    ...DEFAULT_MANIFEST,
    spec: {
      ...DEFAULT_MANIFEST.spec,
      tools: [
        {
          name: 'badtool',
          type: 'invalid_type',
        },
      ],
    },
  };

  const result = validator.validate(manifest);
  assert.strictEqual(result.valid, false, 'Invalid tool type should fail');
  assert.ok(
    result.errors.some((e) => e.includes('type')),
    'Should report invalid type'
  );
});

test('ManifestValidator — duplicate tool names', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    ...DEFAULT_MANIFEST,
    spec: {
      ...DEFAULT_MANIFEST.spec,
      tools: [
        { name: 'duplicate', type: 'shell' },
        { name: 'duplicate', type: 'file' },
      ],
    },
  };

  const result = validator.validate(manifest);
  assert.strictEqual(result.valid, false, 'Duplicate tool names should fail');
  assert.ok(
    result.errors.some((e) => e.includes('duplicate')),
    'Should report duplicate names'
  );
});

test('ManifestValidator — missing required adapters', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    ...DEFAULT_MANIFEST,
    spec: {
      ...DEFAULT_MANIFEST.spec,
      tools: [{ name: 'shell', type: 'shell' }],
    },
  };

  const result = validator.validate(manifest);
  assert.strictEqual(result.valid, false, 'Missing required adapters should fail');
  assert.ok(
    result.errors.some((e) => e.includes('required adapter')),
    'Should report missing adapters'
  );
});

test('ManifestValidator — invalid shell deny patterns', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    ...DEFAULT_MANIFEST,
    spec: {
      ...DEFAULT_MANIFEST.spec,
      security: {
        ...DEFAULT_MANIFEST.spec.security,
        shellDenyPatterns: ['invalid(regex'],
      },
    },
  };

  const result = validator.validate(manifest);
  assert.strictEqual(result.valid, false, 'Invalid regex pattern should fail');
  assert.ok(
    result.errors.some((e) => e.includes('regex')),
    'Should report invalid regex'
  );
});

test('ManifestValidator — invalid modelMaxTokens', async () => {
  const validator = new ManifestValidator();

  // Non-number
  const manifest1 = {
    ...DEFAULT_MANIFEST,
    spec: {
      ...DEFAULT_MANIFEST.spec,
      security: {
        ...DEFAULT_MANIFEST.spec.security,
        modelMaxTokens: 'not-a-number',
      },
    },
  };

  let result = validator.validate(manifest1);
  assert.strictEqual(result.valid, false, 'Non-number modelMaxTokens should fail');

  // Zero
  const manifest2 = {
    ...DEFAULT_MANIFEST,
    spec: {
      ...DEFAULT_MANIFEST.spec,
      security: {
        ...DEFAULT_MANIFEST.spec.security,
        modelMaxTokens: 0,
      },
    },
  };

  result = validator.validate(manifest2);
  assert.strictEqual(result.valid, false, 'Zero modelMaxTokens should fail');

  // Negative
  const manifest3 = {
    ...DEFAULT_MANIFEST,
    spec: {
      ...DEFAULT_MANIFEST.spec,
      security: {
        ...DEFAULT_MANIFEST.spec.security,
        modelMaxTokens: -100,
      },
    },
  };

  result = validator.validate(manifest3);
  assert.strictEqual(result.valid, false, 'Negative modelMaxTokens should fail');

  // Valid positive
  const manifest4 = {
    ...DEFAULT_MANIFEST,
    spec: {
      ...DEFAULT_MANIFEST.spec,
      security: {
        ...DEFAULT_MANIFEST.spec.security,
        modelMaxTokens: 50000,
      },
    },
  };

  result = validator.validate(manifest4);
  assert.ok(result.valid, 'Positive modelMaxTokens should pass');
});

test('ManifestValidator — invalid sessionMapping', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    ...DEFAULT_MANIFEST,
    spec: {
      ...DEFAULT_MANIFEST.spec,
      sessionMapping: {
        enableSessionTracking: 'not-boolean',
        mappingBackend: 'invalid_backend',
      },
    },
  };

  const result = validator.validate(manifest);
  assert.strictEqual(result.valid, false, 'Invalid sessionMapping should fail');
  assert.ok(
    result.errors.some((e) => e.includes('boolean')),
    'Should report non-boolean enableSessionTracking'
  );
  assert.ok(
    result.errors.some((e) => e.includes('mappingBackend')),
    'Should report invalid mappingBackend'
  );
});

test('ManifestValidator — warnings for missing optional fields', async () => {
  const validator = new ManifestValidator();
  const manifest = {
    apiVersion: 'cic.wayland/v1',
    kind: 'CICForeman',
    metadata: {
      name: 'cic_foreman',
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

  const result = validator.validate(manifest);
  assert.ok(result.valid, 'Manifest without optional fields should still be valid');
  assert.ok(result.warnings.length > 0, 'Should have warnings for missing optional fields');
});

test('ManifestValidator — empty manifest', async () => {
  const validator = new ManifestValidator();
  const result = validator.validate({});

  assert.strictEqual(result.valid, false, 'Empty manifest should be invalid');
  assert.ok(
    result.errors.some((e) => e.includes('apiVersion')),
    'Should report missing apiVersion'
  );
});
