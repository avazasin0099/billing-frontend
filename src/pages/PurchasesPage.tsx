import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Eye, Pencil, Trash2, X, Search, Truck } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Input, Select } from '@/components/ui/card';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/page';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { controlClass } from '@/components/ui/field';
import { api, asList } from '@/services/api-client';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { localIsoDate } from '@/offline/pending-operations';
import { Supplier, Item, Purchase } from '@/types';
import { NumberInput } from '@/components/ui/number-input';

interface PurchaseItemRow {
  itemId: string;
  quantity: number;
  unitCost: number;
}

type PayMethod = 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'UPI';
const PAY_LABEL: Record<PayMethod, string> = { BANK_TRANSFER: 'Bank transfer / NEFT', CASH: 'Cash', CHEQUE: 'Cheque', UPI: 'UPI' };
const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(localIsoDate());
  const [itemRows, setItemRows] = useState<PurchaseItemRow[]>([]);
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>('BANK_TRANSFER');
  const [notes, setNotes] = useState('');

  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [purList, suppList, itemList] = await Promise.all([
        api.get('/purchases', { limit: 100 }),
        api.get('/parties/suppliers', { limit: 100 }),
        api.get('/items', { limit: 100, isActive: 'true' }),
      ]);
      setPurchases(asList(purList, 'purchases'));
      setSuppliers(asList(suppList, 'suppliers'));
      setItems(asList(itemList, 'items'));
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const newRow = (): PurchaseItemRow => ({ itemId: '', quantity: 1, unitCost: 0 });

  const handleOpenNewPurchase = () => {
    setEditingPurchase(null);
    setSupplierId('');
    setSupplierInvoiceNumber('');
    setPurchaseDate(localIsoDate());
    setPaidAmount('');
    setPaymentMethod('BANK_TRANSFER');
    setNotes('');
    setItemRows([newRow()]);
    setIsModalOpen(true);
  };

  const loadFull = async (p: Purchase): Promise<Purchase> => {
    if (p.lines && p.lines.length > 0) return p;
    const res = await api.get(`/purchases/${p.id}`);
    return res.purchase || res;
  };

  const handleOpenEditPurchase = async (purchase: Purchase) => {
    try {
      const full = await loadFull(purchase);
      setEditingPurchase(full);
      setSupplierId(full.supplierId);
      setSupplierInvoiceNumber(full.supplierInvoiceNumber || '');
      setPurchaseDate(full.purchaseDate ? String(full.purchaseDate).slice(0, 10) : localIsoDate());
      setPaidAmount(Number(full.paidAmount) || '');
      setPaymentMethod('BANK_TRANSFER');
      setNotes(full.notes || '');
      setItemRows(
        full.lines?.length
          ? full.lines.map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) || 1, unitCost: Number(l.unitCost) || 0 }))
          : [newRow()]
      );
      setIsModalOpen(true);
    } catch (err: any) {
      toast.error('Could not open purchase', err.message);
    }
  };

  const handleViewPurchase = async (purchase: Purchase) => {
    try {
      setSelectedPurchase(await loadFull(purchase));
    } catch (err: any) {
      toast.error('Could not load purchase', err.message);
    }
  };

  const updateRow = (index: number, patch: Partial<PurchaseItemRow>) =>
    setItemRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const handleItemChange = (index: number, newItemId: string) => {
    const selected = items.find((i) => i.id === newItemId);
    updateRow(index, { itemId: newItemId, unitCost: selected ? Number(selected.purchasePrice) || 0 : 0 });
  };

  // Mirrors the server: line tax = qty × cost × item GST rate (cost is entered BEFORE GST).
  const lineCalc = itemRows.map((r) => {
    const gst = Number(items.find((i) => i.id === r.itemId)?.gstRate) || 0;
    const sub = round2(r.quantity * r.unitCost);
    const tax = round2(sub * (gst / 100));
    return { sub, tax, gst };
  });
  const subtotal = round2(lineCalc.reduce((s, l) => s + l.sub, 0));
  const taxTotal = round2(lineCalc.reduce((s, l) => s + l.tax, 0));
  const grandTotal = round2(subtotal + taxTotal);

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error('Select a supplier');
      return;
    }
    if (itemRows.length === 0 || itemRows.some((r) => !r.itemId || r.quantity <= 0)) {
      toast.error('Check the item rows', 'Every row needs a product and a quantity above zero.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        supplierId,
        supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
        purchaseDate,
        items: itemRows.map((r) => ({ itemId: r.itemId, quantity: Number(r.quantity), unitCost: Number(r.unitCost) })),
        paidAmount: Number(paidAmount) || 0,
        paymentMethod,
        notes: notes.trim() || undefined,
      };
      if (editingPurchase) {
        await api.put(`/purchases/${editingPurchase.id}`, payload);
        toast.success('Purchase updated', 'Stock and supplier balance were adjusted.');
      } else {
        await api.post('/purchases', payload);
        toast.success('Goods received', 'Stock and supplier balance were updated.');
      }
      setIsModalOpen(false);
      setEditingPurchase(null);
      await loadData();
    } catch (err: any) {
      toast.error('Purchase not saved', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePurchase = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/purchases/${deleteTarget.id}`);
      toast.success('Purchase deleted');
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error('Purchase not deleted', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filteredPurchases = purchases.filter(
    (p) =>
      !q ||
      p.purchaseNumber?.toLowerCase().includes(q) ||
      p.supplierInvoiceNumber?.toLowerCase().includes(q) ||
      p.supplier?.name?.toLowerCase().includes(q)
  );

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-5">
        <PageHeader
          title="Purchases"
          description="Record supplier bills, receive goods into stock and track what you owe."
          actions={
            <Button onClick={handleOpenNewPurchase}>
              <Plus /> Record purchase
            </Button>
          }
        />

        {purchases.length > 0 && (
          <Input
            aria-label="Search purchases"
            placeholder="Search by purchase no., supplier bill no. or supplier"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search />}
            containerClassName="max-w-md shrink-0"
          />
        )}

        <div className="min-h-0 flex-1">
          {isLoading ? (
            <TableSkeleton cols={8} />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={loadData} />
          ) : filteredPurchases.length === 0 ? (
            <EmptyState
              icon={Truck}
              title={purchases.length === 0 ? 'No purchases yet' : 'No purchases match your search'}
              description={purchases.length === 0 ? 'Record a supplier bill to add stock.' : undefined}
              action={
                purchases.length === 0 && (
                  <Button onClick={handleOpenNewPurchase}>
                    <Plus /> Record purchase
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Purchase</Th>
                  <Th>Supplier bill</Th>
                  <Th>Date</Th>
                  <Th>Supplier</Th>
                  <Th numeric>Total</Th>
                  <Th numeric>Paid</Th>
                  <Th numeric>Due</Th>
                  <Th>Status</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredPurchases.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-mono font-medium text-fg">{p.purchaseNumber}</Td>
                    <Td className="font-mono text-xs">{p.supplierInvoiceNumber || '—'}</Td>
                    <Td>{formatDate(p.purchaseDate)}</Td>
                    <Td className="text-fg">{p.supplier?.name || '—'}</Td>
                    <Td numeric className="font-medium text-fg">
                      {formatCurrency(p.totalAmount)}
                    </Td>
                    <Td numeric>{formatCurrency(p.paidAmount)}</Td>
                    <Td numeric className={Number(p.balanceAmount) > 0 ? 'font-medium text-warning' : ''}>
                      {formatCurrency(p.balanceAmount)}
                    </Td>
                    <Td>
                      <StatusBadge status={p.paymentStatus} />
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <IconButton size="sm" label={`View ${p.purchaseNumber}`} onClick={() => handleViewPurchase(p)}>
                          <Eye />
                        </IconButton>
                        <IconButton size="sm" label={`Edit ${p.purchaseNumber}`} onClick={() => handleOpenEditPurchase(p)}>
                          <Pencil />
                        </IconButton>
                        <IconButton size="sm" variant="danger-ghost" label={`Delete ${p.purchaseNumber}`} onClick={() => setDeleteTarget(p)}>
                          <Trash2 />
                        </IconButton>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      </div>

      {/* Record / edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPurchase ? `Edit purchase · ${editingPurchase.purchaseNumber}` : 'Record purchase'}
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmitPurchase} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select label="Supplier" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} containerClassName="sm:col-span-1">
              <option value="" disabled>
                {suppliers.length ? 'Select supplier' : 'Add a supplier first'}
              </option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input label="Supplier bill no." value={supplierInvoiceNumber} onChange={(e) => setSupplierInvoiceNumber(e.target.value)} />
            <Input label="Bill date" type="date" required max={localIsoDate()} value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>

          <fieldset>
            <div className="mb-2 flex items-center justify-between">
              <legend className="text-sm font-semibold text-fg">Items received</legend>
              <Button type="button" variant="secondary" size="sm" onClick={() => setItemRows((r) => [...r, newRow()])}>
                <Plus /> Add row
              </Button>
            </div>
            <div className="overflow-x-auto rounded-card border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-surface-2 text-xs font-medium text-fg-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left">Product</th>
                    <th scope="col" className="w-24 px-3 py-2 text-right">Qty</th>
                    <th scope="col" className="w-32 px-3 py-2 text-right">Cost / unit (₹, excl. GST)</th>
                    <th scope="col" className="w-16 px-3 py-2 text-right">GST</th>
                    <th scope="col" className="w-28 px-3 py-2 text-right">Amount</th>
                    <th scope="col" className="w-10 px-2 py-2">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {itemRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <label htmlFor={`pur-item-${idx}`} className="sr-only">
                          Product, row {idx + 1}
                        </label>
                        <select
                          id={`pur-item-${idx}`}
                          value={row.itemId}
                          onChange={(e) => handleItemChange(idx, e.target.value)}
                          className={cn(controlClass, 'h-9 border-border-strong px-2')}
                        >
                          <option value="" disabled>
                            Select product
                          </option>
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} (stock {Number(i.currentStock)})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <label htmlFor={`pur-qty-${idx}`} className="sr-only">
                          Quantity, row {idx + 1}
                        </label>
                        <NumberInput
                          id={`pur-qty-${idx}`}
                          min={0}
                          step="any"
                          value={row.quantity}
                          onChange={(e) => updateRow(idx, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                          className={cn(controlClass, 'h-9 border-border-strong px-2 text-right')}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <label htmlFor={`pur-cost-${idx}`} className="sr-only">
                          Cost per unit, row {idx + 1}
                        </label>
                        <NumberInput
                          id={`pur-cost-${idx}`}
                          min={0}
                          step="0.01"
                          value={row.unitCost}
                          onChange={(e) => updateRow(idx, { unitCost: Math.max(0, Number(e.target.value) || 0) })}
                          className={cn(controlClass, 'h-9 border-border-strong px-2 text-right')}
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-fg-muted">{lineCalc[idx]?.gst ?? 0}%</td>
                      <td className="px-3 py-2 text-right font-medium text-fg tabular-nums">
                        {formatCurrency((lineCalc[idx]?.sub || 0) + (lineCalc[idx]?.tax || 0))}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {itemRows.length > 1 && (
                          <IconButton size="sm" variant="danger-ghost" label={`Remove row ${idx + 1}`} onClick={() => setItemRows((r) => r.filter((_, i) => i !== idx))}>
                            <X />
                          </IconButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Paid now (₹)"
                  type="number"
                  step="0.01"
                  min={0}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                />
                <Select label="Paid by" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PayMethod)}>
                  {(Object.keys(PAY_LABEL) as PayMethod[]).map((m) => (
                    <option key={m} value={m}>
                      {PAY_LABEL[m]}
                    </option>
                  ))}
                </Select>
              </div>
              <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
            <Card className="space-y-1.5 bg-surface-2 text-sm shadow-none">
              <div className="flex justify-between text-fg-muted">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-fg-muted">
                <span>GST (input tax)</span>
                <span className="tabular-nums">{formatCurrency(taxTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-fg">
                <span>Bill total</span>
                <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-fg-muted">
                <span>Balance you'll owe</span>
                <span className="tabular-nums">{formatCurrency(Math.max(0, grandTotal - (Number(paidAmount) || 0)))}</span>
              </div>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingPurchase ? 'Save changes' : 'Receive goods'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View */}
      <Modal
        isOpen={!!selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
        title={`Purchase ${selectedPurchase?.purchaseNumber || ''}`}
        description={
          selectedPurchase
            ? `${selectedPurchase.supplier?.name || ''}${selectedPurchase.supplierInvoiceNumber ? ` · Bill ${selectedPurchase.supplierInvoiceNumber}` : ''} · ${formatDate(selectedPurchase.purchaseDate)}`
            : undefined
        }
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <Table>
            <Thead>
              <Tr>
                <Th>Product</Th>
                <Th numeric>Qty</Th>
                <Th numeric>Cost</Th>
                <Th numeric>GST</Th>
                <Th numeric>Amount</Th>
              </Tr>
            </Thead>
            <Tbody>
              {selectedPurchase?.lines?.map((line, idx) => (
                <Tr key={line.id || idx}>
                  <Td className="font-medium text-fg">{line.itemName || '—'}</Td>
                  <Td numeric>{Number(line.quantity)}</Td>
                  <Td numeric>{formatCurrency(line.unitCost)}</Td>
                  <Td numeric>{Number(line.gstRate || 0)}%</Td>
                  <Td numeric className="font-medium text-fg">
                    {formatCurrency(line.lineTotal || 0)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {selectedPurchase && (
            <dl className="ml-auto w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-fg-muted">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatCurrency(selectedPurchase.subtotalAmount)}</dd>
              </div>
              <div className="flex justify-between text-fg-muted">
                <dt>GST</dt>
                <dd className="tabular-nums">{formatCurrency(selectedPurchase.taxAmount)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-semibold text-fg">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatCurrency(selectedPurchase.totalAmount)}</dd>
              </div>
              <div className="flex justify-between text-fg-muted">
                <dt>Paid</dt>
                <dd className="tabular-nums">{formatCurrency(selectedPurchase.paidAmount)}</dd>
              </div>
              <div className="flex justify-between font-medium text-warning">
                <dt>Due</dt>
                <dd className="tabular-nums">{formatCurrency(selectedPurchase.balanceAmount)}</dd>
              </div>
            </dl>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeletePurchase}
        isLoading={isDeleting}
        title="Delete purchase?"
        confirmLabel="Delete purchase"
        message={
          <>
            Purchase <strong className="text-fg">{deleteTarget?.purchaseNumber}</strong> will be deleted. The received stock is
            removed and the supplier's balance is reversed. This can't be undone.
          </>
        }
      />
    </DashboardLayout>
  );
}
