import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../App';
import { Gagal, Memuat } from '../components/Halaman';
import { Kartu } from '../components/Kartu';
import { NamaKategori, StatusPill } from '../components/Label';
import { Tombol } from '../components/Tombol';
import {
  ambilKomentar,
  ambilUsulanById,
  hitungSuara,
  kirimKomentar,
  sudahMemilih,
  ubahSuara,
  type Komentar,
} from '../lib/data';
import { formatRupiah, formatTanggal } from '../lib/format';
import { useMuat } from '../lib/useMuat';

// Linimasa 5 tahap dari riwayat status menyusul di Fase 4.
export default function UsulanDetail() {
  const { id } = useParams();
  const proposalId = Number(id);
  const { user } = useAuth();
  const {
    data: usulan,
    memuat,
    galat,
    ulangi,
  } = useMuat(() => ambilUsulanById(proposalId), [proposalId]);
  const [jumlahSuara, setJumlahSuara] = useState(0);
  const [memilih, setMemilih] = useState(false);
  const [komentar, setKomentar] = useState<Komentar[]>([]);
  const [isiKomentar, setIsiKomentar] = useState('');
  const [pesan, setPesan] = useState('');
  const [galatInteraksi, setGalatInteraksi] = useState<string | null>(null);
  const [mengirimSuara, setMengirimSuara] = useState(false);
  const [mengirimKomentar, setMengirimKomentar] = useState(false);

  // Tiga query ini saling lepas, jadi dijalankan bersamaan.
  const muatInteraksi = useCallback(async () => {
    try {
      const [jumlah, sudah, daftar] = await Promise.all([
        hitungSuara(proposalId),
        user ? sudahMemilih(proposalId, user.id) : Promise.resolve(false),
        ambilKomentar(proposalId),
      ]);
      setJumlahSuara(jumlah);
      setMemilih(sudah);
      setKomentar(daftar);
      setGalatInteraksi(null);
    } catch (e) {
      setGalatInteraksi(e instanceof Error ? e.message : String(e));
    }
  }, [proposalId, user]);

  useEffect(() => {
    if (usulan) muatInteraksi();
  }, [usulan, muatInteraksi]);

  // Saat jumlah dukungan gagal dimuat, tampilkan tanda strip, bukan angka 0 yang menyesatkan.
  const teksSuara = galatInteraksi ? '-' : jumlahSuara.toLocaleString('id-ID');

  if (memuat) return <Memuat apa="usulan" />;
  if (galat) return <Gagal apa="usulan" pesan={galat} ulangi={ulangi} />;
  if (!usulan) {
    return (
      <Kartu>
        <p className="font-semibold">Usulan tidak ditemukan.</p>
        <Link to="/usulan" className="mt-2 inline-block text-sm font-semibold text-warga underline">
          Kembali ke semua usulan
        </Link>
      </Kartu>
    );
  }

  const toggleSuara = async () => {
    if (!user || mengirimSuara) return;
    setMengirimSuara(true);
    const { error } = await ubahSuara(usulan.id, user.id, !memilih);
    setPesan(error ?? '');
    if (!error) await muatInteraksi();
    setMengirimSuara(false);
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isiKomentar.trim() || mengirimKomentar) return;
    setMengirimKomentar(true);
    const { error } = await kirimKomentar(usulan.id, user.id, isiKomentar.trim());
    setPesan(error ?? '');
    if (!error) {
      setIsiKomentar('');
      await muatInteraksi();
    }
    setMengirimKomentar(false);
  };

  return (
    <>
      <Link to="/usulan" className="mb-3 inline-block text-sm text-muted hover:text-ink">
        ← Semua usulan
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[21px] leading-tight font-bold tracking-[-0.02em] sm:text-2xl">
            {usulan.judul}
          </h1>
          <p className="mt-1 text-muted">
            {usulan.lokasi ?? 'Tanpa lokasi'} · diajukan {formatTanggal(usulan.dibuat_pada)}
          </p>
        </div>
        {user ? (
          <Tombol
            onClick={toggleSuara}
            disabled={mengirimSuara || galatInteraksi !== null}
            aria-pressed={memilih}
            className={memilih ? 'border-transparent bg-[#d5ede3] text-[#0b4a36]' : ''}
          >
            {teksSuara} mendukung
          </Tombol>
        ) : (
          <Link to="/login" className="text-sm font-semibold text-warga underline">
            Masuk untuk mendukung ({teksSuara} mendukung)
          </Link>
        )}
      </div>
      {pesan && <p className="mb-4 text-sm text-mustard-tua">{pesan}</p>}
      {galatInteraksi && (
        <div className="mb-6">
          <Gagal apa="dukungan dan komentar" pesan={galatInteraksi} ulangi={muatInteraksi} />
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Kartu>
            <h2 className="mb-2 font-semibold">Deskripsi</h2>
            <p>{usulan.deskripsi}</p>
          </Kartu>

          <Kartu>
            <h2 className="mb-3 font-semibold">Komentar</h2>
            {komentar.length === 0 ? (
              <p className="text-muted">Belum ada komentar.</p>
            ) : (
              <ul className="flex flex-col">
                {komentar.map((k) => (
                  <li key={k.id} className="border-t border-rule py-3 first:border-t-0 first:pt-0">
                    <p className="flex justify-between gap-3 text-[13px] text-muted">
                      <span>{k.nama ?? 'Warga'}</span>
                      <span>{formatTanggal(k.dibuat_pada)}</span>
                    </p>
                    <p className="mt-1">{k.isi}</p>
                  </li>
                ))}
              </ul>
            )}
            {user ? (
              <form onSubmit={kirim} className="mt-4 flex flex-col gap-2">
                <label htmlFor="komentar" className="text-sm font-medium">
                  Tulis komentar
                </label>
                <textarea
                  id="komentar"
                  value={isiKomentar}
                  onChange={(e) => setIsiKomentar(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-border bg-surface px-3.5 py-2.5"
                />
                <Tombol
                  type="submit"
                  varian="utama"
                  disabled={mengirimKomentar}
                  className="self-start"
                >
                  Kirim komentar
                </Tombol>
              </form>
            ) : (
              <p className="mt-4 text-sm">
                <Link to="/login" className="font-semibold text-warga underline">
                  Masuk
                </Link>{' '}
                untuk berkomentar.
              </p>
            )}
          </Kartu>
        </div>

        <Kartu>
          <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3">
            <dt className="text-muted">Status</dt>
            <dd>
              <StatusPill status={usulan.status} />
            </dd>
            <dt className="text-muted">Program</dt>
            <dd>
              <NamaKategori kategori={usulan.kategori} />
            </dd>
            <dt className="text-muted">Estimasi</dt>
            <dd className="font-medium">{formatRupiah(usulan.estimasi_biaya)}</dd>
          </dl>
        </Kartu>
      </div>
    </>
  );
}
