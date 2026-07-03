# Routing Policy Test Suite

The **Routing Policy Test Suite** validates that the MAAL router maps incoming inference requests to the correct local runtime backends under different constraints.

This document describes the test suite structure and the routing rules validated.

---

## 🧪 Test Suite Specifications

The test suite is located at:

```
C:\dev\src\tests\maal-routing-policy.test.ts
```

It contains 13 individual tests validating all routing scenarios against a mock `cicState`.

---

## 🔍 Routing Rules Validated

The tests verify the following routing scenarios:

### 1. Offline Constraints
*   **Test**: `"1. Offline-required routing"`
*   **Validation**: Ensures that requests requiring offline capabilities filter out remote endpoints and select an offline-ready model (e.g. `ollama`, `localai`, `gpt4all`, or `llamafile`).

### 2. Free / Zero-Cost Constraints
*   **Test**: `"2. Cost = 0 (offline-first) routing"`
*   **Validation**: Verifies that when `cost_ceiling === 0`, candidate backends are filtered to free local runtimes.

### 3. Latency Constraints
*   **Test**: `"3. Low-latency routing"`
*   **Validation**: Asserts that requests specifying $T_{\text{latency}} < 1000\text{ ms}$ are routed only to low-latency local runtimes.

### 4. Context Window Constraints
*   **Test**: `"4. Long-context routing"`
*   **Validation**: Validates that requests requiring large context windows ($>8000$ tokens) are routed to `koboldcpp`.

### 5. Tool / RAG Routing
*   **Test**: `"5. RAG-required routing"`
*   **Validation**: Ensures that requests invoking RAG capabilities are routed directly to the `anythingllm` local knowledge base.

### 6. Sandbox & Replay Constraints
*   **Test**: `"6. Deterministic replay routing"` & `"7. Sandbox mode routing"`
*   **Validation**: Verifies that the system routes requests containing sandbox and replay tags to `llamafile` or `ollama` respectively.

### 7. UX Client Mapping
*   **Tests**: `"8. UX source routing: LM Studio"`, `"Jan"`, `"Msty"`, `"Open WebUI"`
*   **Validation**: Validates that incoming client source headers route requests to the matching runtime adapter.

### 8. Drift Avoidance
*   **Test**: `"10. Drift avoidance routing"`
*   **Validation**: Simulates a high drift score (`0.9`) on `ollama`. Asserts that the router bypasses `ollama` and routes the request to the next best candidate (`localai`).
