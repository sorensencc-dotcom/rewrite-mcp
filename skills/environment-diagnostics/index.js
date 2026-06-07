function validateDiagnosticInputs(logs, systemInfo) {
  if (!Array.isArray(logs)) {
    throw new Error("logs is required and must be an array");
  }
  if (!systemInfo || typeof systemInfo !== "object") {
    throw new Error("systemInfo is required and must be an object");
  }
}

export function diagnosticsEnvironment({ logs, systemInfo }) {
  validateDiagnosticInputs(logs, systemInfo);

  const issues = [];
  const rootCauses = [];
  const fixes = [];
  const validationSteps = [];

  // Analyze logs for common issues
  const logText = logs.join("\n");
  if (logText.includes("MSIX")) {
    issues.push("MSIX configuration issue detected");
    rootCauses.push("MSIX package corrupted or not properly installed");
    fixes.push("Run: Get-AppxPackage -Name '*Claude*' | Remove-AppxPackage");
    validationSteps.push("Verify package in Settings > Apps > Installed apps");
  }
  if (logText.includes("WSL") || logText.includes("wsl")) {
    issues.push("WSL2 connectivity issue");
    rootCauses.push("WSL2 service not running or network isolated");
    fixes.push("Run: wsl --shutdown && wsl");
    validationSteps.push("Verify with: wsl --status");
  }
  if (logText.includes("MCP") || logText.includes("server")) {
    issues.push("MCP server health issue");
    rootCauses.push("Server process crashed or configuration missing");
    fixes.push("Restart MCP servers in Claude Desktop settings");
    validationSteps.push("Check server logs in ~/claude/logs/");
  }

  return {
    systemInfo,
    issuesFound: issues.length,
    issues,
    rootCauses,
    fixes,
    validationSteps,
    overallHealth: issues.length === 0 ? "healthy" : "degraded"
  };
}
