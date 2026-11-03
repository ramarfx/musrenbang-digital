import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { sendChat, type ChatMessage, type ChatResponse } from './api';

type Entry = ChatMessage & { links?: ChatResponse['links']; disclaimer?: string | null };
export function MusrenAIChat() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await sendChat(
        text,
        entries.map(({ role, content }) => ({ role, content })),
      );
      setEntries((previous) => [
        ...previous,
        { role: 'user', content: text },
        {
          role: 'assistant',
          content: result.answer,
          links: result.links,
          disclaimer: result.disclaimer,
        },
      ]);
      setMessage('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'MusrenAI belum tersedia.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Percakapan MusrenAI" className="mx-auto flex max-w-3xl flex-col gap-5">
      <header>
        <p className="text-sm font-semibold text-zamrud">Asisten warga</p>
        <h1 className="mt-1 text-3xl font-bold">MusrenAI</h1>
        <p className="mt-2 text-sm">
          Tanyakan cara menggunakan website atau ceritakan masalah pembangunan di lingkunganmu.
        </p>
        <p className="mt-2 text-sm">
          Jangan sertakan nama lengkap, nomor telepon, NIK, alamat rinci, atau data pribadi lainnya.
          Jawaban AI perlu diperiksa kembali.
        </p>
      </header>
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="min-h-56 space-y-4 rounded-2xl border border-rule bg-surface p-4 sm:p-6"
      >
        {entries.length === 0 && (
          <p className="text-sm">
            Mulai dengan pertanyaan, misalnya: “Bagaimana cara mengajukan usulan?”
          </p>
        )}
        {entries.map((entry, index) => (
          <article key={index} className="rounded-xl border border-rule p-4">
            <p className="mb-2 text-sm font-bold">{entry.role === 'user' ? 'Anda' : 'MusrenAI'}</p>
            <p className="whitespace-pre-wrap break-words">{entry.content}</p>
            {entry.disclaimer && <p className="mt-3 text-sm">{entry.disclaimer}</p>}
            {!!entry.links?.length && (
              <nav aria-label="Halaman terkait" className="mt-3 flex flex-wrap gap-3">
                {entry.links.map((link) => (
                  <Link
                    className="font-semibold text-zamrud underline"
                    key={link.path}
                    to={link.path}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
          </article>
        ))}
        {busy && <p role="status">MusrenAI sedang menyiapkan jawaban…</p>}
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor="musrenai-message" className="font-semibold">
          Pesan Anda
        </label>
        <textarea
          id="musrenai-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={1500}
          rows={3}
          disabled={busy}
          className="w-full rounded-xl border border-edge bg-surface p-3"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">{message.length}/1500</span>
          <button
            type="submit"
            disabled={busy || !message.trim()}
            className="rounded-xl bg-zamrud px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            Kirim pesan
          </button>
        </div>
      </form>
    </section>
  );
}
