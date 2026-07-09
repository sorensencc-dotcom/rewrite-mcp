import Anthropic from '@anthropic-ai/sdk';

export const OUTREACH_VERSION = '1.0.0';

export class OutreachValidationError extends Error {
  constructor(public topic: string, public foundPhrase: string) {
    super(`Outreach text generation violated policy. Forbidden topic found: ${topic} ("${foundPhrase}")`);
    this.name = 'OutreachValidationError';
    Object.setPrototypeOf(this, OutreachValidationError.prototype);
  }
}

export class OutreachNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutreachNotConfiguredError';
    Object.setPrototypeOf(this, OutreachNotConfiguredError.prototype);
  }
}

export interface OutreachInput {
  clientName: string;
  namespace?: string;
  prompt: string;
  contextSummary?: string;
}

export interface OutreachOutput {
  emailBody: string;
  recipient: string;
  notebooklm_partial_results?: boolean;
  notebooklm_error_code?: string;
}

export class OutreachAgent {
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly injectedClient?: Anthropic;
  private readonly torqueUrl: string;

  // Forbidden topic rules
  private readonly forbiddenTopics = [
    { name: 'pricing', pattern: /\b(pricing|dollar|price|cost|quote|budget|\$\d+)\b/i },
    { name: 'competitor', pattern: /\b(acmecorp|deltasystems|competitor)\b/i },
    { name: 'technical_jargon', pattern: /\b(kubernetes|docker|redis|kafka|graphql)\b/i }
  ];

  constructor(options: { model?: string; maxTokens?: number; client?: Anthropic; torqueUrl?: string } = {}) {
    this.model = options.model ?? 'claude-haiku-4-5-20251001';
    this.maxTokens = options.maxTokens ?? 1024;
    this.injectedClient = options.client;
    this.torqueUrl = options.torqueUrl ?? 'http://localhost:8000';
  }

  async generateOutreach(input: OutreachInput): Promise<OutreachOutput> {
    const client = this.injectedClient ?? (() => {
      const apiKey = process.env['ANTHROPIC_API_KEY'];
      if (!apiKey) {
        throw new OutreachNotConfiguredError(
          'ANTHROPIC_API_KEY not set — required for outreach agent'
        );
      }
      return new Anthropic({ apiKey });
    })();

    let federatedContext = '';
    let notebooklm_partial_results = false;
    let notebooklm_error_code: string | undefined;

    if (input.namespace) {
      try {
        const fetchFn = typeof fetch === 'function' ? fetch : (await import('node-fetch')).default as any;
        const response = await fetchFn(`${this.torqueUrl}/search/federated`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `context meeting history guidelines for ${input.clientName}`,
            namespaces: [input.namespace],
            limit: 3
          })
        });

        if (response.ok) {
          const data = await response.json() as { results?: any[]; notebooklm_partial_results?: boolean; notebooklm_error_code?: string };
          if (data.notebooklm_partial_results) {
            notebooklm_partial_results = true;
            notebooklm_error_code = data.notebooklm_error_code;
          }
          if (data.results && data.results.length > 0) {
            federatedContext = data.results.map(r => r.body).join('\n\n');
          }
        } else {
          notebooklm_partial_results = true;
          notebooklm_error_code = 'HTTP_ERROR';
        }
      } catch (err) {
        notebooklm_partial_results = true;
        notebooklm_error_code = 'TIMEOUT_OR_NETWORK_ERROR';
      }
    }

    const fullContext = [
      input.contextSummary ? `Local context: ${input.contextSummary}` : '',
      federatedContext ? `Federated context:\n${federatedContext}` : ''
    ].filter(Boolean).join('\n\n');

    const promptText = `You are a professional outreach coordinator writing to ${input.clientName}.
Use ONLY the following context to draft a helpful email.
Context:
${fullContext}

Prompt:
${input.prompt}`;

    const response = await client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{ role: 'user', content: promptText }]
    });

    const emailBody = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text ?? '')
      .join('');

    // Trie/Regex filter scan for forbidden topics (Failure Mode Self-Recognition)
    for (const rule of this.forbiddenTopics) {
      const match = rule.pattern.exec(emailBody);
      if (match) {
        throw new OutreachValidationError(rule.name, match[0]);
      }
    }

    const output: OutreachOutput = {
      emailBody,
      recipient: input.clientName
    };

    if (notebooklm_partial_results) {
      output.notebooklm_partial_results = true;
      output.notebooklm_error_code = notebooklm_error_code;
    }

    return output;
  }
}
