import { createAiClient, type AiConfig } from '../_shared/ai.ts';
import { prompt, routes } from './knowledge.ts';

// Skema JSON standar OpenAI: memaksa bentuk balasan di sumbernya; validateOutput
// tetap lapis kedua. Semua properti wajib dan additionalProperties=false agar
// mode strict OpenAI juga menerimanya.
export const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    answer: { type: 'string' },
    route_ids: {
      type: 'array',
      maxItems: 3,
      items: { type: 'string', enum: Object.keys(routes) },
    },
    disclaimer: { type: ['string', 'null'] },
  },
  required: ['answer', 'route_ids', 'disclaimer'],
};
export type ChatInput = {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  client_request_id?: string;
};
export type Provider = (input: ChatInput, signal: AbortSignal) => Promise<unknown>;

export function createChatProvider(config: AiConfig, fetcher: typeof fetch = fetch): Provider {
  const complete = createAiClient(config, fetcher);
  return async (input, signal) => {
    const { data } = await complete(
      {
        system: prompt,
        messages: [...input.history, { role: 'user', content: input.message }],
        schema: { name: 'musrenai_chat', schema: responseSchema },
        maxTokens: 800,
        maxResponseChars: 8000,
      },
      signal,
    );
    return data;
  };
}
