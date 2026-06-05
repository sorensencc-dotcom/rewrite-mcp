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

  const [activeTab, setActiveTab] = useState<"evolution" | "refactor" | "planning" | "runs" | "safety" | "autonomous" | "apg" | "aar" | "ace" | "research">("evolution");
  const [abmRequest, setAbmRequest] = useState<string>("");
  const [abmJob, setAbmJob] = useState<any | null>(null);
  const [abmJobs, setAbmJobs] = useState<any[]>([]);
  const [isSubmittingJob, setIsSubmittingJob] = useState<boolean>(false);
  const [isFetchingJobs, setIsFetchingJobs] = useState<boolean>(false);
  const [healingPlan, setHealingPlan] = useState<any | null>(null);
  const [failureContext, setFailureContext] = useState<any | null>(null);
  const [planningMode, setPlanningMode] = useState<"deterministic" | "llm" | "hybrid">("deterministic");
  const [jobSubTab, setJobSubTab] = useState<"general" | "agents" | "memory" | "consensus" | "scheduler" | "kg">("general");
  const [jobTasks, setJobTasks] = useState<any[]>([]);
  const [jobExchanges, setJobExchanges] = useState<any[]>([]);
  const [isFetchingJobAgents, setIsFetchingJobAgents] = useState<boolean>(false);
  const [jobMemoryItems, setJobMemoryItems] = useState<any[]>([]);
  const [isFetchingJobMemory, setIsFetchingJobMemory] = useState<boolean>(false);
  const [jobConsensus, setJobConsensus] = useState<any[]>([]);
  const [isFetchingJobConsensus, setIsFetchingJobConsensus] = useState<boolean>(false);
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);
  const [isFetchingScheduler, setIsFetchingScheduler] = useState<boolean>(false);
  const [jobKg, setJobKg] = useState<any>(null);
  const [isFetchingJobKg, setIsFetchingJobKg] = useState<boolean>(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [generatedPhases, setGeneratedPhases] = useState<any[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  const [isGeneratingPhase, setIsGeneratingPhase] = useState<boolean>(false);
  const [refactorOpps, setRefactorOpps] = useState<any[]>([]);
  const [isFetchingOpps, setIsFetchingOpps] = useState<boolean>(false);
  const [capabilitySpecs, setCapabilitySpecs] = useState<any[]>([]);
  const [isFetchingSpecs, setIsFetchingSpecs] = useState<boolean>(false);

  const [researchFindings, setResearchFindings] = useState<any[]>([]);
  const [isFetchingFindings, setIsFetchingFindings] = useState<boolean>(false);
  const [metaRules, setMetaRules] = useState<any[]>([]);
  const [isFetchingMetaRules, setIsFetchingMetaRules] = useState<boolean>(false);

  const fetchResearchFindings = async () => {
    setIsFetchingFindings(true);
    try {
      const res = await fetch("/v1/mee/research/findings");
      const data = await res.json();
      if (data.ok) {
        setResearchFindings(data.data.findings || []);
      }
    } catch (err) {
      console.error("Failed to fetch research findings:", err);
    } finally {
      setIsFetchingFindings(false);
    }
  };

  const fetchMetaRules = async () => {
    setIsFetchingMetaRules(true);
    try {
      const res = await fetch("/v1/mee/research/meta-rules");
      const data = await res.json();
      if (data.ok) {
        setMetaRules(data.data.rules || []);
      }
    } catch (err) {
      console.error("Failed to fetch meta rules:", err);
    } finally {
      setIsFetchingMetaRules(false);
    }
  };

  const triggerResearchScan = async () => {
    setMessage("Triggering background research scan...");
    try {
      const res = await fetch("/v1/mee/research/scan", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Research scan completed. Found ${data.data.findings.length} findings and ${data.data.rules.length} meta-rules.`);
        fetchResearchFindings();
        fetchMetaRules();
      } else {
        setMessage(`Research scan failed: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Research scan failed: ${err.message}`);
    }
  };

  const approveFinding = async (id: string) => {
    setMessage("Approving finding and triggering phase generator...");
    try {
      const res = await fetch(`/v1/mee/research/findings/${encodeURIComponent(id)}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Finding approved. Draft Phase ${data.data.spec.phaseNumber} spec generated.`);
        fetchResearchFindings();
        fetchGeneratedPhases();
      } else {
        setMessage(`Finding approval failed: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Finding approval failed: ${err.message}`);
    }
  };

  const rejectFinding = async (id: string) => {
    try {
      const res = await fetch(`/v1/mee/research/findings/${encodeURIComponent(id)}/reject`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage("Finding rejected.");
        fetchResearchFindings();
      } else {
        setMessage(`Finding rejection failed: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Finding rejection failed: ${err.message}`);
    }
  };


  const fetchGeneratedPhases = async () => {
    try {
      const res = await fetch("/v1/mee/phases");
      const data = await res.json();
      if (data.ok) {
        setGeneratedPhases(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch generated phases:", err);
    }
  };

  const generatePhase = async () => {
    setIsGeneratingPhase(true);
    setMessage("Triggering autonomous phase generator...");
    try {
      const res = await fetch("/v1/mee/phases/generate", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage(`New phase generated: ${data.data.spec.title} (Phase ${data.data.spec.phaseNumber})`);
        fetchGeneratedPhases();
        setSelectedPhaseId(data.data.spec.id);
      } else {
        setMessage(`Phase generation failed: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Phase generation failed: ${err.message}`);
    } finally {
      setIsGeneratingPhase(false);
    }
  };

  const approvePhase = async (id: string) => {
    setMessage("Approving phase and spawning active build job...");
    try {
      const res = await fetch(`/v1/mee/phases/${encodeURIComponent(id)}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Phase approved. Autonomous build job ${data.data.job.id} dispatched successfully.`);
        fetchGeneratedPhases();
      } else {
        setMessage(`Approval failed: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Approval failed: ${err.message}`);
    }
  };

  const rejectPhase = async (id: string) => {
    try {
      const res = await fetch(`/v1/mee/phases/${encodeURIComponent(id)}/reject`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Phase rejected.`);
        fetchGeneratedPhases();
      } else {
        setMessage(`Rejection failed: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Rejection failed: ${err.message}`);
    }
  };

  const fetchRefactorOpportunities = async () => {
    setIsFetchingOpps(true);
    try {
      const res = await fetch("/v1/mee/refactor/opportunities");
      const data = await res.json();
      if (data.ok) {
        setRefactorOpps(data.data.opportunities || []);
      }
    } catch (err) {
      console.error("Failed to fetch refactor opportunities:", err);
    } finally {
      setIsFetchingOpps(false);
    }
  };

  const proposeAndApplyRefactor = async (opp: any) => {
    setMessage("Generating refactor proposal...");
    try {
      const resPropose = await fetch("/v1/mee/refactor/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity: opp })
      });
      const dataPropose = await resPropose.json();
      if (dataPropose.ok) {
        const proposalId = dataPropose.data.proposal.id;
        setMessage("Proposal generated. Applying refactor patches...");
        const resApply = await fetch("/v1/mee/refactor/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposalId })
        });
        const dataApply = await resApply.json();
        if (dataApply.ok) {
          setMessage(`Successfully refactored ${opp.file} and updated architecture logs.`);
          fetchRefactorOpportunities();
        }
      }
    } catch (err: any) {
      setMessage(`Refactoring failed: ${err.message}`);
    }
  };

  const fetchCapabilitySpecs = async () => {
    setIsFetchingSpecs(true);
    try {
      const res = await fetch("/v1/mee/expansion/specs");
      const data = await res.json();
      if (data.ok) {
        setCapabilitySpecs(data.data.specs || []);
      }
    } catch (err) {
      console.error("Failed to fetch capability specs:", err);
    } finally {
      setIsFetchingSpecs(false);
    }
  };

  const proposeAndApplyCapability = async (spec: any) => {
    setMessage("Proposing capability expansion...");
    try {
      const resPropose = await fetch("/v1/mee/expansion/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec })
      });
      const dataPropose = await resPropose.json();
      if (dataPropose.ok) {
        setMessage("Applying capability expansion...");
        const resApply = await fetch("/v1/mee/expansion/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spec })
        });
        const dataApply = await resApply.json();
        if (dataApply.ok) {
          setMessage(`Integrated capability: ${spec.title}. Blueprints and system docs updated.`);
          fetchCapabilitySpecs();
        }
      }
    } catch (err: any) {
      setMessage(`Expansion failed: ${err.message}`);
    }
  };

  const fetchSchedulerStatus = async () => {
    setIsFetchingScheduler(true);
    try {
      const res = await fetch("/v1/mee/autonomous/scheduler/status");
      const data = await res.json();
      if (data.ok) {
        setSchedulerStatus(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch scheduler status:", err);
    } finally {
      setIsFetchingScheduler(false);
    }
  };

  const fetchJobKg = async (jobId: string) => {
    setIsFetchingJobKg(true);
    try {
      const res = await fetch(`/v1/mee/autonomous/jobs/${jobId}/kg`);
      const data = await res.json();
      if (data.ok) {
        setJobKg(data.data.graph);
      }
    } catch (err) {
      console.error("Failed to fetch job kg:", err);
    } finally {
      setIsFetchingJobKg(false);
    }
  };

  const fetchJobConsensus = async (jobId: string) => {
    setIsFetchingJobConsensus(true);
    try {
      const res = await fetch(`/v1/mee/autonomous/jobs/${jobId}/consensus`);
      const data = await res.json();
      if (data.ok) {
        setJobConsensus(data.data.consensus || []);
      }
    } catch (err) {
      console.error("Failed to fetch job consensus:", err);
    } finally {
      setIsFetchingJobConsensus(false);
    }
  };

  const fetchJobAgents = async (jobId: string) => {
    setIsFetchingJobAgents(true);
    try {
      const res = await fetch(`/v1/mee/autonomous/jobs/${jobId}/agents`);
      const data = await res.json();
      if (data.ok) {
        setJobTasks(data.data.tasks || []);
        setJobExchanges(data.data.exchanges || []);
      }
    } catch (err) {
      console.error("Failed to fetch job agents:", err);
    } finally {
      setIsFetchingJobAgents(false);
    }
  };

  const fetchJobMemory = async (jobId: string) => {
    setIsFetchingJobMemory(true);
    try {
      const res = await fetch(`/v1/mee/autonomous/jobs/${jobId}/memory`);
      const data = await res.json();
      if (data.ok) {
        setJobMemoryItems(data.data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch job memory:", err);
    } finally {
      setIsFetchingJobMemory(false);
    }
  };

  const fetchAutonomousJobs = async () => {
    setIsFetchingJobs(true);
    try {
      const res = await fetch("/v1/mee/autonomous/jobs");
      const data = await res.json();
      if (data.ok) {
        setAbmJobs(data.data.jobs || []);
        if (abmJob) {
          const updated = data.data.jobs.find((j: any) => j.id === abmJob.id);
          if (updated) {
            setAbmJob(updated);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch autonomous jobs:", err);
    } finally {
      setIsFetchingJobs(false);
    }
  };

  const startAutonomousJob = async () => {
    if (!abmRequest.trim()) return;
    setIsSubmittingJob(true);
    setMessage("Submitting autonomous build job...");
    try {
      const res = await fetch("/v1/mee/autonomous/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: abmRequest, planningMode })
      });
      const data = await res.json();
      if (data.ok) {
        setAbmJob(data.data.job);
        setMessage(`Autonomous build job ${data.data.job.id} started successfully.`);
        setAbmRequest("");
        fetchAutonomousJobs();
      } else {
        setMessage(`Failed to start autonomous job: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Failed to start autonomous job: ${err.message}`);
    } finally {
      setIsSubmittingJob(false);
    }
  };

  const fetchHealingPlan = async (jobId: string) => {
    try {
      const r = await fetch(`/v1/mee/autonomous/jobs/${jobId}/healing-plan`);
      const json = await r.json();
      if (json.ok) {
        setHealingPlan(json.data.plan);
      } else {
        setHealingPlan(null);
      }
    } catch (err) {
      console.error("Failed to fetch healing plan:", err);
      setHealingPlan(null);
    }
  };

  const fetchFailureContext = async (jobId: string) => {
    try {
      const r = await fetch(`/v1/mee/autonomous/jobs/${jobId}/failure-context`);
      const json = await r.json();
      if (json.ok) {
        setFailureContext(json.data.failure);
      } else {
        setFailureContext(null);
      }
    } catch (err) {
      console.error("Failed to fetch failure context:", err);
      setFailureContext(null);
    }
  };

  const startHealingJob = async (jobId: string) => {
    setMessage("Starting self-healing build run...");
    try {
      const r = await fetch(`/v1/mee/autonomous/jobs/${jobId}/healing/start`, {
        method: "POST",
      });
      const json = await r.json();
      if (json.ok) {
        setMessage("Self-healing job started successfully!");
        setAbmJob(json.data.job);
        fetchAutonomousJobs();
      } else {
        setMessage(`Failed to start healing job: ${json.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Failed to start healing job: ${err.message}`);
    }
  };

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
    fetchAutonomousJobs();
    const interval = setInterval(() => {
      fetchAutoStatus();
      fetchGraph();
      fetchRuns();
      if (selectedRunId) {
        fetchRunDetails(selectedRunId);
      }
      if (activeTab === "autonomous") {
        fetchAutonomousJobs();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedRunId, activeTab]);

  useEffect(() => {
    if (activeTab === "apg") {
      fetchGeneratedPhases();
    } else if (activeTab === "aar") {
      fetchRefactorOpportunities();
    } else if (activeTab === "ace") {
      fetchCapabilitySpecs();
    } else if (activeTab === "research") {
      fetchResearchFindings();
      fetchMetaRules();
    }
  }, [activeTab]);

  useEffect(() => {
    let interval: any = null;
    const hasRunning = abmJobs.some((j) => j.status === "running");
    if (hasRunning || (abmJob && abmJob.status === "running")) {
      interval = setInterval(() => {
        fetchAutonomousJobs();
        if (abmJob) {
          if (jobSubTab === "agents") {
            fetchJobAgents(abmJob.id);
          } else if (jobSubTab === "memory") {
            fetchJobMemory(abmJob.id);
          } else if (jobSubTab === "consensus") {
            fetchJobConsensus(abmJob.id);
          } else if (jobSubTab === "scheduler") {
            fetchSchedulerStatus();
          } else if (jobSubTab === "kg") {
            fetchJobKg(abmJob.id);
          }
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [abmJobs, abmJob, jobSubTab]);

  useEffect(() => {
    if (abmJob) {
      if (abmJob.status === "failed") {
        fetchHealingPlan(abmJob.id);
        fetchFailureContext(abmJob.id);
      } else {
        setHealingPlan(null);
        setFailureContext(null);
      }
    } else {
      setHealingPlan(null);
      setFailureContext(null);
    }
  }, [abmJob?.id, abmJob?.status]);

  useEffect(() => {
    setJobSubTab("general");
    setJobTasks([]);
    setJobExchanges([]);
    setJobMemoryItems([]);
    setJobConsensus([]);
    setSchedulerStatus(null);
    setJobKg(null);
  }, [abmJob?.id]);

  useEffect(() => {
    if (abmJob) {
      if (jobSubTab === "agents") {
        fetchJobAgents(abmJob.id);
      } else if (jobSubTab === "memory") {
        fetchJobMemory(abmJob.id);
      } else if (jobSubTab === "consensus") {
        fetchJobConsensus(abmJob.id);
      } else if (jobSubTab === "scheduler") {
        fetchSchedulerStatus();
      } else if (jobSubTab === "kg") {
        fetchJobKg(abmJob.id);
      }
    }
  }, [abmJob?.id, jobSubTab]);

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
        <button
          onClick={() => {
            setActiveTab("autonomous");
            fetchAutonomousJobs();
          }}
          style={{
            backgroundColor: "transparent",
            color: activeTab === "autonomous" ? "#3b82f6" : "#9ca3af",
            border: "none",
            borderBottom: activeTab === "autonomous" ? "2px solid #3b82f6" : "none",
            padding: "8px 16px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Autonomous Build
        </button>
        <button
          onClick={() => {
            setActiveTab("apg");
            fetchGeneratedPhases();
          }}
          style={{
            backgroundColor: "transparent",
            color: activeTab === "apg" ? "#3b82f6" : "#9ca3af",
            border: "none",
            borderBottom: activeTab === "apg" ? "2px solid #3b82f6" : "none",
            padding: "8px 16px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Phase Generator (APG)
        </button>
        <button
          onClick={() => {
            setActiveTab("aar");
            fetchRefactorOpportunities();
          }}
          style={{
            backgroundColor: "transparent",
            color: activeTab === "aar" ? "#3b82f6" : "#9ca3af",
            border: "none",
            borderBottom: activeTab === "aar" ? "2px solid #3b82f6" : "none",
            padding: "8px 16px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Auto Refactor (AAR)
        </button>
        <button
          onClick={() => {
            setActiveTab("ace");
            fetchCapabilitySpecs();
          }}
          style={{
            backgroundColor: "transparent",
            color: activeTab === "ace" ? "#3b82f6" : "#9ca3af",
            border: "none",
            borderBottom: activeTab === "ace" ? "2px solid #3b82f6" : "none",
            padding: "8px 16px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Capability Expansion (ACE)
        </button>
        <button
          onClick={() => {
            setActiveTab("research");
            fetchResearchFindings();
            fetchMetaRules();
          }}
          style={{
            backgroundColor: "transparent",
            color: activeTab === "research" ? "#3b82f6" : "#9ca3af",
            border: "none",
            borderBottom: activeTab === "research" ? "2px solid #3b82f6" : "none",
            padding: "8px 16px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Research Mode (MLE)
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
      {activeTab === "autonomous" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "24px",
          marginBottom: "32px"
        }}>
          {/* Left Column: Job History */}
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
                  Job History
                </h2>
                <button
                  onClick={fetchAutonomousJobs}
                  disabled={isFetchingJobs}
                  style={{
                    backgroundColor: "transparent",
                    color: "#3b82f6",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.875rem"
                  }}
                >
                  {isFetchingJobs ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", border: "1px solid #1f2937", borderRadius: "8px", padding: "8px", backgroundColor: "#0b0f19" }}>
                {abmJobs.length === 0 ? (
                  <div style={{ padding: "16px", color: "#6b7280", textAlign: "center" }}>
                    No autonomous build jobs found.
                  </div>
                ) : (
                  abmJobs.map(job => {
                    const statusColors: Record<string, string> = {
                      pending: "#fbbf24",
                      running: "#3b82f6",
                      completed: "#10b981",
                      failed: "#ef4444"
                    };
                    const color = statusColors[job.status] || "#9ca3af";

                    return (
                      <div
                        key={job.id}
                        onClick={() => setAbmJob(job)}
                        style={{
                          padding: "12px",
                          borderRadius: "6px",
                          marginBottom: "8px",
                          cursor: "pointer",
                          backgroundColor: abmJob?.id === job.id ? "#1d4ed8" : "#1f2937",
                          border: "1px solid #374151",
                          transition: "background-color 0.2s"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#f9fafb", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "160px" }}>
                            {job.request}
                          </span>
                          <span style={{
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: color + "20",
                            color: color,
                            textTransform: "uppercase"
                          }}>
                            {job.status}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#9ca3af", marginTop: "8px" }}>
                          <span>Proposals: {job.proposalIds?.length ?? 0}</span>
                          <span style={{ fontFamily: "monospace" }}>{job.id.substring(0, 8)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Start New Job / Job details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Start Job Panel */}
            <div style={{
              backgroundColor: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "12px",
              padding: "20px"
            }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "12px" }}>
                Start Autonomous Job
              </h2>
              <textarea
                value={abmRequest}
                onChange={(e) => setAbmRequest(e.target.value)}
                placeholder="Describe 2–3 things you want CIC to build (e.g. 'Add new extractor module, write validator checks, and optimize UI')"
                style={{
                  width: "100%",
                  height: "80px",
                  backgroundColor: "#0b0f19",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  padding: "12px",
                  color: "#ffffff",
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                  resize: "none",
                  boxSizing: "border-box",
                  marginBottom: "12px"
                }}
              />
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Planning Mode:</span>
                <select
                  value={planningMode}
                  onChange={(e) => setPlanningMode(e.target.value as any)}
                  style={{
                    backgroundColor: "#0b0f19",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    color: "#ffffff",
                    padding: "6px 12px",
                    fontSize: "0.875rem"
                  }}
                >
                  <option value="deterministic">Deterministic</option>
                  <option value="llm">LLM-assisted</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <button
                onClick={startAutonomousJob}
                disabled={isSubmittingJob || !abmRequest.trim()}
                style={{
                  backgroundColor: "#8b5cf6",
                  color: "#ffffff",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "none",
                  fontWeight: 600,
                  cursor: (isSubmittingJob || !abmRequest.trim()) ? "not-allowed" : "pointer",
                  transition: "opacity 0.2s"
                }}
              >
                {isSubmittingJob ? "Starting Job..." : "Start Autonomous Job"}
              </button>
            </div>

            {/* Job Detail Viewer */}
            <div style={{
              backgroundColor: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "12px",
              padding: "20px",
              flex: 1,
              minHeight: "380px"
            }}>
              {abmJob ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div>
                      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", margin: 0 }}>
                        Job Details
                      </h3>
                      <span style={{ fontSize: "0.75rem", color: "#6b7280", fontFamily: "monospace" }}>
                        ID: {abmJob.id}
                      </span>
                    </div>
                    <span style={{
                      fontSize: "0.875rem",
                      fontWeight: "bold",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      backgroundColor: abmJob.status === "completed" ? "rgba(16, 185, 129, 0.1)" : abmJob.status === "failed" ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)",
                      color: abmJob.status === "completed" ? "#10b981" : abmJob.status === "failed" ? "#ef4444" : "#3b82f6",
                      textTransform: "uppercase"
                    }}>
                      {abmJob.status}
                                      <hr style={{ borderColor: "#1f2937", margin: "16px 0" }} />

                  {/* Job Sub-Tabs */}
                  <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid #1f2937", marginBottom: "16px" }}>
                    <button
                      onClick={() => setJobSubTab("general")}
                      style={{
                        backgroundColor: "transparent",
                        color: jobSubTab === "general" ? "#3b82f6" : "#9ca3af",
                        border: "none",
                        borderBottom: jobSubTab === "general" ? "2px solid #3b82f6" : "none",
                        padding: "8px 12px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      General Info
                    </button>
                    <button
                      onClick={() => setJobSubTab("agents")}
                      style={{
                        backgroundColor: "transparent",
                        color: jobSubTab === "agents" ? "#3b82f6" : "#9ca3af",
                        border: "none",
                        borderBottom: jobSubTab === "agents" ? "2px solid #3b82f6" : "none",
                        padding: "8px 12px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Agent Timeline
                    </button>
                    <button
                      onClick={() => setJobSubTab("memory")}
                      style={{
                        backgroundColor: "transparent",
                        color: jobSubTab === "memory" ? "#3b82f6" : "#9ca3af",
                        border: "none",
                        borderBottom: jobSubTab === "memory" ? "2px solid #3b82f6" : "none",
                        padding: "8px 12px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Memory Logs
                    </button>
                    <button
                      onClick={() => setJobSubTab("consensus")}
                      style={{
                        backgroundColor: "transparent",
                        color: jobSubTab === "consensus" ? "#3b82f6" : "#9ca3af",
                        border: "none",
                        borderBottom: jobSubTab === "consensus" ? "2px solid #3b82f6" : "none",
                        padding: "8px 12px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Consensus
                    </button>
                    <button
                      onClick={() => setJobSubTab("scheduler")}
                      style={{
                        backgroundColor: "transparent",
                        color: jobSubTab === "scheduler" ? "#3b82f6" : "#9ca3af",
                        border: "none",
                        borderBottom: jobSubTab === "scheduler" ? "2px solid #3b82f6" : "none",
                        padding: "8px 12px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Scheduler
                    </button>
                    <button
                      onClick={() => setJobSubTab("kg")}
                      style={{
                        backgroundColor: "transparent",
                        color: jobSubTab === "kg" ? "#3b82f6" : "#9ca3af",
                        border: "none",
                        borderBottom: jobSubTab === "kg" ? "2px solid #3b82f6" : "none",
                        padding: "8px 12px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      KG Graph
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.875rem" }}>
                    {jobSubTab === "general" && (
                      <>
                        <div>
                          <span style={{ color: "#6b7280", display: "block", marginBottom: "4px" }}>Request Prompt</span>
                          <div style={{ backgroundColor: "#0b0f19", padding: "12px", borderRadius: "6px", border: "1px solid #1f2937" }}>
                            {abmJob.request}
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <div>
                            <span style={{ color: "#6b7280", display: "block", marginBottom: "4px" }}>Execution Run</span>
                            {abmJob.runId ? (
                              <span
                                onClick={() => {
                                  setActiveTab("runs");
                                  fetchRunDetails(abmJob.runId);
                                }}
                                style={{ color: "#3b82f6", textDecoration: "underline", cursor: "pointer", fontFamily: "monospace" }}
                              >
                                {abmJob.runId.substring(0, 8)} (Inspect Run)
                              </span>
                            ) : (
                              <span style={{ color: "#6b7280" }}>None</span>
                            )}
                          </div>
                          <div>
                            <span style={{ color: "#6b7280", display: "block", marginBottom: "4px" }}>Plan Request</span>
                            <span style={{ color: "#cbd5e1", fontFamily: "monospace" }}>
                              {abmJob.planId ? abmJob.planId.substring(0, 8) : "Pending"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span style={{ color: "#6b7280", display: "block", marginBottom: "4px" }}>Tasks & Proposals</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {abmJob.proposalIds && abmJob.proposalIds.length > 0 ? (
                              abmJob.proposalIds.map((pId: string, idx: number) => (
                                <span
                                  key={pId}
                                  onClick={() => {
                                    setActiveTab("evolution");
                                    fetchPatch(pId);
                                  }}
                                  style={{
                                    display: "inline-block",
                                    padding: "4px 8px",
                                    backgroundColor: "#1f2937",
                                    border: "1px solid #374151",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "0.75rem",
                                    color: "#cbd5e1",
                                    fontFamily: "monospace"
                                  }}
                                >
                                  Step {idx + 1}: {pId.substring(0, 8)}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: "#6b7280" }}>No tasks generated yet.</span>
                            )}
                          </div>
                        </div>

                        {abmJob.error && (
                          <div style={{ marginTop: "16px" }}>
                            <span style={{ color: "#ef4444", fontWeight: 600, display: "block", marginBottom: "4px" }}>Job Failure Details</span>
                            <pre style={{
                              margin: 0,
                              padding: "12px",
                              backgroundColor: "rgba(239, 68, 68, 0.1)",
                              color: "#f87171",
                              border: "1px solid #ef4444",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                              fontFamily: "monospace",
                              whiteSpace: "pre-wrap",
                              overflowY: "auto",
                              maxHeight: "150px"
                            }}>
                              {abmJob.error.message}
                              {abmJob.error.code ? `\nCode: ${abmJob.error.code}` : ""}
                            </pre>
                          </div>
                        )}

                        {abmJob.status === "failed" && (
                          <div style={{ marginTop: "24px", borderTop: "1px solid #1f2937", paddingTop: "16px" }}>
                            <h4 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fb7185", marginBottom: "12px" }}>
                              Self-Healing Intelligence
                            </h4>

                            {/* Failure Context Details */}
                            {failureContext && (
                              <div style={{ marginBottom: "16px" }}>
                                <span style={{ color: "#9ca3af", fontSize: "0.85rem", display: "block", marginBottom: "4px" }}>Failure Context</span>
                                <div style={{ backgroundColor: "#0b0f19", border: "1px solid #374151", borderRadius: "6px", padding: "10px", fontSize: "0.85rem" }}>
                                  <div style={{ marginBottom: "4px" }}><strong>Failing Proposals:</strong> {failureContext.failingProposalIds?.join(", ") || "None"}</div>
                                  <div style={{ marginBottom: "4px" }}><strong>Error Code:</strong> <code style={{ color: "#ef4444" }}>{failureContext.errorCode || "N/A"}</code></div>
                                  {failureContext.sandboxOutput && (
                                    <div style={{ marginTop: "8px" }}>
                                      <strong>Sandbox Output:</strong>
                                      <pre style={{ margin: "4px 0 0 0", padding: "8px", backgroundColor: "#1f2937", color: "#38bdf8", borderRadius: "4px", fontSize: "0.75rem", fontFamily: "monospace", overflowX: "auto", maxHeight: "120px", whiteSpace: "pre-wrap" }}>
                                        {failureContext.sandboxOutput.buildOutput || failureContext.sandboxOutput.testOutput || "No logs."}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Healing Plan Recommendations */}
                            {healingPlan ? (
                              <div style={{ backgroundColor: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", padding: "16px" }}>
                                <h5 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#34d399", margin: "0 0 8px 0" }}>
                                  Suggested Healing Plan
                                </h5>
                                <p style={{ margin: "0 0 12px 0", fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.4" }}>
                                  {healingPlan.summary}
                                </p>

                                {healingPlan.suggestedTasks && healingPlan.suggestedTasks.length > 0 && (
                                  <ul style={{ margin: "0 0 16px 0", paddingLeft: "20px", fontSize: "0.85rem", color: "#9ca3af" }}>
                                    {healingPlan.suggestedTasks.map((t: any, i: number) => (
                                      <li key={i} style={{ marginBottom: "6px" }}>
                                        <strong style={{ color: "#cbd5e1" }}>[{t.type}]</strong> {t.title} &mdash; {t.description}
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                <button
                                  onClick={() => startHealingJob(abmJob.id)}
                                  style={{
                                    backgroundColor: "#10b981",
                                    color: "#ffffff",
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    border: "none",
                                    fontWeight: 600,
                                    fontSize: "0.85rem",
                                    cursor: "pointer",
                                    transition: "opacity 0.2s"
                                  }}
                                >
                                  Execute Healing Run
                                </button>
                              </div>
                            ) : (
                              <div style={{ fontSize: "0.85rem", color: "#6b7280", fontStyle: "italic" }}>
                                Generating or loading healing recommendation plan...
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {jobSubTab === "agents" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {isFetchingJobAgents && jobTasks.length === 0 ? (
                          <div style={{ color: "#6b7280", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>
                            Loading agent logs...
                          </div>
                        ) : jobTasks.length === 0 ? (
                          <div style={{ color: "#6b7280", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>
                            No agent tasks dispatched for this job.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {jobTasks.map((task: any) => {
                              const taskExchanges = jobExchanges.filter((e) => e.taskId === task.id);
                              return (
                                <div
                                  key={task.id}
                                  style={{
                                    backgroundColor: "#0b0f19",
                                    border: "1px solid #1f2937",
                                    borderRadius: "8px",
                                    padding: "12px",
                                    fontSize: "0.85rem"
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                    <strong style={{ color: "#e2e8f0" }}>Task: {task.type}</strong>
                                    <span style={{
                                      fontSize: "0.75rem",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      backgroundColor: task.status === "completed" ? "rgba(16, 185, 129, 0.1)" : task.status === "failed" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)",
                                      color: task.status === "completed" ? "#10b981" : task.status === "failed" ? "#ef4444" : "#f59e0b",
                                      textTransform: "uppercase",
                                      fontWeight: "bold"
                                    }}>
                                      {task.status}
                                    </span>
                                  </div>
                                  <div style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: "8px" }}>
                                    Agent ID: <code style={{ color: "#9ca3af" }}>{task.agentId}</code> | Created: {new Date(task.createdAt).toLocaleTimeString()}
                                  </div>
                                  {task.errorMessage && (
                                    <div style={{ color: "#f87171", backgroundColor: "rgba(239,68,68,0.1)", padding: "8px", borderRadius: "4px", marginBottom: "8px", fontFamily: "monospace", fontSize: "0.75rem" }}>
                                      Error: {task.errorMessage}
                                    </div>
                                  )}
                                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderLeft: "2px solid #374151", paddingLeft: "8px", marginTop: "8px" }}>
                                    {taskExchanges.map((ex: any) => (
                                      <div key={ex.id} style={{ fontSize: "0.75rem" }}>
                                        <div style={{ color: ex.direction === "request" ? "#60a5fa" : "#34d399", fontWeight: 600 }}>
                                          {ex.direction === "request" ? "→ Request" : "← Response"} ({new Date(ex.createdAt).toLocaleTimeString()}):
                                        </div>
                                        <pre style={{
                                          margin: "4px 0 0 0",
                                          padding: "6px",
                                          backgroundColor: "#1f2937",
                                          borderRadius: "4px",
                                          fontFamily: "monospace",
                                          color: "#cbd5e1",
                                          overflowX: "auto",
                                          whiteSpace: "pre-wrap"
                                        }}>
                                          {(() => {
                                            try {
                                              return JSON.stringify(JSON.parse(ex.content), null, 2);
                                            } catch {
                                              return ex.content;
                                            }
                                          })()}
                                        </pre>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {jobSubTab === "memory" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {isFetchingJobMemory && jobMemoryItems.length === 0 ? (
                          <div style={{ color: "#6b7280", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>
                            Loading memory logs...
                          </div>
                        ) : jobMemoryItems.length === 0 ? (
                          <div style={{ color: "#6b7280", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>
                            No memory logs generated for this job yet.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {jobMemoryItems.map((item: any) => (
                              <div
                                key={item.id}
                                style={{
                                  backgroundColor: "#0b0f19",
                                  border: "1px solid #1f2937",
                                  borderRadius: "8px",
                                  padding: "12px",
                                  fontSize: "0.85rem"
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                  <strong style={{ color: "#f3f4f6" }}>{item.summary}</strong>
                                  <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                                    {new Date(item.createdAt).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                                  <span style={{
                                    backgroundColor: "#1e293b",
                                    color: "#3b82f6",
                                    fontSize: "0.7rem",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    textTransform: "uppercase"
                                  }}>
                                    Scope: {item.scope}
                                  </span>
                                  {item.tags && item.tags.map((tag: string) => (
                                    <span
                                      key={tag}
                                      style={{
                                        backgroundColor: "#064e3b",
                                        color: "#10b981",
                                        fontSize: "0.7rem",
                                        padding: "2px 6px",
                                        borderRadius: "4px"
                                      }}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <pre style={{
                                  margin: 0,
                                  padding: "8px",
                                  backgroundColor: "#1f2937",
                                  color: "#cbd5e1",
                                  borderRadius: "4px",
                                  fontFamily: "monospace",
                                  fontSize: "0.75rem",
                                  overflowX: "auto",
                                  whiteSpace: "pre-wrap"
                                }}>
                                  {(() => {
                                    try {
                                      return JSON.stringify(JSON.parse(item.details), null, 2);
                                    } catch {
                                      return item.details;
                                    }
                                  })()}
                                </pre>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {jobSubTab === "consensus" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {isFetchingJobConsensus && jobConsensus.length === 0 ? (
                          <div style={{ color: "#6b7280", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>
                            Loading consensus data...
                          </div>
                        ) : jobConsensus.length === 0 ? (
                          <div style={{ color: "#6b7280", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>
                            No consensus gating execution recorded for this job.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {jobConsensus.map((result: any, index: number) => (
                              <div
                                key={result.proposalId + "-" + index}
                                style={{
                                  backgroundColor: "#0b0f19",
                                  border: "1px solid #1f2937",
                                  borderRadius: "8px",
                                  padding: "16px",
                                  fontSize: "0.85rem"
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                  <strong style={{ color: "#f3f4f6" }}>Proposal: {result.proposalId.substring(0, 8)}</strong>
                                  <span style={{
                                    fontSize: "0.75rem",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: result.decision === "ready" ? "rgba(16, 185, 129, 0.1)" : result.decision === "needs_revision" ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                    color: result.decision === "ready" ? "#10b981" : result.decision === "needs_revision" ? "#f59e0b" : "#ef4444",
                                    textTransform: "uppercase",
                                    fontWeight: "bold"
                                  }}>
                                    Decision: {result.decision}
                                  </span>
                                </div>
                                <div style={{ display: "flex", gap: "12px", fontSize: "0.75rem", color: "#9ca3af", marginBottom: "12px" }}>
                                  <span>Score: <strong style={{ color: result.score >= 70 ? "#10b981" : "#ef4444" }}>{result.score}/100</strong></span>
                                  <span>Cycle: <strong>{result.cycles}</strong></span>
                                  <span>Critiques: <strong>{result.critiques?.length ?? 0}</strong></span>
                                </div>
                                {result.critiques && result.critiques.length > 0 ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 600 }}>Active Agent Critiques:</span>
                                    {result.critiques.map((critique: any) => (
                                      <div
                                        key={critique.id}
                                        style={{
                                          backgroundColor: "#1f2937",
                                          borderRadius: "6px",
                                          padding: "10px",
                                          borderLeft: `3px solid ${critique.severity === "error" ? "#ef4444" : critique.severity === "warn" ? "#f59e0b" : "#3b82f6"}`
                                        }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "4px" }}>
                                          <span style={{ color: "#9ca3af" }}>From: <code style={{ color: "#60a5fa" }}>{critique.agentId}</code> &rarr; <code style={{ color: "#f43f5e" }}>{critique.targetAgentId}</code></span>
                                          <span style={{
                                            fontWeight: "bold",
                                            textTransform: "uppercase",
                                            color: critique.severity === "error" ? "#ef4444" : critique.severity === "warn" ? "#f59e0b" : "#3b82f6"
                                          }}>{critique.severity}</span>
                                        </div>
                                        <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "0.8rem", marginTop: "4px" }}>
                                          {critique.issue}
                                        </div>
                                        {critique.suggestedFix && (
                                          <div style={{ color: "#a7f3d0", fontSize: "0.75rem", marginTop: "6px", fontStyle: "italic" }}>
                                            Suggested Fix: {critique.suggestedFix}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: "0.85rem", color: "#10b981", fontStyle: "italic" }}>
                                    No critiques issued. All agents approved this proposal layout.
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {jobSubTab === "scheduler" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {isFetchingScheduler && !schedulerStatus ? (
                          <div style={{ color: "#6b7280", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>
                            Loading scheduler status...
                          </div>
                        ) : !schedulerStatus ? (
                          <div style={{ color: "#6b7280", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>
                            No scheduler status available.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {/* Scheduler Overview */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                              <div style={{ backgroundColor: "#0b0f19", border: "1px solid #1f2937", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                                <span style={{ color: "#9ca3af", fontSize: "0.75rem", display: "block" }}>Active Worker Count</span>
                                <strong style={{ color: "#3b82f6", fontSize: "1.5rem" }}>{schedulerStatus.activeCount} / {schedulerStatus.concurrencyLimit}</strong>
                              </div>
                              <div style={{ backgroundColor: "#0b0f19", border: "1px solid #1f2937", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                                <span style={{ color: "#9ca3af", fontSize: "0.75rem", display: "block" }}>Pending / Paused Queue</span>
                                <strong style={{ color: "#fb923c", fontSize: "1.5rem" }}>
                                  {schedulerStatus.pendingJobIds?.length ?? 0} / {schedulerStatus.pausedJobIds?.length ?? 0}
                                </strong>
                              </div>
                            </div>

                            {/* Active Queue Details */}
                            <div>
                              <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "8px" }}>Active Workers</span>
                              {schedulerStatus.activeJobIds && schedulerStatus.activeJobIds.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  {schedulerStatus.activeJobIds.map((id: string) => (
                                    <div key={id} style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#1f2937", padding: "8px 12px", borderRadius: "6px", fontSize: "0.75rem" }}>
                                      <code style={{ color: "#38bdf8" }}>{id}</code>
                                      <span style={{ color: "#10b981", fontWeight: 600 }}>Executing Step Loop...</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ color: "#6b7280", fontSize: "0.75rem", fontStyle: "italic" }}>No active worker threads running.</div>
                              )}
                            </div>

                            {/* Paused & Pending Queues */}
                            <div>
                              <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "8px" }}>Priority Queue</span>
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {schedulerStatus.pendingJobIds?.map((id: string) => (
                                  <div key={id} style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#0b0f19", border: "1px solid #1f2937", padding: "8px 12px", borderRadius: "6px", fontSize: "0.75rem" }}>
                                    <code style={{ color: "#cbd5e1" }}>{id}</code>
                                    <span style={{ color: "#fb923c", fontWeight: 600 }}>Pending</span>
                                  </div>
                                ))}
                                {schedulerStatus.pausedJobIds?.map((id: string) => (
                                  <div key={id} style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#0b0f19", border: "1px solid #1f2937", padding: "8px 12px", borderRadius: "6px", fontSize: "0.75rem" }}>
                                    <code style={{ color: "#cbd5e1" }}>{id}</code>
                                    <span style={{ color: "#a855f7", fontWeight: 600 }}>Paused (Preempted)</span>
                                  </div>
                                ))}
                                {(!schedulerStatus.pendingJobIds?.length && !schedulerStatus.pausedJobIds?.length) && (
                                  <div style={{ color: "#6b7280", fontSize: "0.75rem", fontStyle: "italic" }}>Priority queue is empty.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {jobSubTab === "kg" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {isFetchingJobKg && !jobKg ? (
                          <div style={{ color: "#6b7280", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>
                            Loading Knowledge Graph...
                          </div>
                        ) : !jobKg ? (
                          <div style={{ color: "#6b7280", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>
                            No Knowledge Graph data recorded.
                          </div>
                        ) : (() => {
                          const nodes = jobKg.nodes || [];
                          const edges = jobKg.edges || [];

                          // Lay out nodes dynamically in 2D coordinate space
                          const nodesByType: Record<string, any[]> = {};
                          nodes.forEach((node: any) => {
                            if (!nodesByType[node.type]) {
                              nodesByType[node.type] = [];
                            }
                            nodesByType[node.type].push(node);
                          });

                          const typeKeys = Object.keys(nodesByType);
                          const nodeCoords: Record<string, { x: number; y: number }> = {};
                          typeKeys.forEach((type, typeIdx) => {
                            const x = typeKeys.length === 1 ? 50 : 10 + (typeIdx / (typeKeys.length - 1)) * 80;
                            const typeNodes = nodesByType[type];
                            typeNodes.forEach((node: any, idx: number) => {
                              const y = typeNodes.length === 1 ? 50 : 15 + (idx / (typeNodes.length - 1)) * 70;
                              nodeCoords[node.id] = { x, y };
                            });
                          });

                          const isHighlightedNode = (nodeId: string) => {
                            if (!hoveredNodeId) return true;
                            if (nodeId === hoveredNodeId) return true;
                            return edges.some((e: any) => 
                              (e.from === hoveredNodeId && e.to === nodeId) ||
                              (e.to === hoveredNodeId && e.from === nodeId)
                            );
                          };

                          const isHighlightedEdge = (edge: any) => {
                            if (!hoveredNodeId) return true;
                            return edge.from === hoveredNodeId || edge.to === hoveredNodeId;
                          };

                          const getNodeColor = (type: string) => {
                            switch (type) {
                              case "file": return "#10b981"; // emerald
                              case "task": return "#3b82f6"; // blue
                              case "failure": return "#f43f5e"; // rose
                              case "agent": return "#8b5cf6"; // purple
                              case "proposal": return "#f59e0b"; // orange/amber
                              default: return "#6b7280";
                            }
                          };

                          const selectedNode = nodes.find((n: any) => n.id === selectedNodeId);

                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                              {/* Stats */}
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                                <div style={{ backgroundColor: "#0b0f19", border: "1px solid #1f2937", borderRadius: "6px", padding: "8px", textAlign: "center" }}>
                                  <span style={{ color: "#9ca3af", fontSize: "0.7rem", display: "block" }}>Graph Nodes</span>
                                  <strong style={{ color: "#3b82f6", fontSize: "1.2rem" }}>{nodes.length}</strong>
                                </div>
                                <div style={{ backgroundColor: "#0b0f19", border: "1px solid #1f2937", borderRadius: "6px", padding: "8px", textAlign: "center" }}>
                                  <span style={{ color: "#9ca3af", fontSize: "0.7rem", display: "block" }}>Graph Edges</span>
                                  <strong style={{ color: "#10b981", fontSize: "1.2rem" }}>{edges.length}</strong>
                                </div>
                                <div style={{ backgroundColor: "#0b0f19", border: "1px solid #1f2937", borderRadius: "6px", padding: "8px", textAlign: "center" }}>
                                  <span style={{ color: "#9ca3af", fontSize: "0.7rem", display: "block" }}>Failures Caused</span>
                                  <strong style={{ color: "#ef4444", fontSize: "1.2rem" }}>
                                    {nodes.filter((n: any) => n.type === "failure").length}
                                  </strong>
                                </div>
                              </div>

                              {/* Interactive Graph Canvas */}
                              <div style={{
                                position: "relative",
                                height: "350px",
                                backgroundColor: "#05050a",
                                border: "1px solid #1f2937",
                                borderRadius: "8px",
                                overflow: "hidden",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center"
                              }}>
                                {/* Connection lines SVG overlay */}
                                <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                                  <defs>
                                    <marker id="arrow" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#4b5563" />
                                    </marker>
                                    <marker id="arrow-highlight" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                                    </marker>
                                  </defs>
                                  {edges.map((edge: any, idx: number) => {
                                    const fromNode = nodeCoords[edge.from];
                                    const toNode = nodeCoords[edge.to];
                                    if (!fromNode || !toNode) return null;
                                    const highlighted = isHighlightedEdge(edge);
                                    return (
                                      <line
                                        key={idx}
                                        x1={`${fromNode.x}%`}
                                        y1={`${fromNode.y}%`}
                                        x2={`${toNode.x}%`}
                                        y2={`${toNode.y}%`}
                                        stroke={highlighted ? "#38bdf8" : "#27272a"}
                                        strokeWidth={highlighted ? 2 : 1}
                                        strokeDasharray={edge.type === "depends_on" ? "5,5" : undefined}
                                        markerEnd={highlighted ? "url(#arrow-highlight)" : "url(#arrow)"}
                                        style={{ transition: "all 0.2s ease" }}
                                      />
                                    );
                                  })}
                                </svg>

                                {/* Render Nodes absolute */}
                                {nodes.map((node: any) => {
                                  const coords = nodeCoords[node.id];
                                  if (!coords) return null;
                                  const active = isHighlightedNode(node.id);
                                  const selected = node.id === selectedNodeId;
                                  return (
                                    <div
                                      key={node.id}
                                      onMouseEnter={() => setHoveredNodeId(node.id)}
                                      onMouseLeave={() => setHoveredNodeId(null)}
                                      onClick={() => setSelectedNodeId(selected ? null : node.id)}
                                      style={{
                                        position: "absolute",
                                        left: `${coords.x}%`,
                                        top: `${coords.y}%`,
                                        transform: "translate(-50%, -50%)",
                                        padding: "6px 12px",
                                        borderRadius: "16px",
                                        backgroundColor: getNodeColor(node.type),
                                        border: selected ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.1)",
                                        color: "#ffffff",
                                        fontSize: "0.7rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                        boxShadow: selected ? "0 0 10px #ffffff" : "0 4px 6px -1px rgba(0,0,0,0.3)",
                                        transition: "all 0.2s ease",
                                        opacity: active ? 1 : 0.15,
                                        zIndex: selected || (hoveredNodeId === node.id) ? 10 : 2,
                                        userSelect: "none"
                                      }}
                                    >
                                      {node.name.length > 18 ? `${node.name.substring(0, 15)}...` : node.name}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Selected Node Details inspector */}
                              {selectedNode && (
                                <div style={{
                                  backgroundColor: "#0b0f19",
                                  border: `1px solid ${getNodeColor(selectedNode.type)}50`,
                                  borderRadius: "8px",
                                  padding: "12px",
                                  fontSize: "0.8rem",
                                  animation: "fadeIn 0.2s ease"
                                }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                    <span style={{
                                      fontSize: "0.7rem",
                                      fontWeight: "bold",
                                      textTransform: "uppercase",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      backgroundColor: getNodeColor(selectedNode.type) + "20",
                                      color: getNodeColor(selectedNode.type)
                                    }}>
                                      {selectedNode.type} Node
                                    </span>
                                    <code style={{ color: "#6b7280" }}>{selectedNode.id}</code>
                                  </div>
                                  <div style={{ color: "#f8fafc", fontWeight: 600, fontSize: "0.9rem", marginBottom: "6px" }}>
                                    {selectedNode.name}
                                  </div>
                                  {selectedNode.meta && Object.keys(selectedNode.meta).length > 0 && (
                                    <div style={{ marginTop: "8px" }}>
                                      <span style={{ color: "#6b7280", fontSize: "0.75rem", display: "block", marginBottom: "4px" }}>Metadata:</span>
                                      <pre style={{
                                        margin: 0,
                                        padding: "8px",
                                        backgroundColor: "#05050a",
                                        color: "#38bdf8",
                                        borderRadius: "4px",
                                        fontFamily: "monospace",
                                        fontSize: "0.75rem",
                                        overflowX: "auto"
                                      }}>{JSON.stringify(selectedNode.meta, null, 2)}</pre>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Traditional tables collapsible/simplified */}
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                {/* Node Inspector list */}
                                <div style={{ backgroundColor: "#0b0f19", border: "1px solid #1f2937", borderRadius: "8px", padding: "12px" }}>
                                  <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "8px" }}>Node List</span>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto", padding: "4px", backgroundColor: "#05050a", borderRadius: "6px" }}>
                                    {nodes.map((node: any) => (
                                      <div
                                        key={node.id}
                                        onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          padding: "6px 10px",
                                          borderBottom: "1px solid #1f2937",
                                          fontSize: "0.75rem",
                                          cursor: "pointer",
                                          backgroundColor: node.id === selectedNodeId ? "rgba(255,255,255,0.05)" : "transparent"
                                        }}
                                      >
                                        <div>
                                          <span style={{ color: getNodeColor(node.type), fontWeight: "bold", marginRight: "8px" }}>
                                            [{node.type.toUpperCase()}]
                                          </span>
                                          <span style={{ color: "#cbd5e1" }}>{node.name}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Semantic connections list */}
                                <div style={{ backgroundColor: "#0b0f19", border: "1px solid #1f2937", borderRadius: "8px", padding: "12px" }}>
                                  <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "8px" }}>Semantic Connections</span>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto", padding: "4px", backgroundColor: "#05050a", borderRadius: "6px" }}>
                                    {edges.map((edge: any, idx: number) => {
                                      const isHighlighted = isHighlightedEdge(edge);
                                      return (
                                        <div
                                          key={idx}
                                          style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "6px 10px",
                                            borderBottom: "1px solid #1f2937",
                                            fontSize: "0.75rem",
                                            opacity: isHighlighted ? 1 : 0.4
                                          }}
                                        >
                                          <span style={{ color: "#cbd5e1" }}>{edge.from.substring(0, 8)}</span>
                                          <span style={{ color: "#fb923c", fontWeight: 600 }}>&mdash; {edge.type} &rarr;</span>
                                          <span style={{ color: "#cbd5e1" }}>{edge.to.substring(0, 8)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#6b7280" }}>
                  Select an autonomous build job from the left history panel to view details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "apg" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "24px",
          marginBottom: "32px"
        }}>
          {/* Left Column: Proposed Phase specs */}
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
                  Proposed Phase Spec List
                </h2>
                <button
                  onClick={generatePhase}
                  disabled={isGeneratingPhase}
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    cursor: isGeneratingPhase ? "not-allowed" : "pointer"
                  }}
                >
                  {isGeneratingPhase ? "Analyzing..." : "Generate Phase"}
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", border: "1px solid #1f2937", borderRadius: "8px", padding: "8px", backgroundColor: "#0b0f19" }}>
                {generatedPhases.length === 0 ? (
                  <div style={{ padding: "16px", color: "#6b7280", textAlign: "center" }}>
                    No generated phases found. Click "Generate Phase" to trigger analysis.
                  </div>
                ) : (
                  generatedPhases.map(phase => {
                    return (
                      <div
                        key={phase.id}
                        onClick={() => setSelectedPhaseId(phase.id)}
                        style={{
                          padding: "12px",
                          borderRadius: "6px",
                          marginBottom: "8px",
                          cursor: "pointer",
                          backgroundColor: selectedPhaseId === phase.id ? "#1d4ed8" : "#1f2937",
                          border: "1px solid #374151",
                          transition: "background-color 0.2s"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#f9fafb" }}>
                            Phase {phase.phaseNumber}: {phase.title}
                          </span>
                          <span style={{
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: phase.score >= 70 ? "#064e3b" : "#7f1d1d",
                            color: phase.score >= 70 ? "#34d399" : "#f87171"
                          }}>
                            {phase.score}/100
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#9ca3af", marginTop: "8px" }}>
                          <span>Status: <strong style={{
                            color: phase.status === "approved" ? "#10b981" : phase.status === "rejected" ? "#ef4444" : "#fbbf24"
                          }}>{phase.status}</strong></span>
                          <span>Findings: {phase.findings?.length ?? 0}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Spec Inspector */}
          <div style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "20px",
            minHeight: "600px"
          }}>
            {(() => {
              const phase = generatedPhases.find(p => p.id === selectedPhaseId);
              if (!phase) {
                return (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#6b7280" }}>
                    Select a generated phase blueprint from the left panel to review its configuration.
                  </div>
                );
              }

              return (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div>
                      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#f3f4f6", margin: 0 }}>
                        Phase Spec: {phase.title}
                      </h2>
                      <span style={{ color: "#60a5fa", fontSize: "0.875rem" }}>
                        Phase Spec ID: {phase.id}
                      </span>
                    </div>
                    {phase.status === "draft" && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => rejectPhase(phase.id)}
                          style={{
                            backgroundColor: "#7f1d1d",
                            color: "#ffffff",
                            padding: "8px 14px",
                            borderRadius: "6px",
                            border: "none",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          Reject Spec
                        </button>
                        <button
                          onClick={() => approvePhase(phase.id)}
                          style={{
                            backgroundColor: "#10b981",
                            color: "#ffffff",
                            padding: "8px 14px",
                            borderRadius: "6px",
                            border: "none",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          Approve & Execute
                        </button>
                      </div>
                    )}
                  </div>

                  <hr style={{ borderColor: "#1f2937", margin: "16px 0" }} />

                  {/* Purpose */}
                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "1rem", color: "#9ca3af", fontWeight: 700, marginBottom: "8px" }}>Purpose</h3>
                    <p style={{ fontSize: "0.875rem", lineHeight: "1.5", color: "#cbd5e1", backgroundColor: "#1f2937", padding: "12px", borderRadius: "6px" }}>
                      {phase.purpose}
                    </p>
                  </div>

                  {/* Objectives */}
                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "1rem", color: "#9ca3af", fontWeight: 700, marginBottom: "8px" }}>Objectives</h3>
                    <ul style={{ paddingLeft: "20px", fontSize: "0.875rem", color: "#cbd5e1" }}>
                      {phase.objectives.map((obj: string, i: number) => (
                        <li key={i} style={{ marginBottom: "6px" }}>{obj}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Tasks */}
                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "1rem", color: "#9ca3af", fontWeight: 700, marginBottom: "8px" }}>Planned Tasks</h3>
                    <ul style={{ paddingLeft: "20px", fontSize: "0.875rem", color: "#cbd5e1" }}>
                      {phase.tasks.map((task: string, i: number) => (
                        <li key={i} style={{ marginBottom: "6px" }}>{task}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Findings */}
                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "1rem", color: "#9ca3af", fontWeight: 700, marginBottom: "8px" }}>Linked Research Findings</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {phase.findings && phase.findings.map((f: any) => (
                        <div key={f.id} style={{ backgroundColor: "#0b0f19", border: "1px solid #1f2937", borderRadius: "6px", padding: "10px", fontSize: "0.8rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1", fontWeight: 600, marginBottom: "4px" }}>
                            <span>{f.title}</span>
                            <span style={{ textTransform: "uppercase", color: f.severity === "critical" ? "#ef4444" : "#f59e0b" }}>{f.severity}</span>
                          </div>
                          <div style={{ color: "#9ca3af" }}>{f.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feasibility Vector Metrics */}
                  <div>
                    <h3 style={{ fontSize: "1rem", color: "#9ca3af", fontWeight: 700, marginBottom: "8px" }}>Scoring Vectors</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", fontSize: "0.8rem" }}>
                      <div style={{ backgroundColor: "#1f2937", padding: "8px", borderRadius: "6px", textAlign: "center" }}>
                        <div>Impact</div>
                        <strong style={{ color: "#38bdf8" }}>{phase.estimatedImpact}</strong>
                      </div>
                      <div style={{ backgroundColor: "#1f2937", padding: "8px", borderRadius: "6px", textAlign: "center" }}>
                        <div>Feasibility</div>
                        <strong style={{ color: "#34d399" }}>{phase.feasibility}</strong>
                      </div>
                      <div style={{ backgroundColor: "#1f2937", padding: "8px", borderRadius: "6px", textAlign: "center" }}>
                        <div>Risk</div>
                        <strong style={{ color: "#ef4444" }}>{phase.risk}</strong>
                      </div>
                      <div style={{ backgroundColor: "#1f2937", padding: "8px", borderRadius: "6px", textAlign: "center" }}>
                        <div>Alignment</div>
                        <strong style={{ color: "#a78bfa" }}>{phase.alignment}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {activeTab === "aar" && (
        <div style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          padding: "20px",
          minHeight: "600px"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "8px" }}>
            Autonomous Architecture Refactoring (AAR)
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "20px" }}>
            Scans the persistent system Knowledge Graph to locate volatile components with high failure frequencies and suggests isolated patch strategies.
          </p>

          {isFetchingOpps && refactorOpps.length === 0 ? (
            <div style={{ color: "#6b7280", textAlign: "center", padding: "40px" }}>
              Scanning KG for refactoring opportunities...
            </div>
          ) : refactorOpps.length === 0 ? (
            <div style={{ color: "#6b7280", textAlign: "center", padding: "40px" }}>
              No current fragile modules or boundaries identified. System is highly cohesive.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {refactorOpps.map((opp) => (
                <div
                  key={opp.id}
                  style={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <code style={{ fontSize: "0.85rem", color: "#60a5fa", fontWeight: "bold" }}>
                        {opp.file}
                      </code>
                      <span style={{
                        fontSize: "0.7rem",
                        fontWeight: "bold",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: opp.severity === "critical" || opp.severity === "high" ? "#7f1d1d" : "#1e293b",
                        color: opp.severity === "critical" || opp.severity === "high" ? "#fca5a5" : "#cbd5e1",
                        textTransform: "uppercase"
                      }}>
                        {opp.severity} severity
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", textTransform: "uppercase", marginBottom: "6px" }}>
                      Refactor Type: {opp.type}
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "#cbd5e1", margin: "0 0 12px 0", lineHeight: "1.4" }}>
                      {opp.description}
                    </p>
                    <div style={{ backgroundColor: "#0b0f19", padding: "10px", borderRadius: "6px", fontSize: "0.8rem", color: "#a7f3d0", marginBottom: "16px", fontStyle: "italic" }}>
                      <strong>Suggested Fix:</strong> {opp.suggestedAction}
                    </div>
                  </div>
                  <button
                    onClick={() => proposeAndApplyRefactor(opp)}
                    style={{
                      width: "100%",
                      backgroundColor: "#8b5cf6",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Propose & Synthesize Refactor
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "ace" && (
        <div style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          padding: "20px",
          minHeight: "600px"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "8px" }}>
            Autonomous Capability Expansion (ACE) Center
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "20px" }}>
            Autonomously scan current architecture parameters to identify missing interfaces, workflows, or agent roles.
          </p>

          {isFetchingSpecs && capabilitySpecs.length === 0 ? (
            <div style={{ color: "#6b7280", textAlign: "center", padding: "40px" }}>
              Analyzing system gaps for expansion blueprints...
            </div>
          ) : capabilitySpecs.length === 0 ? (
            <div style={{ color: "#6b7280", textAlign: "center", padding: "40px" }}>
              No current capability gaps detected in active context.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {capabilitySpecs.map((spec) => (
                <div
                  key={spec.id}
                  style={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 8px 0" }}>
                      {spec.title}
                    </h3>
                    <p style={{ fontSize: "0.875rem", color: "#cbd5e1", margin: "0 0 12px 0", lineHeight: "1.4" }}>
                      {spec.description}
                    </p>

                    <div style={{ marginBottom: "12px" }}>
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af", display: "block", marginBottom: "4px" }}>Required Interfaces:</span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {spec.requirements && spec.requirements.map((req: string) => (
                          <code key={req} style={{ backgroundColor: "#0b0f19", color: "#38bdf8", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontFamily: "monospace" }}>
                            {req}
                          </code>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.75rem", color: "#cbd5e1", marginBottom: "16px" }}>
                      <div>
                        <strong style={{ color: "#9ca3af" }}>Agents Dispatched:</strong>
                        <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px" }}>
                          {spec.suggestedAgents && spec.suggestedAgents.map((a: string) => <li key={a}>{a}</li>)}
                        </ul>
                      </div>
                      <div>
                        <strong style={{ color: "#9ca3af" }}>Subsystems Created:</strong>
                        <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px" }}>
                          {spec.suggestedSubsystems && spec.suggestedSubsystems.map((s: string) => <li key={s}>{s}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => proposeAndApplyCapability(spec)}
                    style={{
                      width: "100%",
                      backgroundColor: "#10b981",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Integrate & Deploy Blueprint
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "research" && (
        <div style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          padding: "20px",
          minHeight: "600px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", margin: 0 }}>
                MLE Research Mode Console
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginTop: "4px" }}>
                Analyze failures, runs, and Knowledge Graph to refine meta-learning rule heuristics and generate evolution specs.
              </p>
            </div>
            <button
              onClick={triggerResearchScan}
              disabled={isFetchingFindings}
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Trigger Research Scan
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
            {/* Findings Section */}
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", marginBottom: "12px" }}>
                Research Discoveries & Findings
              </h3>
              {isFetchingFindings && researchFindings.length === 0 ? (
                <div style={{ color: "#6b7280", padding: "20px" }}>Scanning workspace statistics...</div>
              ) : researchFindings.length === 0 ? (
                <div style={{ color: "#6b7280", padding: "20px", backgroundColor: "#1f2937", borderRadius: "8px" }}>
                  No current findings draft. Trigger a research scan to discover codebase opportunities.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {researchFindings.map((finding) => (
                    <div
                      key={finding.id}
                      style={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        padding: "16px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "#f8fafc", margin: 0 }}>
                          {finding.title}
                        </h4>
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor: finding.severity === "high" || finding.severity === "critical" ? "#ef4444" : "#f59e0b",
                          color: "#ffffff"
                        }}>
                          {finding.severity}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.875rem", color: "#cbd5e1", margin: "0 0 12px 0", lineHeight: "1.4" }}>
                        {finding.description}
                      </p>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                        <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          Category: <code style={{ backgroundColor: "#0b0f19", color: "#38bdf8", padding: "2px 4px", borderRadius: "4px" }}>{finding.category}</code>
                        </span>
                        {(!finding.status || finding.status === "draft") ? (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => rejectFinding(finding.id)}
                              style={{
                                backgroundColor: "#ef4444",
                                color: "#ffffff",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                border: "none",
                                fontSize: "0.8rem",
                                cursor: "pointer"
                              }}
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => approveFinding(finding.id)}
                              style={{
                                backgroundColor: "#10b981",
                                color: "#ffffff",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                border: "none",
                                fontSize: "0.8rem",
                                cursor: "pointer"
                              }}
                            >
                              Approve & Spec
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: finding.status === "promoted" || finding.status === "approved" ? "#34d399" : "#ef4444" }}>
                            Status: {finding.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Meta Rules Section */}
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", marginBottom: "12px" }}>
                MLE Refined Meta-Rules
              </h3>
              {metaRules.length === 0 ? (
                <div style={{ color: "#6b7280", padding: "20px", backgroundColor: "#1f2937", borderRadius: "8px" }}>
                  No meta-rules currently registered. Run scans to generate heuristic rules.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {metaRules.map((rule) => (
                    <div
                      key={rule.id}
                      style={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        padding: "12px"
                      }}
                    >
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 4px 0" }}>
                        {rule.name}
                      </h4>
                      <p style={{ fontSize: "0.8rem", color: "#9ca3af", margin: "0 0 8px 0" }}>
                        {rule.description}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                        <span style={{ color: "#38bdf8" }}>{rule.heuristicType}</span>
                        <span style={{ color: "#10b981", fontWeight: 600 }}>Weight: {rule.weight}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MetaEvolutionConsole;
