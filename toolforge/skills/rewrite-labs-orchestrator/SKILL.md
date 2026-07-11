---
skill_name: rewrite-labs-orchestrator
version: 1.0.0
name: Rewrite Labs Orchestrator
category: orchestration
description: Orchestrates multi-stage development pipelines and handles blockers
author: soren
tags: ["pipeline", "stages", "orchestration"]
---
# Rewrite Labs Orchestrator

Orchestrates multi-stage development pipelines and handles blockers.

## Metadata

- **ID:** rewrite-labs-orchestrator
- **Version:** 1.0.0
- **Category:** orchestration
- **Runtime:** node
- **Entrypoint:** src/index.js

## Usage

Takes a pipeline state input containing an array of stages and their statuses, calculating percent completion, blocked stages, and suggesting next execution steps.
