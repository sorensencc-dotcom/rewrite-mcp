// File: tests/wil/foreman_integration.test.ts

import { strict as assert } from "assert";
import { test } from "node:test";
import { CICForeman } from "../runtime/foreman";
import {
  MockShellAdapter,
  MockFileAdapter,
  MockModelAdapter,
  MockHttpAdapter,
  MockBrowserAdapter
} from "./mocks";

test("CIC Foreman Integration – full APR → CRO → MLA → CKG cycle", async () => {
  const foreman = new CICForeman(
    new MockShellAdapter(),
    new MockFileAdapter(),
    new MockModelAdapter(),
    new MockHttpAdapter(),
    new MockBrowserAdapter()
  );

  const result = await foreman.handleRequest(
    "session_001",
    "Generate a research summary for Willow Run"
  );

  assert.ok(result.plan, "Plan should be defined");
  assert.ok(result.run, "Run should be defined");
  assert.ok(result.plan.planId, "Plan ID should exist");
  assert.ok(result.run.runId, "Run ID should exist");
  assert.ok(result.plan.taskCount > 0, "Plan should have tasks");
  assert.ok(result.run.stepCount > 0, "Run should have steps");
  assert.strictEqual(result.run.status, "completed", "Run should be completed");
});
