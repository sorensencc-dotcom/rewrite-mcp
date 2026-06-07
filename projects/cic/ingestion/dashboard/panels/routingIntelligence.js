let activeTab = "rewrite";
let cachedData = null;

export async function renderRoutingPanel(container) {
  if (!cachedData) {
    try {
      const res = await fetch("/telemetry/routing-policy");
      cachedData = await res.json();
    } catch (err) {
      container.innerHTML = `<div class="panel-title">Routing Policy Intelligence</div><div class="no-logs" style="color: #ef4444;">Error loading policy: ${err.message}</div>`;
      return;
    }
  }

  const payload = cachedData;
  const policies = payload.policies || {};
  const currentPolicy = policies[activeTab] || {
    preferredOrder: ["n/a"],
    qualityTarget: 8.0,
    maxCostUsd: 0.25,
    localPreference: 0.2,
    fallbackAggressiveness: 0.5,
    providerWeights: {}
  };

  const timestampStr = payload.timestamp ? new Date(payload.timestamp).toLocaleString() : "n/a";
  const version = payload.version ?? 0;

  // Build the tab HTML
  const tabsHtml = ["rewrite", "analysis", "generation", "chat"].map(tab => {
    return `<button class="policy-tab ${tab === activeTab ? 'active' : ''}" data-tab="${tab}">${tab.toUpperCase()}</button>`;
  }).join("");

  // Build preferred models HTML
  const preferredHtml = currentPolicy.preferredOrder.map((model, idx) => {
    return `
      <div class="preferred-item">
        <span class="preferred-rank">${idx + 1}</span>
        <span class="preferred-name" style="font-family: monospace; font-size: 0.9rem;">${model}</span>
      </div>
    `;
  }).join("");

  // Build provider weights HTML
  const weightsHtml = Object.entries(currentPolicy.providerWeights || {}).map(([provider, weight]) => {
    const percent = Math.round((weight / 2.0) * 100); // normalized against max weight of 2.0
    return `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted);">
          <span style="text-transform: capitalize;">${provider}</span>
          <span style="font-family: monospace;">${weight.toFixed(2)}</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${percent}%; background: linear-gradient(90deg, #3b82f6, #8b5cf6);"></div>
        </div>
      </div>
    `;
  }).join("") || `<div style="color: var(--text-muted); font-size: 0.85rem;">No weights loaded.</div>`;

  container.innerHTML = `
    <div class="panel-title">
      <span>Routing Policy Intelligence</span>
      <span style="font-size: 0.8rem; background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 4px 8px; border-radius: 12px;">Active: policy-v${version}</span>
    </div>
    
    <div class="policy-tabs">
      ${tabsHtml}
    </div>

    <div class="policy-grid">
      <div class="policy-subpanel">
        <div class="policy-subpanel-title">Model Preferred Order & Hierarchy</div>
        <div class="preferred-list">
          ${preferredHtml}
        </div>
        <div style="margin-top: 15px; font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">
          💡 The system prioritizes routing to top-ranked models. Cheaper/local options are preferred if budgets are tight or local preference boosts their rank.
        </div>
      </div>

      <div class="policy-subpanel">
        <div class="policy-subpanel-title">Learned Parameters & Weights</div>
        
        <div class="metric">Quality Target: <span style="color: #60a5fa; font-weight: 600;">${currentPolicy.qualityTarget.toFixed(2)}</span></div>
        <div class="metric">Max Cost per Request: <span style="color: #34d399; font-weight: 600;">$${currentPolicy.maxCostUsd.toFixed(4)}</span></div>
        <div class="metric">Fallback Aggressiveness: <span style="font-family: monospace;">${currentPolicy.fallbackAggressiveness.toFixed(2)}</span></div>
        
        <div style="margin-top: 15px; margin-bottom: 5px; font-size: 0.9rem; font-weight: 500; color: #ffffff;">Local Compute Preference</div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 2px;">
          <span>Ollama/Local Priority</span>
          <span style="font-family: monospace;">${(currentPolicy.localPreference * 100).toFixed(0)}%</span>
        </div>
        <div class="progress-bar-container" style="margin-bottom: 20px;">
          <div class="progress-bar-fill" style="width: ${currentPolicy.localPreference * 100}%; background: linear-gradient(90deg, #10b981, #34d399);"></div>
        </div>

        <div style="margin-bottom: 5px; font-size: 0.9rem; font-weight: 500; color: #ffffff;">Provider Scoring Multipliers</div>
        ${weightsHtml}
      </div>
    </div>

    <div class="sparkline-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 0.9rem; font-weight: 600; color: #ffffff;">Policy Drift Metrics</span>
        <span style="font-size: 0.8rem; color: var(--text-muted);">Last Trained: ${timestampStr}</span>
      </div>
      <div class="drift-graph">
        <div class="drift-bar" style="height: ${Math.min(100, currentPolicy.qualityTarget * 10)}%;" data-label="Qual."></div>
        <div class="drift-bar" style="height: ${Math.min(100, currentPolicy.maxCostUsd * 200)}%; background: #10b981;" data-label="Cost Cap"></div>
        <div class="drift-bar" style="height: ${Math.min(100, currentPolicy.localPreference * 100)}%; background: #f59e0b;" data-label="Local Pref"></div>
        <div class="drift-bar" style="height: ${Math.min(100, currentPolicy.fallbackAggressiveness * 100)}%; background: #ec4899;" data-label="Fallback"></div>
        <div class="drift-bar" style="height: ${Math.min(100, (currentPolicy.providerWeights?.anthropic ?? 1.0) * 50)}%; background: #8b5cf6;" data-label="w(Ant.)"></div>
        <div class="drift-bar" style="height: ${Math.min(100, (currentPolicy.providerWeights?.google ?? 1.0) * 50)}%; background: #6366f1;" data-label="w(Goog.)"></div>
        <div class="drift-bar" style="height: ${Math.min(100, (currentPolicy.providerWeights?.ollama ?? 1.0) * 50)}%; background: #14b8a6;" data-label="w(Oll.)"></div>
      </div>
      <div style="height: 15px;"></div>
    </div>
  `;

  // Attach event listeners for tabs
  container.querySelectorAll(".policy-tab").forEach(button => {
    button.addEventListener("click", (e) => {
      activeTab = e.target.getAttribute("data-tab");
      renderRoutingPanel(container);
    });
  });
}

