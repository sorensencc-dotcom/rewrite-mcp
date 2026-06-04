# Helm Setup Guide for Claude Desktop

Complete integration of Phase 47/48 cost intelligence into Claude Desktop.

---

## Prerequisites

- Claude Desktop installed (latest version)
- Node.js 18+
- `tsx` or `ts-node` for TypeScript execution
- Phase 47/48 files in place (benchmarks/routing, benchmarks/costs)

---

## Step 1: Install TypeScript Runner

```bash
npm install -g tsx
# or
npm install -g ts-node
```

---

## Step 2: Configure MCP Server

### Option A: Using tsx (Recommended)

1. Find your Claude Desktop config file:

   **macOS/Linux:**
   ```bash
   ~/.config/claude/claude_desktop_config.json
   ```

   **Windows:**
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   # Usually: C:\Users\<YourUsername>\AppData\Roaming\Claude\claude_desktop_config.json
   ```

2. Edit or create the file with:

   ```json
   {
     "mcpServers": {
       "helm": {
         "command": "tsx",
         "args": [
           "/absolute/path/to/rewrite-mcp/tools/mcp/helm-server.ts"
         ],
         "env": {
           "NODE_OPTIONS": "--max-old-space-size=512"
         }
       }
     }
   }
   ```

   Replace `/absolute/path/to/rewrite-mcp` with your actual path.

3. Save and close Claude Desktop completely.

4. Restart Claude Desktop.

### Option B: Using Node with ts-node

If tsx doesn't work, use ts-node:

```json
{
  "mcpServers": {
    "helm": {
      "command": "node",
      "args": [
        "--loader=ts-node/esm",
        "--experimental-specifier-resolution=node",
        "/absolute/path/to/rewrite-mcp/tools/mcp/helm-server.ts"
      ]
    }
  }
}
```

---

## Step 3: Verify MCP Server

1. In Claude Desktop, ask:

   ```
   What tools do you have available?
   ```

2. Look for these tools in the response:
   - `helm:today`
   - `helm:trends`
   - `helm:routing-status`
   - `helm:set-preference`
   - `helm:budget-warning`

3. If missing, check:
   - MCP server is running: `ps aux | grep helm-server`
   - Config file path is correct
   - Absolute path in config (not relative)
   - Claude Desktop logs: `~/.claude/logs`

---

## Step 4: Test Commands

Try these commands in Claude Desktop:

### Test 1: Check today's spend

```
User: /costs
Claude: [Should show today's spend and budget]
```

### Test 2: Check routing status

```
User: /routing
Claude: [Should show current routing preferences]
```

### Test 3: Check budget

```
User: /budget
Claude: [Should show remaining budget]
```

If any command fails, the MCP server isn't responding properly.

---

## Step 5: Generate Cost Data (If Needed)

If you see "No cost data available yet", run a benchmark:

```bash
npm run bench:opus-sonnet
# or
npm run cost:helm  # Just regenerate reports
```

This populates `benchmarks/costs/costLog.json` and `helm.json`.

---

## Step 6: Enable Status Line (Optional, Tier 2)

Status line integration depends on Claude Desktop's MCP status line API (coming soon).

For now, you can:
- Use `/costs` to check spend
- Monitor `benchmarks/costs/reports/helm.json` directly
- Check Helm dashboard at http://localhost:3847/helm (Tier 3)

---

## Step 7: Start Web Dashboard (Optional, Tier 3)

```bash
cd /path/to/rewrite-mcp
npx ts-node tools/helm/server.ts
```

Then open: http://localhost:3847/helm

---

## Troubleshooting

### "helm:today tool not found"

**Problem:** MCP server isn't loading.

**Solutions:**
1. Verify absolute path in config: `echo /absolute/path/to/rewrite-mcp`
2. Check file exists: `ls tools/mcp/helm-server.ts`
3. Check tsx is installed: `tsx --version`
4. Restart Claude Desktop completely (force quit + reopen)
5. Check logs: `tail ~/.claude/logs/*`

### "No cost data available"

**Problem:** Phase 48 hasn't logged any costs.

**Solution:**
1. Run benchmark: `npm run bench:opus-sonnet`
2. Or manually generate reports: `npm run cost:helm`
3. Verify files exist: `ls benchmarks/costs/reports/helm.json`

### "Permission denied" on config file

**Problem:** Can't edit config file.

**Solution:**
```bash
# Check permissions
ls -la ~/.config/claude/
# Fix if needed
chmod 644 ~/.config/claude/claude_desktop_config.json
```

### MCP server crashes on startup

**Problem:** TypeScript error in helm-server.ts

**Solution:**
1. Check syntax: `npx tsc --noEmit tools/mcp/helm-server.ts`
2. Check imports: All Phase 47/48 files must exist
3. Check Node version: `node --version` (must be 18+)

### Status line not showing in Claude Desktop

**Problem:** Status line integration not available in this version.

**Status:** This is a Tier 2 feature requiring Claude Desktop API support. For now, use `/costs` command instead.

---

## Configuration Customization

### Change Daily Budget

Edit the budget value in `tools/mcp/helm-server.ts`:

```typescript
const dailyBudget = 10.0;  // Change this
```

Then restart Claude Desktop.

### Change MCP Server Port

If port 3847 is taken, edit `tools/helm/server.ts`:

```typescript
const PORT = 3847;  // Change this
```

### Change Update Interval

Edit `tools/helm/status-line.ts`:

```typescript
export const defaultConfig: StatusLineConfig = {
  updateIntervalMs: 5000,  // Update every 5 seconds
  // ...
};
```

---

## Next Steps

1. **Enable cost logging in benchmark:**
   - Update `benchmarks/tools/opusSonnetBenchmark.ts` to use Helm
   - See: `benchmarks/routing/INTEGRATION.md`

2. **Integrate Helm into CIC:**
   - Update orchestrator to use `routedAnthropicCall()`
   - Start cost agent on app startup
   - See: `benchmarks/routing/INTEGRATION.md`

3. **Deploy web dashboard:**
   - Run `npx ts-node tools/helm/server.ts`
   - Open http://localhost:3847/helm
   - Bookmark for easy access

4. **Monitor spend:**
   - Use `/costs` to check daily budget
   - Use `/routing` to verify model routing
   - Use `/budget --warning` for alerts

---

## Support

For issues or questions:

1. Check MCP logs: `~/.claude/logs`
2. Review Phase 47/48 docs:
   - `benchmarks/routing/README.md`
   - `benchmarks/costs/README.md`
3. Verify files are in correct locations
4. Ensure absolute paths in config (no `~` or relative paths)

---

## Performance

Expected startup time:

- MCP server: ~500ms
- Command execution: <50ms per call
- Dashboard load: <1s

CPU/Memory impact: Minimal (polling every 30 seconds)

---

## Uninstall

To remove Helm integration:

1. Edit `~/.config/claude/claude_desktop_config.json`
2. Remove the `helm` entry from `mcpServers`
3. Restart Claude Desktop

Files are still in place if you want to re-enable later.

---

## Verification Checklist

- [ ] MCP config file created/edited
- [ ] Absolute path in config is correct
- [ ] `tsx` or `ts-node` installed globally
- [ ] Claude Desktop restarted
- [ ] `helm:today` tool available in Claude Desktop
- [ ] `/costs` command returns data
- [ ] `benchmarks/costs/reports/helm.json` exists
- [ ] Status line shows cost (Tier 2+)
- [ ] Web dashboard loads (Tier 3)

If all checks pass, Helm is ready to use! 🎉
