
import React, { useState, useEffect } from 'react';
import { Truck, Plus, Eye, Calendar, DollarSign, Building } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, Badge, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td, Modal } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Supplier, Item } from '@/types';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);

  // New purchase form
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedItemId, setSelectedItemId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(20);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH' | 'CHEQUE'>('BANK_TRANSFER');

  const loadData = async () => {
    try {
      const [purList, suppList, itemList] = await Promise.all([
        api.get('/purchases').catch(() => ({ purchases: [] })),
        api.get('/parties/suppliers').catch(() => ({ suppliers: [] })),
        api.get('/items', { limit: 100 }).catch(() => ({ items: [] })),
      ]);

      setPurchases(purList.purchases || purList || []);
      setSuppliers(suppList.suppliers || suppList || []);
      const itemsArr = itemList.items || itemList || [];
      setItems(itemsArr);
      if (itemsArr.length > 0) {
        setSelectedItemId(itemsArr[0].id);
        setUnitCost(Number(itemsArr[0].purchasePrice) || 20);
      }
      if ((suppList.suppliers || suppList || []).length > 0) {
        setSupplierId((suppList.suppliers || suppList)[0].id);
      }
    } catch (err) {
      console.error('Failed to load purchases:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !selectedItemId) {
      alert('Supplier and Item are required');
      return;
    }

    try {
      await api.post('/purchases', {
        supplierId,
        supplierInvoiceNumber,
        purchaseDate,
        items: [
          {
            itemId: selectedItemId,
            quantity: Number(purchaseQty),
            unitCost: Number(unitCost),
          },
        ],
        paidAmount: Number(paidAmount),
        paymentMethod,
      });

      alert('Inward purchase recorded! Stock and supplier ledger updated.');
      setIsNewPurchaseOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Failed to save purchase: ${err.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Inward Purchases & Goods Receipt</h2>
            <p className="text-xs text-slate-400 mt-1">Record supplier invoices, restock items, and track payables</p>
          </div>
          <Button variant="primary" onClick={() => setIsNewPurchaseOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Record Inward Purchase
          </Button>
        </div>

        <Card>
          {purchases.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No purchase bills recorded yet. Tap &quot;Record Inward Purchase&quot; to stock up.
            </div>
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
                </Tr>
              </Thead>
              <Tbody>
                {purchases.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-mono font-bold text-white">{p.purchaseNumber}</Td>
                    <Td className="font-mono text-xs">{p.supplierInvoiceNumber || '-'}</Td>
                    <Td>{formatDate(p.purchaseDate)}</Td>
                    <Td className="font-semibold text-white">{p.supplier?.name}</Td>
                    <Td className="font-bold">{formatCurrency(p.totalAmount)}</Td>
                    <Td className="text-emerald-400">{formatCurrency(p.paidAmount)}</Td>
                    <Td className={`font-semibold ${Number(p.balanceAmount) > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {formatCurrency(p.balanceAmount)}
                    </Td>
                    <Td>
                      <Badge variant={p.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                        {p.paymentStatus}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>

      {/* New Purchase Modal */}
      <Modal isOpen={isNewPurchaseOpen} onClose={() => setIsNewPurchaseOpen(false)} title="Record Inward Purchase" maxWidth="md">
        <form onSubmit={handleCreatePurchase} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Select Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
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
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Item to Inward</label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                const selected = items.find((i) => i.id === e.target.value);
                if (selected) setUnitCost(Number(selected.purchasePrice));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (Current Stock: {i.currentStock})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity Inwarded"
              type="number"
              min={1}
              required
              value={purchaseQty}
              onChange={(e) => setPurchaseQty(Number(e.target.value))}
            />
            <Input
              label="Unit Cost Price (₹)"
              type="number"
              step="0.01"
              required
              value={unitCost}
              onChange={(e) => setUnitCost(Number(e.target.value))}
            />
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between text-xs font-bold text-white">
            <span>Estimated Total:</span>
            <span className="text-indigo-400">{formatCurrency(purchaseQty * unitCost)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount Paid Upfront (₹)"
              type="number"
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
            />
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>

          <Button type="submit" variant="primary" size="md" className="w-full mt-4">
            Receive Goods & Post to Stock
          </Button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
