export async function renderHeadroomPanel(container) {
  const [resTelemetry, resAutotune] = await Promise.all([
    fetch("/telemetry/headroom"),
    fetch("/telemetry/headroom-autotune")
  ]);

  const data = await resTelemetry.json();
  const autotune = await resAutotune.json();

  container.innerHTML = `
    <div class="panel-title">Headroom</div>
    <div class="metric">Status: <span style="color: ${autotune.degraded ? '#ff5555' : '#55ff55'}; font-weight: bold;">${autotune.degraded ? 'DEGRADED (Bypassed)' : 'HEALTHY'}</span></div>
    <div class="metric">Context Efficiency Score: ${(autotune.efficiency?.score ?? 0).toFixed(2)}</div>
    <div class="metric">Avg Compression Ratio: ${
      data.compressionHistory.length
        ? (data.compressionHistory.reduce((a,b)=>a+b,0) / data.compressionHistory.length).toFixed(2)
        : "n/a"
    }</div>
    <div class="metric">MCP Latency (avg ms): ${
      data.mcpLatencyHistory.length
        ? (data.mcpLatencyHistory.reduce((a,b)=>a+b,0) / data.mcpLatencyHistory.length).toFixed(1)
        : "n/a"
    }</div>
    <div class="metric">Proxy Latency (avg ms): ${
      data.proxyLatencyHistory.length
        ? (data.proxyLatencyHistory.reduce((a,b)=>a+b,0) / data.proxyLatencyHistory.length).toFixed(1)
        : "n/a"
    }</div>
    <div class="metric">Bypasses: ${data.bypassCount}</div>
    <div class="metric">Auth Failures: ${data.authFailureCount}</div>
    <div class="metric">CCR Retrievals: ${data.ccrRetrievalCount}</div>
    <div class="metric">Last Error: ${data.lastError ?? "none"}</div>
  `;
}
