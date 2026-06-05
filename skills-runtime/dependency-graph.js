// Skill Runtime — Dependency Graph Module
// Manages skill dependencies and detects cycles

const dependencyMap = {
  "cic-section-summarizer": [],
  "agent-drift-detector": ["environment-diagnostics"],
  "rewrite-labs-orchestrator": ["operator-grade-procedures"],
  "environment-diagnostics": [],
  "session-boundary-manager": [],
  "cic-roadmap-updater": ["cic-section-summarizer"],
  "operator-grade-procedures": [],
  "web-regression": ["operator-grade-procedures"],
  "research-capture": [],
  "treatment-update": ["operator-grade-procedures"],
  "doc-update": ["operator-grade-procedures"],
  "docs-sync-release": ["doc-update"],
  "approvals-audit": ["research-capture"]
};

export function getDependencies(skillName) {
  return dependencyMap[skillName] || [];
}

export function hasDependencies(skillName) {
  const deps = getDependencies(skillName);
  return deps.length > 0;
}

export function getTransitiveDependencies(skillName, visited = new Set()) {
  if (visited.has(skillName)) {
    return [];
  }
  visited.add(skillName);

  const deps = getDependencies(skillName);
  const transitiveDeps = [];

  for (const dep of deps) {
    transitiveDeps.push(dep);
    transitiveDeps.push(...getTransitiveDependencies(dep, visited));
  }

  return [...new Set(transitiveDeps)];
}

export function detectCycles() {
  const visited = new Set();
  const recursionStack = new Set();

  function hasCycle(skillName) {
    visited.add(skillName);
    recursionStack.add(skillName);

    const deps = getDependencies(skillName);
    for (const dep of deps) {
      if (!visited.has(dep)) {
        if (hasCycle(dep)) {
          return true;
        }
      } else if (recursionStack.has(dep)) {
        return true;
      }
    }

    recursionStack.delete(skillName);
    return false;
  }

  for (const skillName of Object.keys(dependencyMap)) {
    if (!visited.has(skillName) && hasCycle(skillName)) {
      return true;
    }
  }
  return false;
}

export function validateDependencies(skillName) {
  const deps = getDependencies(skillName);
  const missing = [];

  for (const dep of deps) {
    if (!(dep in dependencyMap)) {
      missing.push(dep);
    }
  }

  return {
    skillName,
    dependencies: deps,
    missingDependencies: missing,
    isValid: missing.length === 0
  };
}

export function getTopologicalOrder() {
  const visited = new Set();
  const order = [];

  function visit(skillName) {
    if (visited.has(skillName)) return;
    visited.add(skillName);

    const deps = getDependencies(skillName);
    for (const dep of deps) {
      visit(dep);
    }
    order.push(skillName);
  }

  for (const skillName of Object.keys(dependencyMap)) {
    visit(skillName);
  }

  return order;
}

export function exportDependencyGraph() {
  return {
    dependencies: dependencyMap,
    hasCycles: detectCycles(),
    topologicalOrder: getTopologicalOrder()
  };
}
