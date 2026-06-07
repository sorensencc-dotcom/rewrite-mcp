// headroomAutotuneRoute.test.js - Vitest unit test for the route registration
import { vi, test, expect } from 'vitest';
import { registerHeadroomAutotuneRoute } from './headroomAutotuneRoute.js';
import { getHeadroomAutotuneState } from '../../lib/headroomAutotune.js';

vi.mock('../../lib/headroomAutotune.js', () => ({
  getHeadroomAutotuneState: vi.fn(() => ({ mock: true }))
}));

test('registerHeadroomAutotuneRoute registers GET route and returns state', () => {
  const app = { get: vi.fn() };
  registerHeadroomAutotuneRoute(app);
  expect(app.get).toHaveBeenCalledWith('/telemetry/headroom-autotune', expect.any(Function));
  const handler = app.get.mock.calls[0][1];
  const res = { json: vi.fn() };
  handler({} , res);
  expect(getHeadroomAutotuneState).toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith({ mock: true });
});
