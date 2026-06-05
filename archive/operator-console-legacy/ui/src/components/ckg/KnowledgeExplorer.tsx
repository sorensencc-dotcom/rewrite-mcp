// File: projects/cic/ui/src/components/ckg/KnowledgeExplorer.tsx | Date: 2026-06-03 | v1.0.0

import React, { useEffect, useState } from "react";

interface CkgNode {
  id: string;
  type: string;
  name: string;
  tags?: string[];
  meta?: Record<string, any>;
}

interface CkgEdge {
  from: string;
  to: string;
  type: string;
  meta?: Record<string, any>;
}

interface Hotspots {
  centralNodes: CkgNode[];
  orphans: CkgNode[];
}

interface DriftReport {
  unmappedSkills: any[];
  stateDiscrepancies: any[];
}

export function KnowledgeExplorer() {
  const [nodes, setNodes] = useState<CkgNode[]>([]);
  const [edges, setEdges] = useState<CkgEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [neighborhood, setNeighborhood] = useState<{ nodes: CkgNode[]; edges: CkgEdge[] } | null>(null);
  const [hotspots, setHotspots] = useState<Hotspots>({ centralNodes: [], orphans: [] });
  const [drift, setDrift] = useState<DriftReport>({ unmappedSkills: [], stateDiscrepancies: [] });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchGraph();
    fetchAnalysis();
  }, []);

  useEffect(() => {
    if (selectedNodeId) {
      fetchNeighborhood(selectedNodeId);
    } else {
      setNeighborhood(null);
    }
  }, [selectedNodeId]);

  const fetchGraph = async () => {
    try {
      const res = await fetch("/v1/ckg/graph");
      const data = await res.json();
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch (err) {
      console.error("Failed to fetch graph:", err);
    }
  };

  const fetchAnalysis = async () => {
    try {
      const resHotspots = await fetch("/v1/ckg/hotspots");
      const resDrift = await fetch("/v1/ckg/drift");
      setHotspots(await resHotspots.json());
      setDrift(await resDrift.json());
    } catch (err) {
      console.error("Failed to fetch analysis stats:", err);
    }
  };

  const fetchNeighborhood = async (nodeId: string) => {
    try {
      const res = await fetch(`/v1/ckg/neighborhood/${encodeURIComponent(nodeId)}?depth=2`);
      const data = await res.json();
      setNeighborhood(data);
    } catch (err) {
      console.error("Failed to fetch node neighborhood:", err);
    }
  };

  const triggerHarvest = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch("/v1/ckg/harvest", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage("Knowledge Graph harvest completed successfully.");
        fetchGraph();
        fetchAnalysis();
      }
    } catch (err: any) {
      setMessage(`Harvest failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNodes = nodes.filter(n => {
    const matchesType = !filterType || n.type === filterType;
    const matchesQuery = !searchQuery || n.id.toLowerCase().includes(searchQuery.toLowerCase()) || n.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesQuery;
  });

  return (
    <div style={{
      padding: "24px",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: "#e2e8f0",
      backgroundColor: "#0b0f19",
      minHeight: "100vh"
    }}>
      {/* Header */}
      <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.025em", color: "#f8fafc" }}>
            Knowledge Graph Explorer (CKG)
          </h1>
          <p style={{ color: "#64748b", marginTop: "4px" }}>
            Unified semantic substrate linking memory, skills, roadmaps, and execution
          </p>
        </div>
        <button
          onClick={triggerHarvest}
          disabled={isLoading}
          style={{
            backgroundColor: "#2563eb",
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: "6px",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)"
          }}
        >
          {isLoading ? "Harvesting..." : "Run Harvest Cycle"}
        </button>
      </header>

      {message && (
        <div style={{
          padding: "12px",
          backgroundColor: "#1f2937",
          borderRadius: "8px",
          marginBottom: "24px",
          color: "#34d399",
          borderLeft: "4px solid #10b981"
        }}>
          {message}
        </div>
      )}

      {/* Main Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 2fr",
        gap: "24px",
        marginBottom: "32px"
      }}>
        {/* Sidebar Browser */}
        <div style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          padding: "20px",
          height: "600px",
          display: "flex",
          flexDirection: "column"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "16px" }}>
            Knowledge Nodes
          </h2>

          <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "6px",
                padding: "8px 12px",
                color: "#e5e7eb",
                fontSize: "0.875rem",
                outline: "none"
              }}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "6px",
                padding: "8px",
                color: "#e5e7eb",
                fontSize: "0.875rem",
                outline: "none"
              }}
            >
              <option value="">All Types</option>
              <option value="doc">Doc</option>
              <option value="memory_event">Memory Event</option>
              <option value="skill">Skill</option>
              <option value="agent">Agent</option>
              <option value="task">Task</option>
              <option value="planning_episode">Plan Episode</option>
              <option value="execution_episode">Exec Episode</option>
            </select>
          </div>

          <div style={{ flex: 1, overflowY: "auto", border: "1px solid #1f2937", borderRadius: "8px", padding: "8px", backgroundColor: "#0b0f19" }}>
            {filteredNodes.map(node => (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  marginBottom: "6px",
                  cursor: "pointer",
                  backgroundColor: selectedNodeId === node.id ? "#1d4ed8" : "#1f2937",
                  transition: "background-color 0.2s"
                }}
              >
                <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{node.name}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#9ca3af", marginTop: "4px" }}>
                  <span>{node.type}</span>
                  <span style={{ fontFamily: "monospace" }}>{node.id.split(":")[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed neighborhood view / traversal */}
        <div style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          padding: "20px",
          height: "600px",
          overflowY: "auto"
        }}>
          {neighborhood ? (
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "16px" }}>
                Neighborhood Traversal for: <span style={{ color: "#60a5fa" }}>{selectedNodeId}</span>
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {/* Adjacent nodes */}
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#9ca3af", marginBottom: "10px" }}>Related Nodes</h3>
                  {neighborhood.nodes.map(n => (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNodeId(n.id)}
                      style={{
                        padding: "8px",
                        backgroundColor: n.id === selectedNodeId ? "#1e3a8a" : "#1f2937",
                        borderRadius: "6px",
                        marginBottom: "6px",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        border: n.id === selectedNodeId ? "1px solid #3b82f6" : "none"
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{n.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{n.type}</div>
                    </div>
                  ))}
                </div>

                {/* Traversal edges */}
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#9ca3af", marginBottom: "10px" }}>Semantic Connections</h3>
                  {neighborhood.edges.map((e, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "8px",
                        backgroundColor: "#1f2937",
                        borderRadius: "6px",
                        marginBottom: "6px",
                        fontSize: "0.8rem",
                        borderLeft: "4px solid #10b981"
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#10b981" }}>{e.type}</div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "4px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {e.from.split(":")[0]} $\rightarrow$ {e.to.split(":")[0]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#6b7280" }}>
              Select a knowledge node from the list to begin semantic path traversal.
            </div>
          )}
        </div>
      </div>

      {/* Hotspots & Drift reports */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "24px"
      }}>
        {/* Hotspots */}
        <div style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          padding: "20px"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "16px" }}>
            Concept Hotspots & Orphans
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <h3 style={{ fontSize: "0.95rem", color: "#9ca3af", fontWeight: 700, marginBottom: "10px" }}>Orphan Nodes</h3>
              {hotspots.orphans.length === 0 ? (
                <div style={{ fontSize: "0.85rem", color: "#6b7280", fontStyle: "italic" }}>No orphan nodes detected.</div>
              ) : (
                hotspots.orphans.slice(0, 5).map(o => (
                  <div key={o.id} style={{ fontSize: "0.85rem", padding: "6px", backgroundColor: "#1f2937", borderRadius: "4px", marginBottom: "6px" }}>
                    {o.name}
                  </div>
                ))
              )}
            </div>
            <div>
              <h3 style={{ fontSize: "0.95rem", color: "#9ca3af", fontWeight: 700, marginBottom: "10px" }}>Central Concepts</h3>
              {hotspots.centralNodes.length === 0 ? (
                <div style={{ fontSize: "0.85rem", color: "#6b7280", fontStyle: "italic" }}>No central hubs (degree $\ge$ 5) detected.</div>
              ) : (
                hotspots.centralNodes.slice(0, 5).map(c => (
                  <div key={c.id} style={{ fontSize: "0.85rem", padding: "6px", backgroundColor: "#1f2937", borderRadius: "4px", marginBottom: "6px", borderLeft: "4px solid #3b82f6" }}>
                    {c.name}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Drift Dashboard */}
        <div style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          padding: "20px"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "16px" }}>
            Documentary & State Drift Audits
          </h2>
          {drift.stateDiscrepancies.length === 0 && drift.unmappedSkills.length === 0 ? (
            <p style={{ color: "#10b981", fontSize: "0.875rem", fontStyle: "italic" }}>
              All documented outlines align cleanly with execution states and memory events. No drift detected.
            </p>
          ) : (
            <div style={{ maxHeight: "150px", overflowY: "auto" }}>
              {drift.unmappedSkills.map((us, idx) => (
                <div key={idx} style={{ fontSize: "0.85rem", color: "#fed7aa", padding: "8px", backgroundColor: "#451a03", borderRadius: "6px", marginBottom: "6px" }}>
                  {us.issue}
                </div>
              ))}
              {drift.stateDiscrepancies.map((sd, idx) => (
                <div key={idx} style={{ fontSize: "0.85rem", color: "#fca5a5", padding: "8px", backgroundColor: "#7f1d1d", borderRadius: "6px", marginBottom: "6px" }}>
                  {sd.issue}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
export default KnowledgeExplorer;
