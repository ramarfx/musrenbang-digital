import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CardProps = {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
};

export function Card({ children, className, as: Tag = 'section' }: CardProps) {
  return (
    // Kartu putih datar Desain 1: garis tipis, tanpa bayangan, sudut 24px.
    <Tag className={cn('rounded-3xl border border-border bg-surface p-5 sm:p-6', className)}>
      {children}
    </Tag>
  );
}
