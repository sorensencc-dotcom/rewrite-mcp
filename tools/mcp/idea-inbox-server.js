#!/usr/bin/env node

import fs from "fs";
import path from "path";
import readline from "readline";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DATA_DIR = path.resolve(__dirname, "../../data/idea-inbox");
const INBOX_FILE = path.join(DATA_DIR, "inbox.json");
const PRIS_FILE = path.join(DATA_DIR, "pris.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const AUDIT_FILE = path.join(DATA_DIR, "audit.log");

const DEFAULT_CONFIG = {
  harvest_threshold: 50,
  escalation_confidence: 0.6,
  dedup_similarity: 0.8,
  batch_size: 50,
  max_pris_per_day: 100,
  model: "claude-opus-4-8",
  reviewer_sla_hours: 72,
  stale_pri_days: 30,
};

const CONTROLLED_VOCABULARY = [
  "UX",
  "performance",
  "AI",
  "security",
  "data",
  "mobile",
  "cost",
  "compliance",
  "integration",
  "accessibility",
  "architecture",
  "infrastructure",
  "testing",
  "documentation",
  "onboarding",
];

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  // Ensure default config exists
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
  }
}

// Read JSON file; return empty array/object if not found
function readFile(filepath, defaultValue) {
  if (!fs.existsSync(filepath)) {
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8"));
  } catch {
    return defaultValue;
  }
}

// Write JSON file
function writeFile(filepath, data) {
  ensureDataDir();
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
}

// Append NDJSON line to audit log
function appendAudit(entry) {
  ensureDataDir();
  fs.appendFileSync(
    AUDIT_FILE,
    JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + "\n"
  );
}

