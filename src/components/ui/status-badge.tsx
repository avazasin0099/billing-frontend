import React from 'react';
import { CircleCheck, CircleDashed, CircleAlert, Clock, CircleX, PackageCheck, CloudUpload } from 'lucide-react';
import { Badge, type BadgeVariant } from './card';

type StatusDef = { label: string; variant: BadgeVariant; Icon: React.ElementType };

/**
 * One mapping for every status in the app, so "Paid" looks identical on invoices, purchases,
 * the dashboard and reports. Each status has an icon + text — colour is never the only signal.
 */
const STATUS: Record<string, StatusDef> = {
  PAID: { label: 'Paid', variant: 'success', Icon: CircleCheck },
  PARTIALLY_PAID: { label: 'Partially paid', variant: 'warning', Icon: CircleDashed },
  UNPAID: { label: 'Unpaid', variant: 'danger', Icon: CircleAlert },
  POSTED: { label: 'Posted', variant: 'neutral', Icon: CircleCheck },
  DRAFT: { label: 'Draft', variant: 'neutral', Icon: Clock },
  CANCELLED: { label: 'Cancelled', variant: 'neutral', Icon: CircleX },
  RECEIVED: { label: 'Received', variant: 'success', Icon: PackageCheck },
  SYNCED: { label: 'Synced', variant: 'success', Icon: CircleCheck },
  PENDING: { label: 'Pending sync', variant: 'warning', Icon: CloudUpload },
  FAILED: { label: 'Sync failed', variant: 'danger', Icon: CircleX },
  ACTIVE: { label: 'Active', variant: 'success', Icon: CircleCheck },
  INACTIVE: { label: 'Inactive', variant: 'neutral', Icon: CircleX },
};

export const StatusBadge: React.FC<{ status?: string | null; className?: string }> = ({ status, className }) => {
  const def = STATUS[String(status || '').toUpperCase()];
  if (!def) {
    return (
      <Badge variant="neutral" className={className}>
        {status ? String(status).replace(/_/g, ' ').toLowerCase() : '—'}
      </Badge>
    );
  }
  const { Icon } = def;
  return (
    <Badge variant={def.variant} icon={<Icon aria-hidden="true" />} className={className}>
      {def.label}
    </Badge>
  );
};
