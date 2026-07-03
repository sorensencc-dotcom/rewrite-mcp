# Architectural Overview

The **Offline-First AI Routing & Drift Control System** provides a highly resilient, low-latency, and deterministic fabric for running large language models (LLMs) locally on edge devices and offline environments. 

This document describes the core design patterns, structural layers, and execution loop of the system.

---

## 🏗️ Core Structural Layers

The system consists of three structural layers operating at different phases of the execution loop:

```
+---------------------------------------------------------------------------------+
|                                 GATEWAY LAYER                                   |
|   Standardizes OpenAI-compatible endpoints, routes CORS, and syncs jsonl logs.  |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                                 ROUTING LAYER                                   |
|   Resolves SLO targets against backend specifications and active drift scores. |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                                INGESTION LAYER                                  |
|   Harvests log entries, computes penalties, and feeds metrics back to Router.   |
+---------------------------------------------------------------------------------+
```

### 1. The Gateway Layer
Exposes standard endpoints (`/v1/chat`, `/v1/completion`, `/v1/rag/query`) on port `3119`. It isolates clients (such as local agent applications or front-ends) from the complexity of multiple backend runtimes. It is side-effect-free, lightweight, and writes structured records of each request/response interaction to a durable JSONL file (`client_sessions.jsonl`).

### 2. The Routing Layer (MAAL)
Acts as the central decision engine. Unlike probabilistic routers, the MAAL router evaluates a deterministic sequence of rules to match specifications (cost, latency, context length, RAG requirement) against registered local backends (Ollama, Koboldcpp, Llamafile, LocalAI, GPT4All).

### 3. The Ingestion Layer (CIC Substrate)
Closes the loop by running asynchronously. It scans client session logs, converts raw log entries into structured CIC events via the `clientSessionExtractor`, computes degradation and drift scores, and updates the global `cicState` memory.

---

## 🔄 The Closed-Loop Feedback Flow

The system operates as a closed-loop control system where past performance directly influences future routing:

```
[Inference Request] ---> [Adapter Gateway] ---> [MAAL Routing] ---> [Selected Model]
                               ^                                          |
                               |                                          v
                         (Applies Drift)                            [Log Turn]
                               |                                          |
                               +<--- [cicState] <--- [Drift Engine] <-----+
```

1.  **Step 1: Inference**: A request arrives at the Gateway and is routed to a local model.
2.  **Step 2: Observation**: The gateway records the latency, token count, and backend used.
3.  **Step 3: Ingestion**: The Harvester Bridge resolves the logs, and the extractor parses them.
4.  **Step 4: Evaluation**: The Drift Engine analyzes latency and token counts. If a backend exceeds 1500ms latency or 3000 tokens, it is penalized.
5.  **Step 5: Mitigation**: The updated drift scores are stored in `cicState.drift`. If a backend's drift score exceeds `0.7`, the MAAL router dynamically prunes it, falling back to the next best backend.

---

## 🛡️ Offline-First Design Principles

1.  **Zero External Network Calls**: The routing policy, tokenizers, and model specifications run entirely locally. Local loopbacks (`localhost`) are used to communicate with local model runtimes.
2.  **Mock Fallbacks**: Every local provider wrapper includes a structured mock fallback block. If a local service is temporarily down, the system does not crash; instead, it returns a marked mock response with correct schema metadata and latency profiles, allowing the drift engine to detect the failure and adapt routing.
3.  **Atomic Offline Storage**: Inference gateway logs are appended synchronously using `fs.appendFileSync` to ensure durability under concurrent threads without relying on external databases.
4.  **Deterministic State**: All drift updates, score accumulations, and routing decisions are side-effect-free, pure functions dependent only on `request` and `cicState`.
