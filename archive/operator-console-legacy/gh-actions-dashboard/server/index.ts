import express, { Request, Response } from "express";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

interface RepoReport {
  name: string;
  issues: string[];
}

let cachedReport: {
  data: RepoReport[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getComplianceReport(): RepoReport[] {
  const now = Date.now();

  // Return cached data if fresh
  if (cachedReport && now - cachedReport.timestamp < CACHE_TTL) {
    return cachedReport.data;
  }

  try {
    // Run the manifest-based check from rewrite-mcp root
    const rewriteMcpPath = path.resolve(__dirname, "../../..");
    const output = execSync(
      "npm run gh-actions:check-manifest -- --json 2>/dev/null || echo '[]'",
      {
        cwd: rewriteMcpPath,
        encoding: "utf-8",
      }
    );

    const data: RepoReport[] = JSON.parse(output.trim() || "[]");
    cachedReport = { data, timestamp: now };
    return data;
  } catch (error) {
    console.error("Failed to fetch compliance report:", error);
    return [];
  }
}

// Middleware
app.use(express.json());
app.use(express.static(path.resolve(__dirname, "../dist")));

// API Routes
app.get("/api/gh-actions/compliance", (_req: Request, res: Response) => {
  const reports = getComplianceReport();
  res.json(reports);
});

app.get("/api/gh-actions/summary", (_req: Request, res: Response) => {
  const reports = getComplianceReport();
  const summary = {
    total: reports.length,
    compliant: reports.filter((r) => r.issues.length === 0).length,
    nonCompliant: reports.filter((r) => r.issues.length > 0).length,
    lastUpdated: cachedReport?.timestamp || Date.now(),
  };
  res.json(summary);
});

// Serve index.html for client-side routing
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.resolve(__dirname, "../dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`Dashboard server listening on http://localhost:${PORT}`);
});
