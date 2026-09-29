'use client';
import { cn } from '@/lib/utils';
const variants = {
  default: 'bg-primary/15 text-primary border-primary/30',
  secondary: 'bg-muted text-muted-foreground',
  destructive: 'bg-red-500/15 text-red-500 border-red-500/30',
  success: 'bg-green-500/15 text-green-600 border-green-500/30',
  warning: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  mock: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  demo: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  outline: 'bg-transparent border text-foreground',
};
export function Badge({ children, variant='default', className }: { children: React.ReactNode; variant?: keyof typeof variants; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold', variants[variant], className)}>{children}</span>;
}
