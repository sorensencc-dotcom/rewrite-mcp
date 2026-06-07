// File: bob/core/build.js | Date: 2026-05-31 | v1.0.0

import { parseAllMarkdown } from './parser/markdownParser.js';
import { buildDependencyGraph, getAffectedPipelines } from './graph/dependencyGraph.js';

import { runModuleGenerator } from './pipelines/moduleGenerator.js';
import { runTestGenerator } from './pipelines/testGenerator.js';
import { runPlaybookGenerator } from './pipelines/playbookGenerator.js';
import { runRouteGenerator } from './pipelines/routeGenerator.js';
import { runConfigGenerator } from './pipelines/configGenerator.js';
import { runDocsSync } from './pipelines/docsSync.js';

import { runDriftCheck } from './validation/driftCheck.js';
import { writeHistoryEntry } from './audit/historyManager.js';

/**
 * Executes a BOB build cycle. Can be a full build or an incremental build based on a diff change.
 * 
 * @param {Object} [diff] - File change details: { changedFile }
 * @returns {Promise<boolean>} Success indicator.
 */
export async function runBuild(diff = null) {
  try {
    const ast = await parseAllMarkdown();
    const graph = await buildDependencyGraph(ast);

    // Resolve affected pipelines
    const pipelines = diff
      ? getAffectedPipelines(graph, diff)
      : ['modules', 'tests', 'playbooks', 'routes', 'configs', 'docs'];

    console.log(`[BOB Build] Active Pipelines: [${pipelines.join(', ')}]`);

    // Execute active pipelines
    if (pipelines.includes('modules')) await runModuleGenerator(ast);
    if (pipelines.includes('tests')) await runTestGenerator(ast);
    if (pipelines.includes('playbooks')) await runPlaybookGenerator(ast);
    if (pipelines.includes('routes')) await runRouteGenerator(ast);
    if (pipelines.includes('configs')) await runConfigGenerator(ast);
    if (pipelines.includes('docs')) await runDocsSync(ast);

    // Run drift check validation
    await runDriftCheck();

    // Log this build event in history logs
    await writeHistoryEntry({
      pipelines,
      changedFile: diff ? diff.changedFile : 'full-build',
      timestamp: Date.now()
    });

    return true;
  } catch (error) {
    console.error(`[BOB Build] Build cycle failed: ${error.message}`);
    return false;
  }
}

export default {
  runBuild
};
