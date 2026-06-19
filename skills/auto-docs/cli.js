#!/usr/bin/env node

import { autoDocs } from './index.js';

async function main() {
  try {
    const result = await autoDocs();

    if (result.success) {
      console.log('\n✓ Auto-docs completed');
      if (result.results?.git?.committed) {
        console.log(`  Commit: ${result.results.git.hash}`);
      }
      if (result.results?.docs?.length) {
        console.log(`  Updated: ${result.results.docs.length} docs`);
      }
      process.exit(0);
    } else {
      console.error('\n✗ Auto-docs failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
