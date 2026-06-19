import { useState, useEffect } from "react";

export function usePreviewRefresh(sessionId: string | null, wsUrl: string) {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`${wsUrl}?sessionId=${sessionId}`);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "preview-refresh") {
          setPreviewUrl(msg.previewUrl);
          setLatencyMs(msg.latencyMs);
          setLoading(false);
        } else if (msg.type === "turn") {
          // Set loading status immediately when a user sends a new instruction
          setLoading(true);
        }
      } catch (err) {
        console.error("Failed to parse preview message:", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [sessionId, wsUrl]);

  return {
    previewUrl,
    latencyMs,
    loading,
  };
}
