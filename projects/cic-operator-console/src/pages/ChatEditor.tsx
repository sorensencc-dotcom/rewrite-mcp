import { useState, useEffect } from "react";
import { useChatSession } from "../hooks/useChatSession";
import { usePatchStream } from "../hooks/usePatchStream";
import { usePreviewRefresh } from "../hooks/usePreviewRefresh";
import { useTurnCache } from "../hooks/useTurnCache";
import { DiffOverlay } from "../components/DiffOverlay";

const BASE_URL = import.meta.env.VITE_CHAT_API_URL || "http://localhost:8000/api/chat-edit-session";
const WS_URL = import.meta.env.VITE_CHAT_WS_URL || "ws://localhost:8000/chat-edit-session/stream";

const mockBeforeHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Rewrite Labs Demo</title>
      <style>
        body { font-family: sans-serif; padding: 40px; background: #fafafa; color: #333; }
        .hero { padding: 60px; text-align: center; background: #e2e8f0; border-radius: 12px; }
        h1 { font-size: 2.5rem; color: #1e293b; margin-bottom: 16px; }
        p { font-size: 1.125rem; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="hero">
        <h1>Welcome to Rewrite Labs</h1>
        <p>This is the original landing page design. Type an instruction to update it live.</p>
      </div>
    </body>
  </html>
`;

const mockAfterHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Rewrite Labs Demo</title>
      <style>
        body { font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc; }
        .hero { padding: 60px; text-align: center; background: #1e293b; border-radius: 12px; border: 1px solid #334155; }
        h1 { font-size: 2.5rem; color: #38bdf8; margin-bottom: 16px; }
        p { font-size: 1.125rem; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="hero">
        <h1>Welcome to Rewrite Labs</h1>
        <p>This is the original landing page design. Type an instruction to update it live.</p>
      </div>
    </body>
  </html>
`;

export default function ChatEditor() {
  const [activeSessionId, setActiveSessionId] = useState<string>("sess-demo");
  const [inputText, setInputText] = useState<string>("");
  const [localMessages, setLocalMessages] = useState<Array<{ id: string; role: "user" | "agent"; text: string }>>([
    { id: "init", role: "agent", text: "Hello! I am your visual redesign assistant. Tell me what changes you want to make." }
  ]);

  const {
    messages,
    turnsUsed,
    turnLimit,
    isProcessing,
    previewUrl,
    error,
    sendMessage,
    rollback
  } = useChatSession({ baseUrl: BASE_URL, wsUrl: WS_URL, sessionId: activeSessionId });

  const {
    patches,
    selectedPatch,
    selectPatch,
    diffMode,
    setDiffMode
  } = usePatchStream(activeSessionId, WS_URL);

  const { latencyMs, loading } = usePreviewRefresh(activeSessionId, WS_URL);
  const { cacheHit, hits, misses } = useTurnCache(activeSessionId, WS_URL);

  // Sync messages from useChatSession and keep fallback introductory message
  useEffect(() => {
    if (messages.length > 0) {
      setLocalMessages([
        { id: "init", role: "agent", text: "Hello! I am your visual redesign assistant. Tell me what changes you want to make." },
        ...messages.map((m, idx) => ({
          id: m.id || `msg-${idx}`,
          role: m.role,
          text: m.text
        }))
      ]);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText;
    setInputText("");
    await sendMessage(textToSend);
  };

  const activeOpSelector = selectedPatch?.ops?.[0]?.selector || "";

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Header */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur">
        <div className="flex items-center space-x-3">
          <div className="h-3 w-3 bg-amber-500 rounded-full shadow-[0_0_8px_#f59e0b]" />
          <h1 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            ChatEditSession Console <span className="text-slate-600">v0.1.0</span>
          </h1>
        </div>
        <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
          <span>Session: 
            <input 
              value={activeSessionId}
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 ml-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </span>
          <span className="text-slate-700">|</span>
          <span>Latency: <span className="text-emerald-400">{latencyMs}ms</span></span>
        </div>
      </header>

      {/* Grid Layout */}
      <div className="flex-1 grid grid-cols-[380px_1fr_360px] overflow-hidden">
        
        {/* Left Panel: Chat Panel */}
        <aside className="border-r border-slate-800 bg-slate-900/20 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Conversation</span>
            <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
              {turnsUsed} / {turnLimit} Turns
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {localMessages.map((m) => (
              <div 
                key={m.id} 
                className={`max-w-[85%] p-3 rounded-lg text-sm border ${
                  m.role === "user" 
                    ? "ml-auto bg-amber-950/20 border-amber-900/50 text-amber-200" 
                    : "bg-slate-900 border-slate-800 text-slate-300"
                }`}
              >
                <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1">
                  {m.role === "user" ? "Operator" : "Agent"}
                </div>
                <p>{m.text}</p>
              </div>
            ))}
            {isProcessing && (
              <div className="max-w-[85%] p-3 rounded-lg text-sm border bg-slate-900 border-slate-800 text-slate-400 italic">
                Thinking...
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            {error && (
              <div className="mb-2 p-2 bg-red-950/40 border border-red-900 rounded text-xs text-red-400">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 outline-none rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-650 transition-colors"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Make the logo smaller..."
                disabled={isProcessing}
              />
              <button
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:text-slate-500 text-slate-950 font-semibold text-sm rounded-lg transition-colors shadow-[0_0_12px_rgba(217,119,6,0.3)]"
                onClick={handleSend}
                disabled={isProcessing}
              >
                Send
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <div className="flex items-center space-x-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${cacheHit ? "bg-emerald-500" : "bg-sky-500"}`} />
                <span>Cache: {cacheHit === null ? "Ready" : cacheHit ? "HIT" : "MISS"}</span>
              </div>
              <span>Hits: {hits} | Misses: {misses}</span>
            </div>
          </div>
        </aside>

        {/* Center Panel: Preview Panel + Diff View */}
        <main className="flex flex-col h-full overflow-hidden relative">
          {/* Main Preview */}
          <div className="flex-1 relative h-full">
            {loading && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
                <div className="flex flex-col items-center space-y-3">
                  <div className="h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono text-slate-400">Applying DOMPatch...</span>
                </div>
              </div>
            )}
            
            {selectedPatch ? (
              <DiffOverlay
                beforeHtml={mockBeforeHtml}
                afterHtml={mockAfterHtml}
                changedSelectors={[activeOpSelector]}
                mode={diffMode}
              />
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full bg-white border-none"
                sandbox="allow-scripts allow-same-origin"
                title="Live Sandbox"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-650 text-sm font-mono">
                Awaiting preview rehydration...
              </div>
            )}
          </div>
        </main>

        {/* Right Panel: Patch Inspector & Session State */}
        <aside className="border-l border-slate-800 bg-slate-900/20 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">DOMPatch Inspector</span>
            <select
              value={diffMode}
              onChange={(e) => setDiffMode(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-[10px] uppercase font-bold text-slate-400 rounded px-2 py-1 outline-none cursor-pointer"
            >
              <option value="side-by-side">Side-By-Side</option>
              <option value="overlay">Overlay Fade</option>
            </select>
          </div>

          {/* Patches List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {patches.length === 0 ? (
              <div className="text-slate-600 text-xs text-center font-mono py-8">
                No patches generated yet
              </div>
            ) : (
              patches.map((p, idx) => (
                <div 
                  key={p.id} 
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPatch?.id === p.id 
                      ? "bg-slate-900 border-amber-600/50" 
                      : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700"
                  }`}
                  onClick={() => selectPatch(p)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-600">Patch #{idx + 1}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      p.cacheHit 
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-900" 
                        : "bg-amber-950 text-amber-400 border border-amber-900"
                    }`}>
                      {p.cacheHit ? "CACHE HIT" : "LLM GEN"}
                    </span>
                  </div>
                  
                  <div className="bg-slate-950 p-2 rounded border border-slate-850 font-mono text-[11px] text-amber-400 overflow-x-auto">
                    {p.ops.map((op) => (
                      <div key={op.id}>
                        <span className="text-purple-400">{op.type}</span>(
                        <span className="text-sky-400">"{op.selector}"</span>, 
                        <span className="text-emerald-400">"{op.value || ""}"</span>)
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex flex-col space-y-2">
            <button
              className="w-full py-2 bg-slate-950 hover:bg-red-950/20 border border-slate-800 hover:border-red-900/50 text-slate-400 hover:text-red-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={rollback}
              disabled={isProcessing}
            >
              Rollback Last Instruction
            </button>
            {selectedPatch && (
              <button
                className="w-full py-2 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                onClick={() => selectPatch(null)}
              >
                Exit Diff Mode
              </button>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}
