import * as crypto from "crypto";
import { MemoryEvent } from "../store/memory-store.types";
import { IntegrityError } from "../store/memory-store.errors";

export class MemoryIntegrity {
  computeChecksum(event: Omit<MemoryEvent, "checksum">): string {
    const { checksum: _, ...eventData } = event as any;
    const sortedKeys = Object.keys(eventData).sort();
    const json = JSON.stringify(
      Object.fromEntries(
        sortedKeys.map((key) => [key, (eventData as any)[key]])
      )
    );
    return "sha256:" + crypto.createHash("sha256").update(json).digest("hex");
  }

  validateChecksum(event: MemoryEvent): boolean {
    if (!event.checksum) {
      console.warn("EVENT_MISSING_CHECKSUM", { event_id: event.id });
      return false;
    }

    const computed = this.computeChecksum(event);
    const matches = computed === event.checksum;

    if (!matches) {
      console.warn("CHECKSUM_MISMATCH", {
        event_id: event.id,
        expected: event.checksum,
        computed,
      });
    }

    return matches;
  }
}
