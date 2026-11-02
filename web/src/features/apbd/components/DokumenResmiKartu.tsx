import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { DOKUMEN_RESMI } from '../lib';

/**
 * Daftar dokumen resmi pemerintah yang menjadi rujukan angka APBD, dengan tombol untuk
 * membukanya. Tautan langsung ke situs aslinya, jadi unduhannya dari pemerintah, bukan dari
 * salinan kami. Dapat ditautkan lewat `/apbd#dokumen-resmi` dari halaman lain.
 */
export function DokumenResmiKartu() {
  return (
    <Card>
      <section id="dokumen-resmi" aria-labelledby="judul-dokumen-resmi" className="scroll-mt-6">
        <h2 id="judul-dokumen-resmi" className="text-lg font-bold">
          Dokumen resmi
        </h2>
        <p className="mt-1 max-w-[68ch] text-sm text-muted">
          Angka total dan jenis belanja di sini dicocokkan ke tiga dokumen ini, yang dibuka dari
          situs pemerintah sendiri. File PDF terbuka di tab baru, dan tombol unduh ada di penampil
          PDF peramban.
        </p>
        <ul className="mt-4 grid gap-3">
          {DOKUMEN_RESMI.map((dokumen) => (
            <li
              key={dokumen.url}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-border p-4"
            >
              <span
                aria-hidden="true"
                className="grid size-10 flex-none place-items-center rounded-[13px] bg-active text-ink"
              >
                <Icon name="buku" size={20} />
              </span>
              <div className="min-w-0 flex-1 basis-64">
                <p className="font-bold [overflow-wrap:anywhere]">{dokumen.judul}</p>
                <p className="text-[13px] text-muted">
                  {dokumen.penerbit} · {dokumen.jenis}
                  {dokumen.ukuran ? ` · ${dokumen.ukuran}` : ''}
                </p>
                <p className="mt-1 text-sm">{dokumen.isi}</p>
              </div>
              <a
                href={dokumen.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonClass('outline', 'sm'), 'flex-none')}
              >
                {dokumen.jenis === 'PDF' ? 'Buka PDF' : 'Baca artikel'}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-muted">Terakhir dicek 2 November 2026.</p>
      </section>
    </Card>
  );
}
