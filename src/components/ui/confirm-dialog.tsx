import React from 'react';
import { TriangleAlert, Info } from 'lucide-react';
import { Modal } from './modal';
import { Button } from './button';
import { cn } from '@/lib/utils';

/** Confirmation for destructive / irreversible actions. */
export const ConfirmDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  isLoading?: boolean;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', tone = 'danger', isLoading }) => {
  const Icon = tone === 'danger' ? TriangleAlert : Info;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-accent'
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="pt-1 text-sm leading-relaxed text-fg-muted">{message}</div>
      </div>
    </Modal>
  );
};
