#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: 'C:\\dev\\rewrite-mcp\\projects\\cic\\ingestion\\.env' });

// Quote cache (5 min TTL)
const quoteCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// Data directory
const dataDir = path.join(__dirname, 'portfolio-data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load data files
function loadData(filename) {
  const filepath = path.join(dataDir, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Data file not found: ${filename}`);
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function loadCSV(filename) {
  const filepath = path.join(dataDir, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Data file not found: ${filename}`);
  }
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, i) => {
      obj[header.trim()] = values[i]?.trim();
      return obj;
    }, {});
  });
}

// Fetch stock quotes from Finnhub
async function fetchQuote(symbol) {
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error('FINNHUB_API_KEY not set in .env');
  }

  return new Promise((resolve, reject) => {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const cached = { data: parsed, timestamp: Date.now() };
          quoteCache.set(symbol, cached);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Tool: Get full portfolio summary
async function getPortfolio() {
  const holdings = loadCSV('fidelity-holdings.csv');
  const pension = loadData('pension.json');
  const socialSecurity = loadData('social-security.json');

  let holdingValue = 0;
  const holdingsWithQuotes = await Promise.all(
    holdings.map(async (h) => {
      const quote = await fetchQuote(h.symbol);
      const value = parseFloat(h.shares) * (quote.c || 0);
      holdingValue += value;
      return { ...h, currentPrice: quote.c, currentValue: value };
    })
  );

  const pensionPV = (pension.monthlyBenefit || 0) * 12 * 25;
  const ssPV = (socialSecurity.monthlyBenefit || 0) * 12 * 25;

  return {
    totalLiquid: holdingValue,
    totalPension: pensionPV,
    totalSS: ssPV,
    totalNetWorth: holdingValue + pensionPV + ssPV,
    holdings: holdingsWithQuotes,
    pension,
    socialSecurity,
    asOf: new Date().toISOString()
  };
}

// Tool: Get holdings only
async function getHoldings() {
  const holdings = loadCSV('fidelity-holdings.csv');
  return await Promise.all(
    holdings.map(async (h) => {
      const quote = await fetchQuote(h.symbol);
      return {
        symbol: h.symbol,
        shares: parseFloat(h.shares),
        costBasis: parseFloat(h.costBasis),
        currentPrice: quote.c,
        currentValue: parseFloat(h.shares) * (quote.c || 0)
      };
    })
  );
}

// Tool: Get pension details
function getPension() {
  return loadData('pension.json');
}

// Tool: Get Social Security details
function getSocialSecurity() {
  return loadData('social-security.json');
}

// Tool: Refresh stock quotes
async function refreshQuotes() {
  quoteCache.clear();
  const holdings = loadCSV('fidelity-holdings.csv');
  const symbols = holdings.map(h => h.symbol);

  const quotes = {};
  for (const symbol of symbols) {
    try {
      quotes[symbol] = await fetchQuote(symbol);
    } catch (e) {
      quotes[symbol] = { error: e.message };
    }
  }
  return { refreshed: new Date().toISOString(), quotes };
}

// Tool: Reload all data files
function reloadData() {
  try {
    const holdings = loadCSV('fidelity-holdings.csv');
    const pension = loadData('pension.json');
    const socialSecurity = loadData('social-security.json');
    return {
      holdings: holdings.length,
      pension: pension.monthlyBenefit,
      socialSecurity: socialSecurity.monthlyBenefit,
      reloaded: new Date().toISOString()
    };
  } catch (e) {
    return { error: e.message };
  }
}

// Simple MCP Server (stdio-based)
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const tools = {
    'get-portfolio': getPortfolio,
    'get-holdings': getHoldings,
    'get-pension': getPension,
    'get-social-security': getSocialSecurity,
    'refresh-quotes': refreshQuotes,
    'reload-data': reloadData
  };

  rl.on('line', async (line) => {
    try {
      const request = JSON.parse(line);
      const toolName = request.method?.split('/')?.pop();
      const tool = tools[toolName];

      if (!tool) {
        console.log(JSON.stringify({ error: `Unknown tool: ${toolName}` }));
        return;
      }

      const result = await tool();
      console.log(JSON.stringify({ result }));
    } catch (e) {
      console.log(JSON.stringify({ error: e.message }));
    }
  });
}

main().catch(console.error);
