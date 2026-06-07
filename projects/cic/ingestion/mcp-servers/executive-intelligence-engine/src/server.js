import Anthropic from "@anthropic-ai/sdk";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration paths
const CONFIG_DIR = path.join(__dirname, "..", "config");
const LOGS_DIR = path.join(__dirname, "..", "logs");
const CREDENTIALS_PATH = path.join(CONFIG_DIR, "credentials.json");
const TOKEN_PATH = path.join(CONFIG_DIR, "token.json");
const RULES_PATH = path.join(CONFIG_DIR, "triage_rules.json");
const AUDIT_LOG_PATH = path.join(LOGS_DIR, "audit.log");

// Staging paths
const DATA_ROOT = path.join(__dirname, "..", "..", "..", "data");
const STAGING_PATHS = {
  "Projects/Cast Iron Charlie": path.join(DATA_ROOT, "staged", "cic"),
  "Business/Rewrite Labs": path.join(DATA_ROOT, "staged", "rewritelabs"),
};

// Ensure directories exist
[CONFIG_DIR, LOGS_DIR, ...Object.values(STAGING_PATHS)].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Pipeline label whitelist
const PIPELINE_COLUMNS = new Set([
  "@Action Required",
  "@Pending",
  "@Review",
  "Business/Rewrite Labs",
  "Projects/Cast Iron Charlie",
  "Administrative",
  "Archived",
]);

// ============================================================================
// AuditLogger
// ============================================================================
class AuditLogger {
  constructor(logPath) {
    this.logPath = logPath;
  }

  log(eventType, source, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      eventType,
      source,
      ...metadata,
    };
    try {
      fs.appendFileSync(this.logPath, JSON.stringify(entry) + "\n");
    } catch (err) {
      console.error(`Failed to write audit log: ${err.message}`);
    }
  }
}

// ============================================================================
// TokenManager
// ============================================================================
class TokenManager {
  constructor(oauth2Client, tokenPath) {
    this.oauth2Client = oauth2Client;
    this.tokenPath = tokenPath;
    this.token = this.loadToken();
  }

  loadToken() {
    if (fs.existsSync(this.tokenPath)) {
      try {
        const tokenData = JSON.parse(fs.readFileSync(this.tokenPath, "utf-8"));
        this.oauth2Client.setCredentials(tokenData);
        return tokenData;
      } catch (err) {
        console.error(`Failed to load token: ${err.message}`);
        return null;
      }
    }
    return null;
  }

  async ensureValidToken() {
    if (!this.token) {
      throw new Error(
        "No refresh token available. Run authentication first."
      );
    }

    const expiryTime = this.token.expiry_date || 0;
    const now = Date.now();
    const refreshWindow = 5 * 60 * 1000; // 5 minutes

    if (now + refreshWindow >= expiryTime) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.token = credentials;
        fs.writeFileSync(this.tokenPath, JSON.stringify(credentials, null, 2));
      } catch (err) {
        throw new Error(`Token refresh failed: ${err.message}`);
      }
    }

    this.oauth2Client.setCredentials(this.token);
  }
}

// ============================================================================
// TriageRuleEngine
// ============================================================================
class TriageRuleEngine {
  constructor(rulesPath) {
    this.rulesPath = rulesPath;
    this.rules = this.loadRules();
  }

  loadRules() {
    if (fs.existsSync(this.rulesPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.rulesPath, "utf-8"));
      } catch (err) {
        console.error(`Failed to load rules: ${err.message}`);
        return {};
      }
    }
    return {};
  }

  saveRules() {
    try {
      fs.writeFileSync(this.rulesPath, JSON.stringify(this.rules, null, 2));
    } catch (err) {
      console.error(`Failed to save rules: ${err.message}`);
    }
  }

  addRule(senderEmail, targetLabel) {
    if (!PIPELINE_COLUMNS.has(targetLabel)) {
      const validLabels = Array.from(PIPELINE_COLUMNS).join(", ");
      throw new Error(
        `Invalid label "${targetLabel}". Valid labels: ${validLabels}`
      );
    }
    this.rules[senderEmail] = targetLabel;
    this.saveRules();
  }

  categorize(sender, keywords = []) {
    // 1. Exact sender match (highest priority)
    if (this.rules[sender]) {
      return this.rules[sender];
    }

    // 2. Domain-based matching
    const domain = sender.split("@")[1];
    if (domain) {
      const domainRule = `@${domain}`;
      if (this.rules[domainRule]) {
        return this.rules[domainRule];
      }
    }

    // 3. Keyword matching with word boundaries
    for (const [rule, label] of Object.entries(this.rules)) {
      if (!rule.startsWith("@") && !rule.includes("@")) {
        // It's a keyword rule
        try {
          const regex = new RegExp(`\\b${rule}\\b`, "i");
          for (const keyword of keywords) {
            if (regex.test(keyword)) {
              return label;
            }
          }
        } catch (err) {
          console.error(`Invalid regex for rule "${rule}": ${err.message}`);
        }
      }
    }

    // 4. Default category
    return "@Pending";
  }
}

