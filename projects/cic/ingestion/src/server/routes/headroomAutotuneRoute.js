// File: projects/cic/ingestion/src/server/routes/headroomAutotuneRoute.js | Date: 2026-06-04 | v1.0.0

import { getHeadroomAutotuneState } from "../../lib/headroomAutotune.js";

export function registerHeadroomAutotuneRoute(app) {
  app.get("/telemetry/headroom-autotune", async (req, res) => {
    try {
      res.json(getHeadroomAutotuneState());
    } catch (e) {
      console.error(e);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
}
