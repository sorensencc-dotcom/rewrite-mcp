"use strict";
// File: projects/cic/src/mee/self-refactor/static-analysis.ts | Date: 2026-06-03 | v1.1.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticAnalysisEngine = void 0;
const typescript_1 = __importDefault(require("typescript"));
const node_crypto_1 = __importDefault(require("node:crypto"));
class StaticAnalysisEngine {
    analyzeFile(filePath, source) {
        const insights = [];
        const ast = typescript_1.default.createSourceFile(filePath, source, typescript_1.default.ScriptTarget.Latest, true);
        // 1. Cyclomatic Complexity & nesting check
        let complexity = 0;
        let nestingDepth = 0;
        let maxNestingDepth = 0;
        const visit = (node) => {
            let isNestingNode = false;
            if (typescript_1.default.isIfStatement(node) ||
                typescript_1.default.isForStatement(node) ||
                typescript_1.default.isForInStatement(node) ||
                typescript_1.default.isForOfStatement(node) ||
                typescript_1.default.isWhileStatement(node) ||
                typescript_1.default.isDoStatement(node) ||
                typescript_1.default.isConditionalExpression(node) ||
                typescript_1.default.isCaseClause(node) ||
                typescript_1.default.isCatchClause(node)) {
                complexity++;
                isNestingNode = true;
                nestingDepth++;
                if (nestingDepth > maxNestingDepth) {
                    maxNestingDepth = nestingDepth;
                }
            }
            // Check function length here
            if (typescript_1.default.isFunctionDeclaration(node) || typescript_1.default.isMethodDeclaration(node) || typescript_1.default.isArrowFunction(node)) {
                const start = node.getStart(ast);
                const end = node.getEnd();
                const funcSource = source.substring(start, end);
                const funcLines = funcSource.split(/\r?\n/).length;
                if (funcLines > 50) {
                    const funcName = node.name ? node.name.text : "anonymous function";
                    const startLine = ast.getLineAndCharacterOfPosition(start).line + 1;
                    const endLine = ast.getLineAndCharacterOfPosition(end).line + 1;
                    insights.push({
                        id: node_crypto_1.default.randomUUID(),
                        file: filePath,
                        type: "long_function",
                        message: `Long function '${funcName}' detected: ${funcLines} lines`,
                        severity: "medium",
                        location: { startLine, endLine },
                        metadata: { linesCount: funcLines, functionName: funcName }
                    });
                }
            }
            typescript_1.default.forEachChild(node, visit);
            if (isNestingNode) {
                nestingDepth--;
            }
        };
        visit(ast);
        if (complexity > 20) {
            insights.push({
                id: node_crypto_1.default.randomUUID(),
                file: filePath,
                type: "complexity",
                message: `High cyclomatic complexity: ${complexity}`,
                severity: "high",
                metadata: { complexity }
            });
        }
        else if (complexity > 10) {
            insights.push({
                id: node_crypto_1.default.randomUUID(),
                file: filePath,
                type: "complexity",
                message: `Moderate cyclomatic complexity: ${complexity}`,
                severity: "medium",
                metadata: { complexity }
            });
        }
        if (maxNestingDepth > 4) {
            insights.push({
                id: node_crypto_1.default.randomUUID(),
                file: filePath,
                type: "complexity",
                message: `Deep control flow nesting detected: ${maxNestingDepth} levels`,
                severity: "medium",
                metadata: { maxNestingDepth }
            });
        }
        // LOC (Lines of Code) check
        const lines = source.split(/\r?\n/);
        if (lines.length > 500) {
            insights.push({
                id: node_crypto_1.default.randomUUID(),
                file: filePath,
                type: "large_module",
                message: `Oversized module: ${lines.length} lines of code`,
                severity: "medium",
                metadata: { linesCount: lines.length }
            });
        }
        // 2. Dead Code & Unused Imports Heuristics
        const declaredLocals = new Set();
        const importedLocals = new Set();
        const referencedLocals = new Set();
        const exportedNames = new Set();
        const analyzeUnused = (node) => {
            // Find variable declarations
            if (typescript_1.default.isVariableDeclaration(node) && typescript_1.default.isIdentifier(node.name)) {
                const name = node.name.text;
                let isExported = false;
                let parent = node.parent;
                while (parent) {
                    if (typescript_1.default.isVariableStatement(parent)) {
                        const modifiers = typescript_1.default.canHaveModifiers(parent) ? typescript_1.default.getModifiers(parent) : undefined;
                        if (modifiers && modifiers.some(m => m.kind === typescript_1.default.SyntaxKind.ExportKeyword)) {
                            isExported = true;
                        }
                        break;
                    }
                    parent = parent.parent;
                }
                if (isExported) {
                    exportedNames.add(name);
                }
                else {
                    declaredLocals.add(name);
                }
            }
            // Find local function declarations
            if (typescript_1.default.isFunctionDeclaration(node) && node.name && typescript_1.default.isIdentifier(node.name)) {
                const name = node.name.text;
                const modifiers = typescript_1.default.canHaveModifiers(node) ? typescript_1.default.getModifiers(node) : undefined;
                const isExported = modifiers && modifiers.some(m => m.kind === typescript_1.default.SyntaxKind.ExportKeyword);
                if (isExported) {
                    exportedNames.add(name);
                }
                else {
                    declaredLocals.add(name);
                }
            }
            // Find class declarations
            if (typescript_1.default.isClassDeclaration(node) && node.name && typescript_1.default.isIdentifier(node.name)) {
                const name = node.name.text;
                const modifiers = typescript_1.default.canHaveModifiers(node) ? typescript_1.default.getModifiers(node) : undefined;
                const isExported = modifiers && modifiers.some(m => m.kind === typescript_1.default.SyntaxKind.ExportKeyword);
                if (isExported) {
                    exportedNames.add(name);
                }
                else {
                    declaredLocals.add(name);
                }
            }
            // Find imports
            if (typescript_1.default.isImportSpecifier(node)) {
                importedLocals.add(node.name.text);
            }
            else if (typescript_1.default.isImportClause(node) && node.name) {
                importedLocals.add(node.name.text);
            }
            else if (typescript_1.default.isNamespaceImport(node)) {
                importedLocals.add(node.name.text);
            }
            // Find references
            if (typescript_1.default.isIdentifier(node)) {
                const name = node.text;
                let isRef = true;
                if (node.parent) {
                    if (typescript_1.default.isPropertyAccessExpression(node.parent) && node.parent.name === node) {
                        isRef = false;
                    }
                    if (typescript_1.default.isVariableDeclaration(node.parent) && node.parent.name === node) {
                        isRef = false;
                    }
                    if (typescript_1.default.isFunctionDeclaration(node.parent) && node.parent.name === node) {
                        isRef = false;
                    }
                    if (typescript_1.default.isClassDeclaration(node.parent) && node.parent.name === node) {
                        isRef = false;
                    }
                    if (typescript_1.default.isImportSpecifier(node.parent) && node.parent.name === node) {
                        isRef = false;
                    }
                    if (typescript_1.default.isImportClause(node.parent) && node.parent.name === node) {
                        isRef = false;
                    }
                }
                if (isRef) {
                    referencedLocals.add(name);
                }
            }
            typescript_1.default.forEachChild(node, analyzeUnused);
        };
        analyzeUnused(ast);
        // Find declared locals that are never referenced
        for (const local of declaredLocals) {
            if (!referencedLocals.has(local) && !exportedNames.has(local)) {
                insights.push({
                    id: node_crypto_1.default.randomUUID(),
                    file: filePath,
                    type: "dead_code",
                    message: `Unused local declaration: '${local}'`,
                    severity: "low",
                    metadata: { identifier: local }
                });
            }
        }
        // Find imported locals that are never referenced
        for (const imported of importedLocals) {
            if (!referencedLocals.has(imported)) {
                insights.push({
                    id: node_crypto_1.default.randomUUID(),
                    file: filePath,
                    type: "unused_import",
                    message: `Unused import specifier: '${imported}'`,
                    severity: "low",
                    metadata: { identifier: imported }
                });
            }
        }
        // 3. Duplicate Code Heuristics
        const normalizedLines = lines.map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith("//") && !line.startsWith("/*"));
        const minChunkLines = 6;
        const lineHashes = new Map();
        for (let i = 0; i <= normalizedLines.length - minChunkLines; i++) {
            const chunk = normalizedLines.slice(i, i + minChunkLines).join("\n");
            const hash = node_crypto_1.default.createHash("md5").update(chunk).digest("hex");
            if (!lineHashes.has(hash)) {
                lineHashes.set(hash, []);
            }
            lineHashes.get(hash).push(i);
        }
        const duplicatedIndexes = new Set();
        for (const [hash, occurrences] of lineHashes.entries()) {
            if (occurrences.length > 1) {
                occurrences.forEach(idx => duplicatedIndexes.add(idx));
            }
        }
        if (duplicatedIndexes.size > 0) {
            insights.push({
                id: node_crypto_1.default.randomUUID(),
                file: filePath,
                type: "duplication",
                message: `Duplicate code blocks detected in module (${duplicatedIndexes.size} similar windows)`,
                severity: "medium",
                metadata: { duplicateWindows: duplicatedIndexes.size }
            });
        }
        // 4. Architectural Drift
        const visitImports = (node) => {
            if (typescript_1.default.isImportDeclaration(node) && typescript_1.default.isStringLiteral(node.moduleSpecifier)) {
                const importPath = node.moduleSpecifier.text;
                const isUiFile = filePath.includes("/ui/") || filePath.includes("\\ui\\");
                const importsUi = importPath.includes("/ui/") || importPath.includes("../ui");
                if (!isUiFile && importsUi) {
                    insights.push({
                        id: node_crypto_1.default.randomUUID(),
                        file: filePath,
                        type: "drift",
                        message: `Architectural boundary violation: logic module imports UI code '${importPath}'`,
                        severity: "critical",
                        metadata: { importPath }
                    });
                }
                const isMeeCore = filePath.includes("/mee/") || filePath.includes("\\mee\\");
                if (isMeeCore) {
                    const importsForbidden = importPath.includes("/cro/") || importPath.includes("/apr/");
                    if (importsForbidden) {
                        insights.push({
                            id: node_crypto_1.default.randomUUID(),
                            file: filePath,
                            type: "drift",
                            message: `Architectural boundary warning: MEE module depends on peer execution/planning module '${importPath}'`,
                            severity: "medium",
                            metadata: { importPath }
                        });
                    }
                }
            }
            typescript_1.default.forEachChild(node, visitImports);
        };
        visitImports(ast);
        return insights;
    }
}
exports.StaticAnalysisEngine = StaticAnalysisEngine;
//# sourceMappingURL=static-analysis.js.map