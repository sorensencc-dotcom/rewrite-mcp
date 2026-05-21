# **SLO Dashboard Specification**
**Rewrite Labs — Phase-26 Runtime Hardening**
**Version 1.0 (Draft)**

---

## **1. Overview**
The **SLO Dashboard** is the primary operational interface for monitoring the health of the Antigravity runtime against the [Antigravity SLO Charter](../ANTIGRAVITY_SLO.md). It provides real-time visibility into reliability, concurrency, latency, and observability metrics.

## **2. Functional Requirements**
- **Real-time Status**: Visualize current SLO compliance using a traffic-light system (Red/Yellow/Green).
- **Error Budget Monitoring**: Track the burn rate of error budgets for Hard Failures, Safe-Mode landings, and Fallbacks.
- **Drill-down Capability**: Allow operators to navigate from a violated SLO to the specific pathological traces (waterfall traces) that caused it.
- **Historical Trends**: Display 24-hour and 7-day trends for latency and drift.

## **3. Layout & Components**

### **3.1 Global Health Header**
A summary bar at the top of the dashboard.
- **Overall Status**: "HEALTHY" | "DEGRADED" | "CRITICAL"
- **Active Incident Count**: Total number of currently failing SLOs.
- **Global Error Budget Burn**: Percentage of total error budget consumed across all domains.

### **3.2 SLO Domain Grid**
Four main cards representing the core SLO domains:

#### **A. Reliability (SLO-R1, SLO-R2)**
- **Widget**: Big Number + Trend Sparkline.
- **Metric**: Success Rate vs. Hard Failure Rate.
- **Safe-Mode Count**: Total landings in the current window.
- **Status**: 
  - Green: 0 hard failures.
  - Red: >0 hard failures.

#### **B. Concurrency (SLO-C1, SLO-C2, SLO-C3)**
- **Widget**: Radial Gauge.
- **Metric**: Peak Concurrent Agents (N).
- **Orchestration Burst Rate**: TPS (Tracks/Sec) over 10s.
- **Status**: 
  - Green: N <= 32.
  - Yellow: 32 < N <= 64.
  - Red: N > 64 or queue corruption detected.

#### **C. Latency & Fallback (SLO-L1, SLO-L2, SLO-L3)**
- **Widget**: Latency Histogram (p50, p95, p99).
- **Metric**: Model Latency (ms).
- **Fallback Activation Rate**: % of calls reaching fallback.
- **Status**: 
  - Green: p95 < 2.5s.
  - Yellow: p95 < 4.0s.
  - Red: p95 >= 4.0s or fallback exhaustion.

#### **D. Safe-Mode & Drift (SLO-S1, SLO-S2, SLO-O3)**
- **Widget**: Line Chart (Memory Drift) + Ticker (Safe-Mode).
- **Metric**: % Heap Drift / Hour.
- **Safe-Mode Rate**: % of total orchestrations.
- **Status**:
  - Green: Safe-Mode < 0.5%, Drift < 5%.
  - Yellow: Safe-Mode < 3%.
  - Red: Safe-Mode >= 3% or Drift >= 5%.

### **3.3 Pathological Trace Explorer**
A table below the grid listing the "Last 10 Anomalies".
- **Columns**: Timestamp, Correlation ID, Violation Type, Latency, Terminal State (Safe-Mode/Success).
- **Action**: Click to open the Waterfall Trace Renderer for that specific Correlation ID.

## **4. Technical Implementation**

### **4.1 Frontend (Operator UI)**
- **Framework**: Vanilla JS (consistent with `metrics-panel.js`).
- **Charts**: Use a lightweight charting library or SVG/Canvas (e.g., Chart.js if approved, or custom D3/SVG).
- **API Client**: `CicAPI.getSLOMetrics()` (New Endpoint).

### **4.2 Backend (Control Plane)**
- **New Endpoint**: `GET /api/control-plane/metrics/slo`
- **Logic**: Aggregates data from `tokenMeter`, `telemetry`, and the `Stress Harness` results.
- **Storage**: Querying the telemetry store (e.g., Postgres/SQLite) for recent span distributions.

## **5. Error Budget Logic**
- **Calculation**: `1 - (Errors / Total_Windows_Events)`.
- **Thresholds**: Alerts trigger at 50%, 80%, and 100% budget consumption.
- **Reset**: Budgets reset every 30 days.

## **6. Visualization Rules**
- **Green**: 100% compliant.
- **Yellow**: SLO breached but Error Budget remains > 20%.
- **Red**: Error Budget exhausted or Hard Failure detected.
