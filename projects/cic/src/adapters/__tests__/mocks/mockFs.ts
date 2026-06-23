/**
 * Mock FS Harness for Phase 27.3 Testing
 * In-memory file/dir store with deterministic behavior
 */

export interface MockFs {
  writeFileSync(path: string, data: Buffer | string): void;
  readFileSync(path: string, encoding?: BufferEncoding): string;
  mkdirSync(path: string, opts?: { recursive?: boolean }): void;
  existsSync(path: string): boolean;
  unlinkSync(path: string): void;
  rmdirSync(path: string, opts?: { recursive?: boolean }): void;
  statSync(path: string): { size: number; isFile(): boolean; isDirectory(): boolean };

  // Test helpers
  __setWriteDelayMs(ms: number): void;
  __existsUnderSandbox(root: string): boolean;
  __getAllFiles(): string[];
}

export function createMockFs(): MockFs {
  const files = new Map<string, Buffer>();
  const dirs = new Set<string>();
  let writeDelayMs = 0;

  const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/+/g, '/');

  const busyWait = (ms: number) => {
    const start = Date.now();
    while (Date.now() - start < ms) {
      // Deterministic busy-wait for timeout testing
    }
  };

  return {
    writeFileSync(filePath, data) {
      const p = normalize(filePath);
      if (writeDelayMs > 0) {
        busyWait(writeDelayMs);
      }
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as string);
      files.set(p, buf);
      const dir = p.split('/').slice(0, -1).join('/');
      if (dir) {
        dirs.add(dir);
      }
    },

    readFileSync(filePath, encoding = 'utf8') {
      const p = normalize(filePath);
      const buf = files.get(p);
      if (!buf) {
        const err = new Error(`ENOENT: ${p}`);
        (err as any).code = 'ENOENT';
        throw err;
      }
      return buf.toString(encoding);
    },

    mkdirSync(dirPath, opts) {
      const p = normalize(dirPath);
      dirs.add(p);
    },

    existsSync(filePath) {
      const p = normalize(filePath);
      return files.has(p) || dirs.has(p);
    },

    unlinkSync(filePath) {
      const p = normalize(filePath);
      files.delete(p);
    },

    rmdirSync(dirPath, opts) {
      const p = normalize(dirPath);
      dirs.forEach((d) => {
        if (d.startsWith(p)) {
          dirs.delete(d);
        }
      });
      files.forEach((_, f) => {
        if (f.startsWith(p)) {
          files.delete(f);
        }
      });
    },

    statSync(filePath) {
      const p = normalize(filePath);
      const buf = files.get(p);
      if (!buf) {
        const err = new Error(`ENOENT: ${p}`);
        (err as any).code = 'ENOENT';
        throw err;
      }
      return {
        size: buf.length,
        isFile: () => true,
        isDirectory: () => false,
      };
    },

    __setWriteDelayMs(ms: number) {
      writeDelayMs = ms;
    },

    __existsUnderSandbox(root: string) {
      const r = normalize(root);
      for (const f of files.keys()) {
        if (f.startsWith(r)) return true;
      }
      for (const d of dirs.values()) {
        if (d.startsWith(r)) return true;
      }
      return false;
    },

    __getAllFiles() {
      return Array.from(files.keys());
    },
  };
}
