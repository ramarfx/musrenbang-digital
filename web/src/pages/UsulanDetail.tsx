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

  const muatInteraksi = useCallback(async () => {
    setJumlahSuara(await hitungSuara(proposalId));
    setMemilih(user ? await sudahMemilih(proposalId, user.id) : false);
    setKomentar(await ambilKomentar(proposalId));
  }, [proposalId, user]);

  useEffect(() => {
    if (usulan) muatInteraksi().catch(() => {});
  }, [usulan, muatInteraksi]);

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
    if (!user) return;
    const { error } = await ubahSuara(usulan.id, user.id, !memilih);
    setPesan(error ?? '');
    if (!error) muatInteraksi();
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isiKomentar.trim()) return;
    const { error } = await kirimKomentar(usulan.id, user.id, isiKomentar.trim());
    setPesan(error ?? '');
    if (!error) {
      setIsiKomentar('');
      muatInteraksi();
    }
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
            aria-pressed={memilih}
            className={memilih ? 'border-transparent bg-[#d5ede3] text-[#0b4a36]' : ''}
          >
            {jumlahSuara.toLocaleString('id-ID')} mendukung
          </Tombol>
        ) : (
          <Link to="/login" className="text-sm font-semibold text-warga underline">
            Masuk untuk mendukung ({jumlahSuara.toLocaleString('id-ID')} mendukung)
          </Link>
        )}
      </div>
      {pesan && <p className="mb-4 text-sm text-mustard-tua">{pesan}</p>}

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
                <Tombol type="submit" varian="utama" className="self-start">
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
