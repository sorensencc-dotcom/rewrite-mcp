// File: projects/cic/ui/src/components/mee/MetaEvolutionConsole.tsx | Date: 2026-06-03 | v1.4.0

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

interface RefactorInsight {
  id: string;
  file: string;
  type:
    | "complexity"
    | "duplication"
    | "dead_code"
    | "unused_import"
    | "long_function"
    | "large_module"
    | "drift"
    | "style"
    | "architecture";
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  location?: {
    startLine: number;
    endLine: number;
  };
  metadata?: Record<string, any>;
}

interface RefactorPlan {
  insights: RefactorInsight[];
  patches: Patch[];
  summary: string;
}

interface PhaseProposal {
  id: string;
  title: string;
  trigger?: MeeTriggerEvent;
  status: "pending" | "validated" | "rejected" | "applied" | "proposed";
  filesCreated: string[];
  planSummary: string;
  timestamp: number;
  validationReport?: ValidationReport;
  refactorPlan?: RefactorPlan;
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

interface DiffChunk {
  type: "context" | "add" | "remove";
  oldLine: number | null;
  newLine: number | null;
  content: string;
}

interface DiffResult {
  path: string;
  oldContent: string | null;
  newContent: string;
  chunks: DiffChunk[];
}

interface ProposalGraph {
  nodes: { id: string; title: string; status: string }[];
  edges: { from: string; to: string; reason: string }[];
  conflicts: { proposalA: string; proposalB: string; path: string; type: string }[];
}

interface NegotiationTranscriptEntry {
  round: number;
  agentA: string;
  agentB: string;
  resolution: { type: string; reason: string; details?: any } | null;
}

export function MetaEvolutionConsole() {
  const [proposals, setProposals] = useState<PhaseProposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string>("");
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [patchDetails, setPatchDetails] = useState<{ proposal: PhaseProposal; patchSet: PatchSet } | null>(null);

  const [activeTab, setActiveTab] = useState<"evolution" | "refactor" | "planning" | "runs" | "safety">("evolution");
  const [refactorInsights, setRefactorInsights] = useState<RefactorInsight[]>([]);
  const [isScanningRefactor, setIsScanningRefactor] = useState<boolean>(false);

  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [selectedRunData, setSelectedRunData] = useState<{ run: any; checkpoints: any[] } | null>(null);
  const [isFetchingRuns, setIsFetchingRuns] = useState<boolean>(false);

  const overrideSafetyCheck = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/v1/mee/proposals/${encodeURIComponent(id)}/override`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Safety check overridden successfully for proposal ${id}.`);
        fetchProposals();
        if (patchDetails && patchDetails.proposal.id === id) {
          setPatchDetails({
            ...patchDetails,
            proposal: data.data
          });
        }
      } else {
        setMessage(`Failed to override safety check: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Failed to override safety check: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRuns = async () => {
    setIsFetchingRuns(true);
    try {
      const res = await fetch("/v1/mee/runs");
      const data = await res.json();
      if (data.ok) {
        setRuns(Array.isArray(data.data.runs) ? data.data.runs : []);
      }
    } catch (err) {
      console.error("Failed to fetch runs:", err);
    } finally {
      setIsFetchingRuns(false);
    }
  };

  const fetchRunDetails = async (id: string) => {
    try {
      const res = await fetch(`/v1/mee/runs/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.ok) {
        setSelectedRunData(data.data);
        setSelectedRunId(id);
      }
    } catch (err) {
      console.error("Failed to fetch run details:", err);
    }
  };

  const cancelRun = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/v1/mee/runs/${encodeURIComponent(id)}/cancel`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Run ${id} cancelled successfully.`);
        fetchRuns();
        fetchRunDetails(id);
      } else {
        setMessage(`Failed to cancel run: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Failed to cancel run: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createManualCheckpoint = async (id: string) => {
    const label = prompt("Enter checkpoint label (optional):") || undefined;
    setIsLoading(true);
    try {
      const res = await fetch(`/v1/mee/runs/${encodeURIComponent(id)}/checkpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, data: { manual: true, timestamp: Date.now() } })
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Checkpoint created successfully.`);
        fetchRunDetails(id);
      } else {
        setMessage(`Failed to create checkpoint: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Failed to create checkpoint: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const [planRequest, setPlanRequest] = useState("");
  const [plan, setPlan] = useState<any | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);

  const runRefactorScan = async () => {
    setIsScanningRefactor(true);
    setMessage("");
    try {
      const res = await fetch("/v1/mee/refactor/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "repo" })
      });
      const data = await res.json();
      if (data.ok) {
        setRefactorInsights(data.data.insights || []);
        setMessage(`Scan complete. Found ${data.data.insights?.length || 0} refactor insights.`);
      } else {
        setMessage(`Scan failed: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Scan failed: ${err.message}`);
    } finally {
      setIsScanningRefactor(false);
    }
  };

  const generateRefactorProposal = async () => {
    if (refactorInsights.length === 0) return;
    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch("/v1/mee/refactor/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insights: refactorInsights })
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Proposal generated successfully. ID: ${data.data.proposalId}`);
        setRefactorInsights([]);
        setActiveTab("evolution");
        fetchProposals();
        fetchGraph();
        if (data.data.proposalId) {
          fetchPatch(data.data.proposalId);
        }
      } else {
        setMessage(`Failed to generate proposal: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Failed to generate proposal: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePlan = async () => {
    if (!planRequest) return;
    setIsGeneratingPlan(true);
    setMessage("");
    try {
      const r = await fetch("/v1/mee/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: planRequest }),
      });
      const json = await r.json();
      if (json.ok) {
        setPlan(json.data.plan);
        setMessage(`Plan generated successfully. Created ${json.data.plan.tasks.length} tasks.`);
        fetchProposals();
        fetchGraph();
      } else {
        setMessage(`Plan generation failed: ${json.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Plan generation failed: ${err.message}`);
    } finally {
      setIsGeneratingPlan(false);
    }
  };
  
  // Phase 30F, 30G, 30H States
  const [diffs, setDiffs] = useState<DiffResult[] | null>(null);
  const [diffMode, setDiffMode] = useState<"side-by-side" | "unified">("side-by-side");
  const [proposalGraph, setProposalGraph] = useState<ProposalGraph | null>(null);
  const [conflicts, setConflicts] = useState<any[] | null>(null);
  const [negotiation, setNegotiation] = useState<{ consensus: PhaseProposal[]; transcript: NegotiationTranscriptEntry[] } | null>(null);
  
  const [autoStatus, setAutoStatus] = useState<{ enabled: boolean; lastRun: number | null; requireApproval: boolean }>({
    enabled: false,
    lastRun: null,
    requireApproval: true
  });

  useEffect(() => {
    fetchProposals();
    fetchAutoStatus();
    fetchGraph();
    fetchRuns();
    const interval = setInterval(() => {
      fetchAutoStatus();
      fetchGraph();
      fetchRuns();
      if (selectedRunId) {
        fetchRunDetails(selectedRunId);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedRunId]);

  const fetchProposals = async () => {
    try {
      const res = await fetch("/v1/mee/proposals");
      const data = await res.json();
      if (data.ok) {
        setProposals(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error("Failed to fetch MEE proposals:", err);
    }
  };

  const fetchAutoStatus = async () => {
    try {
      const res = await fetch("/v1/mee/auto/status");
      const data = await res.json();
      if (data.ok) {
        setAutoStatus(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch auto-evolution status:", err);
    }
  };

  const fetchGraph = async () => {
    try {
      const res = await fetch("/v1/mee/proposals/graph");
      const data = await res.json();
      if (data.ok) {
        setProposalGraph(data.data);
        setConflicts(data.data.conflicts);
      }
    } catch (err) {
      console.error("Failed to fetch proposals graph:", err);
    }
  };

  const triggerProposalScan = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch("/v1/mee/propose", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Scan complete. Proposal created: ${data.data.proposal ? data.data.proposal.title : "none"}`);
        fetchProposals();
        fetchGraph();
      } else {
        setMessage(`Scan failed: ${data.error.message}`);
      }
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
        const data = await res.json();
        if (data.ok && data.data && data.data.status !== "pending") {
          clearInterval(interval);
          fetchProposals();
          fetchGraph();
          
          if (patchDetails && patchDetails.proposal.id === id) {
            setPatchDetails({
              ...patchDetails,
              proposal: data.data
            });
            if (data.data.validationReport) {
              setValidationReport(data.data.validationReport);
            }
          }
          setMessage(`Validation execution complete: proposal is ${data.data.status.toUpperCase()}.`);
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
      const data = await res.json();
      if (data.ok) {
        fetchProposals();
        fetchGraph();
        
        if (patchDetails) {
          setPatchDetails({
            ...patchDetails,
            proposal: { ...patchDetails.proposal, status: "pending" }
          });
        }
        setValidationReport(null);
        pollProposalValidation(id);
      } else {
        setMessage(`Validation start failed: ${data.error.message}`);
      }
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
      if (data.ok) {
        setPatchDetails(data.data);
        setSelectedProposalId(id);
        if (data.data.proposal?.validationReport) {
          setValidationReport(data.data.proposal.validationReport);
        } else {
          setValidationReport(null);
        }
        // Load line-by-line diffs
        loadDiffs(id);
      }
    } catch (err) {
      console.error("Failed to fetch patch details:", err);
    }
  };

  const loadDiffs = async (id: string) => {
    try {
      const res = await fetch(`/v1/mee/diff/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.ok) {
        setDiffs(data.data.diffs);
      }
    } catch (err) {
      console.error("Failed to load patch diffs:", err);
    }
  };

  const applyPatch = async (id: string) => {
    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/v1/mee/apply/${encodeURIComponent(id)}`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage(`Patch for proposal ${id} applied successfully to the workspace tree.`);
        fetchProposals();
        fetchGraph();
        if (patchDetails) {
          setPatchDetails({
            ...patchDetails,
            proposal: { ...patchDetails.proposal, status: "applied" }
          });
        }
      } else {
        const errorMsg = data.error?.message || "Unknown error";
        setMessage(`Failed to apply patch: ${errorMsg}`);
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
        setAutoStatus(data.data.status);
        setMessage(`Auto-Evolution is now ${data.data.status.enabled ? "ENABLED" : "DISABLED"}.`);
      } else {
        setMessage(`Failed to toggle Auto-Evolution: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Failed to toggle Auto-Evolution: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const validateAllProposals = async () => {
    setIsLoading(true);
    setMessage("Validating all proposals sequentially...");
    try {
      const res = await fetch("/v1/mee/proposals/validate-all", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage("All proposals validated successfully in topologically sorted order.");
        fetchProposals();
        fetchGraph();
      } else {
        setMessage(`Validation all failed: ${data.error.message}`);
        if (data.error.details?.conflicts) {
          setConflicts(data.error.details.conflicts);
        }
      }
    } catch (err: any) {
      setMessage(`Validation all failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const applyAllProposals = async () => {
    setIsLoading(true);
    setMessage("Applying all proposals in dependency order...");
    try {
      const res = await fetch("/v1/mee/proposals/apply-all", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Successfully applied proposals: ${data.data.applied.join(", ")}`);
        fetchProposals();
        fetchGraph();
      } else {
        setMessage(`Apply all failed: ${data.error.message}`);
        if (data.error.details?.conflicts) {
          setConflicts(data.error.details.conflicts);
        }
      }
    } catch (err: any) {
      setMessage(`Apply all failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runNegotiation = async () => {
    setIsLoading(true);
    setMessage("Running Agent-to-Agent conflict resolution negotiation rounds...");
    try {
      const res = await fetch("/v1/mee/proposals/negotiate", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setNegotiation(data.data);
        setMessage("Multi-agent negotiation rounds complete. Stable consensus ordering resolved.");
        fetchProposals();
        fetchGraph();
      } else {
        setMessage(`Negotiation failed: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Negotiation failed: ${err.message}`);
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
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={validateAllProposals}
            disabled={isLoading || proposals.length === 0}
            style={{
              backgroundColor: "#1f2937",
              color: "#ffffff",
              border: "1px solid #374151",
              padding: "10px 18px",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: (isLoading || proposals.length === 0) ? "not-allowed" : "pointer",
              transition: "opacity 0.2s"
            }}
          >
            Validate All
          </button>
          <button
            onClick={applyAllProposals}
            disabled={isLoading || proposals.length === 0}
            style={{
              backgroundColor: "#8b5cf6",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: "6px",
              border: "none",
              fontWeight: 600,
              cursor: (isLoading || proposals.length === 0) ? "not-allowed" : "pointer",
              transition: "opacity 0.2s"
            }}
          >
            Apply All
          </button>
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
              cursor: pointer => isLoading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
              transition: "opacity 0.2s"
            }}
          >
            {isLoading ? "Scanning..." : "Scan CKG for Gaps"}
          </button>
        </div>
      </header>

      {message && (
        <div style={{
          padding: "12px",
          backgroundColor: "#1f2937",
          borderRadius: "8px",
          marginBottom: "24px",
          color: "#34d399",
          borderLeft: "4px solid #10b981",
          fontSize: "0.9rem"
        }}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", borderBottom: "1px solid #1f2937", paddingBottom: "12px" }}>
        <button
          onClick={() => setActiveTab("evolution")}
          style={{
            backgroundColor: "transparent",
            color: activeTab === "evolution" ? "#3b82f6" : "#9ca3af",
            border: "none",
            borderBottom: activeTab === "evolution" ? "2px solid #3b82f6" : "none",
            padding: "8px 16px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Evolution Pipeline
        </button>
        <button
          onClick={() => setActiveTab("refactor")}
          style={{
            backgroundColor: "transparent",
            color: activeTab === "refactor" ? "#3b82f6" : "#9ca3af",
            border: "none",
            borderBottom: activeTab === "refactor" ? "2px solid #3b82f6" : "none",
            padding: "8px 16px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Self-Refactor Studio
        </button>
        <button
          onClick={() => setActiveTab("planning")}
          style={{
            backgroundColor: "transparent",
            color: activeTab === "planning" ? "#3b82f6" : "#9ca3af",
            border: "none",
            borderBottom: activeTab === "planning" ? "2px solid #3b82f6" : "none",
            padding: "8px 16px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Planning Studio
        </button>
        <button
          onClick={() => {
            setActiveTab("runs");
            fetchRuns();
          }}
          style={{
            backgroundColor: "transparent",
            color: activeTab === "runs" ? "#3b82f6" : "#9ca3af",
            border: "none",
            borderBottom: activeTab === "runs" ? "2px solid #3b82f6" : "none",
            padding: "8px 16px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Execution Runs
        </button>
        <button
          onClick={() => {
            setActiveTab("safety");
          }}
          style={{
            backgroundColor: "transparent",
            color: activeTab === "safety" ? "#3b82f6" : "#9ca3af",
            border: "none",
            borderBottom: activeTab === "safety" ? "2px solid #3b82f6" : "none",
            padding: "8px 16px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Safety Center
        </button>
      </div>

      {/* Main Grid */}
      {activeTab === "evolution" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "24px",
          marginBottom: "32px"
        }}>
        {/* Left Column: Proposals List + Auto-Evolution Panel + Graph & Conflicts + Negotiation */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Proposals List */}
          <div style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "20px",
            height: "400px",
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

          {/* Dependency Graph & Conflicts Panel */}
          <div style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            flexDirection: "column"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "12px" }}>
              Evolution Pipeline Graph
            </h2>
            {conflicts && conflicts.length > 0 && (
              <div style={{
                backgroundColor: "#7f1d1d",
                border: "1px solid #b91c1c",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "16px",
                fontSize: "0.8rem",
                color: "#fca5a5"
              }}>
                <strong>Conflicts Detected:</strong>
                <ul style={{ margin: "6px 0 0 0", paddingLeft: "16px" }}>
                  {conflicts.map((c, idx) => (
                    <li key={idx}>
                      {c.proposalA.substring(0, 8)} ↔ {c.proposalB.substring(0, 8)} on <code style={{ backgroundColor: "rgba(0,0,0,0.3)", padding: "1px 4px", borderRadius: "3px" }}>{c.path}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {proposalGraph && proposalGraph.edges.length > 0 ? (
              <div style={{ fontSize: "0.8rem", backgroundColor: "#0b0f19", border: "1px solid #1f2937", borderRadius: "8px", padding: "12px" }}>
                <strong>Dependency Edges:</strong>
                <ul style={{ margin: "6px 0 0 0", paddingLeft: "16px", color: "#9ca3af" }}>
                  {proposalGraph.edges.map((e: any, idx: number) => (
                    <li key={idx} style={{ marginBottom: "4px" }}>
                      <strong style={{ color: "#e2e8f0" }}>{e.from.substring(0, 8)}</strong> &rarr; <strong style={{ color: "#e2e8f0" }}>{e.to.substring(0, 8)}</strong>
                      <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>{e.reason}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div style={{ fontSize: "0.8rem", color: "#6b7280", textAlign: "center", padding: "12px" }}>
                No active cross-proposal dependency chains.
              </div>
            )}
          </div>

          {/* Agent Negotiation Panel */}
          <div style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", margin: 0 }}>
                Agent Negotiation
              </h2>
              <button
                onClick={runNegotiation}
                disabled={isLoading || proposals.length === 0}
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "none",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: (isLoading || proposals.length === 0) ? "not-allowed" : "pointer"
                }}
              >
                Trigger
              </button>
            </div>
            {negotiation && negotiation.transcript.length > 0 ? (
              <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid #1f2937", borderRadius: "8px", padding: "10px", backgroundColor: "#0b0f19" }}>
                {negotiation.transcript.map((t, idx) => (
                  <div key={idx} style={{ fontSize: "0.75rem", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #1f2937", lineHeight: "1.4" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#60a5fa", fontWeight: 600, marginBottom: "2px" }}>
                      <span>Round {t.round}</span>
                      <span style={{ color: t.resolution ? "#f59e0b" : "#10b981" }}>
                        {t.resolution ? "CONFLICT ⚠️" : "COMPATIBLE ✅"}
                      </span>
                    </div>
                    <div style={{ color: "#9ca3af" }}>
                      Agent <code style={{ backgroundColor: "#1f2937", padding: "1px 3px", borderRadius: "2px" }}>{t.agentA.substring(0, 8)}</code> 
                      &hArr; 
                      Agent <code style={{ backgroundColor: "#1f2937", padding: "1px 3px", borderRadius: "2px" }}>{t.agentB.substring(0, 8)}</code>
                    </div>
                    {t.resolution && (
                      <div style={{ marginTop: "4px", color: "#cbd5e1" }}>
                        <span style={{ textTransform: "uppercase", fontWeight: "bold", color: "#ef4444", fontSize: "0.7rem", marginRight: "4px" }}>
                          [{t.resolution.type}]
                        </span>
                        {t.resolution.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: 0, textAlign: "center", padding: "12px" }}>
                No negotiation logs active. Click "Trigger" to execute agent-to-agent conflict resolution.
              </p>
            )}
          </div>
        </div>

        {/* Details & Actions View */}
        <div style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          padding: "20px",
          height: "1100px",
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

                    {prop.refactorPlan && (
                      <div style={{ marginBottom: "20px" }}>
                        <h3 style={{ fontSize: "1rem", color: "#9ca3af", fontWeight: 700, marginBottom: "8px" }}>Refactor Insights</h3>
                        <div style={{ backgroundColor: "#1f2937", padding: "12px", borderRadius: "6px" }}>
                          {prop.refactorPlan.insights.map((insight, idx) => (
                            <div key={idx} style={{ borderBottom: idx < prop.refactorPlan!.insights.length - 1 ? "1px solid #374151" : "none", padding: "8px 0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#f3f4f6", fontFamily: "monospace" }}>{insight.file}</span>
                                <span style={{
                                  fontSize: "0.75rem",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  backgroundColor: insight.severity === "critical" || insight.severity === "high" ? "#7f1d1d" : insight.severity === "medium" ? "#78350f" : "#111827",
                                  color: insight.severity === "critical" || insight.severity === "high" ? "#fca5a5" : insight.severity === "medium" ? "#fde68a" : "#cbd5e1"
                                }}>
                                  {insight.severity}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "4px" }}>
                                [{insight.type.toUpperCase()}] {insight.message}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Diff Preview Panel */}
                    {diffs && diffs.length > 0 && (
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <h3 style={{ fontSize: "1rem", color: "#9ca3af", fontWeight: 700, margin: 0 }}>Line-Level Diff Preview</h3>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => setDiffMode("side-by-side")}
                              style={{
                                backgroundColor: diffMode === "side-by-side" ? "#2563eb" : "#1f2937",
                                color: "#ffffff",
                                border: "1px solid #374151",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                cursor: "pointer"
                              }}
                            >
                              Side-by-Side
                            </button>
                            <button
                              onClick={() => setDiffMode("unified")}
                              style={{
                                backgroundColor: diffMode === "unified" ? "#2563eb" : "#1f2937",
                                color: "#ffffff",
                                border: "1px solid #374151",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                cursor: "pointer"
                              }}
                            >
                              Unified
                            </button>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                          {diffs.map((d, idx) => (
                            <div key={idx} style={{
                              border: "1px solid #374151",
                              borderRadius: "6px",
                              backgroundColor: "#0b0f19",
                              overflowX: "auto"
                            }}>
                              <div style={{ backgroundColor: "#1f2937", padding: "8px 12px", borderBottom: "1px solid #374151", fontSize: "0.75rem", fontFamily: "monospace", color: "#cbd5e1" }}>
                                {d.path}
                              </div>

                              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: "0.8rem", color: "#cbd5e1" }}>
                                <tbody>
                                  {diffMode === "side-by-side" ? (
                                    d.chunks.map((c, cidx) => {
                                      let leftBg = "transparent";
                                      let rightBg = "transparent";
                                      if (c.type === "remove") leftBg = "#451a21";
                                      if (c.type === "add") rightBg = "#052e16";

                                      return (
                                        <tr key={cidx} style={{ borderBottom: "1px solid #1f2937" }}>
                                          <td style={{ width: "40px", padding: "4px 8px", color: "#4b5563", borderRight: "1px solid #1f2937", textAlign: "right", backgroundColor: leftBg, userSelect: "none" }}>
                                            {c.oldLine ?? ""}
                                          </td>
                                          <td style={{ padding: "4px 12px", borderRight: "1px solid #1f2937", backgroundColor: leftBg, whiteSpace: "pre-wrap" }}>
                                            {c.type === "remove" || c.type === "context" ? c.content : ""}
                                          </td>
                                          <td style={{ width: "40px", padding: "4px 8px", color: "#4b5563", borderRight: "1px solid #1f2937", textAlign: "right", backgroundColor: rightBg, userSelect: "none" }}>
                                            {c.newLine ?? ""}
                                          </td>
                                          <td style={{ padding: "4px 12px", backgroundColor: rightBg, whiteSpace: "pre-wrap" }}>
                                            {c.type === "add" || c.type === "context" ? c.content : ""}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    d.chunks.map((c, cidx) => {
                                      let lineBg = "transparent";
                                      let prefix = " ";
                                      if (c.type === "remove") {
                                        lineBg = "#451a21";
                                        prefix = "-";
                                      }
                                      if (c.type === "add") {
                                        lineBg = "#052e16";
                                        prefix = "+";
                                      }

                                      return (
                                        <tr key={cidx} style={{ backgroundColor: lineBg, borderBottom: "1px solid #1f2937" }}>
                                          <td style={{ width: "40px", padding: "4px 8px", color: "#4b5563", borderRight: "1px solid #1f2937", textAlign: "right", userSelect: "none" }}>
                                            {c.oldLine ?? ""}
                                          </td>
                                          <td style={{ width: "40px", padding: "4px 8px", color: "#4b5563", borderRight: "1px solid #1f2937", textAlign: "right", userSelect: "none" }}>
                                            {c.newLine ?? ""}
                                          </td>
                                          <td style={{ width: "20px", padding: "4px 8px", color: c.type === "add" ? "#10b981" : c.type === "remove" ? "#ef4444" : "#4b5563", userSelect: "none", textAlign: "center" }}>
                                            {prefix}
                                          </td>
                                          <td style={{ padding: "4px 12px", whiteSpace: "pre-wrap" }}>
                                            {c.content}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "100%", color: "#6b7280" }}>
              Select a self-improvement proposal from the list to view its specification, patch contents, and verification audits.
            </div>
          )}
        </div>
      )}

      {activeTab === "refactor" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "24px",
          marginBottom: "32px"
        }}>
          {/* Left Column: Actions and Scan Insights List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{
              backgroundColor: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "12px",
              padding: "20px",
              display: "flex",
              flexDirection: "column"
            }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "12px" }}>
                Refactor Scanner
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "16px", lineHeight: "1.4" }}>
                Execute a TypeScript AST parser audit across MEE module components to check cyclomatic complexity, dead code, unused imports, long functions, or architectural boundary violations.
              </p>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={runRefactorScan}
                  disabled={isScanningRefactor}
                  style={{
                    flex: 1,
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    border: "none",
                    fontWeight: 600,
                    cursor: isScanningRefactor ? "not-allowed" : "pointer",
                    transition: "opacity 0.2s"
                  }}
                >
                  {isScanningRefactor ? "Scanning AST..." : "Run Scanner"}
                </button>
                <button
                  onClick={generateRefactorProposal}
                  disabled={refactorInsights.length === 0 || isLoading}
                  style={{
                    flex: 1,
                    backgroundColor: "#8b5cf6",
                    color: "#ffffff",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    border: "none",
                    fontWeight: 600,
                    cursor: (refactorInsights.length === 0 || isLoading) ? "not-allowed" : "pointer",
                    transition: "opacity 0.2s"
                  }}
                >
                  Generate Proposal
                </button>
              </div>
            </div>

            {/* Severity Stats block */}
            {refactorInsights.length > 0 && (
              <div style={{
                backgroundColor: "#111827",
                border: "1px solid #1f2937",
                borderRadius: "12px",
                padding: "20px"
              }}>
                <h3 style={{ fontSize: "1rem", color: "#f3f4f6", fontWeight: 600, marginBottom: "12px" }}>Insight Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ padding: "8px", backgroundColor: "#1e293b", borderRadius: "6px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#f87171" }}>
                      {refactorInsights.filter(i => i.severity === "high" || i.severity === "critical").length}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>High/Critical</div>
                  </div>
                  <div style={{ padding: "8px", backgroundColor: "#1e293b", borderRadius: "6px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#fbbf24" }}>
                      {refactorInsights.filter(i => i.severity === "medium").length}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Medium</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Insights List Table / Detail Grid */}
          <div style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "20px",
            minHeight: "600px",
            display: "flex",
            flexDirection: "column"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "16px" }}>
              Code Quality Audits
            </h2>
            <div style={{ flex: 1, overflowY: "auto", border: "1px solid #1f2937", borderRadius: "8px", padding: "8px", backgroundColor: "#0b0f19" }}>
              {refactorInsights.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "400px", color: "#6b7280", padding: "24px" }}>
                  <span style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🔍</span>
                  <div style={{ fontSize: "1rem", fontWeight: 600, color: "#9ca3af" }}>No insights loaded</div>
                  <p style={{ fontSize: "0.85rem", color: "#6b7280", textAlign: "center", marginTop: "6px", maxWidth: "320px" }}>
                    Click "Run Scanner" to start static AST analysis on the workspace components.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {refactorInsights.map((insight) => (
                    <div
                      key={insight.id}
                      style={{
                        padding: "16px",
                        borderRadius: "8px",
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <code style={{ fontSize: "0.85rem", color: "#60a5fa", fontWeight: "bold", fontFamily: "monospace" }}>
                            {insight.file}
                          </code>
                          {insight.location && (
                            <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginLeft: "8px" }}>
                              (Lines {insight.location.startLine}–{insight.location.endLine})
                            </span>
                          )}
                        </div>
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          backgroundColor: insight.severity === "critical" || insight.severity === "high" ? "#7f1d1d" : insight.severity === "medium" ? "#78350f" : "#111827",
                          color: insight.severity === "critical" || insight.severity === "high" ? "#fca5a5" : insight.severity === "medium" ? "#fde68a" : "#cbd5e1"
                        }}>
                          {insight.severity.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                        <span style={{
                          fontSize: "0.7rem",
                          backgroundColor: "#1e293b",
                          color: "#9ca3af",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          textTransform: "uppercase"
                        }}>
                          {insight.type}
                        </span>
                        <p style={{ fontSize: "0.875rem", color: "#e2e8f0", margin: 0 }}>
                          {insight.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "planning" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "24px",
          marginBottom: "32px"
        }}>
          {/* Left Column: Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{
              backgroundColor: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "12px",
              padding: "20px",
              display: "flex",
              flexDirection: "column"
            }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "12px" }}>
                Planning Agent
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "16px", lineHeight: "1.4" }}>
                Decompose a high-level development instruction into sub-tasks, establish logical dependencies, and create proposals automatically.
              </p>
              <textarea
                value={planRequest}
                onChange={(e) => setPlanRequest(e.target.value)}
                placeholder="Example: Add new extractor, update the UI, and refactor the validator."
                style={{
                  width: "100%",
                  height: "100px",
                  padding: "12px",
                  backgroundColor: "#0b0f19",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  color: "#e2e8f0",
                  fontFamily: "inherit",
                  fontSize: "0.875rem",
                  resize: "none",
                  marginBottom: "16px",
                  boxSizing: "border-box"
                }}
              />
              <button
                onClick={generatePlan}
                disabled={isGeneratingPlan || !planRequest}
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  border: "none",
                  fontWeight: 600,
                  cursor: (isGeneratingPlan || !planRequest) ? "not-allowed" : "pointer",
                  transition: "opacity 0.2s"
                }}
              >
                {isGeneratingPlan ? "Generating Plan..." : "Generate Plan"}
              </button>
            </div>
          </div>

          {/* Right Column: Decomposed Tasks List */}
          <div style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "20px",
            minHeight: "600px",
            display: "flex",
            flexDirection: "column"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "16px" }}>
              Planned Execution Sequence
            </h2>
            <div style={{ flex: 1, overflowY: "auto", border: "1px solid #1f2937", borderRadius: "8px", padding: "8px", backgroundColor: "#0b0f19" }}>
              {!plan ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "400px", color: "#6b7280", padding: "24px" }}>
                  <span style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📋</span>
                  <div style={{ fontSize: "1rem", fontWeight: 600, color: "#9ca3af" }}>No plan active</div>
                  <p style={{ fontSize: "0.85rem", color: "#6b7280", textAlign: "center", marginTop: "6px", maxWidth: "320px" }}>
                    Enter an instruction on the left to decompose it into dependency-ordered proposals.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {plan.tasks.map((task: any, idx: number) => (
                    <div
                      key={task.id}
                      style={{
                        padding: "16px",
                        borderRadius: "8px",
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            backgroundColor: "#1e293b",
                            color: "#9ca3af",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            border: "1px solid #374151"
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f3f4f6" }}>
                            {task.title}
                          </span>
                        </div>
                        <span style={{
                          fontSize: "0.7rem",
                          backgroundColor: "#1e293b",
                          color: "#9ca3af",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          textTransform: "uppercase"
                        }}>
                          {task.type}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "#9ca3af", margin: "8px 0 0 32px" }}>
                        {task.description}
                      </p>
                      {task.dependsOn.length > 0 && (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "8px", marginLeft: "32px", fontSize: "0.75rem", color: "#64748b" }}>
                          <span>Depends on:</span>
                          {task.dependsOn.map((depId: string) => (
                            <code key={depId} style={{ backgroundColor: "#0b0f19", color: "#60a5fa", padding: "1px 4px", borderRadius: "3px", fontFamily: "monospace" }}>
                              {depId.substring(0, 8)}
                            </code>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "runs" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "24px",
          marginBottom: "32px"
        }}>
          {/* Left Column: Runs List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{
              backgroundColor: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "12px",
              padding: "20px",
              height: "600px",
              display: "flex",
              flexDirection: "column"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", margin: 0 }}>
                  Execution Runs
                </h2>
                <button
                  onClick={fetchRuns}
                  disabled={isFetchingRuns}
                  style={{
                    backgroundColor: "#1f2937",
                    color: "#ffffff",
                    border: "1px solid #374151",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Refresh
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", border: "1px solid #1f2937", borderRadius: "8px", padding: "8px", backgroundColor: "#0b0f19" }}>
                {runs.length === 0 ? (
                  <div style={{ padding: "16px", color: "#6b7280", textAlign: "center" }}>
                    No execution runs found. Runs will be created when proposals are executed.
                  </div>
                ) : (
                  runs.map(r => {
                    let badgeBg = "#1f2937";
                    let badgeColor = "#9ca3af";
                    if (r.status === "completed") { badgeBg = "#064e3b"; badgeColor = "#10b981"; }
                    else if (r.status === "running") { badgeBg = "#1e3a8a"; badgeColor = "#3b82f6"; }
                    else if (r.status === "failed") { badgeBg = "#7f1d1d"; badgeColor = "#ef4444"; }
                    else if (r.status === "canceled") { badgeBg = "#374151"; badgeColor = "#9ca3af"; }
                    else if (r.status === "pending") { badgeBg = "#78350f"; badgeColor = "#fbbf24"; }

                    return (
                      <div
                        key={r.id}
                        onClick={() => fetchRunDetails(r.id)}
                        style={{
                          padding: "12px",
                          borderRadius: "6px",
                          marginBottom: "8px",
                          cursor: "pointer",
                          backgroundColor: selectedRunId === r.id ? "#1d4ed8" : "#1f2937",
                          border: "1px solid #374151",
                          transition: "background-color 0.2s"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#f9fafb", fontFamily: "monospace" }}>
                            {r.id.substring(0, 8)}...
                          </span>
                          <span style={{
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            textTransform: "uppercase"
                          }}>
                            {r.status}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#9ca3af", marginTop: "8px" }}>
                          <span>Step: {r.currentStepIndex} / {r.totalSteps}</span>
                          <span>{new Date(r.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Run Details */}
          <div style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "20px",
            minHeight: "600px"
          }}>
            {selectedRunId && selectedRunData ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#f3f4f6", margin: 0 }}>
                      Run Execution Detail
                    </h2>
                    <span style={{ color: "#60a5fa", fontSize: "0.875rem", fontFamily: "monospace" }}>
                      ID: {selectedRunData.run.id}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => createManualCheckpoint(selectedRunData.run.id)}
                      disabled={isLoading || selectedRunData.run.status !== "running"}
                      style={{
                        backgroundColor: "#1f2937",
                        color: "#ffffff",
                        border: "1px solid #374151",
                        padding: "8px 14px",
                        borderRadius: "6px",
                        fontWeight: 600,
                        cursor: (isLoading || selectedRunData.run.status !== "running") ? "not-allowed" : "pointer"
                      }}
                    >
                      Checkpoint
                    </button>
                    <button
                      onClick={() => cancelRun(selectedRunData.run.id)}
                      disabled={isLoading || (selectedRunData.run.status !== "running" && selectedRunData.run.status !== "pending")}
                      style={{
                        backgroundColor: "#dc2626",
                        color: "#ffffff",
                        padding: "8px 14px",
                        borderRadius: "6px",
                        border: "none",
                        fontWeight: 600,
                        cursor: (isLoading || (selectedRunData.run.status !== "running" && selectedRunData.run.status !== "pending")) ? "not-allowed" : "pointer"
                      }}
                    >
                      Cancel Run
                    </button>
                  </div>
                </div>

                <hr style={{ borderColor: "#1f2937", margin: "16px 0" }} />

                {/* Progress Bar & Status */}
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "6px" }}>
                    <span>Step Progress ({selectedRunData.run.currentStepIndex} / {selectedRunData.run.totalSteps} Completed)</span>
                    <strong style={{ color: "#3b82f6" }}>
                      {selectedRunData.run.totalSteps > 0 
                        ? Math.round((selectedRunData.run.currentStepIndex / selectedRunData.run.totalSteps) * 100) 
                        : 0}%
                    </strong>
                  </div>
                  <div style={{ width: "100%", height: "8px", backgroundColor: "#1f2937", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{
                      width: `${selectedRunData.run.totalSteps > 0 ? (selectedRunData.run.currentStepIndex / selectedRunData.run.totalSteps) * 100 : 0}%`,
                      height: "100%",
                      backgroundColor: "#3b82f6",
                      transition: "width 0.4s ease"
                    }} />
                  </div>
                </div>

                {/* Metadata info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px", fontSize: "0.875rem", color: "#cbd5e1" }}>
                  <div style={{ backgroundColor: "#1f2937", padding: "12px", borderRadius: "8px" }}>
                    <div><strong>Created At:</strong> {new Date(selectedRunData.run.createdAt).toLocaleString()}</div>
                    <div><strong>Updated At:</strong> {new Date(selectedRunData.run.updatedAt).toLocaleString()}</div>
                  </div>
                  <div style={{ backgroundColor: "#1f2937", padding: "12px", borderRadius: "8px" }}>
                    <div><strong>Status:</strong> <span style={{ textTransform: "uppercase", fontWeight: "bold" }}>{selectedRunData.run.status}</span></div>
                    <div><strong>Last Checkpoint:</strong> <span style={{ fontFamily: "monospace" }}>{selectedRunData.run.lastCheckpointId?.substring(0, 8) || "None"}</span></div>
                  </div>
                </div>

                {/* Error Banner if failed */}
                {selectedRunData.run.error && (
                  <div style={{
                    backgroundColor: "#7f1d1d",
                    border: "1px solid #b91c1c",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "24px",
                    fontSize: "0.875rem",
                    color: "#fca5a5"
                  }}>
                    <strong>Execution Error:</strong> {selectedRunData.run.error.message}
                  </div>
                )}

                {/* Proposals list */}
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "1rem", color: "#f3f4f6", fontWeight: 600, marginBottom: "12px" }}>
                    Execution Sequence Steps
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedRunData.run.proposalIds.map((pId: string, idx: number) => {
                      const isActive = idx === selectedRunData.run.currentStepIndex && selectedRunData.run.status === "running";
                      const isCompleted = idx < selectedRunData.run.currentStepIndex;
                      
                      return (
                        <div
                          key={pId}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px",
                            backgroundColor: isActive ? "rgba(37, 99, 235, 0.1)" : "#1f2937",
                            border: isActive ? "1px solid #2563eb" : "1px solid #374151",
                            borderRadius: "8px"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              backgroundColor: isCompleted ? "#064e3b" : isActive ? "#2563eb" : "#0b0f19",
                              color: isCompleted ? "#10b981" : "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.75rem",
                              fontWeight: "bold"
                            }}>
                              {isCompleted ? "✓" : idx + 1}
                            </span>
                            <span style={{ fontSize: "0.875rem", fontFamily: "monospace", color: "#cbd5e1" }}>
                              {pId}
                            </span>
                          </div>
                          <span style={{
                            fontSize: "0.75rem",
                            color: isCompleted ? "#10b981" : isActive ? "#3b82f6" : "#6b7280",
                            fontWeight: 600
                          }}>
                            {isCompleted ? "Completed" : isActive ? "Active" : "Queued"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Checkpoints list */}
                <div>
                  <h3 style={{ fontSize: "1rem", color: "#f3f4f6", fontWeight: 600, marginBottom: "12px" }}>
                    Checkpoint Logs
                  </h3>
                  {selectedRunData.checkpoints.length === 0 ? (
                    <div style={{ padding: "12px", color: "#6b7280", fontSize: "0.875rem", textAlign: "center", backgroundColor: "#0b0f19", borderRadius: "8px" }}>
                      No checkpoints created for this run yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto", border: "1px solid #1f2937", borderRadius: "8px", padding: "8px", backgroundColor: "#0b0f19" }}>
                      {selectedRunData.checkpoints.map((cp: any) => (
                        <div
                          key={cp.id}
                          style={{
                            padding: "10px",
                            borderBottom: "1px solid #1f2937",
                            fontSize: "0.8rem",
                            lineHeight: "1.4"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: "#60a5fa" }}>
                            <span>{cp.label || "Manual Checkpoint"}</span>
                            <span style={{ color: "#6b7280", fontFamily: "monospace" }}>{cp.id.substring(0, 8)}</span>
                          </div>
                          <div style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "4px" }}>
                            Saved at {new Date(cp.createdAt).toLocaleString()}
                          </div>
                          <pre style={{
                            margin: "6px 0 0 0",
                            padding: "6px",
                            backgroundColor: "#1f2937",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontFamily: "monospace",
                            overflowX: "auto"
                          }}>
                            {JSON.stringify(cp.data, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#6b7280" }}>
                Select an execution run from the left panel to inspect progress and manage checkpoints.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "safety" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "24px",
          marginBottom: "32px"
        }}>
          {/* Left Column: Proposals List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
                Proposals Audit
              </h2>

              <div style={{ flex: 1, overflowY: "auto", border: "1px solid #1f2937", borderRadius: "8px", padding: "8px", backgroundColor: "#0b0f19" }}>
                {proposals.length === 0 ? (
                  <div style={{ padding: "16px", color: "#6b7280", textAlign: "center" }}>
                    No proposals found.
                  </div>
                ) : (
                  proposals.map(prop => {
                    const rLevel = prop.safetyReport?.riskLevel || "unknown";
                    let badgeBg = "#1f2937";
                    let badgeColor = "#9ca3af";
                    if (rLevel === "low") { badgeBg = "#064e3b"; badgeColor = "#10b981"; }
                    else if (rLevel === "medium") { badgeBg = "#78350f"; badgeColor = "#fbbf24"; }
                    else if (rLevel === "high") { badgeBg = "#7c2d12"; badgeColor = "#fb923c"; }
                    else if (rLevel === "critical") { badgeBg = "#7f1d1d"; badgeColor = "#f87171"; }

                    return (
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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#f9fafb" }}>
                            {prop.title}
                          </span>
                          <span style={{
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            textTransform: "uppercase"
                          }}>
                            {rLevel}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#9ca3af", marginTop: "8px" }}>
                          <span>Status: <strong>{prop.status}</strong></span>
                          <span style={{ fontFamily: "monospace" }}>{prop.id.substring(0, 8)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Safety Center Details */}
          <div style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "20px",
            minHeight: "600px"
          }}>
            {selectedProposalId && patchDetails ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#f3f4f6", margin: 0 }}>
                      Safety & Sandbox Audit
                    </h2>
                    <span style={{ color: "#60a5fa", fontSize: "0.875rem", fontFamily: "monospace" }}>
                      Proposal ID: {patchDetails.proposal.id}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => overrideSafetyCheck(patchDetails.proposal.id)}
                      disabled={isLoading || !patchDetails.proposal.safetyReport || patchDetails.proposal.safetyReport.passed}
                      style={{
                        backgroundColor: "#7c2d12",
                        color: "#ffffff",
                        border: "1px solid #fb923c",
                        padding: "8px 14px",
                        borderRadius: "6px",
                        fontWeight: 600,
                        cursor: (isLoading || !patchDetails.proposal.safetyReport || patchDetails.proposal.safetyReport.passed) ? "not-allowed" : "pointer"
                      }}
                    >
                      Override Gating
                    </button>
                    <button
                      onClick={() => runValidation(patchDetails.proposal.id)}
                      disabled={isLoading || patchDetails.proposal.status === "applied"}
                      style={{
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        padding: "8px 14px",
                        borderRadius: "6px",
                        border: "none",
                        fontWeight: 600,
                        cursor: (isLoading || patchDetails.proposal.status === "applied") ? "not-allowed" : "pointer"
                      }}
                    >
                      Trigger Validation
                    </button>
                  </div>
                </div>

                <hr style={{ borderColor: "#1f2937", margin: "16px 0" }} />

                {/* Safety Report Card */}
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "1rem", color: "#f3f4f6", fontWeight: 600, marginBottom: "12px" }}>
                    Static Safety Assessment
                  </h3>
                  {patchDetails.proposal.safetyReport ? (
                    <div style={{
                      backgroundColor: patchDetails.proposal.safetyReport.passed ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      border: `1px solid ${patchDetails.proposal.safetyReport.passed ? "#10b981" : "#ef4444"}`,
                      borderRadius: "8px",
                      padding: "16px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <span style={{ fontSize: "0.9rem" }}>
                          Gating Status: <strong style={{ color: patchDetails.proposal.safetyReport.passed ? "#10b981" : "#ef4444" }}>
                            {patchDetails.proposal.safetyReport.passed ? "PASSED" : "BLOCKED"}
                          </strong>
                        </span>
                        <span style={{
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          backgroundColor: patchDetails.proposal.safetyReport.riskLevel === "critical" ? "#7f1d1d" : patchDetails.proposal.safetyReport.riskLevel === "high" ? "#7c2d12" : "#1f2937",
                          color: patchDetails.proposal.safetyReport.riskLevel === "critical" ? "#f87171" : patchDetails.proposal.safetyReport.riskLevel === "high" ? "#fb923c" : "#cbd5e1"
                        }}>
                          {patchDetails.proposal.safetyReport.riskLevel} Risk
                        </span>
                      </div>
                      {patchDetails.proposal.safetyReport.issues.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.85rem", color: "#cbd5e1" }}>
                          {patchDetails.proposal.safetyReport.issues.map((issue: string, idx: number) => (
                            <li key={idx} style={{ marginBottom: "6px" }}>{issue}</li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#10b981" }}>
                          No static safety violations discovered. Safe for compilation sandbox execution.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "12px", color: "#6b7280", fontSize: "0.875rem", textAlign: "center", backgroundColor: "#0b0f19", borderRadius: "8px" }}>
                      Run verification to perform static safety analysis.
                    </div>
                  )}
                </div>

                {/* Sandbox Results Card */}
                <div>
                  <h3 style={{ fontSize: "1rem", color: "#f3f4f6", fontWeight: 600, marginBottom: "12px" }}>
                    Sandbox Build & Test Logs
                  </h3>
                  {patchDetails.proposal.sandboxResult ? (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                        <div style={{ backgroundColor: "#1f2937", padding: "10px", borderRadius: "6px", textAlign: "center", fontSize: "0.8rem" }}>
                          <div>Compile</div>
                          <strong style={{ color: patchDetails.proposal.sandboxResult.compilePassed ? "#10b981" : "#ef4444" }}>
                            {patchDetails.proposal.sandboxResult.compilePassed ? "PASSED" : "FAILED"}
                          </strong>
                        </div>
                        <div style={{ backgroundColor: "#1f2937", padding: "10px", borderRadius: "6px", textAlign: "center", fontSize: "0.8rem" }}>
                          <div>Tests</div>
                          <strong style={{ color: patchDetails.proposal.sandboxResult.testsPassed ? "#10b981" : "#ef4444" }}>
                            {patchDetails.proposal.sandboxResult.testsPassed ? "PASSED" : "FAILED"}
                          </strong>
                        </div>
                        <div style={{ backgroundColor: "#1f2937", padding: "10px", borderRadius: "6px", textAlign: "center", fontSize: "0.8rem" }}>
                          <div>Overall</div>
                          <strong style={{ color: patchDetails.proposal.sandboxResult.passed ? "#10b981" : "#ef4444" }}>
                            {patchDetails.proposal.sandboxResult.passed ? "PASSED" : "FAILED"}
                          </strong>
                        </div>
                      </div>
                      <pre style={{
                        margin: 0,
                        padding: "16px",
                        backgroundColor: "#05050a",
                        color: "#38bdf8",
                        border: "1px solid #1e293b",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontFamily: "monospace",
                        maxHeight: "300px",
                        overflowY: "auto",
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.4"
                      }}>
                        {patchDetails.proposal.sandboxResult.output || "No build logs captured."}
                      </pre>
                    </div>
                  ) : (
                    <div style={{ padding: "12px", color: "#6b7280", fontSize: "0.875rem", textAlign: "center", backgroundColor: "#0b0f19", borderRadius: "8px" }}>
                      Sandbox build outputs will populate here after verification runs.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#6b7280" }}>
                Select a proposal from the left panel to inspect its safety metrics and sandboxed execution logs.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MetaEvolutionConsole;