// ============================================================================
// GmailClient
// ============================================================================
class GmailClient {
  constructor(gmail) {
    this.gmail = gmail;
    this.labelCache = {};
  }

  async applyLabel(messageId, labelName) {
    try {
      // Get or create label
      let labelId = this.labelCache[labelName];

      if (!labelId) {
        // Try to find existing label
        const response = await this.gmail.users.labels.list({ userId: "me" });
        const label = response.data.labels.find((l) => l.name === labelName);

        if (label) {
          labelId = label.id;
        } else {
          // Create new label
          const createResponse = await this.gmail.users.labels.create({
            userId: "me",
            requestBody: {
              name: labelName,
              labelListVisibility: "labelShow",
              messageListVisibility: "show",
            },
          });
          labelId = createResponse.data.id;
        }

        this.labelCache[labelName] = labelId;
      }

      // Apply label to message
      await this.gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          addLabelIds: [labelId],
        },
      });

      return { success: true, labelId };
    } catch (err) {
      throw new Error(`Failed to apply label: ${err.message}`);
    }
  }

  async getUnreadMessages(hoursBack = 24) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: "me",
        q: `is:unread newer_than:${hoursBack}h`,
        maxResults: 100,
      });
      return response.data.messages || [];
    } catch (err) {
      throw new Error(`Failed to fetch unread messages: ${err.message}`);
    }
  }

  async getMessageDetails(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });
      return response.data;
    } catch (err) {
      throw new Error(`Failed to get message details: ${err.message}`);
    }
  }

  async getMessagesWithAttachments(labelName) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: "me",
        q: `label:"${labelName}" has:attachment`,
        maxResults: 50,
      });
      return response.data.messages || [];
    } catch (err) {
      throw new Error(`Failed to fetch messages for label "${labelName}": ${err.message}`);
    }
  }

  async downloadAttachment(messageId, attachmentId) {
    try {
      const response = await this.gmail.users.messages.attachments.get({
        userId: "me",
        messageId,
        id: attachmentId,
      });
      // Gmail returns base64url-encoded data
      const data = response.data.data.replace(/-/g, "+").replace(/_/g, "/");
      return Buffer.from(data, "base64");
    } catch (err) {
      throw new Error(`Failed to download attachment: ${err.message}`);
    }
  }

  extractAttachmentParts(payload, parts = []) {
    if (payload.filename && payload.filename.length > 0 && payload.body?.attachmentId) {
      parts.push({
        filename: payload.filename,
        mimeType: payload.mimeType,
        attachmentId: payload.body.attachmentId,
        size: payload.body.size || 0,
      });
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        this.extractAttachmentParts(part, parts);
      }
    }
    return parts;
  }
}

// ============================================================================
// ExecutiveIntelligenceEngine
// ============================================================================
class ExecutiveIntelligenceEngine {
  constructor() {
    this.auditLogger = new AuditLogger(AUDIT_LOG_PATH);
    this.triageEngine = new TriageRuleEngine(RULES_PATH);
    this.oauth2Client = null;
    this.tokenManager = null;
    this.gmailClient = null;
  }

