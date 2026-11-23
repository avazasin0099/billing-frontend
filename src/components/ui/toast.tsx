import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Non-blocking notifications that replace window.alert().
 * Usage anywhere (no hook needed):  toast.success('Saved'); toast.error(err.message);
 * Toasts never take keyboard focus, so a barcode scanner keeps typing into its field.
 */
export type ToastTone = 'success' | 'error' | 'warning' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<(t: ToastItem[]) => void>();
const emit = () => listeners.forEach((l) => l(items));

const DURATION: Record<ToastTone, number> = { success: 3500, info: 4000, warning: 6000, error: 7000 };

function push(tone: ToastTone, title: string, description?: string) {
  const id = nextId++;
  items = [...items.slice(-3), { id, tone, title, description }]; // keep at most 4 on screen
  emit();
  window.setTimeout(() => dismiss(id), DURATION[tone]);
  return id;
}

export function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (title: string, description?: string) => push('success', title, description),
  error: (title: string, description?: string) => push('error', title, description),
  warning: (title: string, description?: string) => push('warning', title, description),
  info: (title: string, description?: string) => push('info', title, description),
};

const toneStyle: Record<ToastTone, { Icon: React.ElementType; icon: string; bar: string }> = {
  success: { Icon: CircleCheck, icon: 'text-success', bar: 'bg-success' },
  error: { Icon: CircleAlert, icon: 'text-danger', bar: 'bg-danger' },
  warning: { Icon: TriangleAlert, icon: 'text-warning', bar: 'bg-warning' },
  info: { Icon: Info, icon: 'text-info', bar: 'bg-info' },
};

export const Toaster: React.FC = () => {
  const [list, setList] = useState<ToastItem[]>(items);
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  return createPortal(
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 no-print"
      aria-live="polite"
      aria-relevant="additions"
    >
      {list.map((t) => {
        const s = toneStyle[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-card border border-border bg-surface py-3 pl-4 pr-2 shadow-lg motion-safe:animate-[toast-in_160ms_ease-out]"
          >
            <span className={cn('absolute inset-y-0 left-0 w-1', s.bar)} aria-hidden="true" />
            <s.Icon className={cn('mt-0.5 size-5 shrink-0', s.icon)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg">{t.title}</p>
              {t.description && <p className="mt-0.5 text-sm text-fg-muted">{t.description}</p>}
            </div>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="rounded-control p-1 text-fg-subtle hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
};
