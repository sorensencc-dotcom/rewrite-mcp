/**
 * FileRecord
 * Represents file metadata passed to analyzers
 */

export interface FileRecord {
  id: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  extractedAt?: string;
  tags?: string[];
}
