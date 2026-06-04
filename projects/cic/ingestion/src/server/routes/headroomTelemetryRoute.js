import { getHeadroomTelemetry } from "../../lib/headroomTelemetry.js";

export function registerHeadroomTelemetryRoute(app) {
  app.get("/telemetry/headroom", (req, res) => {
    res.json(getHeadroomTelemetry());
  });
}
