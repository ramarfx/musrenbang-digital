import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { LoadingDots } from '@/components/brand/LogoLoader';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/cn';
import { sendChat, type ChatMessage, type ChatResponse } from './api';

type Entry = ChatMessage & { links?: ChatResponse['links']; disclaimer?: string | null };

const CONTOH_PERTANYAAN = [
  'Bagaimana cara mengajukan usulan?',
  'Apa itu Prioritasku?',
  'Bagaimana usulanku dinilai?',
];

/** Gelembung satu pesan: pesan warga di kanan berlatar tinta, jawaban AI di kiri berlatar kertas. */
function Gelembung({ entry, onPindah }: { entry: Entry; onPindah: () => void }) {
  const warga = entry.role === 'user';
  return (
    <div className={cn('asisten-gelembung flex', warga ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed',
          warga
            ? 'rounded-br-md bg-ink text-on-ink'
            : 'rounded-bl-md border-[1.5px] border-edge bg-surface',
        )}
      >
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{entry.content}</p>
        {entry.disclaimer && <p className="mt-2 text-[12px] text-muted">{entry.disclaimer}</p>}
        {!!entry.links?.length && (
          <nav aria-label="Halaman terkait" className="mt-2.5 flex flex-wrap gap-2">
            {entry.links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={onPindah}
                className="rounded-full border-[1.5px] border-edge bg-pasir px-3 py-1 text-[12.5px] font-bold hover:bg-active"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

/**
 * Isi asisten. Riwayat dan ketikan disimpan di sini (bukan di panel), jadi menutup lalu membuka
 * panel lagi tidak menghapus percakapan. Komponen ini diberi `key` id akun oleh pembungkusnya,
 * jadi ganti akun memulai percakapan baru.
 */
function Asisten() {
  const { user, loading } = useAuth();
  const [buka, setBuka] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pesan, setPesan] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const daftarRef = useRef<HTMLDivElement>(null);

  // Escape menutup panel.
  useEffect(() => {
    if (!buka) return;
    const tekan = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setBuka(false);
    };
    window.addEventListener('keydown', tekan);
    return () => window.removeEventListener('keydown', tekan);
  }, [buka]);

  // Selalu gulir ke pesan terbaru.
  useEffect(() => {
    daftarRef.current?.scrollTo({ top: daftarRef.current.scrollHeight });
  }, [entries, sibuk, buka]);

  async function kirim(isi: string) {
    const teks = isi.trim();
    if (!teks || sibuk) return;
    setSibuk(true);
    setGalat('');
    setEntries((sebelumnya) => [...sebelumnya, { role: 'user', content: teks }]);
    setPesan('');
    try {
      const hasil = await sendChat(
        teks,
        entries.map(({ role, content }) => ({ role, content })),
      );
      setEntries((sebelumnya) => [
        ...sebelumnya,
        {
          role: 'assistant',
          content: hasil.answer,
          links: hasil.links,
          disclaimer: hasil.disclaimer,
        },
      ]);
    } catch (sebab) {
      setGalat(sebab instanceof Error ? sebab.message : 'MusrenAI belum tersedia.');
      // Pesan yang gagal dikembalikan ke kotak ketik supaya bisa dikirim ulang.
      setEntries((sebelumnya) => sebelumnya.slice(0, -1));
      setPesan(teks);
    } finally {
      setSibuk(false);
    }
  }

  function tekanTombol(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void kirim(pesan);
    }
  }

  const tutup = () => setBuka(false);
  // Di HP panel hampir selebar layar, jadi pindah halaman lewat tautan menutupnya.
  const pindah = () => {
    if (window.matchMedia('(max-width: 639px)').matches) tutup();
  };

  return (
    <div className="fixed right-3 bottom-3 z-30 sm:right-5 sm:bottom-5">
      {buka && (
        <section
          role="dialog"
          aria-label="Asisten MusrenAI"
          className="asisten-panel kartu-cap fixed right-3 bottom-[64px] left-3 flex h-[min(520px,calc(100dvh-6rem))] flex-col overflow-hidden rounded-3xl bg-ground sm:absolute sm:right-0 sm:bottom-[52px] sm:left-auto sm:h-[min(560px,calc(100dvh-7rem))] sm:w-[380px]"
        >
          <header className="flex items-center gap-3 bg-ink px-4 py-3 text-on-ink">
            <span
              aria-hidden="true"
              className="grid size-9 flex-none place-items-center rounded-xl bg-hijau-terang text-hitam"
            >
              <Icon name="usulan" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <h2 className="font-bold">MusrenAI</h2>
              <p className="text-[12px] text-on-ink/75">Asisten warga</p>
            </div>
            <button
              type="button"
              onClick={tutup}
              aria-label="Tutup asisten"
              className="grid size-9 flex-none place-items-center rounded-xl transition-[background-color,scale] duration-150 ease-out hover:bg-white/15 active:scale-[0.96]"
            >
              <Icon name="tutup" />
            </button>
          </header>

          {loading ? (
            <p role="status" className="p-5 text-sm text-muted">
              Memeriksa sesi…
            </p>
          ) : !user ? (
            <div className="flex flex-1 flex-col justify-center gap-3 p-5 text-sm">
              <p className="font-bold">Masuk dulu untuk bertanya</p>
              <p className="text-muted">
                MusrenAI menjawab cara memakai website dan membantu menyusun usulanmu.
              </p>
              <Link
                to="/login"
                onClick={tutup}
                className="inline-flex h-10 w-fit items-center rounded-xl bg-ink px-5 font-bold text-on-ink hover:bg-ink-tekan"
              >
                Masuk
              </Link>
            </div>
          ) : (
            <>
              <div
                ref={daftarRef}
                aria-live="polite"
                aria-relevant="additions"
                className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
              >
                {entries.length === 0 && (
                  <div className="asisten-gelembung space-y-3">
                    <p className="text-[14px]">
                      Halo! Tanyakan cara memakai website, atau ceritakan masalah pembangunan di
                      lingkunganmu.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CONTOH_PERTANYAAN.map((contoh) => (
                        <button
                          key={contoh}
                          type="button"
                          onClick={() => void kirim(contoh)}
                          disabled={sibuk}
                          className="rounded-full border-[1.5px] border-edge bg-surface px-3 py-1.5 text-left text-[13px] font-semibold transition-[background-color,scale] duration-150 ease-out hover:bg-active active:scale-[0.97] disabled:opacity-60"
                        >
                          {contoh}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {entries.map((entry, index) => (
                  <Gelembung key={index} entry={entry} onPindah={pindah} />
                ))}
                {sibuk && (
                  <div role="status" className="flex">
                    <span className="rounded-2xl rounded-bl-md border-[1.5px] border-edge bg-surface px-4 py-3">
                      <LoadingDots />
                      <span className="sr-only">MusrenAI sedang menyiapkan jawaban</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t-[1.5px] border-edge bg-surface px-3 pt-2.5 pb-3">
                {galat && (
                  <p
                    role="alert"
                    className="mb-2 rounded-xl bg-active px-3 py-2 text-[13px] font-semibold"
                  >
                    {galat}
                  </p>
                )}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void kirim(pesan);
                  }}
                  className="flex items-end gap-2"
                >
                  <label htmlFor="asisten-pesan" className="sr-only">
                    Pesan untuk MusrenAI
                  </label>
                  <textarea
                    id="asisten-pesan"
                    autoFocus
                    value={pesan}
                    onChange={(event) => setPesan(event.target.value)}
                    onKeyDown={tekanTombol}
                    maxLength={1500}
                    rows={2}
                    disabled={sibuk}
                    placeholder="Tulis pertanyaanmu…"
                    className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border-[1.5px] border-edge bg-ground px-3 py-2 text-[14px] disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={sibuk || !pesan.trim()}
                    aria-label="Kirim pesan"
                    className="grid size-11 flex-none place-items-center rounded-xl bg-ink text-on-ink transition-[background-color,scale] duration-150 ease-out hover:bg-ink-tekan active:scale-[0.96] disabled:opacity-50"
                  >
                    <Icon name="panah-atas" />
                  </button>
                </form>
                <p className="mt-2 text-[11.5px] leading-snug text-muted">
                  Jangan tulis nama lengkap, telepon, NIK, atau alamat rinci. Pesan dikirim ke
                  Google Gemini. Jawaban AI bisa keliru dan bukan keputusan resmi pemerintah.
                </p>
              </div>
            </>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setBuka((nilai) => !nilai)}
        aria-expanded={buka}
        aria-label={buka ? 'Tutup asisten MusrenAI' : 'Buka asisten MusrenAI'}
        className="kartu-cap inline-flex h-11 items-center gap-2 rounded-full bg-hijau-terang px-3 text-[13px] font-bold text-hitam transition-[scale] duration-150 ease-out active:scale-[0.96] sm:px-4"
      >
        <Icon name={buka ? 'tutup' : 'usulan'} size={18} />
        <span className="hidden sm:inline">{buka ? 'Tutup' : 'Tanya MusrenAI'}</span>
      </button>
    </div>
  );
}

/** Asisten melayang di pojok kanan bawah semua halaman aplikasi, hanya bila MusrenAI dinyalakan. */
/** `sembunyi`: dipakai saat menu HP terbuka, supaya tombolnya tidak menutupi baris akun di menu. */
export function AsistenMelayang({ sembunyi = false }: { sembunyi?: boolean }) {
  const { user } = useAuth();
  if (import.meta.env.VITE_MUSRENAI_ENABLED !== 'true' || sembunyi) return null;
  return <Asisten key={user?.id ?? 'tamu'} />;
}
