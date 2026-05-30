import { loadRuntimeContract, requireContractVersion } from "./src/runtime/contract-loader.js";

try {
  console.log("--- Testing Contract Loader ---");
  const contract = loadRuntimeContract();
  console.log("Path:", contract.path);
  console.log("Version:", contract.version);
  console.log("Sections:", contract.sections.join(", "));
  
  console.log("\n--- Testing Version Requirement ---");
  requireContractVersion("1.0.0");
  console.log("Version 1.0.0 check passed");
  
  console.log("\n--- Testing Failure Case (Bad Version) ---");
  try {
    requireContractVersion("9.9.9");
    console.log("ERROR: Should have failed version check");
  } catch (e) {
    console.log("Caught expected version mismatch error:", e.message);
  }

  console.log("\n--- Contract Loader Verification: SUCCESS ---");
} catch (err) {
  console.error("Contract Loader Verification: FAILED");
  console.error(err);
  process.exit(1);
}
