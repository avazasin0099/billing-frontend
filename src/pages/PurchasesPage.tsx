import React, { useState, useEffect } from 'react';
import { Plus, Eye, Pencil, Trash2, X } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Badge, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td, Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { api } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Supplier, Item, Purchase } from '@/types';

interface PurchaseItemRow {
  itemId: string;
  quantity: number;
  unitCost: number;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [itemRows, setItemRows] = useState<PurchaseItemRow[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH' | 'CHEQUE'>('BANK_TRANSFER');
  const [notes, setNotes] = useState('');

  // View Details Modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Delete Confirm Dialog state
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      const [purList, suppList, itemList] = await Promise.all([
        api.get('/purchases').catch(() => ({ purchases: [] })),
        api.get('/parties/suppliers').catch(() => ({ suppliers: [] })),
        api.get('/items', { limit: 100 }).catch(() => ({ items: [] })),
      ]);

      const purArr = purList.purchases || purList || [];
      const suppArr = suppList.suppliers || suppList || [];
      const itemsArr = itemList.items || itemList || [];

      setPurchases(purArr);
      setSuppliers(suppArr);
      setItems(itemsArr);
    } catch (err) {
      console.error('Failed to load purchases:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNewPurchase = () => {
    setEditingPurchase(null);
    setSupplierId(suppliers.length > 0 ? suppliers[0].id : '');
    setSupplierInvoiceNumber('');
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setPaidAmount(0);
    setPaymentMethod('BANK_TRANSFER');
    setNotes('');

    if (items.length > 0) {
      setItemRows([
        {
          itemId: items[0].id,
          quantity: 10,
          unitCost: Number(items[0].purchasePrice) || 20,
        },
      ]);
    } else {
      setItemRows([]);
    }

    setIsModalOpen(true);
  };

  const handleOpenEditPurchase = async (purchase: Purchase) => {
    try {
      let fullPur = purchase;
      if (!fullPur.lines || fullPur.lines.length === 0) {
        const res = await api.get(`/purchases/${purchase.id}`);
        fullPur = res.purchase || res;
      }

      setEditingPurchase(fullPur);
      setSupplierId(fullPur.supplierId);
      setSupplierInvoiceNumber(fullPur.supplierInvoiceNumber || '');
      setPurchaseDate(
        fullPur.purchaseDate ? String(fullPur.purchaseDate).slice(0, 10) : new Date().toISOString().slice(0, 10)
      );
      setPaidAmount(Number(fullPur.paidAmount) || 0);
      setPaymentMethod('BANK_TRANSFER');
      setNotes(fullPur.notes || '');

      if (fullPur.lines && fullPur.lines.length > 0) {
        setItemRows(
          fullPur.lines.map((l) => ({
            itemId: l.itemId,
            quantity: Number(l.quantity) || 1,
            unitCost: Number(l.unitCost) || 0,
          }))
        );
      } else if (items.length > 0) {
        setItemRows([
          {
            itemId: items[0].id,
            quantity: 1,
            unitCost: Number(items[0].purchasePrice) || 0,
          },
        ]);
      } else {
        setItemRows([]);
      }

      setIsModalOpen(true);
    } catch (err: any) {
      alert(`Failed to load purchase details for edit: ${err.message}`);
    }
  };

  const handleViewPurchase = async (purchase: Purchase) => {
    try {
      let fullPur = purchase;
      if (!fullPur.lines || fullPur.lines.length === 0) {
        const res = await api.get(`/purchases/${purchase.id}`);
        fullPur = res.purchase || res;
      }
      setSelectedPurchase(fullPur);
      setIsViewModalOpen(true);
    } catch (err: any) {
      alert(`Failed to load purchase details: ${err.message}`);
    }
  };

  const handleItemChange = (index: number, newItemId: string) => {
    const updated = [...itemRows];
    const selected = items.find((i) => i.id === newItemId);
    updated[index] = {
      ...updated[index],
      itemId: newItemId,
      unitCost: selected ? Number(selected.purchasePrice) || 0 : updated[index].unitCost,
    };
    setItemRows(updated);
  };

  const handleQtyChange = (index: number, quantity: number) => {
    const updated = [...itemRows];
    updated[index] = { ...updated[index], quantity: Math.max(1, quantity) };
    setItemRows(updated);
  };

  const handleUnitCostChange = (index: number, unitCost: number) => {
    const updated = [...itemRows];
    updated[index] = { ...updated[index], unitCost: Math.max(0, unitCost) };
    setItemRows(updated);
  };

  const handleAddItemRow = () => {
    const firstItem = items[0];
    setItemRows([
      ...itemRows,
      {
        itemId: firstItem ? firstItem.id : '',
        quantity: 1,
        unitCost: firstItem ? Number(firstItem.purchasePrice) || 0 : 0,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (itemRows.length <= 1) return;
    setItemRows(itemRows.filter((_, idx) => idx !== index));
  };

  const calculatedSubtotal = itemRows.reduce((sum, r) => sum + r.quantity * r.unitCost, 0);

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      alert('Supplier is required');
      return;
    }
    if (itemRows.length === 0 || itemRows.some((r) => !r.itemId)) {
      alert('Please select valid items for all item rows');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        supplierId,
        supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
        purchaseDate,
        items: itemRows.map((r) => ({
          itemId: r.itemId,
          quantity: Number(r.quantity),
          unitCost: Number(r.unitCost),
        })),
        paidAmount: Number(paidAmount) || 0,
        paymentMethod,
        notes: notes.trim() || undefined,
      };

      if (editingPurchase) {
        await api.put(`/purchases/${editingPurchase.id}`, payload);
        alert('Purchase invoice updated! Stock and supplier ledger adjusted.');
      } else {
        await api.post('/purchases', payload);
        alert('Inward purchase recorded! Stock and supplier ledger updated.');
      }

      setIsModalOpen(false);
      setEditingPurchase(null);
      await loadData();
    } catch (err: any) {
      alert(`Failed to save purchase: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePurchase = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/purchases/${deleteTarget.id}`);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(`Failed to delete purchase: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.purchaseNumber?.toLowerCase().includes(q) ||
      p.supplierInvoiceNumber?.toLowerCase().includes(q) ||
      p.supplier?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full min-h-0 gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-fg tracking-tight">Inward Purchases & Goods Receipt</h2>
            <p className="text-xs text-fg-subtle mt-1">Record supplier invoices, restock items, and track payables</p>
          </div>
          <Button variant="primary" onClick={handleOpenNewPurchase}>
            <Plus className="w-4 h-4 mr-1.5" />
            Record Inward Purchase
          </Button>
        </div>

        {purchases.length > 0 && (
          <Card className="shrink-0">
            <Input
              placeholder="Search purchases by purchase #, invoice #, or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Card>
        )}

        <div className="flex-1 min-h-0">
          {purchases.length === 0 ? (
            <Card className="h-full flex items-center justify-center text-center text-fg-subtle text-sm">
              No purchase bills recorded yet. Tap “Record Inward Purchase” to stock up.
            </Card>
          ) : filteredPurchases.length === 0 ? (
            <Card className="h-full flex items-center justify-center text-center text-fg-subtle text-sm">
              No purchases match your search query.
            </Card>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Purchase #</Th>
                  <Th>Supplier Inv #</Th>
                  <Th>Date</Th>
                  <Th>Supplier</Th>
                  <Th>Total Cost</Th>
                  <Th>Paid Amount</Th>
                  <Th>Balance Payable</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredPurchases.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-mono font-bold text-fg">{p.purchaseNumber}</Td>
                    <Td className="font-mono text-xs">{p.supplierInvoiceNumber || '-'}</Td>
                    <Td>{formatDate(p.purchaseDate)}</Td>
                    <Td className="font-semibold text-fg">{p.supplier?.name || '-'}</Td>
                    <Td className="font-bold">{formatCurrency(p.totalAmount)}</Td>
                    <Td className="text-emerald-600 dark:text-emerald-400">{formatCurrency(p.paidAmount)}</Td>
                    <Td
                      className={`font-semibold ${
                        Number(p.balanceAmount) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-fg-subtle'
                      }`}
                    >
                      {formatCurrency(p.balanceAmount)}
                    </Td>
                    <Td>
                      <Badge variant={p.paymentStatus === 'PAID' ? 'success' : 'warning'}>{p.paymentStatus}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPurchase(p)}
                          title="View Details"
                          className="hover:text-fg"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditPurchase(p)}
                          title="Edit Purchase"
                          className="hover:text-brand"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(p)}
                          title="Delete Purchase"
                          className="hover:text-rose-600 dark:hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      </div>

      {/* Record / Edit Purchase Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPurchase ? `Edit Inward Purchase — ${editingPurchase.purchaseNumber}` : 'Record Inward Purchase'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitPurchase} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Select Supplier *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-fg"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (GSTIN: {s.gstin || 'None'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Supplier Invoice #"
              value={supplierInvoiceNumber}
              onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              placeholder="e.g. SUPP-2026-90"
            />
            <Input
              label="Invoice Date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
            />
          </div>

          {/* Line items section */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-fg">Items Inwarded</label>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddItemRow}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {itemRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-surface-2 p-2.5 rounded-xl border border-border">
                  <div className="flex-1">
                    <label className="block text-[10px] text-fg-subtle mb-0.5">Item</label>
                    <select
                      value={row.itemId}
                      onChange={(e) => handleItemChange(idx, e.target.value)}
                      className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-fg"
                    >
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} (Stock: {i.currentStock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] text-fg-subtle mb-0.5">Qty</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={row.quantity}
                      onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                      className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-fg"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-[10px] text-fg-subtle mb-0.5">Unit Cost (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      required
                      value={row.unitCost}
                      onChange={(e) => handleUnitCostChange(idx, Number(e.target.value))}
                      className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-fg"
                    />
                  </div>
                  <div className="w-24 text-right">
                    <span className="block text-[10px] text-fg-subtle mb-0.5">Total</span>
                    <span className="text-xs font-semibold text-fg">{formatCurrency(row.quantity * row.unitCost)}</span>
                  </div>
                  {itemRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      className="p-1 text-fg-subtle hover:text-rose-600 transition-colors mt-3"
                      title="Remove Item"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-2 p-3 rounded-xl border border-border flex justify-between text-xs font-bold text-fg">
            <span>Estimated Total:</span>
            <span className="text-brand text-sm">{formatCurrency(calculatedSubtotal)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount Paid Upfront (₹)"
              type="number"
              step="0.01"
              min={0}
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
            />
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-fg"
              >
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>

          <Input
            label="Notes / Remarks (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Received in good condition with PO # 1042"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              {editingPurchase ? 'Update Purchase' : 'Receive Goods & Post to Stock'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Purchase Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Purchase Details — ${selectedPurchase?.purchaseNumber}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 text-xs bg-surface-2 p-3 rounded-xl border border-border">
            <div>
              <span className="text-fg-subtle block">Supplier:</span>
              <span className="font-semibold text-fg text-sm">{selectedPurchase?.supplier?.name || '-'}</span>
              <span className="block text-[11px] text-fg-subtle mt-0.5">
                GSTIN: {selectedPurchase?.supplier?.gstin || 'None'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-fg-subtle block">Invoice Date:</span>
              <span className="font-semibold text-fg">
                {selectedPurchase?.purchaseDate ? formatDate(selectedPurchase.purchaseDate) : '-'}
              </span>
              <span className="block text-[11px] text-fg-subtle mt-0.5">
                Supplier Inv #: {selectedPurchase?.supplierInvoiceNumber || '-'}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-fg mb-2">Inward Items</h4>
            <Table>
              <Thead>
                <Tr>
                  <Th>Item</Th>
                  <Th>Qty</Th>
                  <Th>Unit Cost</Th>
                  <Th>GST</Th>
                  <Th className="text-right">Total</Th>
                </Tr>
              </Thead>
              <Tbody>
                {selectedPurchase?.lines?.map((line, idx) => (
                  <Tr key={line.id || idx}>
                    <Td className="font-medium text-fg">{line.itemName || '-'}</Td>
                    <Td>{line.quantity}</Td>
                    <Td>{formatCurrency(line.unitCost)}</Td>
                    <Td>{line.gstRate || 0}%</Td>
                    <Td className="text-right font-bold text-fg">{formatCurrency(line.lineTotal || 0)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>

          <div className="bg-surface-2 p-3 rounded-xl border border-border space-y-1.5 text-xs">
            <div className="flex justify-between text-fg-muted">
              <span>Subtotal:</span>
              <span>{formatCurrency(selectedPurchase?.subtotalAmount || 0)}</span>
            </div>
            <div className="flex justify-between text-fg-muted">
              <span>Tax (GST):</span>
              <span>{formatCurrency(selectedPurchase?.taxAmount || 0)}</span>
            </div>
            <div className="flex justify-between text-fg font-bold text-sm pt-1 border-t border-border">
              <span>Total Cost:</span>
              <span className="text-brand">{formatCurrency(selectedPurchase?.totalAmount || 0)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
              <span>Amount Paid:</span>
              <span>{formatCurrency(selectedPurchase?.paidAmount || 0)}</span>
            </div>
            <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
              <span>Balance Payable:</span>
              <span>{formatCurrency(selectedPurchase?.balanceAmount || 0)}</span>
            </div>
          </div>

          {selectedPurchase?.notes && (
            <div className="text-xs bg-surface-2 p-2.5 rounded-lg border border-border text-fg-muted">
              <span className="font-semibold text-fg block mb-0.5">Notes:</span>
              {selectedPurchase.notes}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsViewModalOpen(false);
                if (selectedPurchase) handleOpenEditPurchase(selectedPurchase);
              }}
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Edit Purchase
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Purchase Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeletePurchase}
        isLoading={isDeleting}
        title="Delete Inward Purchase"
        confirmLabel="Delete Purchase"
        tone="danger"
        message={
          <>
            Are you sure you want to delete purchase{' '}
            <strong className="text-fg">{deleteTarget?.purchaseNumber}</strong>?
            <br />
            This will reverse the inward stock added to inventory and adjust supplier{' '}
            <strong className="text-fg">{deleteTarget?.supplier?.name}</strong>’s balance ledger.
          </>
        }
      />
    </DashboardLayout>
  );
}
