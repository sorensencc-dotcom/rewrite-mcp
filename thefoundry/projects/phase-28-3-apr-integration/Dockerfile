# Phase 28.3 — APR ↔ CRO Integration
# Links Autonomous Planning to CRO executor with adapter operations
# Multi-stage: base → builder → test → validate → final

FROM node:20-slim AS base
WORKDIR /workspace
COPY package*.json ./
COPY projects/cic/package*.json projects/cic/
RUN npm install --ignore-scripts

# Full monorepo build
FROM base AS builder
COPY . .
RUN npm run build -w cic

# Test stage — runs all tests
FROM builder AS test
RUN npm run test -w cic 2>&1

# Validation: APR bridge implemented + TaskExecution extended
FROM test AS validate
RUN if [ ! -f projects/cic/dist/src/apr/task-to-operations.d.ts ]; then echo "ERROR: TaskToOperationsConverter not built" && exit 1; fi
RUN if [ ! -f projects/cic/dist/src/apr/planner-executor-bridge.d.ts ]; then echo "ERROR: PlannerExecutorBridge not built" && exit 1; fi
RUN if grep -q "aprPlanId" projects/cic/dist/src/cro/types.d.ts; then echo "✓ TaskExecution extended with APR context"; else echo "ERROR: aprPlanId not in types"; exit 1; fi
RUN echo "✓ Phase 28.3 validation passed: APR-CRO integration complete"

# Final runtime
FROM node:20-slim AS final
WORKDIR /cic
COPY --from=builder /workspace/projects/cic/dist ./dist
COPY --from=builder /workspace/projects/cic/wil ./wil
ENTRYPOINT ["/bin/bash", "-c", "test -f dist/src/apr/planner-executor-bridge.js && echo 'Phase 28.3 ✓ APR↔CRO integration ready' || (echo 'Build failed' && exit 1)"]
