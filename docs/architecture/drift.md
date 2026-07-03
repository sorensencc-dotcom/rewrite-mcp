# The Drift Scoring Engine

The **Drift Scoring Engine** acts as the dynamic regulator in our feedback loop. It measures performance degradation of local backends and calculates penalty scores. 

This document defines the mathematical model, penalty scoring thresholds, and active state mitigation strategy.

---

## 🧮 Mathematical Model

Drift represents the degradation level of a backend relative to its expected baseline performance. We model drift as a cumulative penalty function bounded between `0.0` (optimal) and `1.0` (fully degraded).

### 1. Penalty Calculation
For each ingested log turn, the system evaluates the latency and token counts:

$$\text{Penalty} = P_{\text{latency}} + P_{\text{tokens}}$$

Where:

*   **Latency Penalty ($P_{\text{latency}}$)**:
    $$P_{\text{latency}} = \begin{cases} 0.3 & \text{if } T_{\text{latency}} > 1500 \text{ ms} \\ 0.0 & \text{otherwise} \end{cases}$$
*   **Token Penalty ($P_{\text{tokens}}$)**:
    $$P_{\text{tokens}} = \begin{cases} 0.3 & \text{if } N_{\text{tokens}} > 3000 \\ 0.0 & \text{otherwise} \end{cases}$$

### 2. Score Update Formula
The drift score of the backend is updated iteratively:

$$D_{t} = \min\left(1.0, \, D_{t-1} + \text{Penalty}\right)$$

Where:
*   $D_{t}$ is the new drift score at step $t$.
*   $D_{t-1}$ is the previous drift score.
*   $\text{Penalty}$ is the calculated penalty from the turn.

---

## 🚦 Mitigation Thresholds

The system acts based on three drift score zones:

```
[0.0] ---------------- [0.3] ------------------ [0.7] ------------------ [1.0]
        STABLE                WARNING                CRITICAL (BYPASS)
```

*   **Stable Zone (`0.0` to `0.3`)**: The backend is operating within healthy performance thresholds. No action is taken.
*   **Warning Zone (`0.3` to `0.7`)**: Performance is degrading (e.g., slow responses or extremely large payloads). The status is highlighted on the Operator Dashboard.
*   **Critical Bypass Zone (`0.7` to `1.0`)**: Performance is severely degraded. The MAAL router prunes this backend from incoming requests, forcing fallbacks to alternative runtimes.

---

## 🔄 Drift Decay & Recovery

To prevent backends from being permanently blacklisted, a decay model is planned to reduce drift scores over time:

$$D_{t} = \max\left(0.0, \, D_{t-1} - \lambda \cdot \Delta t\right)$$

Where:
*   $\lambda$ is the decay constant (e.g., `0.05` per minute).
*   $\Delta t$ is the elapsed idle time.

This allows temporarily overloaded backends to cool down and automatically rejoin the active candidate pool after their scores decay below `0.7`.
