import { useState, useEffect, useCallback, useRef } from "react";

export interface ChatTurn {
  id: string;
  role: "user" | "agent";
  text: string;
  createdAt: string;
}

export interface EditOp {
  id: string;
  type: string;
  selector: string;
  value?: string;
  attributes?: Record<string, string>;
}

export interface PatchResult {
  id: string;
  ops: EditOp[];
  rawPatch: string;
  cacheHit: boolean;
  appliedAt: string;
}

export interface ChatSessionConfig {
  baseUrl: string; // e.g. "http://localhost:8000/api/chat-edit-session"
  wsUrl: string;   // e.g. "ws://localhost:8000/chat-edit-session/stream"
  sessionId: string;
}

export function useChatSession(config: ChatSessionConfig) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [turnsUsed, setTurnsUsed] = useState(0);
  const turnLimit = 50;
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [patches, setPatches] = useState<PatchResult[]>([]);
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 });
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket Connection for real-time patch streaming
  useEffect(() => {
    if (!config.sessionId) return;

    const ws = new WebSocket(`${config.wsUrl}?sessionId=${config.sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setError(null);
      // Subscribe to session channel
      ws.send(JSON.stringify({ type: "subscribe", sessionId: config.sessionId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "turn":
            setMessages((prev) => [...prev, msg.turn]);
            break;
          case "patch":
            setPatches((prev) => [...prev, msg.patch]);
            break;
          case "preview-refresh":
            setPreviewUrl(msg.previewUrl);
            break;
          case "cache-event":
            setCacheStats((prev) => ({
              hits: prev.hits + (msg.cacheHit ? 1 : 0),
              misses: prev.misses + (msg.cacheHit ? 0 : 1),
            }));
            break;
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection error");
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [config.sessionId, config.wsUrl]);

  // Send turn to REST API
  const sendMessage = useCallback(async (instruction: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch(`${config.baseUrl}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: config.sessionId,
          instruction,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setTurnsUsed(data.turnsUsed);
      setPreviewUrl(data.previewUrl);
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setIsProcessing(false);
    }
  }, [config.sessionId, config.baseUrl, isProcessing]);

  // Revert last applied instruction
  const rollback = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch(`${config.baseUrl}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: config.sessionId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Rollback returned status ${res.status}`);
      }

      const data = await res.json();
      setPreviewUrl(data.previewUrl);
      setMessages((prev) => prev.slice(0, -2)); // Remove last user message + agent response
    } catch (err: any) {
      setError(err.message || "Failed to rollback turn");
    } finally {
      setIsProcessing(false);
    }
  }, [config.sessionId, config.baseUrl, isProcessing]);

  return {
    messages,
    turnsUsed,
    turnLimit,
    isProcessing,
    previewUrl,
    patches,
    cacheStats,
    error,
    sendMessage,
    rollback,
  };
}
