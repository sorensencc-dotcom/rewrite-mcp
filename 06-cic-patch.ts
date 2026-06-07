
// Contract acknowledgement (CIC AI Runtime v1.0.0)
import { acknowledgeRuntimeContract } from "./control-plane/contract-ack";

try {
  const ack = acknowledgeRuntimeContract();
  if (globalThis?.CIC_HEALTH_REGISTRY) {
    globalThis.CIC_HEALTH_REGISTRY.register("runtime_contract", ack);
  }
} catch (err) {
  throw err;
}
