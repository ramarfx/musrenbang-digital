import type { ApbdItem } from '@musrenbang/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatRupiah } from '@/lib/format';
import { LABEL_STATUS_DATA, rapikanSumber, statusData, type StatusData } from '../lib';

const NADA_STATUS: Record<StatusData, BadgeTone> = {
  terverifikasi: 'success',
  belum_terverifikasi: 'warning',
  kosong: 'neutral',
};

function BadgeStatus({ status }: { status: StatusData }) {
  return <Badge tone={NADA_STATUS[status]}>{LABEL_STATUS_DATA[status]}</Badge>;
}

function Nominal({ item, status }: { item: ApbdItem; status: StatusData }) {
  if (status === 'kosong') return <span className="font-normal text-muted">Belum ada</span>;
  return (
    <>
      <span className={status === 'terverifikasi' ? 'font-semibold' : 'text-muted'}>
        {formatRupiah(item.nominal_rp)}
      </span>
      {status === 'belum_terverifikasi' && (
        <span className="block text-[12px] font-normal text-muted">Bukan angka resmi</span>
      )}
    </>
  );
}

/**
 * Tabel APBD per kategori. Angka yang belum terverifikasi tetap ditampilkan (muted, dengan
 * keterangan) supaya jelas apa yang ada di data, tetapi tidak pernah tampil seperti angka resmi.
 * Di ponsel tabel diganti daftar kartu, jadi tidak perlu geser ke samping untuk membaca.
 */
export function ApbdTable({ items }: { items: ApbdItem[] }) {
  const baris = items.map((item) => ({
    item,
    status: statusData(item),
    sumber: rapikanSumber(item.sumber),
    catatan: rapikanSumber(item.catatan_pemetaan),
  }));

  return (
    <Card className="p-0">
      <ul className="divide-y divide-rule sm:hidden">
        {baris.map(({ item, status, sumber, catatan }) => (
          <li key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[15px] font-semibold">{item.kategori}</p>
              <BadgeStatus status={status} />
            </div>
            <p className="mt-1.5 text-[15px] tabular-nums">
              <Nominal item={item} status={status} />
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              {sumber ?? 'Sumber belum dicantumkan'}
            </p>
            {item.sumber_url && (
              <a
                href={item.sumber_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[13.5px] font-semibold text-warga underline"
              >
                Buka sumber
              </a>
            )}
            {catatan && <p className="mt-1 text-[13px] leading-relaxed text-muted">{catatan}</p>}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Rincian APBD per kategori beserta sumber dan status verifikasi
          </caption>
          <thead className="bg-ground text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Kategori</th>
              <th className="px-4 py-3 text-right font-semibold">Nominal</th>
              <th className="px-4 py-3 font-semibold">Sumber</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {baris.map(({ item, status, sumber, catatan }) => (
              <tr key={item.id} className="border-t border-rule align-top">
                <td className="px-4 py-3 font-medium">{item.kategori}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <Nominal item={item} status={status} />
                </td>
                <td className="max-w-md px-4 py-3 text-muted">
                  <span className="block">{sumber ?? 'Belum dicantumkan'}</span>
                  {item.sumber_url && (
                    <a
                      href={item.sumber_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-[13px] font-semibold text-warga underline"
                    >
                      Buka sumber
                    </a>
                  )}
                  {catatan && <span className="mt-1 block text-[12.5px]">{catatan}</span>}
                </td>
                <td className="px-4 py-3">
                  <BadgeStatus status={status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
