/**
 * Replay Reporter - Formats simulation results into a human-readable report.
 */

export class ReplayReporter {
  /**
   * Formats the simulation result.
   * 
   * @param {Object} memoId 
   * @param {Object} result Simulation result from ReplaySimulator
   * @returns {string} Formatted report
   */
  report(memoId, result) {
    if (result.status === 'SKIPPED_NO_PRIMARY_TAG') {
      return `=== REPLAY REPORT: Memo ${memoId} ===\n\n[!] Status: SKIPPED (No primary tag found)\n\n=== END REPORT ===`;
    }

    let report = `=== REPLAY REPORT: Memo ${memoId} ===\n\n`;

    // 1. Routing
    report += `[1] Routing Decision\n`;
    report += `    - Routed to: ${result.routing.length > 0 ? result.routing.join(', ') : 'None'}\n\n`;

    // 2. Task Extraction
    if (result.task) {
      report += `[2] Task Extraction\n`;
      report += `    - Title: "${result.task.title}"\n`;
      report += `    - Due: ${result.task.due || 'None'}\n`;
      report += `    - Priority: ${result.task.priority}\n`;
      report += `    - Source Tag: ${result.task.tags.find(t => t.startsWith('memos-source-'))}\n`;
      report += `    - Would Create: ${result.task.wouldCreate ? 'YES' : 'NO (already exists)'}\n\n`;
    } else {
      report += `[2] Task Extraction\n`;
      report += `    - Status: Not a task\n\n`;
    }

    // 3. Idea Clustering
    if (result.idea) {
      report += `[3] Idea Clustering\n`;
      report += `    - Cluster: ${result.idea.cluster}\n`;
      report += `    - Title: "${result.idea.title}"\n`;
      report += `    - Would Create: ${result.idea.wouldCreate ? 'YES' : 'NO (already exists)'}\n\n`;
    } else {
      report += `[3] Idea Clustering\n`;
      report += `    - Status: Not an idea\n\n`;
    }

    // 4. Digest Inclusion
    report += `[4] Digest Inclusion\n`;
    report += `    - Would appear in digest for: ${result.event.createdAt.split('T')[0]}\n`;
    report += `    - Sections: ${result.digest.sections.join(', ')}\n\n`;

    report += `=== END REPORT ===`;

    return report;
  }
}
