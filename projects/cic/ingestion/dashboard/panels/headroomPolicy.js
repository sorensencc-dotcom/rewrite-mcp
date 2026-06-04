export async function renderHeadroomPolicyPanel(container) {
  const res = await fetch("/telemetry/headroom-policy");
  const data = await res.json();

  const last = data.lastDecision ?? {};
  const log = data.decisionLog ?? [];

  // Format the timestamp nicely if available
  const timestampStr = last.timestamp 
    ? new Date(last.timestamp).toLocaleTimeString() 
    : "n/a";

  const actionColor = last.action === "bypass" ? "#ff4d4d" : "#4dff4d";

  container.innerHTML = `
    <div class="panel-title">Headroom Policy Engine</div>
    <div class="metric">Last Decision Action: <span style="color: ${actionColor}; font-weight: bold; text-transform: uppercase;">${last.action ?? "n/a"}</span></div>
    <div class="metric">Active Rule Triggered: <span class="rule-badge">${last.rule ?? "n/a"}</span></div>
    <div class="metric">Evaluation Time: <span>${timestampStr}</span></div>
    <div class="metric">Recent Decisions Log:</div>
    <div class="log-container">
      ${log.length > 0 
        ? log.slice(-6).reverse().map(item => `
          <div class="log-item">
            <span class="log-time">[${new Date(item.timestamp).toLocaleTimeString()}]</span>
            <span class="log-rule">${item.rule}</span>
            &rarr;
            <span class="log-action" style="color: ${item.action === "bypass" ? "#ff4d4d" : "#4dff4d"};">${item.action}</span>
          </div>
        `).join("")
        : '<div class="no-logs">No decisions logged yet.</div>'
      }
    </div>
  `;
}
