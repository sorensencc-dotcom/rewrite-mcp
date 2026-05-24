# Gemini Connectors

This document outlines the structural definition of "Connectors" as they relate to the Gemini agent.

---
-   **Source:** `VERIFIED`
-   **Confidence:** `High`
---

## 1. Connector Architecture

-   **Definition:** The Gemini agent does not have a discrete architectural component named "Connector".
-   **Equivalent Concept:** The function of connecting to external data sources or services is handled by the agent's built-in **Tools**.

## 2. Examples of Tools as Connectors

-   **`google_web_search`:** This tool acts as a "connector" to the public internet via the Google Search service.
-   **`web_fetch`:** This tool can be seen as a generic HTTP "connector" that allows the agent to fetch content from any specified URL, including local and private network addresses.
-   **`invoke_agent`:** This tool acts as a "connector" to other specialized AI agents.

In the Gemini architecture, there is no distinction between a "tool", a "plugin", or a "connector". They are all unified under the single concept of a "Tool" provided by the hosting environment.
