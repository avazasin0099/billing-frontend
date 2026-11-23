import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from './button';

// Re-exported for existing imports (`import { Table, … } from '@/components/ui/modal'`).
export { Table, Thead, Tbody, Tr, Th, Td } from './table';

/* Stack of open modals: only the top-most one reacts to Esc / owns the focus trap,
   and body scroll stays locked until the LAST modal closes. */
const openStack: string[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}> = ({ isOpen, onClose, title, description, children, footer, maxWidth = 'md' }) => {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    openStack.push(id);
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog (first autofocus element, else first focusable, else panel).
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const target =
        panel.querySelector<HTMLElement>('[autofocus]') ||
        panel.querySelector<HTMLElement>(`[data-modal-body] ${FOCUSABLE.split(', ').join(`, [data-modal-body] `)}`) ||
        panel;
      target.focus();
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (openStack[openStack.length - 1] !== id) return; // only the top-most modal
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (n) => n.offsetParent !== null
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown, true);
      const idx = openStack.lastIndexOf(id);
      if (idx >= 0) openStack.splice(idx, 1);
      if (openStack.length === 0) document.body.style.overflow = '';
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [isOpen, id]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-fg/40 dark:bg-black/60" aria-hidden="true" onMouseDown={() => onCloseRef.current()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-lg focus:outline-none',
          maxWidths[maxWidth]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="text-base font-semibold text-fg">
              {title}
            </h2>
            {description && (
              <p id={`${id}-desc`} className="mt-0.5 text-sm text-fg-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close" size="sm" onClick={() => onCloseRef.current()} className="-mr-1.5 -mt-1">
            <X />
          </IconButton>
        </div>
        <div data-modal-body className="overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer && <div className="flex justify-end gap-2 border-t border-border bg-surface-2/50 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};
