// File: projects/cic/ingestion/src/server/routes/headroomAutotuneRoute.js | Date: 2026-06-04 | v1.0.0

import { getHeadroomAutotuneState } from "../../lib/headroomAutotune.js";

export function registerHeadroomAutotuneRoute(app) {
  app.get("/telemetry/headroom-autotune", (req, res) => {
    res.json(getHeadroomAutotuneState());
  });
}
