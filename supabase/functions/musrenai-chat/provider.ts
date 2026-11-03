import { prompt } from './knowledge.ts';
export type ChatInput = {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  client_request_id?: string;
};
export type Provider = (input: ChatInput, signal: AbortSignal) => Promise<unknown>;
export function geminiProvider(
  key: string,
  model: string,
  fetcher: typeof fetch = fetch,
): Provider {
  if (!key || !/^[a-zA-Z0-9._-]{1,80}$/.test(model)) throw new Error('provider configuration');
  return async (input, signal) => {
    const contents = [...input.history, { role: 'user' as const, content: input.message }].map(
      (m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }),
    );
    const response = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt }] },
          contents,
          generationConfig: { maxOutputTokens: 800, responseMimeType: 'application/json' },
        }),
      },
    );
    if (!response.ok) throw new Error('provider unavailable');
    const result = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
    if (!text || text.length > 8000) throw new Error('invalid provider response');
    return JSON.parse(text);
  };
}
