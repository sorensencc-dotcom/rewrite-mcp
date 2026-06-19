import { useState, useEffect } from "react";
import { PatchResult } from "./useChatSession";

export function usePatchStream(sessionId: string | null, wsUrl: string) {
  const [patches, setPatches] = useState<PatchResult[]>([]);
  const [selectedPatch, setSelectedPatch] = useState<PatchResult | null>(null);
  const [diffMode, setDiffMode] = useState<"side-by-side" | "overlay">("side-by-side");

  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`${wsUrl}?sessionId=${sessionId}`);
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "patch") {
          setPatches((prev) => {
            const next = [...prev, msg.patch];
            setSelectedPatch(msg.patch); // Auto-focus the latest incoming patch
            return next;
          });
        }
      } catch (err) {
        console.error("Failed to parse patch message:", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [sessionId, wsUrl]);

  return {
    patches,
    selectedPatch,
    selectPatch: setSelectedPatch,
    diffMode,
    setDiffMode,
  };
}
