"use strict";
// File: projects/cic/src/linking/entity-resolver.ts | Date: 2026-05-30 | v1.4.0
/**
 * Entity normalization, alias resolution, and stable identity resolution with persistence and lineage.
 * Scoped by tenant for Multi-Tenant Knowledge Fabric.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.entityResolver = exports.EntityResolver = void 0;
exports.canonicalizeName = canonicalizeName;
exports.getComparisonKey = getComparisonKey;
exports.getLevenshteinDistance = getLevenshteinDistance;
exports.getStringSimilarity = getStringSimilarity;
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const defaultRegistryPath = path_1.default.resolve(__dirname, "../../data/entity-registry.json");
function canonicalizeName(name) {
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
function getComparisonKey(name) {
    return canonicalizeName(name)
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}
function getLevenshteinDistance(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = [];
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
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j] + 1 // deletion
                );
            }
        }
    }
    return matrix[len1][len2];
}
function getStringSimilarity(s1, s2) {
    const d = getLevenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0)
        return 1.0;
    return 1.0 - d / maxLength;
}
class EntityResolver {
    constructor() {
        // Scoped structures: tenantId -> Map
        this.tenantRegistries = new Map();
        this.tenantAliasMaps = new Map();
        if (typeof process !== "undefined" && !process.env.VITEST) {
            this.load(undefined, "default");
        }
    }
    // Get or initialize registries for a tenant
    getRegistry(tenantId) {
        if (!this.tenantRegistries.has(tenantId)) {
            this.tenantRegistries.set(tenantId, new Map());
        }
        return this.tenantRegistries.get(tenantId);
    }
    getAliasMap(tenantId) {
        if (!this.tenantAliasMaps.has(tenantId)) {
            this.tenantAliasMaps.set(tenantId, new Map());
        }
        return this.tenantAliasMaps.get(tenantId);
    }
    getTenantPath(filePath, tenantId) {
        if (filePath)
            return filePath;
        if (tenantId === "default")
            return defaultRegistryPath;
        return path_1.default.resolve(__dirname, `../../data/tenants/${tenantId}/entity-registry.json`);
    }
    load(filePath, tenantId = "default") {
        const targetPath = this.getTenantPath(filePath, tenantId);
        try {
            if (!fs_1.default.existsSync(targetPath)) {
                return;
            }
            const raw = fs_1.default.readFileSync(targetPath, "utf-8");
            const data = JSON.parse(raw);
            const registry = this.getRegistry(tenantId);
            const aliasMap = this.getAliasMap(tenantId);
            registry.clear();
            aliasMap.clear();
            if (data.registry) {
                for (const [id, entity] of Object.entries(data.registry)) {
                    registry.set(id, entity);
                }
            }
            if (data.aliasMap) {
                for (const [aliasKey, id] of Object.entries(data.aliasMap)) {
                    aliasMap.set(aliasKey, id);
                }
            }
        }
        catch (err) {
            console.error(`[EntityResolver] Failed to load registry for tenant '${tenantId}' from ${targetPath}:`, err.message);
        }
    }
    save(filePath, tenantId = "default") {
        const targetPath = this.getTenantPath(filePath, tenantId);
        try {
            const dir = path_1.default.dirname(targetPath);
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            const registry = this.getRegistry(tenantId);
            const aliasMap = this.getAliasMap(tenantId);
            const data = {
                registry: Object.fromEntries(registry.entries()),
                aliasMap: Object.fromEntries(aliasMap.entries())
            };
            fs_1.default.writeFileSync(targetPath, JSON.stringify(data, null, 2), "utf-8");
        }
        catch (err) {
            console.error(`[EntityResolver] Failed to save registry for tenant '${tenantId}' to ${targetPath}:`, err.message);
        }
    }
    resolve(raw, tenantId = "default") {
        // Normalize type string to fit the SemanticEntity type definition
        let resolvedType = "ARTIFACTS";
        const typeUpper = raw.type.toUpperCase();
        if (typeUpper === "PEOPLE" || typeUpper === "PERSON") {
            resolvedType = "PEOPLE";
        }
        else if (typeUpper === "PLACES" || typeUpper === "PLACE" || typeUpper === "LOCATION") {
            resolvedType = "PLACES";
        }
        else if (typeUpper === "EVENTS" || typeUpper === "EVENT") {
            resolvedType = "EVENTS";
        }
        else {
            resolvedType = "ARTIFACTS";
        }
        const canonicalName = canonicalizeName(raw.name);
        const compKey = getComparisonKey(canonicalName);
        const aliasKey = `${compKey}:${resolvedType}`;
        const registry = this.getRegistry(tenantId);
        const aliasMap = this.getAliasMap(tenantId);
        // 1. Direct alias check (scoped by type)
        if (aliasMap.has(aliasKey)) {
            const id = aliasMap.get(aliasKey);
            const canonical = registry.get(id);
            let enriched = false;
            if (raw.context && !canonical.context.includes(raw.context)) {
                canonical.context += " " + raw.context;
                enriched = true;
                if (!canonical.lineage)
                    canonical.lineage = [];
                canonical.lineage.push({
                    timestamp: new Date().toISOString(),
                    docId: raw.docId || "ingest_unknown",
                    action: "context_enriched",
                    contextAdded: raw.context
                });
            }
            if (!enriched) {
                if (!canonical.lineage)
                    canonical.lineage = [];
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
        for (const existing of registry.values()) {
            if (existing.type !== resolvedType)
                continue;
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
                aliasMap.set(aliasKey, existing.id);
                let enriched = false;
                if (canonicalName.length > existing.name.length) {
                    const oldName = existing.name;
                    existing.name = canonicalName;
                    enriched = true;
                    if (!existing.lineage)
                        existing.lineage = [];
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
                    if (!existing.lineage)
                        existing.lineage = [];
                    existing.lineage.push({
                        timestamp: new Date().toISOString(),
                        docId: raw.docId || "ingest_unknown",
                        action: "context_enriched",
                        contextAdded: raw.context
                    });
                }
                if (!enriched) {
                    if (!existing.lineage)
                        existing.lineage = [];
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
        const hash = crypto_1.default
            .createHash("sha256")
            .update(`${compKey}:${resolvedType}`)
            .digest("hex")
            .slice(0, 16);
        const entityId = `ent_${hash}`;
        const lineage = [{
                timestamp: new Date().toISOString(),
                docId: raw.docId || "ingest_unknown",
                action: "created",
                originalName: raw.name
            }];
        const newEntity = {
            id: entityId,
            name: canonicalName,
            type: resolvedType,
            context: raw.context || "",
            confidence: raw.confidence ?? 1.0,
            lineage
        };
        registry.set(entityId, newEntity);
        aliasMap.set(aliasKey, entityId);
        return newEntity;
    }
    getCanonicalEntities(tenantId = "default") {
        return Array.from(this.getRegistry(tenantId).values());
    }
    clear(tenantId = "default") {
        this.getRegistry(tenantId).clear();
        this.getAliasMap(tenantId).clear();
    }
}
exports.EntityResolver = EntityResolver;
exports.entityResolver = new EntityResolver();
//# sourceMappingURL=entity-resolver.js.map