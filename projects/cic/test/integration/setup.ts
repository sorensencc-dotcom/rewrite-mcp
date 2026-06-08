/**
 * Integration Test Setup
 *
 * Common setup and teardown for all integration tests.
 */

import path from "node:path";
import { beforeAll, afterAll } from "vitest";

// Test environment setup
export const TEST_ARTIFACTS_DIR = path.join(__dirname, "../../.test-artifacts");

beforeAll(() => {
  // Setup: Create test directories
  console.log("[TEST SETUP] Initializing test environment");

  // Set test environment variables
  process.env.NODE_ENV = "test";
  process.env.DEBUG = "cic:*";

  // Suppress console output in tests unless explicitly enabled
  if (!process.env.VERBOSE_TESTS) {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    // Only show errors by default
    console.log = (...args: unknown[]) => {
      if (args[0]?.toString().includes("ERROR") || args[0]?.toString().includes("FAIL")) {
        originalLog(...args);
      }
    };

    console.warn = (...args: unknown[]) => {
      if (process.env.VERBOSE_TESTS) {
        originalWarn(...args);
      }
    };

    console.error = originalError; // Always show errors
  }
});

afterAll(() => {
  // Teardown: Clean up
  console.log("[TEST TEARDOWN] Cleaning up test environment");

  // Reset environment
  delete process.env.NODE_ENV;
  delete process.env.DEBUG;
});