// Simple Jaccard similarity on tokens
function jaccardSimilarity(str1, str2) {
  const tokens1 = new Set(str1.toLowerCase().split(/\s+/));
  const tokens2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Compute priority signal from metadata
function computePrioritySignal(source, title, content) {
  let signal = 0;

  // Source boost
  if (source === "chat") signal += 6;
  else if (source === "email") signal += 5;
  else if (source === "web") signal += 4;
  else if (source === "notes") signal += 5;

  const fullText = `${title} ${content}`.toLowerCase();

  // Keyword boost
  if (/urgent|blocker|critical|p0/.test(fullText)) {
    signal += 3;
  }

  return Math.min(signal, 10);
}

// Extract tags from content using keyword matching
function autoTagContent(content) {
  const tags = [];
  const lowerContent = content.toLowerCase();
  for (const vocab of CONTROLLED_VOCABULARY) {
    if (lowerContent.includes(vocab.toLowerCase())) {
      tags.push(vocab);
    }
  }
  return [...new Set(tags)];
}

// Deduplication check
function checkDuplicate(item) {
  const inbox = readFile(INBOX_FILE, []);
  const config = readFile(CONFIG_FILE, DEFAULT_CONFIG);
  const threshold = config.dedup_similarity || 0.8;

  for (const existing of inbox) {
    const similarity = jaccardSimilarity(
      item.raw_content,
      existing.raw_content
    );
    if (similarity > threshold) {
      return { isDuplicate: true, similarId: existing.idea_id, similarity };
    }
    if (similarity > 0.6 && similarity <= threshold) {
      return { isPossibleDuplicate: true, similarity };
    }
  }
  return { isDuplicate: false, isPossibleDuplicate: false };
}

// Tool handlers
const handlers = {
  "idea:capture": (args) => {
    const {
      source,
      source_ref,
      title,
      raw_content,
      captured_by,
      attachments = [],
      tags: userTags = [],
    } = args;

    if (!source || !raw_content || !captured_by) {
      throw new Error("Missing required fields: source, raw_content, captured_by");
    }

    const idea_id = randomUUID();
    const captured_at = new Date().toISOString();

    // Run intake routing
    const dupCheck = checkDuplicate({
      raw_content,
      idea_id,
    });

    const autoTags = autoTagContent(raw_content);
    const allTags = [...new Set([...userTags, ...autoTags])];
    const priority_signal = computePrioritySignal(source, title, raw_content);

    let status = "new";
    let harvest_notes = "";

    if (dupCheck.isDuplicate) {
      status = "duplicate";
      harvest_notes = `Duplicate of idea ${dupCheck.similarId} (similarity: ${(
        dupCheck.similarity * 100
      ).toFixed(1)}%)`;
    } else if (dupCheck.isPossibleDuplicate) {
      harvest_notes = `Possible duplicate detected (similarity: ${(
        dupCheck.similarity * 100
      ).toFixed(1)}%)`;
    }

    const inboxItem = {
      idea_id,
      source,
      source_ref: source_ref || "",
      captured_at,
      captured_by,
      title: title || raw_content.substring(0, 100),
      raw_content,
      tags: allTags,
      attachments,
      status,
      priority_signal,
      harvest_notes,
      pri_id: null,
    };

    const inbox = readFile(INBOX_FILE, []);
    inbox.push(inboxItem);
    writeFile(INBOX_FILE, inbox);

    return {
      idea_id,
      status,
      message: `Idea captured (${status})`,
      harvest_notes,
    };
  },

  "idea:list-inbox": (args) => {
    const { status, source, tags, limit = 50 } = args;
    const inbox = readFile(INBOX_FILE, []);

    let filtered = inbox;
    if (status) {
      filtered = filtered.filter((i) => i.status === status);
    }
    if (source) {
      filtered = filtered.filter((i) => i.source === source);
    }
    if (tags && tags.length > 0) {
      filtered = filtered.filter((i) =>
        tags.some((t) => i.tags.includes(t))
      );
    }

    return filtered.slice(0, limit);
  },

  "idea:get-item": (args) => {
    const { idea_id } = args;
    if (!idea_id) throw new Error("idea_id required");

    const inbox = readFile(INBOX_FILE, []);
    const item = inbox.find((i) => i.idea_id === idea_id);
    if (!item) throw new Error(`Idea ${idea_id} not found`);
    return item;
  },

  "idea:harvest": async (args) => {
    const { idea_id } = args;
    if (!idea_id) throw new Error("idea_id required");

    const inbox = readFile(INBOX_FILE, []);
    const inboxItem = inbox.find((i) => i.idea_id === idea_id);
    if (!inboxItem) throw new Error(`Idea ${idea_id} not found`);

    const config = readFile(CONFIG_FILE, DEFAULT_CONFIG);

    // Call Claude API for IHA processing
    const systemPrompt = `You are the Idea Harvester Agent (IHA). Analyze the provided idea and return a JSON object with:
- classification: one of Feature, Bug, Initiative, Spike, Process
- scores: object with novelty (0-40), strategic_alignment (0-30), feasibility (0-15), source_priority (0-15)
- harvest_score: sum of scores (0-100)
- confidence: 0.0-1.0 how confident you are in this decision
- pri_draft: object with title, description, problem_statement, proposed_solution, strategic_alignment (array), estimated_effort (XS/S/M/L/XL), suggested_quarter (e.g., Q3 2026)
- rejection_reason: null if generating PRI, otherwise brief reason

Be thorough but concise.`;

    const userMessage = `Analyze this idea submission:
Source: ${inboxItem.source}
Captured by: ${inboxItem.captured_by}
Title: ${inboxItem.title}
Tags: ${inboxItem.tags.join(", ")}
Priority Signal: ${inboxItem.priority_signal}/10

Content:
${inboxItem.raw_content}`;

    let ihaResult;
    try {
      const response = await client.messages.create({
        model: config.model || "claude-opus-4-8",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("IHA response did not contain valid JSON");
      }

      ihaResult = JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`IHA API call failed: ${error.message}`);
    }

    // Decision logic
    const harvest_score = ihaResult.harvest_score || 0;
    const confidence = ihaResult.confidence || 0;
    let newStatus = "rejected";
    let pri_id = null;
    const source_attribution = `${inboxItem.captured_by} via ${inboxItem.source}`;

    if (harvest_score >= config.harvest_threshold) {
      // Generate PRI
      pri_id = randomUUID();
      const pri = {
        pri_id,
        idea_id,
        title: ihaResult.pri_draft.title,
        category: ihaResult.classification,
        description: ihaResult.pri_draft.description,
        problem_statement: ihaResult.pri_draft.problem_statement,
        proposed_solution: ihaResult.pri_draft.proposed_solution,
        strategic_alignment: ihaResult.pri_draft.strategic_alignment || [],
        harvest_score,
        source_attribution,
        dependencies: [],
        estimated_effort: ihaResult.pri_draft.estimated_effort || "M",
        suggested_quarter: ihaResult.pri_draft.suggested_quarter || "Q3 2026",
        status: "proposed",
        created_at: new Date().toISOString(),
        reviewed_by: null,
        roadmap_item_id: null,
      };

      const pris = readFile(PRIS_FILE, []);
      pris.push(pri);
      writeFile(PRIS_FILE, pris);

      newStatus = "harvested";
    } else if (confidence < config.escalation_confidence) {
      newStatus = "escalated";
    }

    // Update inbox item
    const idx = inbox.findIndex((i) => i.idea_id === idea_id);
    inbox[idx].status = newStatus;
    inbox[idx].harvest_notes = `Classification: ${ihaResult.classification}, Score: ${harvest_score}, Confidence: ${(confidence * 100).toFixed(1)}%`;
    if (pri_id) {
      inbox[idx].pri_id = pri_id;
    }
    writeFile(INBOX_FILE, inbox);

    // Audit log
    appendAudit({
      idea_id,
      action: "harvest",
      classification: ihaResult.classification,
      harvest_score,
      confidence,
      decision: newStatus,
      pri_id,
      rejection_reason: ihaResult.rejection_reason,
    });

    return {
      idea_id,
      status: newStatus,
      harvest_score,
      confidence,
      pri_id,
      classification: ihaResult.classification,
    };
  },

  "idea:harvest-batch": async (args) => {
    const { limit } = args;
    const inbox = readFile(INBOX_FILE, []);
    const config = readFile(CONFIG_FILE, DEFAULT_CONFIG);

    const newItems = inbox.filter((i) => i.status === "new");
    const toProcess = newItems.slice(0, limit || config.batch_size);

    const results = [];
    for (const item of toProcess) {
      try {
        const result = await handlers["idea:harvest"]({ idea_id: item.idea_id });
        results.push(result);
      } catch (error) {
        results.push({
          idea_id: item.idea_id,
          error: error.message,
        });
      }
    }

    return {
      processed: results.length,
      results,
    };
  },

  "idea:list-pris": (args) => {
    const { status, category, min_score = 0, quarter, limit = 50 } = args;
    const pris = readFile(PRIS_FILE, []);

    let filtered = pris;
    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    }
    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }
    if (min_score > 0) {
      filtered = filtered.filter((p) => p.harvest_score >= min_score);
    }
    if (quarter) {
      filtered = filtered.filter((p) => p.suggested_quarter === quarter);
    }

    return filtered.slice(0, limit);
  },

  "idea:get-pri": (args) => {
    const { pri_id } = args;
    if (!pri_id) throw new Error("pri_id required");

    const pris = readFile(PRIS_FILE, []);
    const pri = pris.find((p) => p.pri_id === pri_id);
    if (!pri) throw new Error(`PRI ${pri_id} not found`);
    return pri;
  },

  "idea:update-status": (args) => {
    const { idea_id, pri_id, status, reviewed_by, rationale } = args;

    if (!status || !(idea_id || pri_id)) {
      throw new Error("status and (idea_id or pri_id) required");
    }

    if (idea_id) {
      const inbox = readFile(INBOX_FILE, []);
      const idx = inbox.findIndex((i) => i.idea_id === idea_id);
      if (idx === -1) throw new Error(`Idea ${idea_id} not found`);

      inbox[idx].status = status;
      if (rationale) {
        inbox[idx].harvest_notes = rationale;
      }
      writeFile(INBOX_FILE, inbox);

      appendAudit({
        idea_id,
        action: "status_update",
        new_status: status,
        reviewed_by,
        rationale,
      });

      return { idea_id, status, message: "Inbox item status updated" };
    }

    if (pri_id) {
      const pris = readFile(PRIS_FILE, []);
      const idx = pris.findIndex((p) => p.pri_id === pri_id);
      if (idx === -1) throw new Error(`PRI ${pri_id} not found`);

      pris[idx].status = status;
      pris[idx].reviewed_by = reviewed_by;
      writeFile(PRIS_FILE, pris);

      appendAudit({
        pri_id,
        action: "pri_status_update",
        new_status: status,
        reviewed_by,
        rationale,
      });

      return { pri_id, status, message: "PRI status updated" };
    }
  },

  "idea:daily-digest": (args) => {
    const pris = readFile(PRIS_FILE, []);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recent = pris.filter((p) => {
      const created = new Date(p.created_at);
      return created >= oneDayAgo;
    });

    const highSignal = recent.filter((p) => p.harvest_score >= 80);
    const standard = recent.filter((p) => p.harvest_score < 80);

    const byCategory = {};
    for (const pri of recent) {
      if (!byCategory[pri.category]) {
        byCategory[pri.category] = [];
      }
      byCategory[pri.category].push(pri);
    }

    return {
      period: `Last 24 hours (${oneDayAgo.toISOString()} to ${now.toISOString()})`,
      total: recent.length,
      high_signal: highSignal.length,
      standard: standard.length,
      by_category: byCategory,
      high_signal_pris: highSignal,
      all_pris: recent,
    };
  },

  "idea:config": (args) => {
    const { update } = args;

    if (!update) {
      const config = readFile(CONFIG_FILE, DEFAULT_CONFIG);
      return config;
    }

    const config = readFile(CONFIG_FILE, DEFAULT_CONFIG);
    const updated = { ...config, ...update };
    writeFile(CONFIG_FILE, updated);

    appendAudit({
      action: "config_update",
      changes: update,
    });

    return {
      message: "Config updated",
      config: updated,
    };
  },
};

