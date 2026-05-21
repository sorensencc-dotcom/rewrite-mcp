export function safeHarvesterOutput(reason = "harvester_model_failure") {
  return {
    safe_mode: true,
    reason,
    entities: [],
    topics: [],
    signals: [],
    notes: ["Harvester returned safe-mode output."]
  };
}