  async initialize() {
    try {
      // Load credentials
      if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error(
          `Credentials file not found at ${CREDENTIALS_PATH}. Please set up Google OAuth credentials.`
        );
      }

      const credentials = JSON.parse(
        fs.readFileSync(CREDENTIALS_PATH, "utf-8")
      );
      const { client_id, client_secret, redirect_uris } = credentials.installed;

      this.oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      this.tokenManager = new TokenManager(this.oauth2Client, TOKEN_PATH);

      if (!this.tokenManager.token) {
        throw new Error(
          "No valid token. Run authentication flow to obtain a refresh token."
        );
      }

      await this.tokenManager.ensureValidToken();

      const gmail = google.gmail({
        version: "v1",
        auth: this.oauth2Client,
      });
      this.gmailClient = new GmailClient(gmail);

      this.auditLogger.log("server_started", "ExecutiveIntelligenceEngine");
    } catch (err) {
      this.auditLogger.log("initialization_failed", "ExecutiveIntelligenceEngine", {
        error: err.message,
      });
      throw err;
    }
  }

  async execute24hTriageScan() {
    try {
      await this.tokenManager.ensureValidToken();

      const messages = await this.gmailClient.getUnreadMessages(24);

      if (messages.length === 0) {
        this.auditLogger.log("triage_scan_complete", "execute24hTriageScan", {
          messageCount: 0,
          labelsApplied: 0,
        });
        return {
          messageCount: 0,
          labelsApplied: 0,
          result: "```text\n[SYSTEM_PULSE]: Queue clear. 0 unread threads found within parameters.\n```",
        };
      }

      let labelsApplied = 0;
      const projectTargets = []; // messages labeled as CIC or RL for Pass 2

      // --- PASS 1: CLASSIFICATION & LABELING ---
      for (const message of messages) {
        try {
          const details = await this.gmailClient.getMessageDetails(message.id);
          const headers = details.payload.headers || [];
          const from = headers.find((h) => h.name === "From")?.value || "";
          const subject = headers.find((h) => h.name === "Subject")?.value || "";

          const sender = from.match(/<(.+?)>/)?.[1] || from;
          const keywords = [subject, from].join(" ").split(/\s+/);

          const category = this.triageEngine.categorize(sender, keywords);
          await this.gmailClient.applyLabel(message.id, category);
          labelsApplied++;

          this.auditLogger.log("label_applied", "execute24hTriageScan", {
            messageId: message.id, sender, label: category,
          });

          if (STAGING_PATHS[category]) {
            projectTargets.push({ id: message.id, label: category });
          }
        } catch (err) {
          this.auditLogger.log("label_apply_failed", "execute24hTriageScan", {
            messageId: message.id, error: err.message,
          });
        }
      }

      // --- PASS 2: INLINE ATTACHMENT STAGING ---
      let stagingResult = null;
      if (projectTargets.length > 0) {
        this.auditLogger.log("auto_staging_triggered", "execute24hTriageScan", {
          count: projectTargets.length,
        });
        stagingResult = await this.executeAttachmentStaging({ messageTargets: projectTargets });
      }

      this.auditLogger.log("triage_scan_complete", "execute24hTriageScan", {
        messageCount: messages.length,
        labelsApplied,
        attachmentsStaged: stagingResult?.staged?.length ?? 0,
      });

      return {
        messageCount: messages.length,
        labelsApplied,
        staging: stagingResult,
        result: `Processed ${messages.length} messages. Applied ${labelsApplied} labels.${stagingResult ? ` Staged ${stagingResult.staged.length} attachment(s).` : ""}`,
      };
    } catch (err) {
      this.auditLogger.log("execute24hTriageScan_failed", "ExecutiveIntelligenceEngine", {
        error: err.message,
      });
      throw err;
    }
  }

  async executeAttachmentStaging(args = {}) {
    const staged = [];
    const skipped = [];
    const errors = [];

    await this.tokenManager.ensureValidToken();

    // Fast-path: caller supplies specific message targets (e.g. from inline triage pass)
    if (args.messageTargets && args.messageTargets.length > 0) {
      for (const { id, label } of args.messageTargets) {
        const stagingDir = STAGING_PATHS[label];
        if (!stagingDir) {
          errors.push({ label, messageId: id, error: `No staging path for label "${label}"` });
          continue;
        }
        await this._stageMessageAttachments(id, label, stagingDir, staged, skipped, errors);
      }
      return { staged, skipped, errors, summary: `Staged ${staged.length} file(s). Skipped ${skipped.length}. Errors: ${errors.length}.` };
    }

    // Default-path: scan by label query
    const targetLabels = args.labels || Object.keys(STAGING_PATHS);

    for (const label of targetLabels) {
      const stagingDir = STAGING_PATHS[label];
      if (!stagingDir) {
        errors.push({ label, error: `No staging path configured for label "${label}"` });
        continue;
      }

      const messages = await this.gmailClient.getMessagesWithAttachments(label);

      for (const msg of messages) {
        await this._stageMessageAttachments(msg.id, label, stagingDir, staged, skipped, errors);
      }
    }

    return { staged, skipped, errors, summary: `Staged ${staged.length} file(s). Skipped ${skipped.length}. Errors: ${errors.length}.` };
  }

  async _stageMessageAttachments(messageId, label, stagingDir, staged, skipped, errors) {
    try {
      const details = await this.gmailClient.getMessageDetails(messageId);
      const headers = details.payload.headers || [];
      const subject = headers.find((h) => h.name === "Subject")?.value || "no-subject";
      const date = headers.find((h) => h.name === "Date")?.value || "";
      const datePart = date ? new Date(date).toISOString().split("T")[0] : "unknown-date";

      const attachments = this.gmailClient.extractAttachmentParts(details.payload);

      for (const att of attachments) {
        const safeName = att.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const prefix = `${datePart}_${messageId.slice(-6)}_`;
        const destPath = path.join(stagingDir, prefix + safeName);

        if (fs.existsSync(destPath)) {
          skipped.push({ label, filename: safeName, reason: "already exists" });
          continue;
        }

        const buffer = await this.gmailClient.downloadAttachment(messageId, att.attachmentId);
        fs.writeFileSync(destPath, buffer);

        this.auditLogger.log("attachment_staged", "_stageMessageAttachments", {
          label, messageId, subject, filename: safeName, destPath, sizeBytes: buffer.length,
        });

        staged.push({ label, filename: safeName, subject, destPath, sizeBytes: buffer.length });
      }
    } catch (err) {
      errors.push({ label, messageId, error: err.message });
      this.auditLogger.log("attachment_stage_failed", "_stageMessageAttachments", {
        label, messageId, error: err.message,
      });
    }
  }

  async commitTriageAction(messageId, targetLabel, learnSender) {
    try {
      if (!PIPELINE_COLUMNS.has(targetLabel)) {
        const validLabels = Array.from(PIPELINE_COLUMNS).join(", ");
        throw new Error(
          `Invalid label "${targetLabel}". Valid labels: ${validLabels}`
        );
      }

      await this.tokenManager.ensureValidToken();
      await this.gmailClient.applyLabel(messageId, targetLabel);

      if (learnSender) {
        const details = await this.gmailClient.getMessageDetails(messageId);
        const headers = details.payload.headers || [];
        const from = headers.find((h) => h.name === "From")?.value || "";
        const sender = from.match(/<(.+?)>/)?.[1] || from;

        this.triageEngine.addRule(sender, targetLabel);

        this.auditLogger.log("rule_learned", "commitTriageAction", {
          messageId,
          sender,
          label: targetLabel,
        });
      }

      this.auditLogger.log("triage_action_committed", "commitTriageAction", {
        messageId,
        label: targetLabel,
      });

      return {
        success: true,
        message: `Applied label "${targetLabel}" to message ${messageId}${learnSender ? " and learned sender rule." : "."}`,
      };
    } catch (err) {
      this.auditLogger.log("commitTriageAction_failed", "ExecutiveIntelligenceEngine", {
        messageId,
        targetLabel,
        error: err.message,
      });
      throw err;
    }
  }
}

