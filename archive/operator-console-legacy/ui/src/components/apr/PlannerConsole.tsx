// File: projects/cic/ui/src/components/apr/PlannerConsole.tsx | Date: 2026-06-03 | v1.0.0

import React, { useEffect, useState } from "react";

interface PlanningGoal {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  source: string;
  status: string;
  createdAt: string;
}

interface PlanningTask {
  id: string;
  goalId: string;
  title: string;
  description: string;
  owner: string;
  status: string;
  type: string;
}

interface PlannerCritique {
  reviewerRole: string;
  approved: boolean;
  feedback: string;
  riskLevel: string;
}

interface PlanningEpisode {
  id: string;
  timestamp: string;
  decision: {
    plan: {
      goals: PlanningGoal[];
      tasks: PlanningTask[];
    };
    reasoning: string;
  };
  critiques: PlannerCritique[];
  status: string;
}

export function PlannerConsole() {
  const [episodes, setEpisodes] = useState<PlanningEpisode[]>([]);
  const [activePlan, setActivePlan] = useState<{ goals: PlanningGoal[]; tasks: PlanningTask[] } | null>(null);
  const [reasoning, setReasoning] = useState<string>("");
  const [critiques, setCritiques] = useState<PlannerCritique[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    fetchEpisodes();
  }, []);

  const fetchEpisodes = async () => {
    try {
      const res = await fetch("/v1/apr/episodes");
      const data = await res.json();
      setEpisodes(data);
    } catch (err) {
      console.error("Failed to fetch episodes:", err);
    }
  };

  const triggerPlanning = async (dryRun: boolean) => {
    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch("/v1/apr/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun })
      });
      const data: PlanningEpisode = await res.json();
      setActivePlan(data.decision.plan);
      setReasoning(data.decision.reasoning);
      setCritiques(data.critiques);
      setMessage(dryRun ? "Dry-run planning compiled successfully." : "Planning episode committed to Git-log.");
      fetchEpisodes();
    } catch (err: any) {
      setMessage(`Error running planner: ${err.message}`);
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
          Autonomous Planner Console (APR)
        </h1>
        <p style={{ color: "#64748b", marginTop: "4px" }}>
          CIC self-optimization engine, roadmap sandbox, and multi-agent loops
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
            Planning Orchestrator
          </h2>
          <p style={{ color: "#9ca3af", fontSize: "0.875rem", marginBottom: "20px" }}>
            Trigger a planning cycle using latest ARPS deltas, Memory trends, and Skill Graph constraints.
          </p>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => triggerPlanning(true)}
              disabled={isLoading}
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                padding: "10px 16px",
                borderRadius: "6px",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background-color 0.2s"
              }}
            >
              Run Planning (Dry-Run)
            </button>
            <button
              onClick={() => triggerPlanning(false)}
              disabled={isLoading}
              style={{
                backgroundColor: "#10b981",
                color: "#ffffff",
                padding: "10px 16px",
                borderRadius: "6px",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background-color 0.2s"
              }}
            >
              Apply & Commit Plan
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

        {/* System Health / Hotspots summary */}
        <div style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          padding: "20px"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "12px" }}>
            Reasoning Context
          </h2>
          {reasoning ? (
            <div>
              <p style={{ fontSize: "0.9rem", color: "#d1d5db", lineHeight: 1.5 }}>
                {reasoning}
              </p>
              <div style={{ marginTop: "16px" }}>
                <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#9ca3af", fontWeight: 700, marginBottom: "8px" }}>
                  Multi-Agent Critique
                </h3>
                {critiques.map((c, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: "1px solid #1f2937",
                    fontSize: "0.875rem"
                  }}>
                    <span style={{ fontWeight: 600, color: "#e5e7eb" }}>{c.reviewerRole}</span>
                    <span style={{
                      backgroundColor: c.approved ? "#064e3b" : "#7f1d1d",
                      color: c.approved ? "#a7f3d0" : "#fca5a5",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "0.75rem"
                    }}>
                      {c.approved ? "Approved" : "Rejected"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: "#6b7280", fontSize: "0.875rem", fontStyle: "italic" }}>
              No planning cycle executed in this session.
            </p>
          )}
        </div>
      </section>

      {/* Plan Details */}
      {activePlan && (
        <section style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "32px"
        }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "16px" }}>
            Generated Plan Output
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Goals */}
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#9ca3af", marginBottom: "12px" }}>Goals</h3>
              {activePlan.goals.map((g, i) => (
                <div key={i} style={{
                  padding: "12px",
                  backgroundColor: "#1f2937",
                  borderRadius: "8px",
                  marginBottom: "10px",
                  borderLeft: g.priority === "high" ? "4px solid #ef4444" : "4px solid #3b82f6"
                }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{g.title}</div>
                  <div style={{ fontSize: "0.85rem", color: "#9ca3af", marginTop: "4px" }}>{g.description}</div>
                </div>
              ))}
            </div>

            {/* Tasks */}
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#9ca3af", marginBottom: "12px" }}>Tasks & Routing</h3>
              {activePlan.tasks.map((t, i) => (
                <div key={i} style={{
                  padding: "12px",
                  backgroundColor: "#1f2937",
                  borderRadius: "8px",
                  marginBottom: "10px"
                }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{t.title}</div>
                  <div style={{ fontSize: "0.85rem", color: "#9ca3af", marginTop: "4px" }}>{t.description}</div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <span style={{
                      backgroundColor: "#374151",
                      fontSize: "0.75rem",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      color: "#e5e7eb"
                    }}>
                      Owner: {t.owner}
                    </span>
                    <span style={{
                      backgroundColor: t.type === "AUTO_EXECUTABLE" ? "#064e3b" : "#451a03",
                      fontSize: "0.75rem",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      color: t.type === "AUTO_EXECUTABLE" ? "#a7f3d0" : "#fed7aa"
                    }}>
                      {t.type}
                    </span>
                  </div>
                </div>
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
          Planning Episodes History
        </h2>

        {episodes.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: "0.875rem", fontStyle: "italic" }}>
            No committed planning episodes found in log history.
          </p>
        ) : (
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f2937", color: "#9ca3af", fontSize: "0.875rem" }}>
                  <th style={{ padding: "10px" }}>ID</th>
                  <th style={{ padding: "10px" }}>Timestamp</th>
                  <th style={{ padding: "10px" }}>Status</th>
                  <th style={{ padding: "10px" }}>Goals Count</th>
                  <th style={{ padding: "10px" }}>Tasks Count</th>
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
                    <td style={{ padding: "10px" }}>{e.decision.plan.goals.length}</td>
                    <td style={{ padding: "10px" }}>{e.decision.plan.tasks.length}</td>
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
export default PlannerConsole;
