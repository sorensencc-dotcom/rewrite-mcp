// File: projects/cic/src/mee/self-refactor/static-analysis.ts | Date: 2026-06-03 | v1.1.0

import ts from "typescript";
import crypto from "node:crypto";
import { RefactorInsight } from "../mee-schema.js";

export class StaticAnalysisEngine {
  analyzeFile(filePath: string, source: string): RefactorInsight[] {
    const insights: RefactorInsight[] = [];

    const ast = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true
    );

    // 1. Cyclomatic Complexity & nesting check
    let complexity = 0;
    let nestingDepth = 0;
    let maxNestingDepth = 0;

    const visit = (node: ts.Node) => {
      let isNestingNode = false;
      if (
        ts.isIfStatement(node) ||
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isDoStatement(node) ||
        ts.isConditionalExpression(node) ||
        ts.isCaseClause(node) ||
        ts.isCatchClause(node)
      ) {
        complexity++;
        isNestingNode = true;
        nestingDepth++;
        if (nestingDepth > maxNestingDepth) {
          maxNestingDepth = nestingDepth;
        }
      }

      // Check function length here
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
        const start = node.getStart(ast);
        const end = node.getEnd();
        const funcSource = source.substring(start, end);
        const funcLines = funcSource.split(/\r?\n/).length;
        if (funcLines > 50) {
          const funcName = (node as any).name ? (node as any).name.text : "anonymous function";
          const startLine = ast.getLineAndCharacterOfPosition(start).line + 1;
          const endLine = ast.getLineAndCharacterOfPosition(end).line + 1;
          insights.push({
            id: crypto.randomUUID(),
            file: filePath,
            type: "long_function",
            message: `Long function '${funcName}' detected: ${funcLines} lines`,
            severity: "medium",
            location: { startLine, endLine },
            metadata: { linesCount: funcLines, functionName: funcName }
          });
        }
      }

      ts.forEachChild(node, visit);

      if (isNestingNode) {
        nestingDepth--;
      }
    };
    visit(ast);

    if (complexity > 20) {
      insights.push({
        id: crypto.randomUUID(),
        file: filePath,
        type: "complexity",
        message: `High cyclomatic complexity: ${complexity}`,
        severity: "high",
        metadata: { complexity }
      });
    } else if (complexity > 10) {
      insights.push({
        id: crypto.randomUUID(),
        file: filePath,
        type: "complexity",
        message: `Moderate cyclomatic complexity: ${complexity}`,
        severity: "medium",
        metadata: { complexity }
      });
    }

    if (maxNestingDepth > 4) {
      insights.push({
        id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
        file: filePath,
        type: "large_module",
        message: `Oversized module: ${lines.length} lines of code`,
        severity: "medium",
        metadata: { linesCount: lines.length }
      });
    }

    // 2. Dead Code & Unused Imports Heuristics
    const declaredLocals = new Set<string>();
    const importedLocals = new Set<string>();
    const referencedLocals = new Set<string>();
    const exportedNames = new Set<string>();

    const analyzeUnused = (node: ts.Node) => {
      // Find variable declarations
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        let isExported = false;
        let parent: ts.Node | undefined = node.parent;
        while (parent) {
          if (ts.isVariableStatement(parent)) {
            const modifiers = ts.canHaveModifiers(parent) ? ts.getModifiers(parent) : undefined;
            if (modifiers && modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
              isExported = true;
            }
            break;
          }
          parent = parent.parent;
        }
        if (isExported) {
          exportedNames.add(name);
        } else {
          declaredLocals.add(name);
        }
      }

      // Find local function declarations
      if (ts.isFunctionDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
        const isExported = modifiers && modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
        if (isExported) {
          exportedNames.add(name);
        } else {
          declaredLocals.add(name);
        }
      }

      // Find class declarations
      if (ts.isClassDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
        const isExported = modifiers && modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
        if (isExported) {
          exportedNames.add(name);
        } else {
          declaredLocals.add(name);
        }
      }

      // Find imports
      if (ts.isImportSpecifier(node)) {
        importedLocals.add(node.name.text);
      } else if (ts.isImportClause(node) && node.name) {
        importedLocals.add(node.name.text);
      } else if (ts.isNamespaceImport(node)) {
        importedLocals.add(node.name.text);
      }

      // Find references
      if (ts.isIdentifier(node)) {
        const name = node.text;
        let isRef = true;
        if (node.parent) {
          if (ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) {
            isRef = false;
          }
          if (ts.isVariableDeclaration(node.parent) && node.parent.name === node) {
            isRef = false;
          }
          if (ts.isFunctionDeclaration(node.parent) && node.parent.name === node) {
            isRef = false;
          }
          if (ts.isClassDeclaration(node.parent) && node.parent.name === node) {
            isRef = false;
          }
          if (ts.isImportSpecifier(node.parent) && node.parent.name === node) {
            isRef = false;
          }
          if (ts.isImportClause(node.parent) && node.parent.name === node) {
            isRef = false;
          }
        }
        if (isRef) {
          referencedLocals.add(name);
        }
      }

      ts.forEachChild(node, analyzeUnused);
    };
    analyzeUnused(ast);

    // Find declared locals that are never referenced
    for (const local of declaredLocals) {
      if (!referencedLocals.has(local) && !exportedNames.has(local)) {
        insights.push({
          id: crypto.randomUUID(),
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
          id: crypto.randomUUID(),
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
    const lineHashes = new Map<string, number[]>();

    for (let i = 0; i <= normalizedLines.length - minChunkLines; i++) {
      const chunk = normalizedLines.slice(i, i + minChunkLines).join("\n");
      const hash = crypto.createHash("md5").update(chunk).digest("hex");
      if (!lineHashes.has(hash)) {
        lineHashes.set(hash, []);
      }
      lineHashes.get(hash)!.push(i);
    }

    const duplicatedIndexes = new Set<number>();
    for (const [hash, occurrences] of lineHashes.entries()) {
      if (occurrences.length > 1) {
        occurrences.forEach(idx => duplicatedIndexes.add(idx));
      }
    }

    if (duplicatedIndexes.size > 0) {
      insights.push({
        id: crypto.randomUUID(),
        file: filePath,
        type: "duplication",
        message: `Duplicate code blocks detected in module (${duplicatedIndexes.size} similar windows)`,
        severity: "medium",
        metadata: { duplicateWindows: duplicatedIndexes.size }
      });
    }

    // 4. Architectural Drift
    const visitImports = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const importPath = node.moduleSpecifier.text;
        
        const isUiFile = filePath.includes("/ui/") || filePath.includes("\\ui\\");
        const importsUi = importPath.includes("/ui/") || importPath.includes("../ui");
        if (!isUiFile && importsUi) {
          insights.push({
            id: crypto.randomUUID(),
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
              id: crypto.randomUUID(),
              file: filePath,
              type: "drift",
              message: `Architectural boundary warning: MEE module depends on peer execution/planning module '${importPath}'`,
              severity: "medium",
              metadata: { importPath }
            });
          }
        }
      }
      ts.forEachChild(node, visitImports);
    };
    visitImports(ast);

    return insights;
  }
}