// ============================================================================
// MCP Server Setup
// ============================================================================
const server = new Server({
  name: "executive-intelligence-engine",
  version: "2.0.0",
});

const engine = new ExecutiveIntelligenceEngine();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "execute_24h_triage_scan",
      description:
        "Scans unread Gmail messages from the past 24 hours, categorizes them using learned rules, and applies appropriate pipeline labels.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "stage_email_attachments",
      description:
        "Scans emails labeled 'Projects/Cast Iron Charlie' or 'Business/Rewrite Labs' for attachments and downloads them into the appropriate local staging directory. Skips files already staged.",
      inputSchema: {
        type: "object",
        properties: {
          labels: {
            type: "array",
            items: { type: "string" },
            description: `Subset of labels to scan. Defaults to all: ${Object.keys(STAGING_PATHS).join(", ")}`,
          },
        },
        required: [],
      },
    },
    {
      name: "commit_triage_action",
      description:
        "Applies a manual pipeline label to a specific message and optionally learns the sender-to-label mapping for future auto-categorization.",
      inputSchema: {
        type: "object",
        properties: {
          messageId: {
            type: "string",
            description: "The Gmail message ID to label.",
          },
          targetLabel: {
            type: "string",
            description: `Pipeline label to apply. Valid values: ${Array.from(PIPELINE_COLUMNS).join(", ")}`,
          },
          learnSender: {
            type: "boolean",
            description:
              "If true, learn this sender-to-label mapping for future auto-categorization.",
            default: false,
          },
        },
        required: ["messageId", "targetLabel"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "execute_24h_triage_scan") {
      const result = await engine.execute24hTriageScan();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } else if (request.params.name === "stage_email_attachments") {
      const result = await engine.executeAttachmentStaging(request.params.arguments || {});
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } else if (request.params.name === "commit_triage_action") {
      const { messageId, targetLabel, learnSender } = request.params.arguments;
      const result = await engine.commitTriageAction(
        messageId,
        targetLabel,
        learnSender || false
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  } catch (err) {
    engine.auditLogger.log("tool_error", request.params.name, {
      error: err.message,
    });
    return {
      content: [
        {
          type: "text",
          text: `Error: ${err.message}`,
          isError: true,
        },
      ],
    };
  }
});

// ============================================================================
// Server Start
// ============================================================================
async function main() {
  try {
    await engine.initialize();
    console.log("[INFO] Executive Intelligence Engine initialized.");

    const transport = server.createStdioTransport();
    await server.connect(transport);
    console.log("[INFO] MCP server listening on stdio.");
  } catch (err) {
    console.error(`[ERROR] Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

main();