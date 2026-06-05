import { useState, useEffect } from "react";
import ComplianceTable from "./components/ComplianceTable";
import Summary from "./components/Summary";
import "./App.css";

interface RepoReport {
  name: string;
  issues: string[];
}

export default function App() {
  const [reports, setReports] = useState<RepoReport[]>([]);
  const [filter, setFilter] = useState<"all" | "clean" | "issues">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchReports() {
    try {
      setLoading(true);
      const res = await fetch("/api/gh-actions/compliance");
      if (!res.ok) throw new Error("Failed to fetch compliance data");
      const data: RepoReport[] = await res.json();
      setReports(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  }

  const filtered = reports.filter((r) => {
    if (filter === "clean") return r.issues.length === 0;
    if (filter === "issues") return r.issues.length > 0;
    return true;
  });

  return (
    <div className="app">
      <header className="app-header">
        <h1>GitHub Actions Compliance Dashboard</h1>
        <p className="deadline">
          Deadline: September 16, 2026 (Node.js 20 EOL)
        </p>
      </header>

      <Summary reports={reports} loading={loading} />

      <div className="controls">
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({reports.length})
        </button>
        <button
          className={`filter-btn ${filter === "clean" ? "active" : ""}`}
          onClick={() => setFilter("clean")}
        >
          Clean ({reports.filter((r) => r.issues.length === 0).length})
        </button>
        <button
          className={`filter-btn ${filter === "issues" ? "active" : ""}`}
          onClick={() => setFilter("issues")}
        >
          Issues ({reports.filter((r) => r.issues.length > 0).length})
        </button>
        <button className="refresh-btn" onClick={fetchReports}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <ComplianceTable
        reports={filtered}
        loading={loading}
      />
    </div>
  );
}
