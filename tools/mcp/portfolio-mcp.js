#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "fs";
import path from "path";
import https from "https";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: "C:\\dev\\rewrite-mcp\\projects\\cic\\ingestion\\.env" });

// Initialize MCP server
const server = new McpServer({
  name: "portfolio-mcp",
  version: "1.0.0"
});

// ============================================================================
// Data Loading & Caching
// ============================================================================

const dataDir = path.join(__dirname, "portfolio-data");
const quoteCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function loadJSON(filename) {
  const filepath = path.join(dataDir, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Data file not found: ${filename}`);
  }
  return JSON.parse(fs.readFileSync(filepath, "utf8"));
}

function loadCSV(filename) {
  const filepath = path.join(dataDir, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Data file not found: ${filename}`);
  }
  const content = fs.readFileSync(filepath, "utf8");
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return headers.reduce((obj, header, i) => {
      obj[header.trim()] = values[i]?.trim();
      return obj;
    }, {});
  });
}

async function fetchQuote(symbol) {
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY not set");
  }

  return new Promise((resolve, reject) => {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            quoteCache.set(symbol, { data: parsed, timestamp: Date.now() });
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

// ============================================================================
// Tool: Get Portfolio Summary
// ============================================================================

const GetPortfolioSchema = z.object({});

server.registerTool(
  "get_portfolio",
  {
    title: "Get Portfolio Summary",
    description: "Returns complete portfolio summary including holdings, pension, and Social Security",
    inputSchema: GetPortfolioSchema,
    annotations: {
      readOnlyHint: true
    }
  },
  async () => {
    try {
      const holdings = loadCSV("fidelity-holdings.csv");
      const pension = loadJSON("pension.json");
      const socialSecurity = loadJSON("social-security.json");

      let totalLiquid = 0;
      const holdingsWithPrices = await Promise.all(
        holdings.map(async (h) => {
          const quote = await fetchQuote(h.symbol);
          const value = parseFloat(h.shares) * (quote.c || 0);
          totalLiquid += value;
          return {
            symbol: h.symbol,
            shares: parseFloat(h.shares),
            costBasis: parseFloat(h.costBasis),
            currentPrice: quote.c || 0,
            currentValue: value
          };
        })
      );

      const pensionPV = (pension.monthlyBenefit || 0) * 12 * 25;
      const ssPV = (socialSecurity.monthlyBenefit || 0) * 12 * 25;

      const output = {
        totalLiquid: Math.round(totalLiquid * 100) / 100,
        totalPension: pensionPV,
        totalSocialSecurity: ssPV,
        totalNetWorth: Math.round((totalLiquid + pensionPV + ssPV) * 100) / 100,
        holdingsCount: holdings.length,
        asOf: new Date().toISOString()
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
      };
    }
  }
);

// ============================================================================
// Tool: Get Holdings
// ============================================================================

server.registerTool(
  "get_holdings",
  {
    title: "Get Holdings",
    description: "Returns detailed holdings information with current prices",
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true
    }
  },
  async () => {
    try {
      const holdings = loadCSV("fidelity-holdings.csv");
      const holdingsWithPrices = await Promise.all(
        holdings.map(async (h) => {
          const quote = await fetchQuote(h.symbol);
          return {
            symbol: h.symbol,
            shares: parseFloat(h.shares),
            costBasis: parseFloat(h.costBasis),
            currentPrice: quote.c || 0,
            currentValue: parseFloat(h.shares) * (quote.c || 0)
          };
        })
      );

      return {
        content: [{ type: "text", text: JSON.stringify(holdingsWithPrices, null, 2) }],
        structuredContent: { holdings: holdingsWithPrices, count: holdingsWithPrices.length }
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
      };
    }
  }
);

// ============================================================================
// Tool: Get Pension
// ============================================================================

server.registerTool(
  "get_pension",
  {
    title: "Get Pension Details",
    description: "Returns pension plan details and benefit amounts",
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true
    }
  },
  async () => {
    try {
      const pension = loadJSON("pension.json");
      return {
        content: [{ type: "text", text: JSON.stringify(pension, null, 2) }],
        structuredContent: pension
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
      };
    }
  }
);

// ============================================================================
// Tool: Get Social Security
// ============================================================================

server.registerTool(
  "get_social_security",
  {
    title: "Get Social Security Details",
    description: "Returns Social Security benefit information",
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true
    }
  },
  async () => {
    try {
      const socialSecurity = loadJSON("social-security.json");
      return {
        content: [{ type: "text", text: JSON.stringify(socialSecurity, null, 2) }],
        structuredContent: socialSecurity
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
      };
    }
  }
);

// ============================================================================
// Tool: Refresh Quotes
// ============================================================================

server.registerTool(
  "refresh_quotes",
  {
    title: "Refresh Stock Quotes",
    description: "Clears quote cache and fetches fresh prices for all holdings",
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true
    }
  },
  async () => {
    try {
      quoteCache.clear();
      const holdings = loadCSV("fidelity-holdings.csv");
      const symbols = holdings.map((h) => h.symbol);

      const quotes = {};
      for (const symbol of symbols) {
        try {
          quotes[symbol] = await fetchQuote(symbol);
        } catch (e) {
          quotes[symbol] = { error: e instanceof Error ? e.message : String(e) };
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(quotes, null, 2) }],
        structuredContent: { quotes, refreshed: new Date().toISOString() }
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
      };
    }
  }
);

// ============================================================================
// Tool: Reload Data
// ============================================================================

server.registerTool(
  "reload_data",
  {
    title: "Reload Data Files",
    description: "Reloads all portfolio data files from disk",
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true
    }
  },
  async () => {
    try {
      const holdings = loadCSV("fidelity-holdings.csv");
      const pension = loadJSON("pension.json");
      const socialSecurity = loadJSON("social-security.json");

      const output = {
        holdings: {
          count: holdings.length,
          totalCostBasis: holdings.reduce((sum, h) => sum + parseFloat(h.costBasis), 0)
        },
        pension: {
          monthlyBenefit: pension.monthlyBenefit,
          presentValue: pension.presentValue
        },
        socialSecurity: {
          monthlyBenefit: socialSecurity.monthlyBenefit,
          presentValue: socialSecurity.presentValue
        },
        reloaded: new Date().toISOString()
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
      };
    }
  }
);

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Portfolio MCP server running");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
