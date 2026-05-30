# CIC Dashboard Integration Specification

> **Version:** 1.0.0  
> **Status:** Active  
> **Last Updated:** 2026-05-22

## Overview
This document specifies the integration between the CIC Control Plane and the Operator UI Dashboard, focusing on real-time telemetry, SLO tracking, and MAS (Multi-Agent System) visibility for the ingestion pipeline.

## 🛰️ Telemetry Stream
- **Source:** `src/logging/blackbox.js`
- **Protocol:** Server-Sent Events (SSE) or WebSocket via Control Plane.
- **Payloads:**
    - `ingest_started`: Pipeline entry point.
    - `mas_directive`: Real-time routing decisions (rerun, skip, fallback).
    - `blackbox_event`: Logic-specific lifecycle markers.

## 📊 SLO Metrics Plane
- **Endpoint:** `GET /api/control-plane/metrics/slo`
- **Tracked SLIs:**
    - **Latency:** Ingestion duration per memo.
    - **Efficacy:** Ratio of successful extractions vs. model fallbacks.
    - **Availability:** Control Plane uptime and API responsiveness.
- **Visualization:** Integrated into the "SLO Dashboard" panel.

## 🧠 MAS Cognitive Trace (Phase 28-31)
- **Panel:** `js/introspection-panel.js`
- **Data Source:** `projects/cic/orchestrator/src/mas/introspection.js`
- **Visuals:**
    - **Decision Path:** Graphical representation of *why* an agent was rerun or bypassed.
    - **Feature Attribution:** Weighted list of telemetry signals driving the current MAS directive.
    - **Counterfactuals:** Predicted outcome if MAS had not intervened.

## 🕹️ Operator Controls
- **Manual Overrides:** Telemetry-instrumented toggle for force-triggering re-runs.
- **Policy Tuning:** Real-time adjustment of MAS confidence thresholds (0.35/0.45 defaults).

