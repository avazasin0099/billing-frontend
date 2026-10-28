import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ArrowRight,
  PackageCheck,
  Calendar,
  User,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, Badge, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td, Modal } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';
import { posAudio } from '@/lib/sound';

export default function ReturnsPage() {
  const [invoiceNumberQuery, setInvoiceNumberQuery] = useState('');
  const [foundInvoice, setFoundInvoice] = useState<Invoice | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Return item quantities: { itemId: quantity }
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [refundMode, setRefundMode] = useState<'CASH' | 'LEDGER_CREDIT'>('CASH');
  const [returnReason, setReturnReason] = useState('Customer Return');
  const [returnNotes, setReturnNotes] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Recent Invoices list for quick pick
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await api.get('/invoices', { limit: 10 });
        setRecentInvoices(res.invoices || res || []);
      } catch (err) {
        console.error('Failed to load recent invoices:', err);
      } finally {
        setIsLoadingRecent(false);
      }
    };
    fetchRecent();
  }, []);

  const handleSearchInvoice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!invoiceNumberQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setFoundInvoice(null);
    setSuccessMessage(null);

    try {
      const res = await api.get('/invoices', { search: invoiceNumberQuery.trim() });
      const invoices: Invoice[] = res.invoices || res || [];
      if (invoices.length === 0) {
        setSearchError(`No invoice found matching "${invoiceNumberQuery}"`);
        posAudio.playErrorBuzz();
      } else {
        // Fetch detailed invoice with lines
        const detailed = await api.get(`/invoices/${invoices[0].id}`);
        setFoundInvoice(detailed);
        posAudio.playScanBeep();

        // Initialize return quantities to 0
        const initialQtys: Record<string, number> = {};
        detailed.lines?.forEach((line: any) => {
          initialQtys[line.itemId] = 0;
        });
        setReturnQtys(initialQtys);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Failed to search invoice');
      posAudio.playErrorBuzz();
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectInvoice = async (inv: Invoice) => {
    setInvoiceNumberQuery(inv.invoiceNumber);
    setSearchError(null);
    setSuccessMessage(null);
    try {
      const detailed = await api.get(`/invoices/${inv.id}`);
      setFoundInvoice(detailed);
      posAudio.playScanBeep();
      const initialQtys: Record<string, number> = {};
      detailed.lines?.forEach((line: any) => {
        initialQtys[line.itemId] = 0;
      });
      setReturnQtys(initialQtys);
    } catch (err: any) {
      setSearchError(err.message);
    }
  };

  const handleQtyChange = (itemId: string, maxQty: number, val: number) => {
    const clamped = Math.min(maxQty, Math.max(0, val));
    setReturnQtys((prev) => ({ ...prev, [itemId]: clamped }));
  };

  // Calculate estimated refund total
  const estimatedRefund =
    foundInvoice?.lines?.reduce((sum: number, line: any) => {
      const qty = returnQtys[line.itemId] || 0;
      const unitP = Number(line.unitPrice) || 0;
      return sum + qty * unitP;
    }, 0) || 0;

  const totalItemsToReturn = Object.values(returnQtys).reduce((sum, q) => sum + q, 0);

  const handleSubmitReturn = async () => {
    if (!foundInvoice) return;
    const itemsToReturn = Object.entries(returnQtys)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }));

    if (itemsToReturn.length === 0) {
      posAudio.playErrorBuzz();
      alert('Please select at least one item quantity to return');
      return;
    }

    setIsSubmittingReturn(true);
    try {
      await api.post(`/invoices/${foundInvoice.id}/returns`, {
        items: itemsToReturn,
        refundMode,
        reason: returnReason,
        notes: returnNotes,
      });

      posAudio.playSuccessChime();
      setSuccessMessage(
        `Return processed! Stock replenished and GST Credit Note created successfully for ${formatCurrency(
          estimatedRefund
        )}.`
      );
      setFoundInvoice(null);
      setInvoiceNumberQuery('');
      setReturnQtys({});
    } catch (err: any) {
      posAudio.playErrorBuzz();
      alert(`Return failed: ${err.message}`);
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-fg tracking-tight flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-brand" />
              <span>Sales Returns & GST Credit Notes</span>
            </h2>
            <p className="text-xs text-fg-subtle mt-1">
              Process customer returns, restock inventory automatically, and generate legal Credit Notes
            </p>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Search & Process Return (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Step 1: Locate Invoice by Number or Receipt Barcode</CardTitle>
              </CardHeader>
              <form onSubmit={handleSearchInvoice} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-fg-subtle absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={invoiceNumberQuery}
                    onChange={(e) => setInvoiceNumberQuery(e.target.value)}
                    placeholder="Enter invoice # (e.g. INV/2026-27/0001)..."
                    className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-fg placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                </div>
                <Button type="submit" variant="primary" size="md" isLoading={isSearching} className="font-bold">
                  Find Bill
                </Button>
              </form>

              {searchError && (
                <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}
            </Card>

            {/* Found Invoice Item Selection */}
            {foundInvoice && (
              <Card className="border-brand/30">
                <CardHeader className="border-b border-border pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-fg text-sm">{foundInvoice.invoiceNumber}</span>
                        <Badge variant="success">Posted</Badge>
                      </div>
                      <div className="text-xs text-fg-subtle mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(foundInvoice.invoiceDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {foundInvoice.customer?.name || 'Walk-in Retail Customer'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-fg-subtle block">Total Billed</span>
                      <span className="text-base font-bold text-fg">
                        {formatCurrency(foundInvoice.totalAmount)}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-fg-subtle block mb-2">
                      Select Items and Quantities to Return
                    </label>
                    <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                      {foundInvoice.lines?.map((line: any) => {
                        const currentReturnQty = returnQtys[line.itemId] || 0;
                        const maxQty = Number(line.quantity);

                        return (
                          <div
                            key={line.id || line.itemId}
                            className="p-3 bg-surface-2/50 flex items-center justify-between gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-semibold text-fg truncate">{line.itemName}</h5>
                              <div className="text-[11px] text-fg-subtle mt-0.5">
                                <span>Unit: {formatCurrency(line.unitPrice)}</span>
                                <span className="mx-1.5">•</span>
                                <span>Billed Qty: {maxQty}</span>
                                <span className="mx-1.5">•</span>
                                <span className="text-brand">{line.gstRate}% GST</span>
                              </div>
                            </div>

                            {/* Qty Controls */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-fg-subtle">Return:</span>
                              <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(line.itemId, maxQty, currentReturnQty - 1)}
                                  className="p-1 hover:bg-surface-2 text-fg-subtle hover:text-fg rounded"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={currentReturnQty}
                                  onChange={(e) =>
                                    handleQtyChange(line.itemId, maxQty, Number(e.target.value))
                                  }
                                  className="w-10 text-center bg-transparent text-xs font-bold text-fg focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(line.itemId, maxQty, currentReturnQty + 1)}
                                  className="p-1 hover:bg-surface-2 text-fg-subtle hover:text-fg rounded"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Return Tender & Reason */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-fg-muted block mb-1">
                        Refund Mode
                      </label>
                      <select
                        value={refundMode}
                        onChange={(e: any) => setRefundMode(e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="CASH">Cash Refund (Counter)</option>
                        <option value="LEDGER_CREDIT">Customer Ledger Credit (Deduct Udhaar)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-fg-muted block mb-1">
                        Return Reason
                      </label>
                      <select
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="Customer Return">Customer Return / Exchange</option>
                        <option value="Damaged Goods">Damaged / Defective Goods</option>
                        <option value="Expired Product">Expired Product</option>
                        <option value="Billing Error">Billing Rate / Quantity Error</option>
                      </select>
                    </div>
                  </div>

                  <Input
                    label="Return Audit Note (Optional)"
                    placeholder="e.g. Returned with original seal and box"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                  />

                  {/* Action Summary */}
                  <div className="p-3 bg-surface-2 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <span className="text-xs text-fg-subtle block">Total Refundable</span>
                      <span className="text-lg font-bold text-fg">{formatCurrency(estimatedRefund)}</span>
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleSubmitReturn}
                      isLoading={isSubmittingReturn}
                      disabled={totalItemsToReturn === 0}
                      className="font-bold shadow-lg shadow-emerald-600/30"
                    >
                      <PackageCheck className="w-4 h-4 mr-1.5" />
                      Restock & Issue Credit Note
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Quick Recent Invoices (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Recent Issued Invoices</span>
                  <Link to="/invoices" className="text-xs text-brand hover:underline">
                    View All
                  </Link>
                </CardTitle>
              </CardHeader>
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {isLoadingRecent ? (
                  <div className="p-6 text-center text-xs text-fg-subtle">Loading recent invoices...</div>
                ) : recentInvoices.length === 0 ? (
                  <div className="p-6 text-center text-xs text-fg-subtle">No recent invoices found</div>
                ) : (
                  recentInvoices.map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => handleSelectInvoice(inv)}
                      className="w-full p-3.5 text-left hover:bg-surface-2/50 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-fg group-hover:text-brand font-mono">
                          {inv.invoiceNumber}
                        </div>
                        <div className="text-[11px] text-fg-subtle mt-0.5">
                          {inv.customer?.name || 'Walk-in'} • {formatDate(inv.invoiceDate)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-fg">
                          {formatCurrency(inv.totalAmount)}
                        </div>
                        <span className="text-[10px] text-brand flex items-center justify-end gap-0.5 mt-0.5">
                          Select <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
