export function safeSynthesizerOutput(reason = "synthesizer_model_failure") {
  return {
    safe_mode: true,
    reason,
    sections: [],
    summary: null,
    citations: [],
    notes: ["Synthesizer returned safe-mode output."]
  };
}
