// File: projects/cic/ui/src/components/skills/SkillExplorer.tsx | Date: 2026-06-03 | v1.0.0

import React, { useEffect, useState } from "react";

interface Node {
  id: string;
  type: "skill" | "agent" | "tool" | "lane" | "phase" | "doc" | "external_system";
  name: string;
  tags?: string[];
  meta?: any;
}

interface Edge {
  from: string;
  to: string;
  type: string;
  meta?: any;
}

interface Hotspots {
  orphanSkills: Node[];
  unusedAgents: Node[];
  denseNodes: Node[];
}

interface DriftReport {
  unmappedCicSkills: Node[];
  unmappedExternalSkills: string[];
}

export function SkillExplorer() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hotspots, setHotspots] = useState<Hotspots>({ orphanSkills: [], unusedAgents: [], denseNodes: [] });
  const [drift, setDrift] = useState<DriftReport>({ unmappedCicSkills: [], unmappedExternalSkills: [] });
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"nodes" | "hotspots" | "drift">("nodes");

  const fetchData = async () => {
    try {
      const graphRes = await fetch("/v1/skills/graph");
      const graph = await graphRes.json();
      setNodes(graph.nodes || []);
      setEdges(graph.edges || []);
      setHotspots(graph.meta?.hotspots || { orphanSkills: [], unusedAgents: [], denseNodes: [] });

      const driftRes = await fetch("/v1/skills/drift");
      const driftData = await driftRes.json();
      setDrift(driftData);
    } catch (err) {
      console.error("Failed to load skill graph:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleHarvest = async () => {
    setIsHarvesting(true);
    try {
      const res = await fetch("/v1/skills/harvest", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setNodes(data.graph.nodes || []);
        setEdges(data.graph.edges || []);
        setHotspots(data.graph.meta?.hotspots || { orphanSkills: [], unusedAgents: [], denseNodes: [] });
        
        const driftRes = await fetch("/v1/skills/drift");
        const driftData = await driftRes.json();
        setDrift(driftData);
      }
    } catch (err) {
      console.error("Harvest failed:", err);
    } finally {
      setIsHarvesting(false);
    }
  };

  const filteredNodes = filterType === "all" ? nodes : nodes.filter(n => n.type === filterType);

  const containerStyle: React.CSSProperties = {
    padding: "32px",
    fontFamily: "'Outfit', 'Inter', sans-serif",
    color: "#f8fafc",
    backgroundColor: "#0b0f19",
    backgroundImage: "radial-gradient(circle at 50% 0%, #1e1e38 0%, #080711 70%)",
    minHeight: "100vh"
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    paddingBottom: "16px"
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "32px",
    fontWeight: 700,
    background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: 0
  };

  const buttonStyle: React.CSSProperties = {
    padding: "12px 24px",
    borderRadius: "12px",
    border: "none",
    background: isHarvesting
      ? "rgba(255, 255, 255, 0.1)"
      : "linear-gradient(135deg, #0ea5e9 0%, #4f46e5 100%)",
    color: "#ffffff",
    cursor: isHarvesting ? "not-allowed" : "pointer",
    fontSize: "14px",
    fontWeight: 600,
    boxShadow: "0 4px 12px rgba(14, 165, 233, 0.25)",
    transition: "transform 0.2s, box-shadow 0.2s"
  };

  const statsRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginBottom: "32px"
  };

  const statCardStyle: React.CSSProperties = {
    background: "rgba(17, 24, 39, 0.65)",
    backdropFilter: "blur(12px)",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
  };

  const statNumStyle: React.CSSProperties = {
    fontSize: "36px",
    fontWeight: 700,
    color: "#38bdf8",
    margin: "8px 0 0 0"
  };

  const tabsContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: "12px",
    marginBottom: "24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "12px"
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: active ? "rgba(56, 189, 248, 0.15)" : "transparent",
    color: active ? "#38bdf8" : "#94a3b8",
    cursor: "pointer",
    fontWeight: 600,
    transition: "all 0.2s"
  });

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>CIC Skill Explorer</h1>
          <p style={{ color: "#94a3b8", margin: "4px 0 0 0", fontSize: "14px" }}>
            Phase 24 — Autonomous Capability Graph & Cross-System Mappings
          </p>
        </div>
        <button
          style={buttonStyle}
          onClick={handleHarvest}
          disabled={isHarvesting}
        >
          {isHarvesting ? "Harvesting Repository..." : "Scan & Re-Harvest Graph"}
        </button>
      </header>

      {/* Stats Summary */}
      <section style={statsRowStyle}>
        <div style={statCardStyle}>
          <div style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 500 }}>Total Graph Nodes</div>
          <div style={statNumStyle}>{nodes.length}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 500 }}>Dependencies (Edges)</div>
          <div style={statNumStyle}>{edges.length}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 500 }}>Orphan Skills</div>
          <div style={{ ...statNumStyle, color: hotspots.orphanSkills.length > 0 ? "#f43f5e" : "#10b981" }}>
            {hotspots.orphanSkills.length}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 500 }}>Doctrine Drift</div>
          <div style={{ ...statNumStyle, color: drift.unmappedCicSkills.length > 0 ? "#f59e0b" : "#10b981" }}>
            {drift.unmappedCicSkills.length} unmapped
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div style={tabsContainerStyle}>
        <button style={tabStyle(activeTab === "nodes")} onClick={() => setActiveTab("nodes")}>
          Capability Nodes
        </button>
        <button style={tabStyle(activeTab === "hotspots")} onClick={() => setActiveTab("hotspots")}>
          Heuristic Hotspots
        </button>
        <button style={tabStyle(activeTab === "drift")} onClick={() => setActiveTab("drift")}>
          Doctrine Sync
        </button>
      </div>

      {/* Tab 1: Nodes View */}
      {activeTab === "nodes" && (
        <section>
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            {["all", "skill", "agent", "tool", "external_system"].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: filterType === type ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor: filterType === type ? "rgba(56, 189, 248, 0.1)" : "rgba(255, 255, 255, 0.02)",
                  color: filterType === type ? "#38bdf8" : "#94a3b8",
                  cursor: "pointer",
                  fontSize: "12px",
                  textTransform: "capitalize",
                  transition: "all 0.2s"
                }}
              >
                {type.replace("_", " ")}s
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
            {filteredNodes.map(n => {
              let typeColor = "#38bdf8";
              if (n.type === "agent") typeColor = "#a855f7";
              else if (n.type === "tool") typeColor = "#eab308";
              else if (n.type === "external_system") typeColor = "#10b981";

              return (
                <div key={n.id} style={statCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{
                      backgroundColor: `${typeColor}15`,
                      color: typeColor,
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>
                      {n.type}
                    </span>
                    <span style={{ color: "#475569", fontSize: "11px" }}>ID: {n.id.split(":")[0]}</span>
                  </div>
                  <h4 style={{ margin: "12px 0 8px 0", fontSize: "16px", fontWeight: 600, wordBreak: "break-all" }}>
                    {n.name}
                  </h4>
                  {n.meta?.path && (
                    <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic", wordBreak: "break-all" }}>
                      {n.meta.path}
                    </div>
                  )}
                  {/* Edges from/to this node */}
                  {edges.filter(e => e.from === n.id || e.to === n.id).length > 0 && (
                    <div style={{ marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px" }}>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>
                        Connections:
                      </div>
                      {edges.filter(e => e.from === n.id).map((e, idx) => (
                        <div key={idx} style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0" }}>
                          → [{e.type}] → {e.to.split(":")[1] || e.to}
                        </div>
                      ))}
                      {edges.filter(e => e.to === n.id).map((e, idx) => (
                        <div key={idx} style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0" }}>
                          ← [{e.type}] ← {e.from.split(":")[1] || e.from}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tab 2: Hotspots */}
      {activeTab === "hotspots" && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
          {/* Orphan Skills */}
          <div style={statCardStyle}>
            <h3 style={{ margin: "0 0 16px 0", color: "#f43f5e", display: "flex", justifyContent: "space-between" }}>
              <span>Orphan Skills</span>
              <span style={{ fontSize: "14px", color: "#64748b" }}>{hotspots.orphanSkills.length} total</span>
            </h3>
            {hotspots.orphanSkills.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "13px" }}>No orphan skills detected. Clean connectivity!</p>
            ) : (
              <ul style={{ paddingLeft: "16px", margin: 0 }}>
                {hotspots.orphanSkills.map(n => (
                  <li key={n.id} style={{ color: "#cbd5e1", fontSize: "13px", margin: "8px 0" }}>
                    <strong>{n.name}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Unused Agents */}
          <div style={statCardStyle}>
            <h3 style={{ margin: "0 0 16px 0", color: "#eab308", display: "flex", justifyContent: "space-between" }}>
              <span>Unused Agents</span>
              <span style={{ fontSize: "14px", color: "#64748b" }}>{hotspots.unusedAgents.length} total</span>
            </h3>
            {hotspots.unusedAgents.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "13px" }}>All agents mapped to skills. High utilization!</p>
            ) : (
              <ul style={{ paddingLeft: "16px", margin: 0 }}>
                {hotspots.unusedAgents.map(n => (
                  <li key={n.id} style={{ color: "#cbd5e1", fontSize: "13px", margin: "8px 0" }}>
                    <strong>{n.name}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Dense Nodes */}
          <div style={statCardStyle}>
            <h3 style={{ margin: "0 0 16px 0", color: "#38bdf8", display: "flex", justifyContent: "space-between" }}>
              <span>Dense Hotspots (Degree &ge; 5)</span>
              <span style={{ fontSize: "14px", color: "#64748b" }}>{hotspots.denseNodes.length} total</span>
            </h3>
            {hotspots.denseNodes.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "13px" }}>No heavy hotspots. Modular connectivity.</p>
            ) : (
              <ul style={{ paddingLeft: "16px", margin: 0 }}>
                {hotspots.denseNodes.map(n => (
                  <li key={n.id} style={{ color: "#cbd5e1", fontSize: "13px", margin: "8px 0" }}>
                    <strong>{n.name}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Tab 3: Doctrine Sync */}
      {activeTab === "drift" && (
        <section>
          <div style={statCardStyle}>
            <h3 style={{ margin: "0 0 16px 0", color: "#f59e0b" }}>Doctrine Drift Analysis</h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px 0" }}>
              Checks if CIC capabilities are successfully synchronized with external AI system boundaries (Claude, Copilot, Antigravity).
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
              <div>
                <h4 style={{ color: "#ef4444", fontSize: "14px", margin: "0 0 12px 0" }}>
                  Unmapped CIC Skills (No external contract mapping)
                </h4>
                {drift.unmappedCicSkills.length === 0 ? (
                  <div style={{ color: "#10b981", fontSize: "13px" }}>🟢 100% Alignment: All CIC skills mapped externally.</div>
                ) : (
                  <ul style={{ paddingLeft: "16px", margin: 0 }}>
                    {drift.unmappedCicSkills.map(n => (
                      <li key={n.id} style={{ color: "#cbd5e1", fontSize: "13px", margin: "6px 0" }}>
                        {n.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 style={{ color: "#ef4444", fontSize: "14px", margin: "0 0 12px 0" }}>
                  Unmapped External Skills (Found on platform but not in CIC)
                </h4>
                {drift.unmappedExternalSkills.length === 0 ? (
                  <div style={{ color: "#10b981", fontSize: "13px" }}>🟢 No unmapped external skills found.</div>
                ) : (
                  <ul style={{ paddingLeft: "16px", margin: 0 }}>
                    {drift.unmappedExternalSkills.map((s, idx) => (
                      <li key={idx} style={{ color: "#cbd5e1", fontSize: "13px", margin: "6px 0" }}>
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
