# Work Summarizer v4.0 — Pluggable Reasoning Providers

## Architecture

Work Summarizer now supports pluggable reasoning providers via the `ReasoningProvider` interface. This allows:

- **Claude provider** (production) — uses Anthropic API
- **Ollama provider** (stub) — ready for local LLM integration
- **Custom providers** — implement `ReasoningProvider` interface for other LLMs

## Interface Contract

```typescript
export interface ReasoningInput {
  period: "daily" | "weekly";
  subsystemContexts: SubsystemContext[];
  dependencyGraph: Record<string, string[]>;
  driftSignals: Array<{ signalType: string; count: number; score: number }>;
}

export interface ReasoningOutput {
  transcript_excerpts: Array<{...}>;
  subsystem_impacts: Array<{...}>;
  cross_repo_impacts: Array<{...}>;
  notable_changes: Array<{...}>;
  risks_or_followups: Array<{...}>;
  message: string;
}

export interface ReasoningProvider {
  synthesize(input: ReasoningInput): Promise<ReasoningOutput>;
}
```

## Usage

### Via Skill Input

Enable reasoning with provider selection:

```json
{
  "mode": "daily",
  "reasoningEnabled": true,
  "reasoningProvider": "claude",
  "anthropicModel": "claude-3-5-sonnet-20240620"
}
```

Supported `reasoningProvider` values:
- `"claude"` — Anthropic Claude (requires `ANTHROPIC_API_KEY` env var)
- `"ollama"` — Local Ollama server (requires `OLLAMA_BASE_URL`, optional `OLLAMA_MODEL`)

### Programmatic

```typescript
import { ClaudeProvider } from "./providers/claudeProvider.js";
import { OllamaProvider } from "./providers/ollamaProvider.js";
import { createProvider, createProviderFromEnv } from "./providers/index.js";

// Direct instantiation
const claude = new ClaudeProvider(apiKey, "claude-3-5-sonnet-20240620", 30000);
const ollama = new OllamaProvider("llama3");

// Factory
const provider = createProvider({
  type: "claude",
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-5-sonnet-20240620"
});

// From environment
const providerFromEnv = createProviderFromEnv("claude", 30000);
```

## Implementation Details

### Claude Provider
- **File**: `src/providers/claudeProvider.ts`
- **Features**: Timeout handling, JSON extraction from markdown, strict validation
- **Env vars**: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- **Default model**: `claude-3-5-sonnet-20240620`

### Ollama Provider
- **File**: `src/providers/ollamaProvider.ts`
- **Status**: Stub/deterministic (ready for HTTP wiring)
- **Env vars**: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`

## Backward Compatibility

The old `AnthropicProvider` (from `llm-provider.ts`) remains available. When `reasoningProvider` is not specified or is `"claude"`, the legacy code path is used automatically.

Transition plan:
1. Old path: `AnthropicProvider` + `LLMContext`
2. New path: `ReasoningProvider` + `ReasoningInput`
3. Adapter: mapping from old→new schemas on legacy fallback

## Testing

```bash
npm test -- reasoningProvider.test.ts
```

Tests cover:
- FakeProvider (deterministic test double)
- OllamaProvider (stub validation)
- Schema compliance
- Empty context handling

## Adding a Custom Provider

1. Implement `ReasoningProvider` interface
2. Add to `src/providers/{name}Provider.ts`
3. Export from `src/providers/index.ts`
4. Register in `createProvider()` factory
5. Add tests to `tests/reasoningProvider.test.ts`

Example:

```typescript
import { ReasoningProvider, ReasoningInput, ReasoningOutput } from "../reasoningProvider.js";

export class CustomProvider implements ReasoningProvider {
  async synthesize(input: ReasoningInput): Promise<ReasoningOutput> {
    // Implementation
  }
}
```

## Timeout & Error Handling

All providers support configurable timeout:

```typescript
const provider = new ClaudeProvider(apiKey, model, 30000); // 30s timeout
```

On timeout or API error:
- Synthesis fails gracefully
- Report falls back to deterministic summary
- Error logged to `risks_or_followups`

## Next Steps

- **Wire Ollama HTTP client** to `OllamaProvider.synthesize()`
- **Add provider metrics** (latency, token usage)
- **Support provider chaining** (fallback to Ollama if Claude fails)