export function renderCommandBarPanel(container) {
  container.innerHTML = `
    <div class="panel-title">HELM Command Bar</div>
    <div class="quick-cmds">
      <button class="quick-cmd-btn" data-cmd="routing-policy">routing-policy</button>
      <button class="quick-cmd-btn" data-cmd="routing-train">routing-train</button>
      <button class="quick-cmd-btn" data-cmd="routing-diff">routing-diff</button>
      <button class="quick-cmd-btn" data-cmd="help">help</button>
    </div>
    <div class="command-input-container">
      <input type="text" class="command-input" placeholder="Type a command... (e.g. routing-policy)">
      <button class="btn run-cmd-btn">Execute</button>
    </div>
    <div class="terminal-box">
      <div>visitor@helm:~$ Type a command or click a quick-action button above.</div>
    </div>
  `;

  const terminal = container.querySelector(".terminal-box");
  const input = container.querySelector(".command-input");
  const runBtn = container.querySelector(".run-cmd-btn");

  const appendToConsole = (cmd, text, isError = false) => {
    const time = new Date().toLocaleTimeString();
    const cmdLine = `<div style="color: #60a5fa; margin-top: 8px;">[${time}] visitor@helm:~$ ${cmd}</div>`;
    const style = isError ? "color: #f87171;" : "color: #a7f3d0;";
    const outputLine = `<div style="${style} white-space: pre-wrap; font-family: monospace;">${text}</div>`;
    terminal.innerHTML += cmdLine + outputLine;
    terminal.scrollTop = terminal.scrollHeight;
  };

  const handleCommand = async (cmd) => {
    cmd = cmd.trim();
    if (!cmd) return;

    input.value = "";

    if (cmd === "help") {
      const helpText = `Available commands:
  routing-policy — Displays the current learned policies, constraints, and provider weights.
  routing-train  — Force runs the training runner script to optimize policies from logs.
  routing-diff   — Analyzes the policy drift/difference against the previous policy version.
  help           — Shows this help menu.`;
      appendToConsole(cmd, helpText);
      return;
    }

    if (cmd === "routing-policy") {
      appendToConsole(cmd, "Fetching current routing policy...");
      try {
        const res = await fetch("/telemetry/routing-policy");
        const data = await res.json();
        appendToConsole(cmd, JSON.stringify(data, null, 2));
        
        // Refresh the main panel data too
        cachedData = data;
        const mainPanel = document.getElementById("panel-routing-intelligence");
        if (mainPanel) renderRoutingPanel(mainPanel);
      } catch (err) {
        appendToConsole(cmd, `Error: ${err.message}`, true);
      }
      return;
    }

    if (cmd === "routing-diff") {
      appendToConsole(cmd, "Computing policy diff against previous version...");
      try {
        const res = await fetch("/telemetry/routing-diff");
        const data = await res.json();
        appendToConsole(cmd, JSON.stringify(data, null, 2));
      } catch (err) {
        appendToConsole(cmd, `Error: ${err.message}`, true);
      }
      return;
    }

    if (cmd === "routing-train") {
      appendToConsole(cmd, "⚠️ Triggering ARPE Nightly Trainer (npx ts-node benchmarks/routing/learning/trainer.ts)... Please wait, this takes a few seconds...");
      try {
        const res = await fetch("/telemetry/routing-train", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          appendToConsole(cmd, `🎉 Training Successful!\nUpdated to Policy Version ${data.version}.\nPolicies:\n${JSON.stringify(data.policies, null, 2)}`);
          
          // Refresh the main panel data
          cachedData = data;
          const mainPanel = document.getElementById("panel-routing-intelligence");
          if (mainPanel) renderRoutingPanel(mainPanel);
        } else {
          appendToConsole(cmd, `Error: ${data.error || "Unknown error"}`, true);
        }
      } catch (err) {
        appendToConsole(cmd, `Error: ${err.message}`, true);
      }
      return;
    }

    appendToConsole(cmd, `bash: command not found: ${cmd}. Type "help" for a list of available commands.`, true);
  };

  // Run on button click
  runBtn.addEventListener("click", () => {
    handleCommand(input.value);
  });

  // Run on Enter key
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleCommand(input.value);
    }
  });

  // Quick action buttons
  container.querySelectorAll(".quick-cmd-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      handleCommand(btn.getAttribute("data-cmd"));
    });
  });
}
