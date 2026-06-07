#!/usr/bin/env node
import { sessionWrap } from "../skills/session-wrap/index.js";

async function main() {
  const args = process.argv.slice(2);

  // Parse command line args as JSON
  let input = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];

    if (key === 'commitMessage' || key === 'summary') {
      input[key] = value;
    } else if (key === 'docUpdates') {
      try {
        input[key] = JSON.parse(value);
      } catch {
        input[key] = [];
      }
    }
  }

  if (!input.commitMessage) {
    console.error('Error: --commitMessage is required');
    process.exit(1);
  }

  try {
    const result = await sessionWrap(input);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
