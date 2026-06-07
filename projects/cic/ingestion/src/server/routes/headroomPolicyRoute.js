import { getPolicyState, evaluatePolicies } from "../../lib/headroomPolicyEngine.js";

export function registerHeadroomPolicyRoute(app) {
  app.get("/telemetry/headroom-policy", (req, res) => {
    evaluatePolicies();
    res.json(getPolicyState());
  });
}
