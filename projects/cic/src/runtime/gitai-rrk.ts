export function convertGovernanceFeedback(feedback: any): any {
  if (!feedback || typeof feedback !== "object") throw new Error("Invalid feedback");
  if (!feedback.type || !feedback.location || !feedback.description) {
    throw new Error("Missing required fields");
  }
  return {
    type: "research_goal",
    target: feedback.location,
    metadata: {
      description: feedback.description
    }
  };
}
