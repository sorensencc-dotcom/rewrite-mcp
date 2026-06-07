#!/usr/bin/env node
const path = require('path');
// Adjust path to load .env from the root of the rewrite-mcp project
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { loadData } = require('../src/ops/loader');
const { evaluateHealth } = require('../src/ops/status');
const { formatToHuman, formatToJson, formatToRaw } = require('../src/ops/formatter');

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const flags = args.slice(1);

    if (command !== 'status') {
        console.error("Unknown command. Usage: cic-ops status [--json | --raw]");
        process.exit(1);
    }

    try {
        const data = await loadData();
        const health = evaluateHealth(data);

        if (flags.includes('--json')) {
            console.log(formatToJson(data, health));
        } else if (flags.includes('--raw')) {
            console.log(formatToRaw(data));
        } else {
            console.log(formatToHuman(data, health));
        }

        process.exit(health.exitCode);

    } catch (error) {
        console.error("Failed to run command:", error);
        process.exit(2);
    }
}

main();
