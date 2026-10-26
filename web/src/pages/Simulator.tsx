import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Gagal, JudulHalaman, Memuat } from '../components/Halaman';
import { Kartu } from '../components/Kartu';
import { TileKategori } from '../components/Label';
import { Slider } from '../components/Slider';
import { Tombol } from '../components/Tombol';
import { ambilAlokasiSaya, ambilConfig, ambilKategori, simpanAlokasi } from '../lib/data';
import { formatRupiah } from '../lib/format';
import { infoKategori } from '../lib/kategori';
import { useMuat } from '../lib/useMuat';

const LANGKAH = 100_000;

// Tampilan lengkap Desain 1 (ring dana, pilihanmu dibanding APBD) menyusul di Fase 2.
export default function Simulator() {
  const { user } = useAuth();
  const { data, memuat, galat, ulangi } = useMuat(async () => {
    const [kategori, config] = await Promise.all([ambilKategori(), ambilConfig()]);
    return { kategori, anggaran: Number(config.virtual_budget_per_warga) || 10_000_000 };
  });
  const [alokasi, setAlokasi] = useState<Record<string, number>>({});
  const [pesan, setPesan] = useState('');

  const userId = user?.id ?? null;

  // Ganti akun (atau keluar) selalu mulai dari kosong, supaya pilihan akun
  // sebelumnya tidak terbawa ke akun berikutnya di perangkat yang sama.
  useEffect(() => {
    setAlokasi({});
    setPesan('');
    if (!userId) return;
    let batal = false;
    ambilAlokasiSaya(userId)
      .then((tersimpan) => {
        if (!batal) setAlokasi(tersimpan);
      })
      .catch((e: unknown) => {
        if (!batal)
          setPesan(`Pilihan tersimpanmu gagal dimuat: ${e instanceof Error ? e.message : e}`);
      });
    return () => {
      batal = true;
    };
  }, [userId]);

  if (memuat) return <Memuat apa="simulator" />;
  if (galat || !data) return <Gagal apa="simulator" pesan={galat ?? ''} ulangi={ulangi} />;

  const { kategori, anggaran } = data;
  const total = kategori.reduce((s, k) => s + (alokasi[k] ?? 0), 0);
  const sisa = anggaran - total;

  // Slider tidak bisa melewati sisa dana: nilai dipotong ke batas yang tersedia,
  // dan tidak pernah di bawah 0 (mis. alokasi lama lebih besar dari anggaran baru).
  const ubah = (kat: string, nilai: number) => {
    const lainnya = total - (alokasi[kat] ?? 0);
    const batas = Math.max(0, anggaran - lainnya);
    setAlokasi((prev) => ({ ...prev, [kat]: Math.max(0, Math.min(nilai, batas)) }));
    setPesan('');
  };

  const simpan = async () => {
    if (!user) return;
    const { error } = await simpanAlokasi(
      user.id,
      Object.fromEntries(kategori.map((k) => [k, alokasi[k] ?? 0])),
    );
    setPesan(error ?? 'Pilihanmu tersimpan dan ikut dihitung di halaman Bandingkan.');
  };

  return (
    <>
      <JudulHalaman
        judul="Simulator anggaran"
        sub={`Bagikan ${formatRupiah(anggaran)} ke program kota. Habiskan semuanya, lalu kirim untuk digabung dengan pilihan warga lain.`}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Kartu role="group" aria-label="Pembagian anggaran per program">
          {kategori.map((kat) => {
            const nilai = alokasi[kat] ?? 0;
            return (
              <div
                key={kat}
                className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-t border-rule py-3.5 first:border-t-0 first:pt-0 sm:grid-cols-[40px_minmax(0,1.1fr)_minmax(120px,1.6fr)_112px]"
              >
                <TileKategori kategori={kat} />
                <label htmlFor={`slider-${kat}`} className="min-w-0 font-semibold">
                  {kat}
                  <span className="block text-[13px] font-normal text-muted">
                    {infoKategori(kat).deskripsi}
                  </span>
                </label>
                <div className="col-span-full row-start-2 sm:col-span-1 sm:row-start-auto">
                  <Slider
                    id={`slider-${kat}`}
                    label={kat}
                    nilai={nilai}
                    maks={anggaran}
                    langkah={LANGKAH}
                    onUbah={(v) => ubah(kat, v)}
                    teksNilai={formatRupiah(nilai)}
                  />
                </div>
                <div className="text-right font-semibold whitespace-nowrap sm:row-start-auto">
                  {formatRupiah(nilai)}
                  <span className="block text-[13px] font-normal text-muted">
                    {Math.round((nilai / anggaran) * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </Kartu>

        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <Kartu>
            <p className="text-[13px] text-muted">Sisa dana</p>
            <p className="text-3xl font-semibold tracking-[-0.02em]" aria-live="polite">
              {formatRupiah(sisa)}
            </p>
            <p className="mt-1 text-sm text-muted">Terpakai {formatRupiah(total)}</p>
          </Kartu>
          {user ? (
            <Tombol varian="utama" onClick={simpan} disabled={sisa !== 0} className="h-[52px]">
              Kirim pilihan saya
            </Tombol>
          ) : (
            <p className="rounded-2xl bg-surface px-4 py-3 text-sm">
              Slider bisa digeser tanpa akun, tetapi mengirim pilihan butuh akun.{' '}
              <Link to="/login" className="font-semibold text-warga underline">
                Masuk dulu
              </Link>
              .
            </p>
          )}
          <p className="rounded-xl bg-active px-3 py-2.5 text-[13px] text-muted">
            {pesan ||
              (sisa === 0
                ? 'Siap dikirim. Satu akun, satu pilihan; bisa diubah kapan saja.'
                : sisa < 0
                  ? 'Pilihan tersimpanmu melebihi anggaran saat ini. Kurangi alokasi sampai sisa dana Rp0.'
                  : 'Sisa dana harus Rp0 sebelum pilihan bisa dikirim.')}
          </p>
        </div>
      </div>
    </>
  );
}
