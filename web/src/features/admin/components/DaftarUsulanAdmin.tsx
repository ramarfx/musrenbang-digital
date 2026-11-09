import {
  PROPOSAL_MODERATION_STATUSES,
  PROPOSAL_STATUSES,
  type Proposal,
  type ProposalModeration,
  type ProposalStatus,
} from '@musrenbang/shared';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { ModerationBadge, LABEL_MODERASI } from '@/features/proposals/components/ModerationBadge';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { cn } from '@/lib/cn';
import { formatAngka, formatRupiah, formatTanggal } from '@/lib/format';
import { DialogHapusUsulan } from './DialogHapusUsulan';
import { DialogUbahStatusUsulan } from './DialogUbahStatusUsulan';

/** Jumlah baris per halaman tabel semua usulan. */
const BARIS_PER_HALAMAN = 10;

type SaringModerasi = ProposalModeration | 'semua';
type SaringStatus = ProposalStatus | 'semua';
type KunciUrut =
  | 'judul'
  | 'kategori'
  | 'estimasi_biaya'
  | 'jumlah_suara'
  | 'moderasi'
  | 'status'
  | 'dibuat_pada';
type ArahUrut = 'naik' | 'turun';

// Urutan baca yang masuk akal: yang masih menunggu lebih dulu, yang sudah ditolak terakhir.
const PERINGKAT_MODERASI: Record<ProposalModeration, number> = {
  Menunggu: 0,
  Disetujui: 1,
  Ditolak: 2,
};

function nilaiUrut(proposal: Proposal, kunci: KunciUrut): string | number {
  switch (kunci) {
    case 'judul':
      return proposal.judul.toLocaleLowerCase('id-ID');
    case 'kategori':
      return proposal.kategori.toLocaleLowerCase('id-ID');
    case 'moderasi':
      return PERINGKAT_MODERASI[proposal.moderasi];
    case 'status':
      return PROPOSAL_STATUSES.indexOf(proposal.status);
    case 'dibuat_pada':
      return new Date(proposal.dibuat_pada).getTime();
    default:
      return proposal[kunci];
  }
}

function KepalaKolom({
  label,
  kunci,
  urut,
  arah,
  onUrut,
  className,
}: {
  label: string;
  kunci: KunciUrut;
  urut: KunciUrut;
  arah: ArahUrut;
  onUrut: (kunci: KunciUrut) => void;
  className?: string;
}) {
  const aktif = urut === kunci;
  return (
    <th
      scope="col"
      aria-sort={aktif ? (arah === 'naik' ? 'ascending' : 'descending') : 'none'}
      className={cn('text-left text-[13px] font-semibold text-ink', className)}
    >
      <button
        type="button"
        onClick={() => onUrut(kunci)}
        className="inline-flex min-h-11 w-full items-center gap-1 px-4 py-2 transition-colors duration-150 ease-out hover:text-warga focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-warga"
      >
        {label}
        {aktif && (
          <span aria-hidden="true" className="text-xs text-warga">
            {arah === 'naik' ? '↑' : '↓'}
          </span>
        )}
      </button>
    </th>
  );
}

/**
 * Tabel seluruh usulan untuk admin. Padat dan bisa diurutkan lewat kepala kolom, dengan
 * tindakan ubah tahap dan hapus langsung di baris, sama seperti tabel admin sebelumnya.
 */
