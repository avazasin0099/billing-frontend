import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, FileText, Users, Building2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Input, Select } from '@/components/ui/card';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/page';
import { toast } from '@/components/ui/toast';
import { api, asList } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSession } from '@/lib/session';
import { INDIAN_STATES, gstinError, shopStateCode, stateName } from '@/lib/indian-states';
import { cn } from '@/lib/utils';

type Kind = 'customer' | 'supplier';

const LEDGER_LABEL: Record<string, string> = {
  INVOICE: 'Bill',
  PAYMENT: 'Payment',
  CREDIT_NOTE: 'Credit note',
  DEBIT_NOTE: 'Debit note',
  OPENING_BALANCE: 'Opening balance',
  ADJUSTMENT: 'Adjustment',
};

const COPY = {
  customer: {
    title: 'Customers',
    description: 'Customer accounts, credit limits and udhaar statements.',
    singular: 'customer',
    endpoint: '/parties/customers',
    listKey: 'customers',
    nameLabel: 'Customer name',
    balanceLabel: 'Udhaar due',
    emptyIcon: Users,
    debitLabel: 'Billed',
    creditLabel: 'Received',
  },
  supplier: {
    title: 'Suppliers',
    description: 'Vendors you buy from and the amount you owe them.',
    singular: 'supplier',
    endpoint: '/parties/suppliers',
    listKey: 'suppliers',
    nameLabel: 'Contact person',
    balanceLabel: 'You owe',
    emptyIcon: Building2,
    debitLabel: 'Paid',
    creditLabel: 'Purchased',
  },
} as const;

interface PartyForm {
  name: string;
  companyName: string;
  phone: string;
  email: string;
  gstin: string;
  stateCode: string;
  creditLimit: number | '';
  openingBalance: number | '';
}

const emptyForm = (): PartyForm => ({
  name: '',
  companyName: '',
  phone: '',
  email: '',
  gstin: '',
  stateCode: shopStateCode(),
  creditLimit: '',
  openingBalance: '',
});

