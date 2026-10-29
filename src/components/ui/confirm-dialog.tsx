import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './modal';
import { Button } from './button';

/** Reusable confirmation dialog for destructive / irreversible actions. */
export const ConfirmDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  isLoading?: boolean;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', tone = 'danger', isLoading }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg shrink-0 ${
            tone === 'danger'
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              : 'bg-brand/10 text-brand'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-fg-muted leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);
