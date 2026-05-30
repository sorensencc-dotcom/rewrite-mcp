/**
 * projects/cic/src/linking/entity-resolver.ts
 * Entity normalization, alias resolution, and stable identity resolution with persistence and lineage.
 */

import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { SemanticEntity, EntityLineageEntry } from "../harvester/extractors/v2/extractor-v2.types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRegistryPath = path.resolve(__dirname, "../../data/entity-registry.json");

export function canonicalizeName(name: string): string {
  let cleaned = name.trim().replace(/\s+/g, " ");
  // Handle "Last, First [Middle]" formatting
  if (cleaned.includes(",")) {
    const parts = cleaned.split(",").map(p => p.trim());
    if (parts.length === 2) {
      // Standardize as "First Last"
      cleaned = `${parts[1]} ${parts[0]}`;
    }
  }
  return cleaned;
}

export function getComparisonKey(name: string): string {
  return canonicalizeName(name)
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getLevenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[len1][len2];
}

export function getStringSimilarity(s1: string, s2: string): number {
  const d = getLevenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0;
  return 1.0 - d / maxLength;
}

export class EntityResolver {
  private registry: Map<string, SemanticEntity> = new Map();
  private aliasMap: Map<string, string> = new Map();

  constructor() {
    if (typeof process !== "undefined" && !process.env.VITEST) {
      this.load();
    }
  }

  load(filePath: string = defaultRegistryPath): void {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      
      this.registry.clear();
      this.aliasMap.clear();

      if (data.registry) {
        for (const [id, entity] of Object.entries(data.registry)) {
          this.registry.set(id, entity as SemanticEntity);
        }
      }
      if (data.aliasMap) {
        for (const [aliasKey, id] of Object.entries(data.aliasMap)) {
          this.aliasMap.set(aliasKey, id as string);
        }
      }
    } catch (err: any) {
      console.error(`[EntityResolver] Failed to load registry from ${filePath}:`, err.message);
    }
  }

  save(filePath: string = defaultRegistryPath): void {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        registry: Object.fromEntries(this.registry.entries()),
        aliasMap: Object.fromEntries(this.aliasMap.entries())
      };

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err: any) {
      console.error(`[EntityResolver] Failed to save registry to ${filePath}:`, err.message);
    }
  }

  resolve(raw: { name: string; type: string; context?: string; confidence?: number; docId?: string }): SemanticEntity {
    // Normalize type string to fit the SemanticEntity type definition
    let resolvedType: "PEOPLE" | "PLACES" | "EVENTS" | "ARTIFACTS" = "ARTIFACTS";
    const typeUpper = raw.type.toUpperCase();
    if (typeUpper === "PEOPLE" || typeUpper === "PERSON") {
      resolvedType = "PEOPLE";
    } else if (typeUpper === "PLACES" || typeUpper === "PLACE" || typeUpper === "LOCATION") {
      resolvedType = "PLACES";
    } else if (typeUpper === "EVENTS" || typeUpper === "EVENT") {
      resolvedType = "EVENTS";
    } else {
      resolvedType = "ARTIFACTS";
    }

    const canonicalName = canonicalizeName(raw.name);
    const compKey = getComparisonKey(canonicalName);
    const aliasKey = `${compKey}:${resolvedType}`;

    // 1. Direct alias check (scoped by type)
    if (this.aliasMap.has(aliasKey)) {
      const id = this.aliasMap.get(aliasKey)!;
      const canonical = this.registry.get(id)!;
      
      let enriched = false;
      if (raw.context && !canonical.context.includes(raw.context)) {
        canonical.context += " " + raw.context;
        enriched = true;
        if (!canonical.lineage) canonical.lineage = [];
        canonical.lineage.push({
          timestamp: new Date().toISOString(),
          docId: raw.docId || "ingest_unknown",
          action: "context_enriched",
          contextAdded: raw.context
        });
      }
      if (!enriched) {
        if (!canonical.lineage) canonical.lineage = [];
        canonical.lineage.push({
          timestamp: new Date().toISOString(),
          docId: raw.docId || "ingest_unknown",
          action: "merged_alias",
          originalName: raw.name
        });
      }
      return canonical;
    }

    // 2. Similarity check against existing registry
    for (const existing of this.registry.values()) {
      if (existing.type !== resolvedType) continue;

      const existingCompKey = getComparisonKey(existing.name);
      const sim = getStringSimilarity(compKey, existingCompKey);

      // Substring match threshold
      const isSub = (compKey.length >= 5 && existingCompKey.length >= 5) &&
                    (compKey.includes(existingCompKey) || existingCompKey.includes(compKey));

      // Token overlap check for PEOPLE
      let tokenMatch = false;
      if (resolvedType === "PEOPLE") {
        const words1 = compKey.split(/\s+/).filter(w => w.length > 2);
        const words2 = existingCompKey.split(/\s+/).filter(w => w.length > 2);
        const commonWords = words1.filter(w => words2.includes(w));
        if (commonWords.length >= 2) {
          tokenMatch = true;
        }
      }

      if (sim >= 0.8 || isSub || tokenMatch) {
        this.aliasMap.set(aliasKey, existing.id);
        
        let enriched = false;
        if (canonicalName.length > existing.name.length) {
          const oldName = existing.name;
          existing.name = canonicalName;
          enriched = true;
          if (!existing.lineage) existing.lineage = [];
          existing.lineage.push({
            timestamp: new Date().toISOString(),
            docId: raw.docId || "ingest_unknown",
            action: "name_updated",
            originalName: oldName
          });
        }
        if (raw.context && !existing.context.includes(raw.context)) {
          existing.context += " " + raw.context;
          enriched = true;
          if (!existing.lineage) existing.lineage = [];
          existing.lineage.push({
            timestamp: new Date().toISOString(),
            docId: raw.docId || "ingest_unknown",
            action: "context_enriched",
            contextAdded: raw.context
          });
        }
        if (!enriched) {
          if (!existing.lineage) existing.lineage = [];
          existing.lineage.push({
            timestamp: new Date().toISOString(),
            docId: raw.docId || "ingest_unknown",
            action: "merged_alias",
            originalName: raw.name
          });
        }
        return existing;
      }
    }

    // 3. Create new canonical entity with a stable ID
    const hash = crypto
      .createHash("sha256")
      .update(`${canonicalName.toLowerCase()}:${resolvedType}`)
      .digest("hex")
      .slice(0, 16);
    const entityId = `ent_${hash}`;

    const lineage: EntityLineageEntry[] = [{
      timestamp: new Date().toISOString(),
      docId: raw.docId || "ingest_unknown",
      action: "created",
      originalName: raw.name
    }];

    const newEntity: SemanticEntity = {
      id: entityId,
      name: canonicalName,
      type: resolvedType,
      context: raw.context || "",
      confidence: raw.confidence ?? 1.0,
      lineage
    };

    this.registry.set(entityId, newEntity);
    this.aliasMap.set(aliasKey, entityId);
    return newEntity;
  }

  getCanonicalEntities(): SemanticEntity[] {
    return Array.from(this.registry.values());
  }

  clear(): void {
    this.registry.clear();
    this.aliasMap.clear();
  }
}

export const entityResolver = new EntityResolver();
