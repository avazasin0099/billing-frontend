import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './page';

// `brand`/`emerald`/`amber`/`rose`/`sky` are legacy names mapped onto semantic tones.
export type StatTone = 'highlight' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand' | 'emerald' | 'amber' | 'rose' | 'sky';

const toneChip: Record<StatTone, string> = {
  highlight: 'bg-highlight text-highlight-fg',
  primary: 'bg-primary-soft text-accent',
  brand: 'bg-primary-soft text-accent',
  success: 'bg-success-soft text-success',
  emerald: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  amber: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  rose: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  sky: 'bg-info-soft text-info',
  neutral: 'bg-surface-2 text-fg-muted',
};

/**
 * KPI card. The number stays neutral (text-fg); meaning is carried by the icon chip
 * and the footer, never by a loud coloured number.
 */
export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}> = ({ label, value, icon: Icon, tone = 'neutral', footerLeft, footerRight, isLoading, className }) => (
  <div className={cn('rounded-card border border-border bg-surface p-4 shadow-sm', className)}>
    <div className="mb-2 flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-fg-muted">{label}</span>
      {Icon && (
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-control', toneChip[tone])}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      )}
    </div>
    {isLoading ? (
      <Skeleton className="h-8 w-32" />
    ) : (
      <div className="text-2xl font-semibold tracking-tight text-fg tabular-nums">{value}</div>
    )}
    {(footerLeft || footerRight) && (
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-fg-subtle">
        <span className="truncate">{isLoading ? <Skeleton className="h-3 w-24" /> : footerLeft}</span>
        {footerRight && <span className="shrink-0">{footerRight}</span>}
      </div>
    )}
  </div>
);
