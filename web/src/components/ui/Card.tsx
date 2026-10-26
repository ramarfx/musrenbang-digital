import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CardProps = {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
};

export function Card({ children, className, as: Tag = 'section' }: CardProps) {
  return (
    <Tag className={cn('rounded-xl border border-stone-200 bg-white p-4 shadow-sm', className)}>
      {children}
    </Tag>
  );
}
