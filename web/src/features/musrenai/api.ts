import { supabase } from '@/lib/supabase';
import { parseChatResponse, type ChatMessage, type ChatResponse } from './contract';
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
    if (status === 401) throw new Error('Sesi telah berakhir. Silakan masuk kembali.');
    if (status === 429) throw new Error('Batas permintaan tercapai. Silakan coba lagi nanti.');
    if (status === 400) throw new Error('Pesan tidak valid atau mengandung data pribadi.');
    throw new Error('MusrenAI belum tersedia. Silakan coba lagi nanti.');
  }
  try {
    return parseChatResponse(data);
  } catch {
    throw new Error('Jawaban MusrenAI tidak dapat ditampilkan. Silakan coba lagi.');
  }
}
