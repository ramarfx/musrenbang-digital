import type { Proposal } from '@musrenbang/shared';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';
import { WILAYAH, cariWilayah, titikDiWilayah, type KodeWilayah } from '@/lib/wilayah';
import { FilterWilayah } from './FilterWilayah';
import { ProposalMap } from './ProposalMap';

const tombolIkon =
  'inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-[13px] font-semibold text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga';

/**
 * Peta usulan dengan pilihan wilayah dan tombol perbesar. Memilih wilayah mengarsir batasnya,
 * menerbangkan peta ke sana, dan menyaring penanda usulan ke wilayah itu. Peta di pop-up baru
 * dibuat saat pop-up terbuka, supaya Leaflet mengukur ukurannya setelah ada ruang.
 */
export function PanelPetaUsulan({ proposals }: { proposals: Proposal[] }) {
  const [wilayah, setWilayah] = useState<KodeWilayah | null>(null);
  const [besar, setBesar] = useState(false);

  const berlokasi = useMemo(
    () =>
      proposals.filter(
        (proposal): proposal is Proposal & { latitude: number; longitude: number } =>
          proposal.latitude !== null && proposal.longitude !== null,
      ),
    [proposals],
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
    const pilihan = wilayah === null ? undefined : cariWilayah(wilayah);
    if (!pilihan) return berlokasi;
    return berlokasi.filter((proposal) =>
      titikDiWilayah(pilihan.geometri, proposal.latitude, proposal.longitude),
    );
  }, [berlokasi, wilayah]);

  const namaWilayah = wilayah === null ? null : (cariWilayah(wilayah)?.nama ?? null);

  const kendali = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <FilterWilayah
        terpilih={wilayah}
        onPilih={setWilayah}
        jumlah={jumlah}
        total={berlokasi.length}
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
        className="w-[min(1100px,calc(100vw-24px))]"
      >
        {besar && (
          <div className="flex max-h-[calc(100dvh-24px)] flex-col p-4 sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 id="peta-besar-judul" className="text-lg font-bold">
                  Peta usulan {namaWilayah ?? 'DKI Jakarta'}
                </h2>
                <p className="text-[13px] text-muted">
                  Pilih wilayah untuk melihat batas dan usulan di dalamnya.
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup peta"
                onClick={() => setBesar(false)}
                className="grid size-9 flex-none place-items-center rounded-xl border border-border bg-surface text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
              >
                <Icon name="tutup" size={17} />
              </button>
            </div>
            <div className="mb-3">{kendali}</div>
            <ProposalMap
              proposals={tersaring}
              wilayah={wilayah}
              className="h-[min(62dvh,640px)]"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
