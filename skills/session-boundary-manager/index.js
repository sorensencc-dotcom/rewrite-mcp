function validateTranscript(transcript) {
  if (!Array.isArray(transcript)) {
    throw new Error("transcript is required and must be an array of messages");
  }
}

export function manageSessionBoundary({ transcript }) {
  validateTranscript(transcript);

  const messageCount = transcript.length;
  const totalTokens = transcript.reduce((sum, msg) => sum + (msg.tokens || 0), 0);
  const contextDriftScore = calculateDrift(transcript);
  const isOverflowing = totalTokens > 100000 || messageCount > 50;

  const recommendations = [];
  if (isOverflowing) {
    recommendations.push("Session context is approaching limit");
    recommendations.push("Consider auto-summarization and split");
  }
  if (contextDriftScore > 0.7) {
    recommendations.push("Context has drifted significantly from original task");
    recommendations.push("Recommend explicit re-grounding or new session");
  }

  return {
    messageCount,
    estimatedTokens: totalTokens,
    contextDriftScore: Math.round(contextDriftScore * 100) / 100,
    isOverflowing,
    recommendations,
    suggestedAction: isOverflowing ? "summarize_and_split" : "continue"
  };
}

function calculateDrift(transcript) {
  if (transcript.length < 2) return 0;
  const first = transcript[0].content || "";
  const last = transcript[transcript.length - 1].content || "";
  const similarity = (first.length + last.length) / 2 / 500;
  return Math.min(Math.max(1 - similarity, 0), 1);
}