export function DaftarUsulanAdmin({ proposals }: { proposals: Proposal[] }) {
  const [cari, setCari] = useState('');
  const [moderasi, setModerasi] = useState<SaringModerasi>('semua');
  const [status, setStatus] = useState<SaringStatus>('semua');
  const [urut, setUrut] = useState<KunciUrut>('dibuat_pada');
  const [arah, setArah] = useState<ArahUrut>('turun');
  const [halaman, setHalaman] = useState(1);
  const [ubahStatus, setUbahStatus] = useState<Proposal | null>(null);
  const [hapus, setHapus] = useState<Proposal | null>(null);

  const jumlahStatus = useMemo(() => {
    const hasil: Partial<Record<ProposalStatus, number>> = {};
    for (const proposal of proposals) {
      hasil[proposal.status] = (hasil[proposal.status] ?? 0) + 1;
    }
    return hasil;
  }, [proposals]);

  const hasil = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    const tersaring = proposals
      .filter((proposal) => moderasi === 'semua' || proposal.moderasi === moderasi)
      .filter((proposal) => status === 'semua' || proposal.status === status)
      .filter(
        (proposal) =>
          kunci.length === 0 ||
          proposal.judul.toLowerCase().includes(kunci) ||
          proposal.pengusul_nama.toLowerCase().includes(kunci) ||
          proposal.kategori.toLowerCase().includes(kunci) ||
          proposal.lokasi?.toLowerCase().includes(kunci),
      );

    return tersaring.sort((a, b) => {
      const kiri = nilaiUrut(a, urut);
      const kanan = nilaiUrut(b, urut);
      const banding =
        typeof kiri === 'string' && typeof kanan === 'string'
          ? kiri.localeCompare(kanan, 'id-ID')
          : Number(kiri) - Number(kanan);
      const hasilBanding = arah === 'naik' ? banding : -banding;
      return hasilBanding || new Date(b.dibuat_pada).getTime() - new Date(a.dibuat_pada).getTime();
    });
  }, [proposals, cari, moderasi, status, urut, arah]);

  const ubahUrutan = (kunci: KunciUrut) => {
    if (kunci === urut) {
      setArah((sekarang) => (sekarang === 'naik' ? 'turun' : 'naik'));
      return;
    }
    setUrut(kunci);
    setArah(kunci === 'dibuat_pada' ? 'turun' : 'naik');
  };

  const resetSaring = () => {
    setCari('');
    setModerasi('semua');
    setStatus('semua');
    setHalaman(1);
  };

  // Pagination tabel: kembali ke halaman pertama setiap penyaring berubah.
  const totalHalaman = Math.max(1, Math.ceil(hasil.length / BARIS_PER_HALAMAN));
  const halamanAktif = Math.min(halaman, totalHalaman);
  const tampilHalaman = hasil.slice(
    (halamanAktif - 1) * BARIS_PER_HALAMAN,
    halamanAktif * BARIS_PER_HALAMAN,
  );

  const adaSaring = cari.trim().length > 0 || moderasi !== 'semua' || status !== 'semua';

  if (proposals.length === 0) {
    return (
      <EmptyState
        title="Belum ada usulan"
        description="Usulan dari warga akan muncul di sini setelah dikirim."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Cari usulan" htmlFor="cari-semua-usulan" className="w-full max-w-sm">
          <Input
            id="cari-semua-usulan"
            type="search"
            value={cari}
            onChange={(event) => {
              setCari(event.target.value);
              setHalaman(1);
            }}
            placeholder="Judul, pengusul, kategori, atau lokasi"
          />
        </Field>
        <Field label="Persetujuan" htmlFor="saring-moderasi" className="w-full max-w-[220px]">
          <Select
            id="saring-moderasi"
            value={moderasi}
            onChange={(event) => {
              setModerasi(event.target.value as SaringModerasi);
              setHalaman(1);
            }}
          >
            <option value="semua">Semua</option>
            {PROPOSAL_MODERATION_STATUSES.map((nama) => (
              <option key={nama} value={nama}>
                {LABEL_MODERASI[nama]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tahap" htmlFor="saring-status" className="w-full max-w-[220px]">
          <Select
            id="saring-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as SaringStatus);
              setHalaman(1);
            }}
          >
            <option value="semua">Semua tahap ({formatAngka(proposals.length)})</option>
            {PROPOSAL_STATUSES.map((nama) => (
              <option key={nama} value={nama}>
                {nama} ({formatAngka(jumlahStatus[nama] ?? 0)})
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <p aria-live="polite" className="text-xs text-muted">
        Menampilkan {formatAngka(hasil.length)} dari {formatAngka(proposals.length)} usulan
        {hasil.length > 0 &&
          ` (baris ${formatAngka((halamanAktif - 1) * BARIS_PER_HALAMAN + 1)}–${formatAngka(Math.min(halamanAktif * BARIS_PER_HALAMAN, hasil.length))})`}
        .
      </p>

      <div
        role="region"
        aria-label="Tabel semua usulan"
        tabIndex={0}
        className="overflow-x-auto rounded-2xl border border-border bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
      >
        <table className="w-full min-w-[940px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Daftar semua usulan beserta kategori, estimasi biaya, dukungan, persetujuan, tahap, dan
            tanggal pengajuan.
          </caption>
          <thead className="bg-pasir">
            <tr>
              <KepalaKolom
                label="Usulan"
                kunci="judul"
                urut={urut}
                arah={arah}
                onUrut={ubahUrutan}
              />
              <KepalaKolom
                label="Kategori"
                kunci="kategori"
                urut={urut}
                arah={arah}
                onUrut={ubahUrutan}
              />
              <KepalaKolom
                label="Estimasi"
                kunci="estimasi_biaya"
                urut={urut}
                arah={arah}
                onUrut={ubahUrutan}
              />
              <KepalaKolom
                label="Suara"
                kunci="jumlah_suara"
                urut={urut}
                arah={arah}
                onUrut={ubahUrutan}
              />
              <KepalaKolom
                label="Moderasi"
                kunci="moderasi"
                urut={urut}
                arah={arah}
                onUrut={ubahUrutan}
              />
              <KepalaKolom
                label="Diajukan"
                kunci="dibuat_pada"
                urut={urut}
                arah={arah}
                onUrut={ubahUrutan}
              />
              <KepalaKolom
                label="Status"
                kunci="status"
                urut={urut}
                arah={arah}
                onUrut={ubahUrutan}
              />
            </tr>
          </thead>
          <tbody>
            {hasil.length === 0 ? (
              <tr className="border-t border-rule">
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  <p className="font-semibold text-ink">Tidak ada usulan yang cocok</p>
                  <p className="mt-1">Ubah kata kunci atau penyaring untuk melihat usulan lain.</p>
                  {adaSaring && (
                    <Button type="button" variant="outline" className="mt-3" onClick={resetSaring}>
                      Hapus filter
                    </Button>
                  )}
                </td>
              </tr>
            ) : (
              tampilHalaman.map((proposal) => {
                const tahap = PROPOSAL_STATUSES.indexOf(proposal.status);
                return (
                  <tr key={proposal.id} className="border-t border-rule align-top">
                    <td className="w-[30%] px-4 py-3">
                      <Link
                        to={`/admin/usulan/${proposal.id}`}
                        className="font-medium text-warga hover:underline [overflow-wrap:anywhere]"
                      >
                        {proposal.judul}
                      </Link>
                      <p className="mt-0.5 text-[13px] text-muted [overflow-wrap:anywhere]">
                        {proposal.pengusul_nama}
                      </p>
                    </td>
                    <td className="px-4 py-3 [overflow-wrap:anywhere]">{proposal.kategori}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatRupiah(proposal.estimasi_biaya)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatAngka(proposal.jumlah_suara)}
                    </td>
                    <td className="px-4 py-3">
                      <ModerationBadge moderasi={proposal.moderasi} />
                    </td>
                    <td className="px-4 py-3 text-[13px] whitespace-nowrap">
                      {formatTanggal(proposal.dibuat_pada)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <div className="flex gap-1" aria-hidden="true">
                          {PROPOSAL_STATUSES.map((nama, index) => (
                            <span
                              key={nama}
                              className={cn(
                                'h-1.5 w-6 rounded-full',
                                index <= tahap ? 'bg-hijau-terang' : 'bg-track',
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-[12.5px] whitespace-nowrap text-muted">
                          <StatusBadge status={proposal.status} /> · tahap {tahap + 1} dari{' '}
                          {PROPOSAL_STATUSES.length}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => setUbahStatus(proposal)}
                            aria-label={`Ubah status ${proposal.judul}`}
                            className="relative h-8 rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold transition-[scale,background-color] duration-150 ease-out after:absolute after:-inset-1.5 after:content-[''] hover:bg-active active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
                          >
                            Ubah status
                          </button>
                          <button
                            type="button"
                            onClick={() => setHapus(proposal)}
                            aria-label={`Hapus usulan ${proposal.judul}`}
                            title="Hapus usulan"
                            className="relative inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-ink transition-[scale,background-color,color,border-color] duration-150 ease-out after:absolute after:-inset-1.5 after:content-[''] hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
                          >
                            <Icon name="sampah" size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        halaman={halamanAktif}
        totalHalaman={totalHalaman}
        onHalaman={setHalaman}
        label="Halaman tabel semua usulan"
      />

      {ubahStatus && (
        <DialogUbahStatusUsulan proposal={ubahStatus} onClose={() => setUbahStatus(null)} />
      )}
      {hapus && <DialogHapusUsulan proposal={hapus} onClose={() => setHapus(null)} />}
    </div>
  );
}
