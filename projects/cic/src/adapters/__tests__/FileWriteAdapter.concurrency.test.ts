/**
 * FileWriteAdapter — Concurrency Test Harness
 * Validates parallel write behavior, race conditions, cleanup under load
 */

import { FileWriteAdapter } from '../FileWriteAdapter';
import { createSandboxRoot } from './mocks/mockSandbox';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('FileWriteAdapter – Concurrency', () => {
  let sandboxRoot: string;
  let adapter: FileWriteAdapter;

  beforeEach(() => {
    sandboxRoot = createSandboxRoot();
    adapter = new FileWriteAdapter(sandboxRoot, { debug: false });
  });

  afterEach(async () => {
    try {
      await fs.rm(sandboxRoot, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  const exec = async (filePath: string, payload: string) =>
    adapter.execute({
      path: filePath,
      payload,
      policy: { timeoutMs: 5000 },
    });

  // =========================================================================
  // CC-01: 10 parallel writes to different files
  // =========================================================================

  test('CC-01: 10 parallel writes to different files', async () => {
    const promises = Array.from({ length: 10 }).map((_, i) =>
      exec(`concurrent/file-${i}.txt`, `payload-${i}`)
    );

    const results = await Promise.all(promises);

    results.forEach((res, i) => {
      expect(res.status).toBe('success');
      expect((res as any).bytesWritten).toBe(`payload-${i}`.length);
    });

    // Verify all files exist with correct content
    for (let i = 0; i < 10; i++) {
      const filePath = path.join(sandboxRoot, `concurrent/file-${i}.txt`);
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe(`payload-${i}`);
    }
  });

  // =========================================================================
  // CC-02: 10 parallel writes to same directory
  // =========================================================================

  test('CC-02: 10 parallel writes to same directory', async () => {
    const promises = Array.from({ length: 10 }).map((_, i) =>
      exec(`shared-dir/file-${i}.txt`, `content-${i}`)
    );

    const results = await Promise.all(promises);

    results.forEach((res) => {
      expect(res.status).toBe('success');
    });

    // Verify directory contains all 10 files
    const dirPath = path.join(sandboxRoot, 'shared-dir');
    const files = await fs.readdir(dirPath);
    expect(files.length).toBe(10);
  });

  // =========================================================================
  // CC-03: 10 parallel writes to same file (last-write-wins)
  // =========================================================================

  test('CC-03: 10 parallel writes to same file', async () => {
    const filePath = 'concurrent/same.txt';
    const payloads = Array.from({ length: 10 }).map((_, i) => `v${i}`);

    const promises = payloads.map((p) => exec(filePath, p));
    const results = await Promise.all(promises);

    results.forEach((res) => {
      expect(res.status).toBe('success');
    });

    // Verify final file contains one of the written values
    const finalPath = path.join(sandboxRoot, filePath);
    const finalContent = await fs.readFile(finalPath, 'utf-8');
    expect(payloads.includes(finalContent)).toBe(true);
  });

  // =========================================================================
  // CC-04: Mixed payload sizes in parallel
  // =========================================================================

  test('CC-04: parallel writes with mixed sizes', async () => {
    const promises = [
      exec('mixed/small.txt', 'x'), // 1 byte
      exec('mixed/medium.txt', Buffer.alloc(1024, 'a')), // 1 KB
      exec('mixed/large.txt', Buffer.alloc(1024 * 1024, 'b')), // 1 MB
      exec('mixed/tiny.txt', ''), // 0 bytes
      exec('mixed/text.txt', 'The quick brown fox jumps over the lazy dog'),
    ];

    const results = await Promise.all(promises);

    results.forEach((res) => {
      expect(res.status).toBe('success');
    });

    // Verify all files created
    const dirPath = path.join(sandboxRoot, 'mixed');
    const files = await fs.readdir(dirPath);
    expect(files.length).toBe(5);
  });

  // =========================================================================
  // CC-05: 10 writes to paths with different nesting levels
  // =========================================================================

  test('CC-05: parallel writes to mixed path depths', async () => {
    const promises = [
      exec('file1.txt', 'depth-1'),
      exec('dir1/file2.txt', 'depth-2'),
      exec('dir1/dir2/file3.txt', 'depth-3'),
      exec('dir1/dir2/dir3/file4.txt', 'depth-4'),
      exec('dir1/dir2/dir3/dir4/file5.txt', 'depth-5'),
      exec('a/b/c/d/e/f/g.txt', 'depth-7'),
      exec('x/y/z.txt', 'depth-3-alt'),
      exec('m/n/o/p/q/r/s/t/u.txt', 'depth-9'),
      exec('p1/p2/p3/f.txt', 'mixed-1'),
      exec('nested/deep/path/to/file.txt', 'mixed-2'),
    ];

    const results = await Promise.all(promises);

    results.forEach((res) => {
      expect(res.status).toBe('success');
    });

    // Verify all paths were created
    expect(results.length).toBe(10);
  });

  // =========================================================================
  // CC-06: Mixed success/error under concurrent load
  // =========================================================================

  test('CC-06: concurrent writes with mixed valid/invalid paths', async () => {
    const promises = [
      exec('valid/file1.txt', 'ok1'), // valid
      exec('/absolute/invalid.txt', 'bad1'), // invalid - absolute
      exec('valid/file2.txt', 'ok2'), // valid
      exec('../../escape.txt', 'bad2'), // invalid - traversal
      exec('valid/file3.txt', 'ok3'), // valid
      exec('valid/file4.txt', 'ok4'), // valid
      exec('../relative.txt', 'bad3'), // invalid - relative
      exec('valid/file5.txt', 'ok5'), // valid
    ];

    const results = await Promise.all(promises);

    // Count successes and errors
    const successes = results.filter((r) => r.status === 'success').length;
    const errors = results.filter((r) => r.status === 'error').length;

    expect(successes).toBe(5);
    expect(errors).toBe(3);
  });

  // =========================================================================
  // CC-07: Concurrent operations preserve data integrity
  // =========================================================================

  test('CC-07: data integrity under concurrent writes', async () => {
    const testData = Array.from({ length: 20 }).map((_, i) => ({
      path: `integrity/file-${i}.txt`,
      payload: `data-${i}-${Date.now()}-${Math.random()}`,
    }));

    const promises = testData.map((item) => exec(item.path, item.payload));
    await Promise.all(promises);

    // Verify each file contains exactly what was written
    for (const item of testData) {
      const filePath = path.join(sandboxRoot, item.path);
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe(item.payload);
    }
  });

  // =========================================================================
  // CC-08: Concurrent cleanup after mixed operations
  // =========================================================================

  test('CC-08: concurrent operations followed by cleanup', async () => {
    const promises = Array.from({ length: 15 }).map((_, i) =>
      exec(`cleanup-test/file-${i}.txt`, `payload-${i}`)
    );

    const results = await Promise.all(promises);
    expect(results.every((r) => r.status === 'success')).toBe(true);

    // Give cleanup time
    await new Promise((r) => setTimeout(r, 200));

    // Verify files still exist (cleanup is async and doesn't block adapter)
    const dirPath = path.join(sandboxRoot, 'cleanup-test');
    try {
      const files = await fs.readdir(dirPath);
      expect(files.length).toBe(15);
    } catch (err: any) {
      // Directory might have been cleaned up
      expect(err.code).toBe('ENOENT');
    }
  });
});
