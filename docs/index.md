<div class="hero-container">
  <div class="hero-badge">Knowledge Base</div>
  <h1 class="hero-title">REWRITE LABS DOCUMENTATION</h1>
  <p class="hero-lead">The living archive of the Arsenal of Democracy. Operational manuals, architecture specifications, and the long-term roadmap for the Rewrite Labs ecosystem. AAB System: Autonomous approvals integrated, tested, and refined. Watch for approval prompts.</p>
</div>

<div class="grid-container">
  <div class="grid-section">
    <h3>Core Architecture</h3>
    <ul>
      <li><a href="rewrite/architecture/system-overview/">System Overview</a></li>
      <li><a href="rewrite/architecture/pms/">Prompt Management (PMS)</a></li>
      <li><a href="rewrite/architecture/agents/">Orchestration & Agents</a></li>
      <li><a href="rewrite/architecture/pipeline/">The Pipeline</a></li>
    </ul>
  </div>
  <div class="grid-section">
    <h3>Operations</h3>
    <ul>
      <li><a href="rewrite/governance/SLO_CHARTER/">SLO Charter</a></li>
      <li><a href="rewrite/architecture/telemetry/">Prompt Telemetry</a></li>
      <li><a href="cic/manuals/release-automation/">Release Automation</a></li>
      <li><a href="rewrite/releases/CHANGELOG/">Changelog</a></li>
    </ul>
  </div>
  <div class="grid-section">
    <h3>Readiness</h3>
    <ul>
      <li><a href="rewrite/readiness/phase-26-mandate/">Phase 26: Hardening</a></li>
      <li><a href="rewrite/readiness/phase-27-mandate/">Phase 27: Recovery</a></li>
      <li><a href="rewrite/readiness/phase-28-mandate/">Phase 28: Predictive</a></li>
      <li><a href="rewrite/REWRITE_LABS_STATE/">Project State</a></li>
    </ul>
  </div>
  <div class="grid-section">
    <h3>Approval Systems</h3>
    <ul>
      <li><a href="aab/AAB_ACTIVATION/">AAB Activation Guide</a></li>
      <li><a href="aab/autonomous-approval-buffering/">System Documentation</a></li>
      <li><a href="aab/integration/">Integration Guide</a></li>
    </ul>
  </div>
</div>

<style>
  .hero-container {
    padding: 4rem 0;
    border-bottom: 1px solid var(--iron);
    margin-bottom: 3rem;
  }
  .hero-badge {
    font-family: 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--ember);
    font-weight: 800;
    font-size: 0.7rem;
    margin-bottom: 1rem;
  }
  .hero-title {
    font-family: 'Playfair Display', serif !important;
    font-weight: 900 !important;
    font-size: 3.5rem !important;
    line-height: 1 !important;
    margin: 0 0 1.5rem 0 !important;
    border-bottom: none !important;
  }
  .hero-lead {
    font-family: 'Libre Baskerville', serif;
    font-style: italic;
    font-size: 1.1rem;
    color: var(--ash);
    max-width: 700px;
    line-height: 1.6;
  }
  .grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
  }
  .grid-section h3 {
    margin-bottom: 1rem !important;
  }
  .grid-section ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .grid-section li {
    margin-bottom: 0.5rem;
  }
  .grid-section a {
    color: var(--bone);
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s;
  }
  .grid-section a:hover {
    color: var(--ember);
  }
</style>