// Tool definitions
const tools = {
  "idea:capture": {
    name: "idea:capture",
    description:
      "Submit a new idea; normalizes to Inbox schema, runs dedup + priority scoring + auto-tagging",
    inputSchema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          enum: ["email", "web", "chat", "notes"],
          description: "Origin channel",
        },
        source_ref: {
          type: "string",
          description: "Original reference (message ID, URL, etc.)",
        },
        title: {
          type: "string",
          description: "Brief title; auto-generated from content if omitted",
        },
        raw_content: {
          type: "string",
          description: "Full idea content",
        },
        captured_by: {
          type: "string",
          description: "User identity/email",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "User-supplied tags",
        },
        attachments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              url: { type: "string" },
              type: { type: "string" },
            },
          },
          description: "Attached files or URLs",
        },
      },
      required: ["source", "raw_content", "captured_by"],
    },
  },

  "idea:list-inbox": {
    name: "idea:list-inbox",
    description: "List inbox items with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["new", "processing", "harvested", "rejected", "duplicate", "escalated"],
          description: "Filter by status",
        },
        source: {
          type: "string",
          enum: ["email", "web", "chat", "notes"],
          description: "Filter by source",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags (any match)",
        },
        limit: {
          type: "integer",
          default: 50,
          description: "Max items to return",
        },
      },
    },
  },

  "idea:get-item": {
    name: "idea:get-item",
    description: "Get a single inbox item by idea_id",
    inputSchema: {
      type: "object",
      properties: {
        idea_id: {
          type: "string",
          description: "UUID of the idea",
        },
      },
      required: ["idea_id"],
    },
  },

  "idea:harvest": {
    name: "idea:harvest",
    description:
      "Run IHA on one item: enrich → classify → score → draft PRI or reject. Calls Claude API",
    inputSchema: {
      type: "object",
      properties: {
        idea_id: {
          type: "string",
          description: "UUID of the idea to harvest",
        },
      },
      required: ["idea_id"],
    },
  },

  "idea:harvest-batch": {
    name: "idea:harvest-batch",
    description: "Run IHA on all new items up to batch_size limit",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Override batch size",
        },
      },
    },
  },

  "idea:list-pris": {
    name: "idea:list-pris",
    description: "List PRIs with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["proposed", "under_review", "accepted", "deferred", "declined"],
          description: "Filter by PRI status",
        },
        category: {
          type: "string",
          enum: ["Feature", "Bug", "Initiative", "Spike", "Process"],
          description: "Filter by category",
        },
        min_score: {
          type: "integer",
          default: 0,
          description: "Minimum harvest score",
        },
        quarter: {
          type: "string",
          description: "Filter by suggested_quarter (e.g., Q3 2026)",
        },
        limit: {
          type: "integer",
          default: 50,
          description: "Max items to return",
        },
      },
    },
  },

  "idea:get-pri": {
    name: "idea:get-pri",
    description: "Get a single PRI by pri_id",
    inputSchema: {
      type: "object",
      properties: {
        pri_id: {
          type: "string",
          description: "UUID of the PRI",
        },
      },
      required: ["pri_id"],
    },
  },

  "idea:update-status": {
    name: "idea:update-status",
    description:
      "Human override: set status on an inbox item or PRI (with reviewer identity + rationale)",
    inputSchema: {
      type: "object",
      properties: {
        idea_id: {
          type: "string",
          description: "UUID of inbox item (if updating idea)",
        },
        pri_id: {
          type: "string",
          description: "UUID of PRI (if updating PRI)",
        },
        status: {
          type: "string",
          description: "New status",
        },
        reviewed_by: {
          type: "string",
          description: "Identity of reviewer",
        },
        rationale: {
          type: "string",
          description: "Reason for status change",
        },
      },
      required: ["status"],
    },
  },

  "idea:daily-digest": {
    name: "idea:daily-digest",
    description:
      "Summarize PRIs created in last 24 hours; flag high-signal (score >= 80) separately",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  "idea:config": {
    name: "idea:config",
    description: "Read current IHA config; optionally write updated values",
    inputSchema: {
      type: "object",
      properties: {
        update: {
          type: "object",
          description: "Config fields to update (harvest_threshold, model, etc.)",
        },
      },
    },
  },
};

