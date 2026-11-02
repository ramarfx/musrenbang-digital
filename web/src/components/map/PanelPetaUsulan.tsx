import type { Proposal } from '@musrenbang/shared';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';
import {
  WILAYAH,
  cariWilayah,
  titikDiWilayah,
  type KodeWilayah,
  type PilihanWilayah,
} from '@/lib/wilayah';
import { FilterKategori } from './FilterKategori';
import { FilterWilayah } from './FilterWilayah';
import { ProposalMap } from './ProposalMap';

const tombolIkon =
  'inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-[13px] font-semibold text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga';

/**
 * Peta usulan dengan pilihan wilayah dan tombol perbesar. Memilih wilayah mengarsir batasnya,
 * menerbangkan peta ke sana, dan menyaring penanda usulan ke wilayah itu. Perbesar membuka
 * pop-up yang hampir memenuhi layar; petanya baru dibuat saat pop-up terbuka, supaya Leaflet
 * mengukur ukurannya setelah ada ruang.
 */
export function PanelPetaUsulan({ proposals }: { proposals: Proposal[] }) {
  const [wilayah, setWilayah] = useState<PilihanWilayah>(null);
  const [besar, setBesar] = useState(false);
  const [disembunyikan, setDisembunyikan] = useState<string[]>([]);
  const [titikTampil, setTitikTampil] = useState(true);

  const semuaBerlokasi = useMemo(
    () =>
      proposals.filter(
        (proposal): proposal is Proposal & { latitude: number; longitude: number } =>
          proposal.latitude !== null && proposal.longitude !== null,
      ),
    [proposals],
  );

  const kategori = useMemo(() => {
    const hitung = new Map<string, number>();
    for (const proposal of semuaBerlokasi) {
      hitung.set(proposal.kategori, (hitung.get(proposal.kategori) ?? 0) + 1);
    }
    return [...hitung]
      .map(([nama, jumlah]) => ({ nama, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);
  }, [semuaBerlokasi]);

  const berlokasi = useMemo(
    () => semuaBerlokasi.filter((proposal) => !disembunyikan.includes(proposal.kategori)),
    [semuaBerlokasi, disembunyikan],
  );

  const jumlah = useMemo(() => {
    const hasil = Object.fromEntries(WILAYAH.map((item) => [item.kode, 0])) as Record<
      KodeWilayah,
      number
    >;
    for (const proposal of berlokasi) {
      for (const item of WILAYAH) {
        if (titikDiWilayah(item.geometri, proposal.latitude, proposal.longitude)) {
          hasil[item.kode] += 1;
        }
      }
    }
    return hasil;
  }, [berlokasi]);

  const tersaring = useMemo(() => {
    if (!titikTampil) return [];
    const pilihan = wilayah === null || wilayah === 'tanpa' ? undefined : cariWilayah(wilayah);
    if (!pilihan) return berlokasi;
    return berlokasi.filter((proposal) =>
      titikDiWilayah(pilihan.geometri, proposal.latitude, proposal.longitude),
    );
  }, [berlokasi, wilayah, titikTampil]);

  const namaWilayah =
    wilayah === null || wilayah === 'tanpa' ? null : (cariWilayah(wilayah)?.nama ?? null);

  const kendali = (
    <div className="flex flex-wrap items-center gap-2">
      <FilterWilayah
        terpilih={wilayah}
        onPilih={setWilayah}
        jumlah={jumlah}
        total={berlokasi.length}
      />
      <FilterKategori
        kategori={kategori}
        disembunyikan={disembunyikan}
        onUbah={setDisembunyikan}
        titikTampil={titikTampil}
        onTitik={setTitikTampil}
      />
    </div>
  );

  const keterangan = namaWilayah ? (
    <p className="text-[13px] text-muted">
      {formatAngka(tersaring.length)} usulan berlokasi di {namaWilayah}.
    </p>
  ) : null;

  return (
    <div className="space-y-3">
      {kendali}
      {keterangan}

      <div className="relative">
        <ProposalMap proposals={tersaring} wilayah={wilayah} />
        <button
          type="button"
          onClick={() => setBesar(true)}
          className={cn(tombolIkon, 'absolute top-3 right-3 z-[400] shadow-sm')}
        >
          <Icon name="perbesar" size={15} />
          Perbesar peta
        </button>
      </div>

      <Modal
        open={besar}
        onClose={() => setBesar(false)}
        labelledBy="peta-besar-judul"
        className="h-[calc(100dvh-24px)] w-[calc(100vw-24px)] max-w-none overflow-hidden"
      >
        {besar && (
          <div className="flex h-full flex-col gap-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="peta-besar-judul" className="text-lg font-bold">
                Peta usulan {namaWilayah ?? 'DKI Jakarta'}
              </h2>
              <div className="flex items-center gap-2">
                {kendali}
                <button
                  type="button"
                  aria-label="Tutup peta"
                  onClick={() => setBesar(false)}
                  className="grid size-9 flex-none place-items-center rounded-xl border border-border bg-surface text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
                >
                  <Icon name="tutup" size={17} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <ProposalMap proposals={tersaring} wilayah={wilayah} className="h-full" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
