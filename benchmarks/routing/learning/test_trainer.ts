import { trainPolicies } from "./trainer";
import { getPolicyDiff, loadActivePolicies } from "./policyStore";

async function verifyTrainer() {
  console.log("=== ARPE Trainer Verification ===");
  
  try {
    const policies = await trainPolicies();
    console.log("✅ trainPolicies executed successfully.");
    console.log("Optimized Policies Keys:", Object.keys(policies));

    const active = loadActivePolicies();
    if (active) {
      console.log("✅ loadActivePolicies verified policy-active.json exists and is readable.");
      console.log(`   Version: ${active.version}`);
      console.log(`   Timestamp: ${active.timestamp}`);
    } else {
      throw new Error("❌ policy-active.json could not be loaded after training.");
    }

    const diff = getPolicyDiff();
    if (diff) {
      console.log("✅ getPolicyDiff executed successfully.");
      console.log(`   Policy Changed: ${diff.changed}`);
      console.log(`   Current Version: ${diff.version.current}`);
      console.log(`   Previous Version: ${diff.version.previous}`);
    } else {
      console.log("ℹ️ No policy diff details available (this is normal if it is the first version).");
    }

    console.log("=== Verification Successful! ===");
  } catch (err) {
    console.error("❌ Verification Failed:", err);
    process.exit(1);
  }
}

verifyTrainer();
