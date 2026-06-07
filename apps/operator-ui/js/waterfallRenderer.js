/**
 * waterfallRenderer.js
 * @version 1.0.0
 * @date 2026-05-20
 *
 * Phase 26 Waterfall Trace Renderer — ASCII Visualization.
 */

export function renderWaterfall(events) {
  if (!events || events.length === 0) return "No events.";

  // Sort oldest → newest
  events.sort((a, b) => (a.ts < b.ts ? -1 : 1));

  const t0 = new Date(events[0].ts).getTime();

  function rel(ts) {
    const ms = new Date(ts).getTime() - t0;
    return (ms / 1000).toFixed(3).padStart(7, " ");
  }

  const lines = [];

  for (const e of events) {
    const time = rel(e.ts);
    const type = e.type.toUpperCase().padEnd(12, " ");
    const stage = (e.stage || e.subsystem || "-").padEnd(12, " ");

    let detail = "";

    if (e.type === "model_call") {
      const bar = "█".repeat(Math.min(20, Math.floor(e.latencyMs / 20)));
      detail = `${e.model} ${e.success ? "OK" : "FAIL"} ${e.latencyMs}ms ${bar} attempt=${e.attempt || 1}/${e.maxAttempts || 1}`;
    }

    if (e.type === "pipeline") {
      detail = `${e.step || "-"} ${e.status?.toUpperCase() || "-"} safe=${e.safeMode ? "Y" : "N"} reason=${e.reason || "-"}`;
    }

    if (e.type === "fallback") {
      detail = `fallback chain=${(e.chain || []).join("→")} mode=${e.finalMode} attempts=${e.attempts}`;
    }

    if (e.type === "override") {
      detail = `OVERRIDE agent=${e.agent} action=${e.action}`;
    }

    if (e.type === "drift") {
      detail = `DRIFT pack=${e.pack}@${e.version} expected=${e.expectedHash?.slice(0, 6)} actual=${e.actualHash?.slice(0, 6)}`;
    }

    if (e.type === "mas_decision") {
      const d = e.directive ?? "none";
      const marker = (d === "fallbackAgent") ? "!!" : (d === "rerunAgent" || d === "skipAgent") ? "! " : "  ";
      detail = `${marker}MAS ${d} drift=${(e.drift ?? 0).toFixed(2)} conf=${(e.confidence ?? 0).toFixed(2)} reason=${e.reason ?? "-"}`;
    }

    if (e.type === "mas_signal") {
      detail = `   MAS signal drift=${(e.drift ?? 0).toFixed(2)} conf=${(e.confidence ?? 0).toFixed(2)}`;
    }

    lines.push(`[${time}s] ${type} ${stage} ${detail}`);
  }

  return lines.join("\n");
}