// MCP protocol handler
function sendResponse(id, result) {
  console.log(
    JSON.stringify({
      jsonrpc: "2.0",
      id,
      result,
    })
  );
}

function sendError(id, code, message) {
  console.log(
    JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: { code, message },
    })
  );
}

function handleInitialize(params, id) {
  sendResponse(id, {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: "idea-inbox-server",
      version: "1.0.0",
    },
  });
}

async function handleToolCall(name, args, id) {
  try {
    const handler = handlers[name];
    if (!handler) {
      sendError(id, -32601, `Tool ${name} not found`);
      return;
    }

    const result = await handler(args);
    sendResponse(id, {
      type: "text",
      text: JSON.stringify(result, null, 2),
    });
  } catch (error) {
    sendError(id, -32603, error.message);
  }
}

// Main protocol loop
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on("line", async (line) => {
    try {
      const msg = JSON.parse(line);

      if (msg.method === "initialize") {
        handleInitialize(msg.params, msg.id);
      } else if (msg.method === "tools/list") {
        sendResponse(msg.id, { tools: Object.values(tools) });
      } else if (msg.method === "tools/call") {
        const { name, arguments: args } = msg.params;
        await handleToolCall(name, args, msg.id);
      } else if (msg.method === "resources/list") {
        sendResponse(msg.id, { resources: [] });
      } else if (msg.method === "prompts/list") {
        sendResponse(msg.id, { prompts: [] });
      }
    } catch (error) {
      console.error(`Error processing message: ${error.message}`);
    }
  });

  rl.on("close", () => {
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
