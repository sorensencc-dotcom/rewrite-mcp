# Deterministic Routing Policy

The MAAL (Multi-Agent Adaptive Layer) Router uses a deterministic, rule-based routing policy to match incoming inference requests to the most appropriate offline backend runtime. 

This document details the routing heuristics, the prioritized decision tree, and the state structure of the routing engine.

---

## 🧭 Prioritized Decision Tree

The routing engine processes a prioritized list of rules inside `route()`. The first rule that matches a request’s constraints selects the corresponding backend.

```
                           [Inference Request]
                                    |
                       (offline_required === true?)
                                   / \
                                 Yes  No
                                 /     \
           [Filter: Offline-Only]       (cost_ceiling === 0?)
                     |                          / \
                     |                        Yes  No
                     |                        /     \
                     |          [Filter: Free-Only]  (latency_ms < 1000?)
                     |                   |                   / \
                     |                   |                 Yes  No
                     |                   |                 /     \
                     |                   |      [Filter: Low-Lat] (context > 8k?)
                     |                   |              |                 / \
                     |                   |              |               Yes  No
                     |                   |              |               /     \
                     |                   |              |      [Filter: Long]  ...
                     v                   v              v               v       v
           +--------------------------------------------------------------------+
           |                    Sort and Filter Backends                        |
           +--------------------------------------------------------------------+
                                         |
                            (driftScore > Threshold 0.7?)
                                        / \
                                      Yes  No
                                      /     \
                           [Prune / Avoid]   [Select Backend]
```

### 1. The Rule Pipeline
The selection pipeline evaluates rules in the following sequence:

| Rule # | Condition | Action / Filter Order | Primary Backend |
| :--- | :--- | :--- | :--- |
| **1** | `offline_required` | Filter to offline-ready backends | `ollama` |
| **2** | `cost_ceiling === 0` | Prioritize free, local runtimes | `ollama` |
| **3** | `latency_ms < 1000` | Prioritize fast response backends | `ollama` |
| **4** | `min_context_length > 8000` | Filter to long-context backends | `koboldcpp` |
| **5** | RAG Tool Request | Prioritize local knowledge base | `anythingllm` |
| **6** | `deterministic-replay` tag | Prioritize single-binary runtimes | `llamafile` |
| **7** | `sandbox` tag | Prioritize secure sandbox execution | `ollama` |
| **8** | Client Source (e.g., Jan) | Map to runtime matching UX client | `localai` |
| **9** | Default Fallback | Safety net if no filters applied | `ollama` |

---

## 💾 State Structure

The router relies on the `CICState` interface to track active backend performance. The router does not communicate with external stores directly; it reads from this memory object during the decision phase.

```typescript
export type BackendId =
  | "ollama"
  | "localai"
  | "gpt4all"
  | "llamafile"
  | "koboldcpp"
  | "anythingllm"
  | "mock";

export interface CICState {
  drift: Record<BackendId, number>;
}
```

---

## 🛡️ Drift Avoidance & Pruning

After compiling the sorted candidate list for a request, the router performs **Drift-aware Pruning**:

1.  **Read Drift Scores**: Loop through the candidate backends.
2.  **Evaluate Threshold**: Check if `cicState.drift[backend] > 0.7`.
3.  **Bypass**: If the drift score exceeds the `0.7` threshold, the candidate is discarded from the list.
4.  **Fallback**: The request falls back to the next candidate in the priority list.

This ensures that if `ollama` becomes slow or degraded, the system automatically redirects incoming chat requests to `localai` or `gpt4all`, allowing self-healing operations without operator intervention.
