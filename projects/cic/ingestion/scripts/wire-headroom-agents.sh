#!/usr/bin/env bash
set -euo pipefail

# Discovery agent
for ext in ts js; do
  file="src/agents/discoveryAgent.${ext}"
  if [ -f "$file" ]; then
    sed -i.bak 's#from "../lib/llmClient"#from "../lib/llmClientWithHeadroom"#' "$file" || true
    sed -i.bak 's#llm\.chat(#chatWithHeadroom(#g' "$file" || true
  fi
done

# Harvester agent
for ext in ts js; do
  file="src/agents/harvesterAgent.${ext}"
  if [ -f "$file" ]; then
    sed -i.bak 's#from "../lib/llmClient"#from "../lib/llmClientWithHeadroom"#' "$file" || true
    sed -i.bak 's#llm\.chat(#chatWithHeadroom(#g' "$file" || true
  fi
done

# Orchestrator agent
for ext in ts js; do
  file="src/agents/orchestratorAgent.${ext}"
  if [ -f "$file" ]; then
    sed -i.bak 's#from "../lib/llmClient"#from "../lib/llmClientWithHeadroom"#' "$file" || true
    sed -i.bak 's#llm\.chat(#chatWithHeadroom(#g' "$file" || true
  fi
done

# Synthesizer agent
for ext in ts js; do
  file="src/agents/synthesizerAgent.${ext}"
  if [ -f "$file" ]; then
    sed -i.bak 's#from "../lib/llmClient"#from "../lib/llmClientWithHeadroom"#' "$file" || true
    sed -i.bak 's#llm\.chat(#chatWithHeadroom(#g' "$file" || true
  fi
done

# Audit agent
for ext in ts js; do
  file="src/agents/auditAgent.${ext}"
  if [ -f "$file" ]; then
    sed -i.bak 's#from "../lib/llmClient"#from "../lib/llmClientWithHeadroom"#' "$file" || true
    sed -i.bak 's#llm\.chat(#chatWithHeadroom(#g' "$file" || true
  fi
done

# Observability / debug tools (if they call LLM)
for ext in ts js; do
  file="src/agents/observabilityAgent.${ext}"
  if [ -f "$file" ]; then
    sed -i.bak 's#from "../lib/llmClient"#from "../lib/llmClientWithHeadroom"#' "$file" || true
    sed -i.bak 's#llm\.chat(#chatWithHeadroom(#g' "$file" || true
  fi
done
