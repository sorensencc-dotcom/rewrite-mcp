# Prompt Management System (PMS)

This document outlines the architecture of the `cic-pms` application, a dedicated Prompt Management System found in the `apps/cic-pms/` directory.

---
-   **Source:** `VERIFIED` (from `apps/cic-pms/` source code)
-   **Confidence:** `High`
---

## 1. Architecture and Purpose

-   **Purpose:** The `cic-pms` is a Node.js application designed to manage, version, and assemble prompts for AI models in a deterministic and reliable way. It abstracts the complexity of prompt engineering away from the applications that use the prompts.
-   **Core Concept:** The central concept is a "Prompt Pack".

## 2. Prompt Packs

-   **Definition:** A Prompt Pack is a JSON file (e.g., `analysis_v1.json`, `rewrite_v1.json`) that defines a complete prompt, including its structure, parameters, and metadata.
-   **Location:** Packs are stored in the `apps/cic-pms/packs/` directory.
-   **Key Components (Inferred from schema and source):**
    -   **`name`**: The unique name of the prompt pack.
    -   **`version`**: The version of the pack (e.g., "1.0.0").
    -   **`sections`**: An array of prompt sections (e.g., "role", "instructions", "context", "output_format"). The assembler combines these sections to build the final prompt string.
    -   **`guards`**: A list of validation rules to apply before a prompt is assembled (e.g., `guard_missingFields`). This ensures the inputs to the prompt are valid.
    -   **`model_router`**: Configuration for selecting the appropriate AI model based on the request.

## 3. Workflow

1.  **Load:** An application requests a prompt pack by name (e.g., `analysis_v1`).
2.  **Validate:** The PMS loader validates the pack's schema.
3.  **Assemble:** The PMS assembler takes the prompt pack and user-provided inputs, applies the guards, and assembles the final, complete prompt string.
4.  **Execute:** The final prompt is sent to the appropriate AI model via a unified client.
5.  **Drift Detection:** The system includes functionality to detect "drift" (i.e., if a prompt pack file has been modified from its canonical version), ensuring consistency.
