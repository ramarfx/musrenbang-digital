import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { DecorRings } from './DecorRings';

type CardProps = {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
};

export function Card({ children, className, as: Tag = 'section' }: CardProps) {
  return (
    // Kartu bercap Desain 2: tepi tinta dan alas tebal (lihat kartu-cap di index.css).
    <Tag className={cn('kartu-cap rounded-3xl bg-surface p-5 sm:p-6', className)}>{children}</Tag>
  );
}

/** Kartu panel gelap untuk temuan utama, dengan lingkaran dekorasi di pojok. Tanpa gradasi. */
export function HeroCard({
  children,
  className,
  isiClassName,
}: Omit<CardProps, 'as'> & { isiClassName?: string }) {
  return (
    <section
      className={cn(
        'kartu-cap group relative overflow-hidden rounded-3xl bg-hijau p-5 text-white sm:p-6',
        className,
      )}
    >
      <DecorRings className="-right-16 -bottom-16 size-44 transition-transform duration-[400ms] ease-out group-hover:scale-110" />
      <div className={cn('relative', isiClassName)}>{children}</div>
    </section>
  );
}
