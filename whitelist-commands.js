#!/usr/bin/env node

import { ApprovalHandler } from './skills-runtime/approval-handler.js';

const handler = new ApprovalHandler();

// 5 common commands to whitelist as manually approved
const commandsToWhitelist = [
  { cmd: 'npm run policy:check', reason: 'Check policy compliance' },
  { cmd: 'npm run policy:report', reason: 'Generate policy report' },
  { cmd: 'npm run release:full', reason: 'Full release pipeline' },
  { cmd: 'npm run doc:drift', reason: 'Check documentation drift' },
  { cmd: 'npm run gh-actions:check', reason: 'Check GitHub Actions compliance' }
];

console.log('\n✅ Whitelisting 5 manual approval commands\n');

for (const { cmd, reason } of commandsToWhitelist) {
  const result = handler.approveCommand(cmd, reason);
  console.log(`  [OK] ${cmd}`);
  console.log(`       → ${result.status}\n`);
}

// Get summary
const summary = handler.getSummary();
console.log('\n📈 Updated Approval Summary:\n');
console.log(`  Pre-Approved Count:    ${summary.stats.preApprovedCount}`);
console.log(`  Pending Review:        ${summary.stats.pendingCount}`);
console.log(`  Manually Approved:     ${summary.stats.manuallyApproved}`);
console.log(`  Auto-Promoted:         ${summary.stats.autoPromoted}`);
console.log(`  Total Requests:        ${summary.stats.totalRequests}`);
console.log(`  Auto-Promotion Rate:   ${summary.stats.autoPromotionRate}\n`);

console.log('✅ Whitelist saved to approvals-manifest.json\n');
