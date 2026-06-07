// File: bob/core/graph/dependencyGraph.js | Date: 2026-05-31 | v1.0.0

/**
 * Builds the build dependency graph linking markdown spec files to target generation pipelines.
 * 
 * @param {Object} ast - Unified parsed spec AST from markdownParser.
 * @returns {Promise<Object>} Dependency graph: { [filePath]: Array<string> }
 */
export async function buildDependencyGraph(ast = {}) {
  const graph = {};

  for (const file of Object.keys(ast)) {
    if (file.includes('playbooks') || file.includes('playbook')) {
      graph[file] = ['playbooks', 'tests', 'docs'];
    } else if (file.includes('task.md') || file.includes('task')) {
      graph[file] = ['modules', 'tests', 'docs'];
    } else if (file.includes('/api/') || file.includes('api-route') || file.includes('server')) {
      graph[file] = ['routes', 'tests', 'docs'];
    } else if (file.includes('config')) {
      graph[file] = ['configs', 'docs'];
    } else {
      // General docs sync fallback
      graph[file] = ['docs'];
    }
  }

  return graph;
}

/**
 * Resolves which pipelines are affected by a specific file mutation.
 * 
 * @param {Object} graph - Precomputed dependency graph from buildDependencyGraph()
 * @param {Object} diff - Delta representation: { changedFile }
 * @returns {Array<string>} Affected pipeline names.
 */
export function getAffectedPipelines(graph = {}, diff = null) {
  if (!diff || !diff.changedFile) {
    // If no specific file is provided, rebuild all pipelines
    return ['modules', 'tests', 'playbooks', 'routes', 'configs', 'docs'];
  }

  const { changedFile } = diff;
  const normalizedFile = changedFile.replace(/\\/g, '/');

  // Exact match first
  if (graph[normalizedFile]) {
    return graph[normalizedFile];
  }

  // Substring path matching fallback
  for (const [filePattern, pipelines] of Object.entries(graph)) {
    if (normalizedFile.includes(filePattern) || filePattern.includes(normalizedFile)) {
      return pipelines;
    }
  }

  // Safe defaults based on standard subfolders if not tracked in the active AST graph
  if (normalizedFile.includes('playbooks/')) {
    return ['playbooks', 'tests', 'docs'];
  }
  if (normalizedFile.includes('task.md')) {
    return ['modules', 'tests', 'docs'];
  }
  if (normalizedFile.includes('server/') || normalizedFile.includes('api/')) {
    return ['routes', 'tests', 'docs'];
  }
  if (normalizedFile.includes('config/')) {
    return ['configs', 'docs'];
  }

  return ['docs']; // Simple docs sync fallback
}

export default {
  buildDependencyGraph,
  getAffectedPipelines
};
