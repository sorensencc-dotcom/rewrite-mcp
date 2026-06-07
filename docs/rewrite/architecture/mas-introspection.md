# MAS Deep Introspection & Efficacy Lab

> **Status:** Production (v2.13.0+)  
> **Subsystem:** MAS (Multi-Agent Synergy)  
> **Phases:** 30 (Introspection) & 31 (Efficacy)  
> **Classification:** Architectural Specification / Traceability

---

## 👁️ Overview
The Deep Introspection Layer provides **Accountable Autonomy** for the Rewrite Labs MAS. While previous phases enabled autonomous routing and mitigation, Phase 30 and 31 ensure every cognitive intervention is traceable, explainable, and provably useful.

The system answers two critical questions for the operator:
1. **Why did MAS intervene?** (Introspection)
2. **Was the intervention worth it?** (Efficacy)

---

## 🏗️ Architecture

### 1. Introspection Engine (`introspection.js`)
The core logic responsible for capturing the "state of mind" of the MAS at the moment of a mitigation decision.

- **Feature Attribution**: A weighted mapping of input signals (Average Drift, Confidence, Rerun Frequency) to their impact on the decision.
- **Confidence Scoring**: A deterministic calculation of MAS's certainty in its own mitigation strategy, penalized by high volatility and rewarded by strong signal clarity.
- **Decision Path**: A human-readable array of logic steps followed by the Mitigation Engine (e.g., "Stability score dropped below 60 → Critical mode engaged").
- **Persistence**: All traces are WAL-persisted to `data/mas-introspection.json`.

### 2. Counterfactual Simulator
Embedded within the Introspection Engine, this module generates "What-If" scenarios using deterministic modeling.

- **No-Mitigation Path**: Projects the system's TTI (Time-to-Instability) and failure rate if current trends continued without intervention.
- **Mitigated Path**: Projects the expected improvement following the MAS intervention.

### 3. Efficacy Lab (`mas-efficacy.js`)
A frontend-integrated analysis engine that performs **Delta Analysis** across a window of introspection records.

- **Failures Avoided**: Cumulative delta between projected failures (No-Mit) and actual/projected outcomes with mitigation.
- **Instability Prevented**: Total gain in TTI (minutes) attributed to MAS interventions.
- **Net Positive Rate**: Percentage of interventions that resulted in higher confidence and improved stability.

---

## 📊 Data Model

### Introspection Record
```json
{
  "id": "7f8a12c3b4e5",
  "timestamp": 1716384000000,
  "modeBefore": "normal",
  "modeAfter": "elevated",
  "stability": {
    "score": 72.5,
    "avgDrift": 0.38,
    "avgConf": 0.82,
    "rerunFreq": 15
  },
  "featureAttribution": {
    "avgDrift": 0.38,
    "avgConfidence": 0.82,
    "rerunFrequency": 0.15,
    "recoveryScore": 0.275
  },
  "confidence": 0.85,
  "counterfactuals": {
    "noMitigation": { "projectedTTI": 5, "projectedFailures": 8 },
    "withMitigation": { "projectedTTI": 25, "projectedFailures": 2 }
  },
  "decisionPath": [
    "Stability score calculated: 72.50",
    "Global mode evaluated: ELEVATED",
    "Policy mitigation applied for mode elevated"
  ]
}
```

---

## 🎨 Visualization

### Cognitive Trace Panel
Displays the real-time "Decision Path" and "Feature Attribution" for the most recent MAS intervention. It uses a color-coded bar chart to show which signal (e.g., Drift vs. Rerun Frequency) was the primary driver.

### Efficacy Lab Dashboard
A high-level dashboard for business and technical stakeholders that quantifies the ROI of MAS. It surfaces "Failures Avoided" as a primary KPI, proving that the autonomous layer is preventing downtime and API cost overruns.

---

## 🛠️ Logic: Confidence Calculation
The confidence score is calculated using a base value adjusted by signal quality:
- **Base**: 0.70
- **Drift Penalty**: -0.10 if average drift > 0.5 (high volatility)
- **Signal Bonus**: +0.15 if any single feature attribution > 0.6 (clear driver)
- **Range**: Clamped between 0.10 and 0.99.
