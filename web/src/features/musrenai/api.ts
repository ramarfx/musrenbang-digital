import { supabase } from '@/lib/supabase';
import {
  chatErrorMessage,
  parseChatResponse,
  type ChatMessage,
  type ChatResponse,
} from './contract';
export type { ChatMessage, ChatResponse } from './contract';
export async function sendChat(message: string, history: ChatMessage[]): Promise<ChatResponse> {
  const { data, error } = await supabase.functions.invoke('musrenai-chat', {
    body: {
      message,
      history: history
        .slice(-6)
        .map(({ role, content }) => ({ role, content: content.slice(0, 1500) })),
      client_request_id: crypto.randomUUID(),
    },
  });
  if (error) {
    const status = error.context instanceof Response ? error.context.status : 0;
    throw new Error(chatErrorMessage(status));
  }
  try {
    return parseChatResponse(data);
  } catch {
    throw new Error('Jawaban MusrenAI tidak dapat ditampilkan. Silakan coba lagi.');
  }
}
