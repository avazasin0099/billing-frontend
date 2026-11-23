import React from 'react';
import { CircleAlert, RotateCw, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/** Standard page title row: title + description on the left, actions on the right. */
export const PageHeader: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}> = ({ title, description, actions, className }) => (
  <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
    <div className="min-w-0">
      <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
      {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

/** Segmented tabs (role="tablist") with arrow-key navigation. */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label,
  className,
  fullWidth,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: React.ReactNode; icon?: LucideIcon; count?: number }[];
  label: string;
  className?: string;
  fullWidth?: boolean;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (idx + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    onChange(items[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('inline-flex rounded-card border border-border bg-surface-2 p-1', fullWidth && 'flex w-full', className)}
    >
      {items.map((it, idx) => {
        const active = it.value === value;
        const Icon = it.icon;
        return (
          <button
            key={it.value}
            ref={(el) => {
              refs.current[idx] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(it.value)}
            onKeyDown={(e) => onKeyDown(e, idx)}
            className={cn(
              'inline-flex h-8 items-center justify-center gap-1.5 rounded-control px-3 text-sm font-medium transition-colors',
              fullWidth && 'flex-1',
              active ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden="true" />}
            {it.label}
            {it.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  active ? 'bg-primary-soft text-accent' : 'bg-surface text-fg-subtle'
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Empty state: what's missing + the next step. */
export const EmptyState: React.FC<{
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon: Icon, title, description, action, className }) => (
  <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
    <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
      <Icon className="size-6" aria-hidden="true" />
    </div>
    <p className="text-sm font-semibold text-fg">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/** Error state with a recovery action. */
export const ErrorState: React.FC<{ message?: string; onRetry?: () => void; className?: string }> = ({
  message = 'Something went wrong while loading this data.',
  onRetry,
  className,
}) => (
  <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)} role="alert">
    <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
      <CircleAlert className="size-6" aria-hidden="true" />
    </div>
    <p className="text-sm font-semibold text-fg">Couldn't load data</p>
    <p className="mt-1 max-w-sm text-sm text-fg-muted">{message}</p>
    {onRetry && (
      <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
        <RotateCw /> Try again
      </Button>
    )}
  </div>
);

/** Shimmer-free skeleton block (respects reduced motion via the global rule). */
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse rounded-control bg-surface-2', className)} aria-hidden="true" />
);

/** Table-shaped loading placeholder. */
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 6, cols = 5 }) => (
  <div className="overflow-hidden rounded-card border border-border bg-surface" role="status" aria-label="Loading">
    <div className="flex gap-4 border-b border-border bg-surface-2 px-4 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 border-b border-border px-4 py-3.5 last:border-0">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className={cn('h-3.5 flex-1', c === 0 && 'max-w-[30%]')} />
        ))}
      </div>
    ))}
  </div>
);
