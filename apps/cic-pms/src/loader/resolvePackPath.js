/**
 * pms/src/loader/resolvePackPath.js
 * 2026-05-18 v1.0.0
 */
import path from 'node:path';

export function resolvePackPath(basePath, packName, version) {
  const fileName = `${packName}_v${version.split('.')[0]}.json`;
  return path.resolve(basePath, fileName);
}