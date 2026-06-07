# Operational Manual: Startup & Launcher

This document describes the procedures for booting the Cast Iron Charlie (CIC) ecosystem, ranging from one-click GUI launchers to hardened CLI scripts.

## 1. One-Click Desktop Launcher (Recommended)

For Linux environments with a desktop entry system (e.g., Ubuntu, Debian, WSLg), a GUI launcher is available.

- **File**: `scripts/CIC-Control-Plane.desktop`
- **Action**: Double-click the "CIC Control Plane" icon in your applications menu or on your desktop.
- **What it does**:
    1.  Sets up the hardened environment variables.
    2.  Executes the `launch-cic.sh` boot script.
    3.  Opens the Operator Dashboard automatically in your default browser.

## 2. Hardened CLI Boot Script

The `launch-cic.sh` script is the authoritative way to start the system from a terminal. It ensures that all services are started in the correct order with the necessary guardrails.

- **File**: `scripts/launch-cic.sh`
- **Usage**:
  ```bash
  cd /mnt/c/dev/rewrite-mcp
  bash scripts/launch-cic.sh
  ```
- **Lifecycle Sequence**:
    1.  **Environment Check**: Verifies workspace root and environment variable consistency.
    2.  **Telemetry Boot**: Starts the Prompt Telemetry server (Port 4310).
    3.  **Intelligence Boot**: Starts the CIC Ingestion/Intelligence server (Port 4001).
    4.  **Control Plane Boot**: Starts the main API and Static UI server (Port 3000).
    5.  **Dashboard Access**: Opens `http://localhost:3000/dashboard` automatically.

## 3. Manual Service Startup

If you need to debug a specific component or run services on non-standard ports, you can start them manually.

### 3.1. Telemetry Server
```bash
cd /mnt/c/dev/rewrite-mcp/tools/prompt-telemetry
npm start
```
*Default Port: 4310*

### 3.2. Intelligence Server
```bash
cd /mnt/c/dev/rewrite-mcp/projects/cic/ingestion
npm run ingest:server
```
*Default Port: 4001*

### 3.3. Control Plane
```bash
cd /mnt/c/dev/rewrite-mcp/apps/control-plane
npm start
```
*Default Port: 3000*

## 4. Verification

Once the system is started, verify health via the **Ops Console**:

```bash
cd /mnt/c/dev/rewrite-mcp
npm run ops:status
```

A healthy startup should show all three core services as **REACHABLE** and reporting **OK** in the health block.

## 5. Troubleshooting

- **Port Conflict**: If a service fails with `EADDRINUSE`, use `fuser -k <port>/tcp` to clear the process.
- **Auth Errors**: If you encounter 401/403 errors, ensure `AUTH_DISABLED=true` is set in the Control Plane `.env` for local development.
- **Missing Secrets**: The system will warn if required `ORCH_*` or `CP_*` secrets are missing. Ensure your `.env` files are populated or run via Infisical.
