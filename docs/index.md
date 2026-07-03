# Offline-First AI Routing & Drift Control System

Welcome to the internal engineering manual for the **Offline-First AI Routing & Drift Control System**. This site contains the comprehensive specification, architecture designs, and operation manuals for the MAAL (Multi-Agent Adaptive Layer) routing and CIC (Conversational Intelligence Core) drift feedback control loop.

---

## 🚀 System Design Goals

Our AI fabric is designed to operate locally, efficiently, and resiliently, prioritizing local-first processing before falling back to remote providers. The system implements three core capabilities:

1.  **Unified Adapter Gateway**: A standardized API Gateway serving as a single endpoint for all chat, completion, and retrieval models, running locally on port `3119`.
2.  **Deterministic MAAL Routing**: A rule-based routing policy that maps incoming user and agent requests to the most appropriate offline model runtime based on service-level objectives (SLOs), contexts, cost targets, and sandbox isolation constraints.
3.  **Active Drift Feedback Loop**: A closed-loop control system that harvests performance and token usage logs, extracts drift signals, accumulates drift scores, and dynamically feeds these metrics back into the MAAL router to bypass degraded or slow offline backends.

---

## 🗺️ System Blueprint

```
                     +---------------------------------------+
                     |         Inference Request             |
                     +-------------------+-------------------+
                                         |
                                         v
                     +-------------------+-------------------+
                     |      Unified Adapter Gateway API      |
                     |             (Port 3119)               |
                     +-------------------+-------------------+
                                         |
                                         v
                     +-------------------+-------------------+
                     |       Deterministic MAAL Router       |
                     |         (Routing Policy Rules)        |
                     +-------------------+-------------------+
                                         |
                        +----------------+----------------+
                        |                                 |
                        v                                 v
              +---------+---------+             +---------+---------+
              |   Healthy Backend |             |  Drifted Backend  |
              |     (e.g. Ollama) |             | (Bypassed/Pruned) |
              +---------+---------+             +-------------------+
                        |
                        v
              +---------+---------+
              |   Client Sessions |
              |     JSONL Log     |
              +---------+---------+
                        |
                        v
              +---------+---------+
              |  Harvester Ingest |
              |  (Extractor/Bridge|
              +---------+---------+
                        |
                        v
              +---------+---------+
              |    Drift Engine   |
              | (Score Penalty)   |
              +---------+---------+
                        |
                        +---------------------------------+
                                                          | (Update state)
                                                          v
                                                +---------+---------+
                                                |   Global state    |
                                                |   (cicState.drift)|
                                                +-------------------+
```

---

## 📖 Navigation Map

*   **[Architecture Overview](architecture/overview.md)**: Conceptual breakdown of the feedback loop and design principles.
*   **[Deterministic Routing](architecture/routing.md)**: Detailed MAAL routing heuristics and SLO resolution rules.
*   **[Drift Control](architecture/drift.md)**: Mathematical models of drift score penalties and feedback routing.
*   **[Ingestion Flow](architecture/ingestion.md)**: How JSONL client logs are resolved, extracted, and processed offline.
*   **[Adapter Gateway API](gateway/adapterGatewayAPI.md)**: Express endpoints, synchronous logging, and CORS configurations.
*   **[Provider Adapters](gateway/providers.md)**: Timeout-gated adapters for Ollama, Koboldcpp, Llamafile, LocalAI, and GPT4All.
*   **[CIC Substrate](cic/harvester.md)**: Extractors, Bridge Resolvers, and the Replay Ingestion Harness.
*   **[Drift Dashboard](dashboard/dashboard.md)**: Real-time operator console UI displaying metrics and active bypasses.
*   **[Test Coverage](tests/routing-tests.md)**: Complete details of the 16 unit and integration test suites validating system correctness.
