import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatTone = 'brand' | 'emerald' | 'amber' | 'rose' | 'sky' | 'neutral';

const toneChip: Record<StatTone, string> = {
  brand: 'bg-brand/10 text-brand',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  neutral: 'bg-surface-2 text-fg-subtle',
};

/**
 * Standard KPI / metric card used across every data tab.
 * Values stay neutral (text-fg) for a clean, professional read; meaning is
 * carried by the tinted icon chip and the optional footer — not loud numbers.
 */
export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  className?: string;
}> = ({ label, value, icon: Icon, tone = 'neutral', footerLeft, footerRight, className }) => (
  <div
    className={cn(
      'bg-surface border border-border rounded-xl p-5 shadow-sm transition-shadow hover:shadow-md',
      className
    )}
  >
    <div className="flex items-center justify-between gap-3 mb-3">
      <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</span>
      {Icon && (
        <div className={cn('p-2 rounded-lg shrink-0', toneChip[tone])}>
          <Icon className="w-4 h-4" />
        </div>
      )}
    </div>
    <div className="text-2xl font-bold text-fg tracking-tight tabular-nums">{value}</div>
    {(footerLeft || footerRight) && (
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2 text-[11px] text-fg-subtle">
        <span className="truncate">{footerLeft}</span>
        {footerRight && <span className="shrink-0">{footerRight}</span>}
      </div>
    )}
  </div>
);
