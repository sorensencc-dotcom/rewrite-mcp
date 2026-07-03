# Dashboard Endpoints Test Suite

The **Dashboard Endpoints Test Suite** verifies that the gateway server correctly serves the metrics API and static dashboard UI pages.

This document describes the dashboard endpoint tests.

---

## 🧪 Test Suite Specifications

The test suite is located at:

```
C:\dev\src\tests\dashboard-endpoints.test.ts
```

It uses a zero-dependency approach, spinning up the Express server on a test port (`3125`) and using native `fetch` requests to validate HTTP response codes and payloads.

---

## 🔍 Validation Coverage

The test suite contains two main tests:

### 1. GET `/metrics` Validation
```typescript
test("GET /metrics should return drift state and recent logs", async () => {
  const res = await fetch(`http://localhost:${testPort}/metrics`);
  expect(res.status).toBe(200);
  const data = (await res.json()) as any;
  expect(data).toHaveProperty("drift");
  expect(data).toHaveProperty("recent");
  expect(Array.isArray(data.recent)).toBe(true);
});
```
*   **Response Code**: Asserts that the endpoint returns `200 OK`.
*   **State Structure**: Verifies that the JSON response contains `drift` and `recent` properties.
*   **Array Compliance**: Asserts that `recent` is an array.

### 2. GET `/dashboard` Validation
```typescript
test("GET /dashboard should return html page", async () => {
  const res = await fetch(`http://localhost:${testPort}/dashboard`);
  expect(res.status).toBe(200);
  const text = await res.text();
  expect(text).toContain("<!DOCTYPE html>");
  expect(text).toContain("CIC DRIFT CONTROL CENTER");
});
```
*   **Response Code**: Asserts that the dashboard page is served with `200 OK`.
*   **HTML Structure**: Confirms that the response contains the `<!DOCTYPE html>` declaration.
*   **UI Integrity**: Asserts that the page contains the title header `"CIC DRIFT CONTROL CENTER"`, confirming the correct `dashboard.html` asset is resolved and sent to the client.
