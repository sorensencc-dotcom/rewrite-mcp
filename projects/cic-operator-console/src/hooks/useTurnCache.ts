import { useState, useEffect } from "react";

export function useTurnCache(sessionId: string | null, wsUrl: string) {
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);

  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`${wsUrl}?sessionId=${sessionId}`);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "cache-event") {
          setCacheHit(msg.cacheHit);
          if (msg.cacheHit) {
            setHits((prev) => prev + 1);
          } else {
            setMisses((prev) => prev + 1);
          }
        }
      } catch (err) {
        console.error("Failed to parse cache event message:", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [sessionId, wsUrl]);

  return {
    cacheHit,
    hits,
    misses,
  };
}
