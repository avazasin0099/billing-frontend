import React, { useCallback, useEffect, useState } from 'react';
import { Search, Eye, RotateCcw, ReceiptIndianRupee as Receipt } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Input, Select } from '@/components/ui/card';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table';
import { PageHeader, EmptyState, ErrorState, TableSkeleton, Skeleton } from '@/components/ui/page';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { api, asList } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSession } from '@/lib/session';
import { Invoice } from '@/types';
import { NumberInput } from '@/components/ui/number-input';

const totalTax = (inv: Partial<Invoice>) =>
  Number(inv.cgstAmount || 0) + Number(inv.sgstAmount || 0) + Number(inv.igstAmount || 0) + Number(inv.cessAmount || 0);

export default function InvoicesPage() {
  const { isManager } = useSession();
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  const fetchFullInvoice = async (inv: Invoice): Promise<Invoice> => {
    try {
      return (await api.get(`/invoices/${inv.id}`)) || inv;
    } catch {
      return inv;
    }
  };

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.get('/invoices', { search, paymentStatus, limit: 100 });
      setInvoices(asList(data, 'invoices'));
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleViewInvoice = async (inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    setSelectedInvoice(await fetchFullInvoice(inv));
    setDetailLoading(false);
  };

  const handleOpenReturnModal = async (inv: Invoice) => {
    // Reset first so the previous invoice's lines never flash in the dialog.
    setSelectedInvoice({ ...inv, lines: [] });
    setReturnQty({});
    setReturnMode('CASH');
    setReturnNotes('');
    setIsReturnModalOpen(true);
    setDetailLoading(true);
    const full = await fetchFullInvoice(inv);
    setSelectedInvoice(full);
    const initial: Record<string, number> = {};
    full.lines?.forEach((l) => (initial[l.itemId] = 0));
    setReturnQty(initial);
    setDetailLoading(false);
  };

  const handleProcessReturn = async () => {
    if (!selectedInvoice) return;
    const itemsToReturn = Object.entries(returnQty)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }));
    if (itemsToReturn.length === 0) {
      toast.error('Enter a quantity for at least one item');
      return;
    }
    setIsReturning(true);
    try {
      await api.post(`/invoices/${selectedInvoice.id}/returns`, {
        items: itemsToReturn,
        refundMode: returnMode,
        notes: returnNotes,
      });
      toast.success('Return processed', 'A credit note was issued and stock was added back.');
      setIsReturnModalOpen(false);
      fetchInvoices();
    } catch (err: any) {
      toast.error('Return not processed', err.message);
    } finally {
      setIsReturning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-5">
        <PageHeader title="Invoices" description="Every bill issued at the counter, with payment status." />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchInvoices();
          }}
          className="grid shrink-0 grid-cols-1 items-end gap-3 sm:grid-cols-12"
        >
          <Input
            label="Invoice number"
            containerClassName="sm:col-span-6"
            placeholder="e.g. INV/2026-27/0001"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search />}
          />
          <Select
            label="Payment status"
            containerClassName="sm:col-span-4"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="UNPAID">Unpaid</option>
          </Select>
          <Button type="submit" variant="secondary" className="sm:col-span-2">
            Search
          </Button>
        </form>

        <div className="min-h-0 flex-1">
          {isLoading ? (
            <TableSkeleton cols={7} />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={fetchInvoices} />
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={search || paymentStatus ? 'No invoices match these filters' : 'No invoices yet'}
              description={search || paymentStatus ? 'Try a different number or status.' : 'Bills issued from the POS will appear here.'}
            />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Invoice</Th>
                  <Th>Date</Th>
                  <Th>Customer</Th>
                  <Th numeric>Taxable</Th>
                  <Th numeric>GST</Th>
                  <Th numeric>Total</Th>
                  <Th>Status</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {invoices.map((inv) => (
                  <Tr key={inv.id}>
                    <Td className="font-mono font-medium text-fg">{inv.invoiceNumber}</Td>
                    <Td>{formatDate(inv.invoiceDate)}</Td>
                    <Td>{inv.customer?.name || 'Walk-in customer'}</Td>
                    <Td numeric>{formatCurrency(inv.taxableAmount)}</Td>
                    <Td numeric>{formatCurrency(totalTax(inv))}</Td>
                    <Td numeric className="font-medium text-fg">
                      {formatCurrency(inv.totalAmount)}
                    </Td>
                    <Td>
                      <StatusBadge status={inv.paymentStatus} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <IconButton size="sm" label={`View ${inv.invoiceNumber}`} onClick={() => handleViewInvoice(inv)}>
                          <Eye />
                        </IconButton>
                        {isManager && (
                          <IconButton size="sm" label={`Return items from ${inv.invoiceNumber}`} onClick={() => handleOpenReturnModal(inv)}>
                            <RotateCcw />
                          </IconButton>
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

      {/* Invoice detail */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Invoice ${selectedInvoice?.invoiceNumber || ''}`}
        description={selectedInvoice ? `${formatDate(selectedInvoice.invoiceDate)} · ${selectedInvoice.customer?.name || 'Walk-in customer'}` : undefined}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={selectedInvoice?.paymentStatus} />
            {selectedInvoice?.customer?.gstin && (
              <span className="text-sm text-fg-muted">
                GSTIN <span className="font-mono">{selectedInvoice.customer.gstin}</span>
              </span>
            )}
          </div>

          {detailLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Item</Th>
                  <Th>HSN</Th>
                  <Th numeric>Qty</Th>
                  <Th numeric>Rate</Th>
                  <Th numeric>GST</Th>
                  <Th numeric>Amount</Th>
                </Tr>
              </Thead>
              <Tbody>
                {selectedInvoice?.lines?.length ? (
                  selectedInvoice.lines.map((line) => (
                    <Tr key={line.id}>
                      <Td className="font-medium text-fg">{line.itemName}</Td>
                      <Td className="font-mono text-xs">{line.hsnCode || '—'}</Td>
                      <Td numeric>{Number(line.quantity)}</Td>
                      <Td numeric>{formatCurrency(line.unitPrice)}</Td>
                      <Td numeric>{Number(line.gstRate)}%</Td>
                      <Td numeric className="font-medium text-fg">
                        {formatCurrency(line.lineTotal)}
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={6} className="py-6 text-center">
                      No line items on this invoice.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          )}

          {selectedInvoice && (
            <dl className="ml-auto w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-fg-muted">
                <dt>Taxable</dt>
                <dd className="tabular-nums">{formatCurrency(selectedInvoice.taxableAmount)}</dd>
              </div>
              <div className="flex justify-between text-fg-muted">
                <dt>GST</dt>
                <dd className="tabular-nums">{formatCurrency(totalTax(selectedInvoice))}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-semibold text-fg">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatCurrency(selectedInvoice.totalAmount)}</dd>
              </div>
              <div className="flex justify-between text-fg-muted">
                <dt>Paid</dt>
                <dd className="tabular-nums">{formatCurrency(selectedInvoice.paidAmount)}</dd>
              </div>
              {Number(selectedInvoice.balanceAmount) > 0 && (
                <div className="flex justify-between font-medium text-danger">
                  <dt>Balance due</dt>
                  <dd className="tabular-nums">{formatCurrency(selectedInvoice.balanceAmount)}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </Modal>

      {/* Sales return */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title={`Return items · ${selectedInvoice?.invoiceNumber || ''}`}
        description="Returned goods are added back to stock and a credit note is issued."
        maxWidth="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsReturnModalOpen(false)} disabled={isReturning}>
              Cancel
            </Button>
            <Button onClick={handleProcessReturn} isLoading={isReturning} disabled={detailLoading}>
              Issue credit note
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {detailLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-card border border-border">
              {selectedInvoice?.lines?.map((line: any) => {
                const maxQty = Math.max(0, Number(line.quantity) - Number(line.returnedQuantity || 0));
                return (
                  <li key={line.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{line.itemName}</p>
                      <p className="text-xs text-fg-muted">
                        Sold {Number(line.quantity)} × {formatCurrency(line.unitPrice)}
                        {Number(line.returnedQuantity) > 0 && ` · already returned ${Number(line.returnedQuantity)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor={`inv-ret-${line.id}`} className="text-sm text-fg-muted">
                        Return
                      </label>
                      <NumberInput
                        id={`inv-ret-${line.id}`}
                        min={0}
                        max={maxQty}
                        value={returnQty[line.itemId] || 0}
                        onChange={(e) =>
                          setReturnQty({
                            ...returnQty,
                            [line.itemId]: Math.min(maxQty, Math.max(0, Number(e.target.value) || 0)),
                          })
                        }
                        className="h-9 w-20 rounded-control border border-border-strong bg-surface px-2 text-center text-sm font-semibold text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <Select label="Refund as" value={returnMode} onChange={(e) => setReturnMode(e.target.value as any)}>
            <option value="CASH">Cash refund from drawer</option>
            <option value="LEDGER_CREDIT">Credit to customer's udhaar account</option>
          </Select>
          <Input
            label="Reason"
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            placeholder="e.g. Damaged seal, wrong size"
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}