export const PartyDirectory: React.FC<{ kind: Kind }> = ({ kind }) => {
  const c = COPY[kind];
  const { isManager } = useSession();
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PartyForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const [ledgerParty, setLedgerParty] = useState<any | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.get(c.endpoint, { search, limit: 100 });
      setRows(asList(data, c.listKey));
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.endpoint]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const set = <K extends keyof PartyForm>(k: K, v: PartyForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setIsFormOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      companyName: p.companyName || '',
      phone: p.phone || '',
      email: p.email || '',
      gstin: p.gstin || '',
      stateCode: p.stateCode || shopStateCode(),
      creditLimit: Number(p.creditLimit) || '',
      openingBalance: '',
    });
    setIsFormOpen(true);
  };

  const gstErr = gstinError(form.gstin, form.stateCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gstErr) return;
    setIsSaving(true);
    // Empty strings are sent on edit so a field can be CLEARED (undefined would keep the old value).
    const body: Record<string, any> = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      gstin: form.gstin.trim(),
      stateCode: form.stateCode,
      state: stateName(form.stateCode),
    };
    if (kind === 'supplier') body.companyName = form.companyName.trim();
    if (kind === 'customer') body.creditLimit = Number(form.creditLimit) || 0;
    if (!editingId && form.openingBalance !== '') body.openingBalance = Number(form.openingBalance);

    try {
      if (editingId) await api.patch(`${c.endpoint}/${editingId}`, body);
      else await api.post(c.endpoint, body);
      toast.success(editingId ? 'Changes saved' : `${c.singular[0].toUpperCase()}${c.singular.slice(1)} added`);
      setIsFormOpen(false);
      fetchRows();
    } catch (err: any) {
      toast.error(`Could not save ${c.singular}`, err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await api.delete(`${c.endpoint}/${deleteTarget.id}`);
      toast.success(`${deleteTarget.name} removed`);
      setDeleteTarget(null);
      fetchRows();
    } catch (err: any) {
      toast.error(`Could not remove ${c.singular}`, err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openLedger = async (p: any) => {
    setLedgerParty(p);
    setLedger([]);
    setLedgerLoading(true);
    try {
      const data = await api.get(`${c.endpoint}/${p.id}/ledger`);
      setLedger(data.ledger || []);
      if (data[kind]) setLedgerParty(data[kind]); // fresh balance
    } catch (err: any) {
      toast.error('Could not load statement', err.message);
      setLedgerParty(null);
    } finally {
      setLedgerLoading(false);
    }
  };

  const balanceClass = (v: any) => (Number(v) > 0 ? 'font-medium text-warning' : Number(v) < 0 ? 'text-success' : 'text-fg-muted');

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-5">
        <PageHeader
          title={c.title}
          description={c.description}
          actions={
            <Button onClick={openAdd}>
              <Plus /> Add {c.singular}
            </Button>
          }
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchRows();
          }}
          className="flex shrink-0 items-end gap-2"
        >
          <Input
            aria-label={`Search ${c.title.toLowerCase()}`}
            placeholder="Search by name, phone or GSTIN"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search />}
            containerClassName="max-w-md"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <div className="min-h-0 flex-1">
          {isLoading ? (
            <TableSkeleton cols={6} />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={fetchRows} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={c.emptyIcon}
              title={search ? `No ${c.title.toLowerCase()} match "${search}"` : `No ${c.title.toLowerCase()} yet`}
              action={
                !search && (
                  <Button variant="secondary" onClick={openAdd}>
                    <Plus /> Add {c.singular}
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Phone</Th>
                  <Th>GSTIN</Th>
                  <Th>State</Th>
                  {kind === 'customer' && <Th numeric>Credit limit</Th>}
                  <Th numeric>{c.balanceLabel}</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <span className="block font-medium text-fg">{p.name}</span>
                      {p.companyName && <span className="block text-xs text-fg-subtle">{p.companyName}</span>}
                    </Td>
                    <Td>{p.phone || '—'}</Td>
                    <Td className="font-mono text-xs">{p.gstin || '—'}</Td>
                    <Td>{stateName(p.stateCode) || '—'}</Td>
                    {kind === 'customer' && (
                      <Td numeric>{Number(p.creditLimit) > 0 ? formatCurrency(p.creditLimit) : 'No limit'}</Td>
                    )}
                    <Td numeric className={balanceClass(p.currentBalance)}>
                      {formatCurrency(p.currentBalance)}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="secondary" size="sm" onClick={() => openLedger(p)}>
                          <FileText /> Statement
                        </Button>
                        {isManager && (
                          <>
                            <IconButton size="sm" label={`Edit ${p.name}`} onClick={() => openEdit(p)}>
                              <Pencil />
                            </IconButton>
                            <IconButton size="sm" variant="danger-ghost" label={`Remove ${p.name}`} onClick={() => setDeleteTarget(p)}>
                              <Trash2 />
                            </IconButton>
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      </div>

      {/* Add / edit */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingId ? `Edit ${c.singular}` : `Add ${c.singular}`} maxWidth="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={cn('grid grid-cols-1 gap-4', kind === 'supplier' && 'sm:grid-cols-2')}>
            <Input label={c.nameLabel} required value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
            {kind === 'supplier' && (
              <Input label="Company / firm" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Mobile or landline" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="State"
              hint="Decides CGST + SGST (same state) or IGST (other state)."
              value={form.stateCode}
              onChange={(e) => set('stateCode', e.target.value)}
            >
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} · {s.name}
                </option>
              ))}
            </Select>
            <Input
              label="GSTIN"
              hint={gstErr ? undefined : 'Only for GST-registered businesses.'}
              error={gstErr}
              value={form.gstin}
              onChange={(e) => set('gstin', e.target.value.toUpperCase().replace(/\s/g, ''))}
              maxLength={15}
              className="font-mono uppercase"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {kind === 'customer' && (
              <Input
                label="Credit limit (₹)"
                hint="Maximum udhaar allowed. Leave blank for no limit."
                type="number"
                min={0}
                value={form.creditLimit}
                onChange={(e) => set('creditLimit', e.target.value === '' ? '' : Number(e.target.value))}
              />
            )}
            {!editingId && (
              <Input
                label={kind === 'customer' ? 'Opening udhaar (₹)' : 'Opening amount you owe (₹)'}
                hint="Balance carried over from before using Bill Pro."
                type="number"
                value={form.openingBalance}
                onChange={(e) => set('openingBalance', e.target.value === '' ? '' : Number(e.target.value))}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving} disabled={!!gstErr}>
              {editingId ? 'Save changes' : `Add ${c.singular}`}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isSaving}
        title={`Remove ${c.singular}?`}
        confirmLabel="Remove"
        message={
          <>
            <strong className="text-fg">{deleteTarget?.name}</strong> will be removed from your list. Their history is kept.
            A {c.singular} with an outstanding balance can't be removed until it is settled.
          </>
        }
      />

      {/* Statement */}
      <Modal
        isOpen={!!ledgerParty}
        onClose={() => setLedgerParty(null)}
        title={`Statement · ${ledgerParty?.name || ''}`}
        description={[ledgerParty?.phone, ledgerParty?.gstin && `GSTIN ${ledgerParty.gstin}`].filter(Boolean).join(' · ') || undefined}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <Card className="flex items-center justify-between bg-surface-2 shadow-none">
            <span className="text-sm text-fg-muted">{c.balanceLabel}</span>
            <span className={cn('text-xl tabular-nums', balanceClass(ledgerParty?.currentBalance))}>
              {formatCurrency(ledgerParty?.currentBalance)}
            </span>
          </Card>
          {ledgerLoading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : ledger.length === 0 ? (
            <EmptyState icon={FileText} title="No transactions yet" />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Entry</Th>
                  <Th numeric>{c.debitLabel}</Th>
                  <Th numeric>{c.creditLabel}</Th>
                  <Th numeric>Balance</Th>
                </Tr>
              </Thead>
              <Tbody>
                {ledger.map((row) => (
                  <Tr key={row.id}>
                    <Td>{formatDate(row.createdAt)}</Td>
                    <Td>
                      <span className="block text-fg">{LEDGER_LABEL[row.entryType] || row.entryType}</span>
                      {row.notes && <span className="block text-xs text-fg-subtle">{row.notes}</span>}
                    </Td>
                    <Td numeric>{Number(row.debitAmount) > 0 ? formatCurrency(row.debitAmount) : '—'}</Td>
                    <Td numeric>{Number(row.creditAmount) > 0 ? formatCurrency(row.creditAmount) : '—'}</Td>
                    <Td numeric className="font-medium text-fg">
                      {formatCurrency(row.runningBalance)}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
};
