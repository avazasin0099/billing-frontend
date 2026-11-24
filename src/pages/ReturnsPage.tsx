import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, CircleCheck, ReceiptIndianRupee as Receipt, ChevronRight, PackageCheck, Calendar, User, Minus, Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, Input, Select } from '@/components/ui/card';
import { Button, IconButton } from '@/components/ui/button';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { api, asList } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';
import { posAudio } from '@/lib/sound';
import { NumberInput } from '@/components/ui/number-input';

export default function ReturnsPage() {
  const [invoiceNumberQuery, setInvoiceNumberQuery] = useState('');
  const [foundInvoice, setFoundInvoice] = useState<Invoice | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [refundMode, setRefundMode] = useState<'CASH' | 'LEDGER_CREDIT'>('CASH');
  const [returnReason, setReturnReason] = useState('Customer return');
  const [returnNotes, setReturnNotes] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  useEffect(() => {
    api
      .get('/invoices', { limit: 10 })
      .then((res) => setRecentInvoices(asList(res, 'invoices')))
      .catch(() => setRecentInvoices([]))
      .finally(() => setIsLoadingRecent(false));
  }, []);

  const loadInvoice = async (id: string) => {
    const detailed = await api.get(`/invoices/${id}`);
    setFoundInvoice(detailed);
    const initial: Record<string, number> = {};
    detailed.lines?.forEach((line: any) => (initial[line.itemId] = 0));
    setReturnQtys(initial);
    setReturnNotes('');
    posAudio.playScanBeep();
  };

  const handleSearchInvoice = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = invoiceNumberQuery.trim();
    if (!q) return;
    setIsSearching(true);
    setSearchError(null);
    setFoundInvoice(null);
    setSuccessMessage(null);
    try {
      const res = await api.get('/invoices', { search: q });
      const invoices = asList<Invoice>(res, 'invoices');
      // Prefer an exact invoice-number match over the newest partial match.
      const match = invoices.find((i) => i.invoiceNumber.toLowerCase() === q.toLowerCase()) || invoices[0];
      if (!match) {
        setSearchError(`No invoice found matching "${q}".`);
        posAudio.playErrorBuzz();
      } else {
        await loadInvoice(match.id);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Could not search invoices.');
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
      await loadInvoice(inv.id);
    } catch (err: any) {
      setSearchError(err.message);
    }
  };

  const handleQtyChange = (itemId: string, maxQty: number, val: number) => {
    const clamped = Math.min(maxQty, Math.max(0, Number.isFinite(val) ? val : 0));
    setReturnQtys((prev) => ({ ...prev, [itemId]: clamped }));
  };

  // Refund estimate from each line's billed total (includes GST and any discount).
  const estimatedRefund =
    foundInvoice?.lines?.reduce((sum, line: any) => {
      const qty = returnQtys[line.itemId] || 0;
      const perUnit = Number(line.quantity) > 0 ? Number(line.lineTotal) / Number(line.quantity) : 0;
      return sum + qty * perUnit;
    }, 0) || 0;

  const totalItemsToReturn = Object.values(returnQtys).reduce((sum, q) => sum + q, 0);

  const handleSubmitReturn = async () => {
    if (!foundInvoice) return;
    const itemsToReturn = Object.entries(returnQtys)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity, reason: returnReason }));

    if (itemsToReturn.length === 0) {
      posAudio.playErrorBuzz();
      toast.error('Select at least one item to return');
      return;
    }

    setIsSubmittingReturn(true);
    try {
      await api.post(`/invoices/${foundInvoice.id}/returns`, {
        items: itemsToReturn,
        refundMode,
        reason: returnReason,
        notes: [returnReason, returnNotes].filter(Boolean).join(' — '),
      });
      posAudio.playSuccessChime();
      setSuccessMessage(
        `Credit note issued for ${foundInvoice.invoiceNumber}. Stock has been added back (about ${formatCurrency(estimatedRefund)}).`
      );
      toast.success('Return processed');
      setFoundInvoice(null);
      setInvoiceNumberQuery('');
      setReturnQtys({});
    } catch (err: any) {
      posAudio.playErrorBuzz();
      toast.error('Return not processed', err.message);
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Sales returns"
          description="Find the original bill, choose what came back, and issue a GST credit note. Stock is added back automatically."
        />

        {successMessage && (
          <div role="status" className="flex items-start gap-3 rounded-card border border-success/30 bg-success-soft p-4 text-sm text-fg">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <Card>
              <CardHeader>
                <CardTitle>1. Find the bill</CardTitle>
              </CardHeader>
              <form onSubmit={handleSearchInvoice} className="flex items-start gap-2">
                <Input
                  aria-label="Invoice number"
                  value={invoiceNumberQuery}
                  onChange={(e) => setInvoiceNumberQuery(e.target.value)}
                  placeholder="Invoice number, e.g. INV/2026-27/0001"
                  icon={<Search />}
                  className="font-mono"
                  error={searchError || undefined}
                />
                <Button type="submit" isLoading={isSearching}>
                  Find bill
                </Button>
              </form>
            </Card>

            {foundInvoice && (
              <Card>
                <CardHeader>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="font-mono">{foundInvoice.invoiceNumber}</CardTitle>
                      <StatusBadge status={foundInvoice.paymentStatus} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-4" aria-hidden="true" />
                        {formatDate(foundInvoice.invoiceDate)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="size-4" aria-hidden="true" />
                        {foundInvoice.customer?.name || 'Walk-in customer'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-fg-muted">Bill total</p>
                    <p className="text-base font-semibold text-fg tabular-nums">{formatCurrency(foundInvoice.totalAmount)}</p>
                  </div>
                </CardHeader>

                <div className="space-y-5">
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium text-fg">2. Items returned</legend>
                    <ul className="divide-y divide-border overflow-hidden rounded-card border border-border">
                      {foundInvoice.lines?.map((line: any) => {
                        const qty = returnQtys[line.itemId] || 0;
                        const maxQty = Math.max(0, Number(line.quantity) - Number(line.returnedQuantity || 0));
                        return (
                          <li key={line.id || line.itemId} className="flex items-center justify-between gap-3 p-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-fg">{line.itemName}</p>
                              {line.description && <p className="whitespace-pre-line break-words text-xs text-fg-muted">{line.description}</p>}
                              <p className="text-xs text-fg-muted">
                                {formatCurrency(line.unitPrice)} · sold {Number(line.quantity)}
                                {Number(line.returnedQuantity) > 0 && ` · already returned ${Number(line.returnedQuantity)}`} ·{' '}
                                {line.gstRate}% GST
                              </p>
                            </div>
                            <div className="flex items-center rounded-control border border-border-strong">
                              <IconButton size="sm" label={`Return one less ${line.itemName}`} onClick={() => handleQtyChange(line.itemId, maxQty, qty - 1)} disabled={qty <= 0}>
                                <Minus />
                              </IconButton>
                              <label htmlFor={`ret-${line.itemId}`} className="sr-only">
                                Quantity of {line.itemName} to return
                              </label>
                              <NumberInput
                                id={`ret-${line.itemId}`}
                                value={qty}
                                min={0}
                                max={maxQty}
                                onChange={(e) => handleQtyChange(line.itemId, maxQty, Number(e.target.value))}
                                className="h-8 w-12 bg-transparent text-center text-sm font-semibold text-fg focus:outline-none"
                              />
                              <IconButton size="sm" label={`Return one more ${line.itemName}`} onClick={() => handleQtyChange(line.itemId, maxQty, qty + 1)} disabled={qty >= maxQty}>
                                <Plus />
                              </IconButton>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Select label="3. Refund as" value={refundMode} onChange={(e) => setRefundMode(e.target.value as any)}>
                      <option value="CASH">Cash refund from drawer</option>
                      <option value="LEDGER_CREDIT">Credit to customer's udhaar account</option>
                    </Select>
                    <Select label="Reason" value={returnReason} onChange={(e) => setReturnReason(e.target.value)}>
                      <option value="Customer return">Customer return / exchange</option>
                      <option value="Damaged goods">Damaged or defective</option>
                      <option value="Expired product">Expired product</option>
                      <option value="Billing error">Billing error (rate / quantity)</option>
                    </Select>
                  </div>

                  <Input
                    label="Note"
                    hint="Optional — kept on the credit note for audit."
                    placeholder="e.g. Returned sealed in original box"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                  />

                  <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-fg-muted">Estimated refund (incl. GST)</p>
                      <p className="text-xl font-semibold text-fg tabular-nums">{formatCurrency(estimatedRefund)}</p>
                    </div>
                    <Button onClick={handleSubmitReturn} isLoading={isSubmittingReturn} disabled={totalItemsToReturn === 0}>
                      <PackageCheck /> Issue credit note
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-5">
            <Card padded={false}>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold text-fg">Recent bills</h2>
                <Link to="/invoices" className="text-sm font-medium text-accent hover:underline">
                  All invoices
                </Link>
              </div>
              {isLoadingRecent ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : recentInvoices.length === 0 ? (
                <EmptyState icon={Receipt} title="No bills yet" />
              ) : (
                <ul className="max-h-[500px] divide-y divide-border overflow-y-auto">
                  {recentInvoices.map((inv) => (
                    <li key={inv.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectInvoice(inv)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2"
                      >
                        <span className="min-w-0">
                          <span className="block font-mono text-sm font-medium text-fg">{inv.invoiceNumber}</span>
                          <span className="block truncate text-xs text-fg-muted">
                            {inv.customer?.name || 'Walk-in'} · {formatDate(inv.invoiceDate)}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium text-fg tabular-nums">{formatCurrency(inv.totalAmount)}</span>
                          <ChevronRight className="size-4 text-fg-subtle" aria-hidden="true" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
