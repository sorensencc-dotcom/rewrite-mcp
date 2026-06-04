import fs from "node:fs";
import path from "node:path";

export function loadSnapshot(testPath: string): string | null {
  if (!fs.existsSync(testPath)) return null;
  return fs.readFileSync(testPath, "utf8");
}

export function saveSnapshot(testPath: string, content: string): void {
  fs.mkdirSync(path.dirname(testPath), { recursive: true });
  fs.writeFileSync(testPath, content, "utf8");
}

export function snapshotExists(testPath: string): boolean {
  return fs.existsSync(testPath);
}
