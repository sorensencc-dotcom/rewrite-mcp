// File: projects/cic/ui/src/components/cro/ExecutionConsole.tsx | Date: 2026-06-03 | v1.0.0

import React, { useEffect, useState } from "react";

interface TaskExecution {
  taskId: string;
  goalId: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  owner: string;
  startTime?: string;
  endTime?: string;
  result?: any;
  error?: string;
  retryCount: number;
}

interface ExecutionStats {
  activeWorkers: number;
  queueLength: number;
  totalExecuted: number;
  totalFailed: number;
}

interface ExecutionEpisode {
  id: string;
  timestamp: string;
  tasks: TaskExecution[];
  status: string;
  stats: ExecutionStats;
  logs: string[];
}

export function ExecutionConsole() {
  const [episodes, setEpisodes] = useState<ExecutionEpisode[]>([]);
  const [activeEpisode, setActiveEpisode] = useState<ExecutionEpisode | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    fetchEpisodes();
  }, []);

  const fetchEpisodes = async () => {
    try {
      const res = await fetch("/v1/cro/episodes");
      const data = await res.json();
      setEpisodes(data);
    } catch (err) {
      console.error("Failed to fetch episodes:", err);
    }
  };

  const triggerExecution = async (dryRun: boolean) => {
    setIsLoading(true);
    setMessage("");
    try {
      // Simulate tasks batch payload
      const mockTasks = [
        { taskId: "t_retry_mem", goalId: "g_mem", title: "Deploy retry loops", owner: "agent:TokenEconomyAgent" },
        { taskId: "t_redesign_smoke", goalId: "g_redesign", title: "Run redesign checks", owner: "agent:RedesignAgent" },
        { taskId: "t_custom_fallback", goalId: "g_custom", title: "Run custom extractor fallback", owner: "agent:CustomAgent" }
      ];

      const res = await fetch("/v1/cro/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun, tasks: mockTasks })
      });
      const data: ExecutionEpisode = await res.json();
      setActiveEpisode(data);
      setMessage(dryRun ? "Dry-run execution batch run successfully." : "Execution batch committed & logged.");
      fetchEpisodes();
    } catch (err: any) {
      setMessage(`Error running executor: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      padding: "24px",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: "#e2e8f0",
      backgroundColor: "#0b0f19",
      minHeight: "100vh"
    }}>
      {/* Header */}
      <header style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.025em", color: "#f8fafc" }}>
          Runtime Execution Console (CRO)
        </h1>
        <p style={{ color: "#64748b", marginTop: "4px" }}>
          Supervise active agent runs, schedule queues, and monitor retry safeguards
        </p>
      </header>

      {/* Control Panel */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "24px",
        marginBottom: "32px"
      }}>
        {/* Run Controls */}
        <div style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          padding: "20px",
          backdropFilter: "blur(12px)"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "12px" }}>
            Queue Scheduler
          </h2>
          <p style={{ color: "#9ca3af", fontSize: "0.875rem", marginBottom: "20px" }}>
            Dispatch a batch of simulated tasks to the executor queue.
          </p>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => triggerExecution(true)}
              disabled={isLoading}
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                padding: "10px 16px",
                borderRadius: "6px",
                border: "none",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Run Batch (Dry-Run)
            </button>
            <button
              onClick={() => triggerExecution(false)}
              disabled={isLoading}
              style={{
                backgroundColor: "#10b981",
                color: "#ffffff",
                padding: "10px 16px",
                borderRadius: "6px",
                border: "none",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Run & Commit Execution
            </button>
          </div>

          {message && (
            <div style={{
              marginTop: "16px",
              padding: "12px",
              backgroundColor: "#1f2937",
              borderRadius: "6px",
              fontSize: "0.875rem",
              color: "#34d399",
              borderLeft: "4px solid #10b981"
            }}>
              {message}
            </div>
          )}
        </div>

        {/* Worker Pool Stats */}
        <div style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          padding: "20px"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "16px" }}>
            Worker Pool Status
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ backgroundColor: "#1f2937", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#9ca3af", fontWeight: 700 }}>Active Workers</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f8fafc", marginTop: "4px" }}>
                {activeEpisode?.stats.activeWorkers ?? 0} / 4
              </div>
            </div>
            <div style={{ backgroundColor: "#1f2937", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#9ca3af", fontWeight: 700 }}>Backlog Queue</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#60a5fa", marginTop: "4px" }}>
                {activeEpisode?.stats.queueLength ?? 0}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Execution Details & Logs */}
      {activeEpisode && (
        <section style={{
          display: "grid",
          gridTemplateColumns: "3fr 2fr",
          gap: "24px",
          marginBottom: "32px"
        }}>
          {/* Tasks table */}
          <div style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "20px"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "16px" }}>
              Tasks Queue Logs
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f2937", color: "#9ca3af", fontSize: "0.85rem" }}>
                  <th style={{ padding: "8px" }}>Task</th>
                  <th style={{ padding: "8px" }}>Owner</th>
                  <th style={{ padding: "8px" }}>Status</th>
                  <th style={{ padding: "8px" }}>Retries</th>
                </tr>
              </thead>
              <tbody>
                {activeEpisode.tasks.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #1f2937", fontSize: "0.875rem" }}>
                    <td style={{ padding: "8px", fontWeight: 600 }}>{t.title}</td>
                    <td style={{ padding: "8px", fontFamily: "monospace", color: "#9ca3af" }}>{t.owner}</td>
                    <td style={{ padding: "8px" }}>
                      <span style={{
                        backgroundColor: t.status === "completed" ? "#064e3b" : (t.status === "failed" ? "#7f1d1d" : "#374151"),
                        color: t.status === "completed" ? "#a7f3d0" : (t.status === "failed" ? "#fca5a5" : "#d1d5db"),
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "0.75rem"
                      }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: "8px", textAlign: "center" }}>{t.retryCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Supervisor Logs */}
          <div style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "20px"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "16px" }}>
              Supervisor Stream
            </h2>
            <div style={{
              backgroundColor: "#030712",
              padding: "12px",
              borderRadius: "8px",
              height: "220px",
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: "0.8rem",
              lineHeight: 1.5,
              color: "#34d399"
            }}>
              {activeEpisode.logs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: "6px" }}>{log}</div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Episode Log History */}
      <section style={{
        backgroundColor: "#111827",
        border: "1px solid #1f2937",
        borderRadius: "12px",
        padding: "24px"
      }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "16px" }}>
          Execution Episodes History
        </h2>

        {episodes.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: "0.875rem", fontStyle: "italic" }}>
            No execution episodes found in history logs.
          </p>
        ) : (
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f2937", color: "#9ca3af", fontSize: "0.875rem" }}>
                  <th style={{ padding: "10px" }}>ID</th>
                  <th style={{ padding: "10px" }}>Timestamp</th>
                  <th style={{ padding: "10px" }}>Status</th>
                  <th style={{ padding: "10px" }}>Executed</th>
                  <th style={{ padding: "10px" }}>Failed</th>
                </tr>
              </thead>
              <tbody>
                {episodes.map(e => (
                  <tr key={e.id} style={{ borderBottom: "1px solid #1f2937", fontSize: "0.9rem" }}>
                    <td style={{ padding: "10px", fontFamily: "monospace", color: "#60a5fa" }}>{e.id}</td>
                    <td style={{ padding: "10px", color: "#9ca3af" }}>{new Date(e.timestamp).toLocaleString()}</td>
                    <td style={{ padding: "10px" }}>
                      <span style={{
                        backgroundColor: e.status === "committed" ? "#064e3b" : "#374151",
                        color: e.status === "committed" ? "#a7f3d0" : "#d1d5db",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "0.75rem"
                      }}>
                        {e.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px" }}>{e.stats.totalExecuted}</td>
                    <td style={{ padding: "10px" }}>{e.stats.totalFailed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
export default ExecutionConsole;
