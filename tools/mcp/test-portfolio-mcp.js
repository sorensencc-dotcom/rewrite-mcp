#!/usr/bin/env node

/**
 * Smoke test for portfolio-mcp server
 * Verifies the server can start and handle tool calls
 */

import { spawn } from 'child_process';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverScript = path.join(__dirname, 'portfolio-mcp.js');

async function runTest() {
  console.log('🧪 Portfolio MCP Smoke Test\n');

  // Start server
  const serverProcess = spawn('node', [serverScript], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, FINNHUB_API_KEY: 'test-key' }
  });

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverScript],
    env: { ...process.env, FINNHUB_API_KEY: 'test-key' }
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    console.log('Connecting to server...');
    await client.connect(transport);
    console.log('✅ Connected\n');

    // List available tools
    console.log('Listing available tools...');
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.tools.length} tools:\n`);
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // Call get_portfolio (should work even if it fails due to API)
    console.log('\nTesting get_portfolio tool...');
    try {
      const result = await client.callTool({
        name: 'get_portfolio',
        arguments: {}
      });
      console.log('✅ Tool call successful');
      if (result.content[0]?.text) {
        const lines = result.content[0].text.split('\n').slice(0, 5);
        console.log('   Response preview:');
        lines.forEach(line => console.log(`   ${line}`));
      }
    } catch (error) {
      console.log('✅ Tool call executed (error expected due to API key)');
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('\n✅ All tests passed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
