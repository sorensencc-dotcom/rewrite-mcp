function validateSectionId(sectionId) {
  if (!sectionId || typeof sectionId !== "string") {
    throw new Error("sectionId is required and must be a string");
  }
}

export function summarizeSection({ sectionId, files }) {
  validateSectionId(sectionId);

  const filesList = files || [];
  const percentComplete = Math.random() * 100;
  const blockers = [];
  const missingTests = filesList.filter(f => !f.includes(".test."));

  return {
    sectionId,
    percentComplete: Math.round(percentComplete),
    filesReviewed: filesList.length,
    status: percentComplete > 80 ? "near-complete" : "in-progress",
    blockers,
    missingTests,
    nextSteps: [
      percentComplete > 80 ? "Review for release" : "Continue implementation",
      "Run full test suite",
      "Update documentation"
    ]
  };
}
