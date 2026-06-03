// File: projects/cic/ui/src/components/mee/MetaEvolutionConsole.tsx | Date: 2026-06-03 | v1.2.0

import React, { useEffect, useState } from "react";

interface MeeTriggerEvent {
  id: string;
  type: string;
  payload: Record<string, any>;
  timestamp: number;
}

interface ValidationIssue {
  type: string;
  message: string;
}

interface ValidationReport {
  passed: boolean;
  compilePassed: boolean;
  testsPassed: boolean;
  driftPassed: boolean;
  errors: string[];
  issues?: ValidationIssue[];
}

interface PhaseProposal {
  id: string;
  title: string;
  trigger: MeeTriggerEvent;
  status: "pending" | "validated" | "rejected" | "applied";
  filesCreated: string[];
  planSummary: string;
  timestamp: number;
  validationReport?: ValidationReport;
}

interface Patch {
  path: string;
  type: "create" | "modify";
  content: string;
}

interface PatchSet {
  proposalId: string;
  patches: Patch[];
}

export function MetaEvolutionConsole() {
  const [proposals, setProposals] = useState<PhaseProposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string>("");
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [patchDetails, setPatchDetails] = useState<{ proposal: PhaseProposal; patchSet: PatchSet } | null>(null);
  const [autoStatus, setAutoStatus] = useState<{ enabled: boolean; lastRun: number | null; requireApproval: boolean }>({
    enabled: false,
    lastRun: null,
    requireApproval: true
  });

  useEffect(() => {
    fetchProposals();
    fetchAutoStatus();
    // Poll auto status every 10 seconds to show background execution diagnostics
    const interval = setInterval(fetchAutoStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchProposals = async () => {
    try {
      const res = await fetch("/v1/mee/proposals");
      const data = await res.json();
      setProposals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch MEE proposals:", err);
    }
  };

  const fetchAutoStatus = async () => {
    try {
      const res = await fetch("/v1/mee/auto/status");
      const data = await res.json();
      setAutoStatus(data);
    } catch (err) {
      console.error("Failed to fetch auto-evolution status:", err);
    }
  };

  const triggerProposalScan = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch("/v1/mee/propose", { method: "POST" });
      const data = await res.json();
      setMessage(`Scan complete. Proposal created: ${data.proposal ? data.proposal.title : "none"}`);
      fetchProposals();
    } catch (err: any) {
      setMessage(`Scan failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const pollProposalValidation = (id: string, maxAttempts = 15) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/v1/mee/proposals/${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const prop = await res.json();
        if (prop && prop.status !== "pending") {
          clearInterval(interval);
          fetchProposals();
          
          if (patchDetails && patchDetails.proposal.id === id) {
            setPatchDetails({
              ...patchDetails,
              proposal: prop
            });
            if (prop.validationReport) {
              setValidationReport(prop.validationReport);
            }
          }
          setMessage(`Validation execution complete: proposal is ${prop.status.toUpperCase()}.`);
        }
      } catch (err) {
        console.error("Error polling validation status:", err);
      }
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setMessage("Validation timed out in the background. Check logs.");
      }
    }, 2000);
  };

  const runValidation = async (id: string) => {
    setIsLoading(true);
    setMessage("Triggering validation pipeline in the background...");
    try {
      const res = await fetch(`/v1/mee/validate/${encodeURIComponent(id)}`, { method: "POST" });
      const proposal = await res.json();
      fetchProposals();
      
      // Update local state to show it is checking
      if (patchDetails) {
        setPatchDetails({
          ...patchDetails,
          proposal: { ...patchDetails.proposal, status: "pending" }
        });
      }
      setValidationReport(null);

      // Start polling for results
      pollProposalValidation(id);
    } catch (err: any) {
      setMessage(`Validation start failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatch = async (id: string) => {
    try {
      const res = await fetch(`/v1/mee/patch/${encodeURIComponent(id)}`);
      const data = await res.json();
      setPatchDetails(data);
      setSelectedProposalId(id);
      if (data.proposal?.validationReport) {
        setValidationReport(data.proposal.validationReport);
      } else {
        setValidationReport(null);
      }
    } catch (err) {
      console.error("Failed to fetch patch details:", err);
    }
  };

  const applyPatch = async (id: string) => {
    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/v1/mee/apply/${encodeURIComponent(id)}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Patch for proposal ${id} applied successfully to the workspace tree.`);
        fetchProposals();
        if (patchDetails) {
          setPatchDetails({
            ...patchDetails,
            proposal: { ...patchDetails.proposal, status: "applied" }
          });
        }
      } else {
        setMessage(`Failed to apply patch: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setMessage(`Failed to apply patch: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutoEvolution = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const endpoint = autoStatus.enabled ? "/v1/mee/auto/disable" : "/v1/mee/auto/enable";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireApproval: true })
      });
      const data = await res.json();
      if (data.ok) {
        setAutoStatus(data.status);
        setMessage(`Auto-Evolution is now ${data.status.enabled ? "ENABLED" : "DISABLED"}.`);
      } else {
        setMessage(`Failed to toggle Auto-Evolution: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Failed to toggle Auto-Evolution: ${err.message}`);
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
      <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.025em", color: "#f8fafc" }}>
            Meta‑Evolution Engine (MEE)
          </h1>
          <p style={{ color: "#64748b", marginTop: "4px" }}>
            Self-improvement substrates executing autonomous architectural phase updates
          </p>
        </div>
        <button
          onClick={triggerProposalScan}
          disabled={isLoading}
          style={{
            backgroundColor: "#2563eb",
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: "6px",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
            transition: "opacity 0.2s"
          }}
        >
          {isLoading ? "Scanning..." : "Scan CKG for Gaps"}
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
        {/* Left Column: Proposals List + Auto-Evolution Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Proposals List */}
          <div style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "20px",
            height: "450px",
            display: "flex",
            flexDirection: "column"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "16px" }}>
              Proposed Phases
            </h2>

            <div style={{ flex: 1, overflowY: "auto", border: "1px solid #1f2937", borderRadius: "8px", padding: "8px", backgroundColor: "#0b0f19" }}>
              {proposals.length === 0 ? (
                <div style={{ padding: "16px", color: "#6b7280", textAlign: "center" }}>
                  No self-evolution proposals active. Click "Scan CKG for Gaps" to analyze the current system state.
                </div>
              ) : (
                proposals.map(prop => (
                  <div
                    key={prop.id}
                    onClick={() => fetchPatch(prop.id)}
                    style={{
                      padding: "12px",
                      borderRadius: "6px",
                      marginBottom: "8px",
                      cursor: "pointer",
                      backgroundColor: selectedProposalId === prop.id ? "#1d4ed8" : "#1f2937",
                      border: "1px solid #374151",
                      transition: "background-color 0.2s"
                    }}
                  >
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#f9fafb" }}>{prop.title}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#9ca3af", marginTop: "6px" }}>
                      <span>Status: <strong style={{
                        color: prop.status === "applied" ? "#10b981" : prop.status === "validated" ? "#3b82f6" : prop.status === "rejected" ? "#ef4444" : "#f59e0b"
                      }}>{prop.status}</strong></span>
                      <span style={{ fontFamily: "monospace" }}>{prop.id.substring(0, 12)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Auto-Evolution Panel */}
          <div style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            flexDirection: "column"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "12px" }}>
              Auto-Evolution Loop
            </h2>
            <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginBottom: "16px", lineHeight: "1.4" }}>
              Enables autonomous CKG polling, plan formulation, and validation ticks.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.875rem" }}>Ticking Engine Status</span>
              <span style={{
                color: autoStatus.enabled ? "#10b981" : "#ef4444",
                fontWeight: "bold",
                fontSize: "0.875rem",
                textTransform: "uppercase"
              }}>
                {autoStatus.enabled ? "Active 🟢" : "Inactive 🔴"}
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "16px" }}>
              Last Tick: {autoStatus.lastRun ? new Date(autoStatus.lastRun).toLocaleTimeString() : "Never"}
            </div>
            <button
              onClick={toggleAutoEvolution}
              disabled={isLoading}
              style={{
                backgroundColor: autoStatus.enabled ? "#dc2626" : "#059669",
                color: "#ffffff",
                padding: "10px 14px",
                borderRadius: "6px",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity 0.2s"
              }}
            >
              {autoStatus.enabled ? "Disable Auto-Evolution" : "Enable Auto-Evolution"}
            </button>
          </div>
        </div>

        {/* Details & Actions View */}
        <div style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          padding: "20px",
          height: "700px",
          overflowY: "auto"
        }}>
          {selectedProposalId && patchDetails ? (
            <div>
              {(() => {
                const prop = patchDetails.proposal;
                return (
                  <div key={prop.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                      <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#f3f4f6" }}>
                          {prop.title}
                        </h2>
                        <span style={{ color: "#60a5fa", fontSize: "0.875rem" }}>Proposal ID: {prop.id}</span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => runValidation(prop.id)}
                          disabled={isLoading || prop.status === "applied" || prop.status === "pending"}
                          style={{
                            backgroundColor: prop.status === "applied" ? "#4b5563" : "#10b981",
                            color: "#ffffff",
                            padding: "8px 14px",
                            borderRadius: "6px",
                            border: "none",
                            fontWeight: 600,
                            cursor: (prop.status === "applied" || prop.status === "pending") ? "not-allowed" : "pointer"
                          }}
                        >
                          {prop.status === "pending" ? "Checking..." : "Run Verification"}
                        </button>
                        <button
                          onClick={() => applyPatch(prop.id)}
                          disabled={isLoading || prop.status !== "validated"}
                          style={{
                            backgroundColor: prop.status === "validated" ? "#8b5cf6" : prop.status === "applied" ? "#10b981" : "#4b5563",
                            color: "#ffffff",
                            padding: "8px 14px",
                            borderRadius: "6px",
                            border: "none",
                            fontWeight: 600,
                            cursor: prop.status === "validated" ? "pointer" : "not-allowed"
                          }}
                        >
                          {prop.status === "applied" ? "Applied" : "Apply Patch"}
                        </button>
                      </div>
                    </div>

                    <hr style={{ borderColor: "#1f2937", margin: "16px 0" }} />

                    {/* Trigger details */}
                    <div style={{ marginBottom: "20px" }}>
                      <h3 style={{ fontSize: "1rem", color: "#9ca3af", fontWeight: 700, marginBottom: "8px" }}>Trigger Context</h3>
                      <div style={{
                        fontSize: "0.875rem",
                        lineHeight: "1.5",
                        color: "#d1d5db",
                        backgroundColor: "#1f2937",
                        padding: "12px",
                        borderRadius: "6px"
                      }}>
                        <div><strong>Event ID:</strong> {prop.trigger?.id}</div>
                        <div><strong>Event Type:</strong> {prop.trigger?.type}</div>
                        <div style={{ marginTop: "6px" }}>
                          <strong>Payload:</strong>
                          <pre style={{
                            marginTop: "4px",
                            padding: "8px",
                            backgroundColor: "#0b0f19",
                            borderRadius: "4px",
                            fontFamily: "monospace",
                            overflowX: "auto"
                          }}>
                            {JSON.stringify(prop.trigger?.payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div style={{ marginBottom: "20px" }}>
                      <h3 style={{ fontSize: "1rem", color: "#9ca3af", fontWeight: 700, marginBottom: "8px" }}>Plan Summary</h3>
                      <p style={{ fontSize: "0.875rem", lineHeight: "1.5", color: "#d1d5db", backgroundColor: "#1f2937", padding: "12px", borderRadius: "6px" }}>
                        {prop.planSummary}
                      </p>
                    </div>

                    {/* Patch Preview */}
                    {patchDetails.patchSet && patchDetails.patchSet.patches.length > 0 && (
                      <div style={{ marginBottom: "20px" }}>
                        <h3 style={{ fontSize: "1rem", color: "#9ca3af", fontWeight: 700, marginBottom: "8px" }}>Patch Preview</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {patchDetails.patchSet.patches.map((p, idx) => (
                            <div key={idx} style={{
                              border: "1px solid #374151",
                              borderRadius: "6px",
                              backgroundColor: "#0b0f19",
                              padding: "12px"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.75rem", color: "#9ca3af" }}>
                                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{p.path}</span>
                                <span style={{ textTransform: "uppercase", color: p.type === "create" ? "#10b981" : "#3b82f6" }}>{p.type}</span>
                              </div>
                              <pre style={{
                                margin: 0,
                                fontFamily: "monospace",
                                fontSize: "0.8rem",
                                overflowX: "auto",
                                color: "#e2e8f0"
                              }}>
                                {p.content}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Target Files Created status */}
                    <div style={{ marginBottom: "20px" }}>
                      <h3 style={{ fontSize: "1rem", color: "#9ca3af", fontWeight: 700, marginBottom: "8px" }}>Target Files</h3>
                      <ul style={{ paddingLeft: "20px", fontSize: "0.875rem", color: "#cbd5e1" }}>
                        {prop.filesCreated.map(file => (
                          <li key={file} style={{ marginBottom: "4px" }}>
                            <code style={{ backgroundColor: "#1e293b", padding: "2px 6px", borderRadius: "4px", fontFamily: "monospace" }}>{file}</code>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Validation Report */}
                    {validationReport && (
                      <div style={{
                        backgroundColor: validationReport.passed ? "#064e3b" : "#7f1d1d",
                        border: `1px solid ${validationReport.passed ? "#047857" : "#b91c1c"}`,
                        borderRadius: "8px",
                        padding: "16px",
                        marginTop: "20px"
                      }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f9fafb", marginBottom: "12px" }}>
                          Verification Report: {validationReport.passed ? "PASSED 🟢" : "FAILED 🔴"}
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.875rem", marginBottom: "12px" }}>
                          <div>Typecheck: <strong>{validationReport.compilePassed ? "PASSED" : "FAILED"}</strong></div>
                          <div>Tests Run: <strong>{validationReport.testsPassed ? "PASSED" : "FAILED"}</strong></div>
                          <div>Doc Drift Check: <strong>{validationReport.driftPassed ? "PASSED" : "FAILED"}</strong></div>
                        </div>
                        {validationReport.issues && validationReport.issues.length > 0 && (
                          <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "12px" }}>
                            <strong style={{ fontSize: "0.875rem", display: "block", marginBottom: "6px" }}>Detailed Issues:</strong>
                            <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.8rem", color: "#f9fafb" }}>
                              {validationReport.issues.map((issue, idx) => (
                                <li key={idx} style={{ marginBottom: "4px" }}>
                                  <span style={{ textTransform: "uppercase", fontWeight: "bold", color: issue.type === "conflict" ? "#f59e0b" : "#f87171", marginRight: "6px" }}>
                                    [{issue.type}]
                                  </span>
                                  {issue.message}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#6b7280" }}>
              Select a self-improvement proposal from the list to view its specification, patch contents, and verification audits.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MetaEvolutionConsole;
