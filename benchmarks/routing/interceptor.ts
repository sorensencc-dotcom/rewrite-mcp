import { RoutingContext, RoutingDecision } from "./policy";
import { selectModel } from "./router";
import { Anthropic } from "@anthropic-ai/sdk";
import {
  logAnthropicCall,
  logGeminiCall,
  logOllamaCall,
  logCopilotCall,
} from "../costs/system";

export interface RoutedCallParams extends RoutingContext {
  call: (model: string, provider: string) => Promise<RoutedCallResult>;
  source?: "api:direct" | "cli:claude-code" | "cli:copilot" | "benchmark";
  metadata?: Record<string, any>;
  dryRun?: boolean; // If true, return decision without executing call
}

export interface RoutedCallResult {
  content: string; // API response text
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
}

export async function routedCall<T extends RoutedCallResult>(
  params: RoutedCallParams
): Promise<T & { decision: RoutingDecision }> {
  const decision = await selectModel({
    taskType: params.taskType,
    qualityTarget: params.qualityTarget,
    maxCostUsd: params.maxCostUsd,
    dailyBudgetUsd: params.dailyBudgetUsd,
  });

  if (params.dryRun) {
    // Return decision without executing
    return {
      content: "",
      inputTokens: 0,
      outputTokens: 0,
      model: decision.chosen.model,
      provider: decision.chosen.provider,
      decision,
    } as T & { decision: RoutingDecision };
  }

  // Execute call with chosen model
  const result = await params.call(
    decision.chosen.model,
    decision.chosen.provider
  );

  // Log cost via Phase 48
  logCostForResult(result, params);

  return {
    ...result,
    decision,
  } as T & { decision: RoutingDecision };
}

function logCostForResult(
  result: RoutedCallResult,
  params: RoutedCallParams
): void {
  const source = params.source ?? "api:direct";
  const metadata = {
    taskType: params.taskType,
    ...params.metadata,
  };

  switch (result.provider) {
    case "anthropic":
      logAnthropicCall({
        model: result.model,
        source,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costModel: "direct",
        metadata,
      });
      break;
    case "google":
      logGeminiCall({
        model: result.model,
        source,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costModel: "direct",
        metadata,
      });
      break;
    case "microsoft":
      logCopilotCall({
        model: result.model,
        source,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        metadata,
      });
      break;
    case "ollama":
      logOllamaCall({
        model: result.model,
        source,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        metadata,
      });
      break;
  }
}

// Helper for Anthropic client calls
export async function routedAnthropicCall(params: {
  client: Anthropic;
  routing: RoutingContext;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  source?: "api:direct" | "cli:claude-code" | "cli:copilot" | "benchmark";
  metadata?: Record<string, any>;
  dryRun?: boolean;
}): Promise<
  Anthropic.Message & {
    decision: RoutingDecision;
  }
> {
  const result = await routedCall<RoutedCallResult>({
    ...params.routing,
    source: params.source,
    metadata: params.metadata,
    dryRun: params.dryRun,
    call: async (model, provider) => {
      if (provider !== "anthropic") {
        throw new Error(
          `routedAnthropicCall expects anthropic provider, got ${provider}`
        );
      }

      const res = await params.client.messages.create({
        model,
        max_tokens: params.maxTokens ?? 4096,
        messages: params.messages,
      });

      return {
        content:
          res.content[0].type === "text" ? res.content[0].text : "",
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
        model,
        provider: "anthropic",
      };
    },
  });

  // Extract the routing decision and return as Anthropic.Message extension
  const { decision, ...rest } = result;

  return {
    ...rest,
    decision,
  } as any;
}
