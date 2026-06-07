// Direct test of session-wrap skill
import { sessionWrap } from './skills/session-wrap/index.js';

const result = await sessionWrap({
  commitMessage: '[claude] Phase 47.1: Test session wrap',
  summary: 'Testing session wrap skill directly'
});

console.log(JSON.stringify(result, null, 2));
