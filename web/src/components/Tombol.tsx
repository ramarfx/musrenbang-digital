import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Varian = 'utama' | 'biasa';

// Tombol bulat penuh seperti Desain 1. Utama = hijau, biasa = putih bergaris.
// Tekan: skala 0,97 dalam 160ms supaya terasa merespons.
const DASAR =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold whitespace-nowrap transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100';

const VARIAN: Record<Varian, string> = {
  utama:
    'bg-hijau text-white hover:bg-hijau-tekan disabled:bg-mati disabled:text-muted disabled:hover:bg-mati',
  biasa: 'border border-border bg-surface text-ink hover:bg-active disabled:opacity-50',
};

export function kelasTombol(varian: Varian = 'biasa', tambahan = ''): string {
  return `${DASAR} ${VARIAN[varian]} ${tambahan}`;
}

export function Tombol({
  varian = 'biasa',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { varian?: Varian }) {
  return <button type={type} className={kelasTombol(varian, className)} {...props} />;
}

export function TombolLink({
  varian = 'biasa',
  className = '',
  children,
  ...props
}: LinkProps & { varian?: Varian; children: ReactNode }) {
  return (
    <Link className={kelasTombol(varian, className)} {...props}>
      {children}
    </Link>
  );
}
