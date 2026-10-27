
import React, { useEffect, useState } from 'react';
import { Search, Receipt, Eye, RotateCcw, Printer, Filter } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, Badge, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td, Modal } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});
  const [returnMode, setReturnMode] = useState<'CASH' | 'LEDGER_CREDIT'>('CASH');
  const [returnNotes, setReturnNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const data = await api.get('/invoices', { search, paymentStatus });
      setInvoices(data.invoices || data || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [paymentStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleOpenReturnModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    const initialQty: Record<string, number> = {};
    inv.lines?.forEach((l) => {
      initialQty[l.itemId] = 0;
    });
    setReturnQty(initialQty);
    setIsReturnModalOpen(true);
  };

  const handleProcessReturn = async () => {
    if (!selectedInvoice) return;
    const itemsToReturn = Object.entries(returnQty)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }));

    if (itemsToReturn.length === 0) {
      alert('Please specify quantity to return for at least one item');
      return;
    }

    try {
      await api.post(`/invoices/${selectedInvoice.id}/returns`, {
        items: itemsToReturn,
        refundMode: returnMode,
        notes: returnNotes,
      });
      alert('Sales return and credit note processed successfully!');
      setIsReturnModalOpen(false);
      fetchInvoices();
    } catch (err: any) {
      alert(`Return failed: ${err.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Sales Invoices</h2>
            <p className="text-xs text-slate-400 mt-1">Audit log of all counter and tax invoices</p>
          </div>
        </div>

        {/* Filters Card */}
        <Card>
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8">
              <Input
                placeholder="Search invoice number (e.g. INV/2026-27/0001)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="sm:col-span-3">
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Payment Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="UNPAID">Unpaid / Credit</option>
              </select>
            </div>
            <div className="sm:col-span-1">
              <Button type="submit" variant="primary" className="w-full">
                Filter
              </Button>
            </div>
          </form>
        </Card>

        {/* Invoices Table */}
        <Card>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No invoices match your filter criteria.</div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Invoice #</Th>
                  <Th>Date</Th>
                  <Th>Customer</Th>
                  <Th>Taxable Value</Th>
                  <Th>Tax (GST)</Th>
                  <Th>Bill Total</Th>
                  <Th>Payment Status</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {invoices.map((inv) => (
                  <Tr key={inv.id}>
                    <Td className="font-mono font-bold text-white">{inv.invoiceNumber}</Td>
                    <Td>{formatDate(inv.invoiceDate)}</Td>
                    <Td>{inv.customer?.name || 'Walk-in Retail'}</Td>
                    <Td>{formatCurrency(inv.taxableAmount)}</Td>
                    <Td>{formatCurrency(Number(inv.cgstAmount) + Number(inv.sgstAmount) + Number(inv.igstAmount))}</Td>
                    <Td className="font-bold text-white">{formatCurrency(inv.totalAmount)}</Td>
                    <Td>
                      <Badge
                        variant={
                          inv.paymentStatus === 'PAID'
                            ? 'success'
                            : inv.paymentStatus === 'PARTIALLY_PAID'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {inv.paymentStatus}
                      </Badge>
                    </Td>
                    <Td className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setIsDetailModalOpen(true);
                        }}
                        title="View Line Items"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenReturnModal(inv)}
                        title="Process Return / Credit Note"
                        className="hover:text-amber-400"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Invoice ${selectedInvoice?.invoiceNumber}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-500 block">Customer</span>
              <span className="font-semibold text-white">{selectedInvoice?.customer?.name || 'Walk-in Retail'}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Date</span>
              <span>{formatDate(selectedInvoice?.invoiceDate)}</span>
            </div>
          </div>

          <Table>
            <Thead>
              <Tr>
                <Th>Item</Th>
                <Th>Qty</Th>
                <Th>Price</Th>
                <Th>GST</Th>
                <Th className="text-right">Total</Th>
              </Tr>
            </Thead>
            <Tbody>
              {selectedInvoice?.lines?.map((line) => (
                <Tr key={line.id}>
                  <Td className="font-medium text-white">{line.itemName}</Td>
                  <Td>{line.quantity}</Td>
                  <Td>{formatCurrency(line.unitPrice)}</Td>
                  <Td>{line.gstRate}%</Td>
                  <Td className="text-right font-bold text-white">{formatCurrency(line.lineTotal)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <div className="flex justify-between items-center pt-3 border-t border-slate-800 font-bold text-sm">
            <span>Bill Total:</span>
            <span className="text-indigo-400 text-base">{formatCurrency(selectedInvoice?.totalAmount)}</span>
          </div>
        </div>
      </Modal>

      {/* Sales Return Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title={`Process Sales Return (${selectedInvoice?.invoiceNumber})`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Select the items and quantities returned. Goods will be restocked automatically.
          </p>

          <div className="space-y-2">
            {selectedInvoice?.lines?.map((line) => (
              <div key={line.id} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div>
                  <div className="font-semibold text-white">{line.itemName}</div>
                  <div className="text-slate-500">Bought: {line.quantity} • {formatCurrency(line.unitPrice)}/ea</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Return:</span>
                  <input
                    type="number"
                    min={0}
                    max={line.quantity}
                    value={returnQty[line.itemId] || 0}
                    onChange={(e) =>
                      setReturnQty({ ...returnQty, [line.itemId]: Math.min(line.quantity, Number(e.target.value)) })
                    }
                    className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-center font-bold"
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Refund Settlement Mode</label>
            <select
              value={returnMode}
              onChange={(e) => setReturnMode(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            >
              <option value="CASH">Cash Drawer Refund</option>
              <option value="LEDGER_CREDIT">Customer Account Credit (Udhaar deduction)</option>
            </select>
          </div>

          <Input
            label="Return Reason"
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            placeholder="e.g. Expired seal, customer change of mind"
          />

          <Button variant="primary" size="md" className="w-full mt-3" onClick={handleProcessReturn}>
            Confirm Return & Issue Credit Note
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
