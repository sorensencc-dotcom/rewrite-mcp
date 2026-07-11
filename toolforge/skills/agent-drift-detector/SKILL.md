---
skill_name: agent-drift-detector
version: 1.0.0
name: Agent Drift Detector
category: validation
description: Detect schema drift in agent messages and APIs
author: soren
tags: ["drift", "schema", "validation"]
---
# Agent Drift Detector

Detect schema drift in agent messages and APIs.

## Metadata

- **ID:** agent-drift-detector
- **Version:** 1.0.0
- **Category:** validation
- **Runtime:** node
- **Entrypoint:** src/index.js

## Usage

Compares an expected schema against the actual observed schema of an agent's outputs, alerting if fields are missing or unexpected.
