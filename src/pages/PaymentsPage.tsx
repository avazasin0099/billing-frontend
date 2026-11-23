import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Plus, Info } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge, Input, Select } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table';
import { PageHeader, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/page';
import { toast } from '@/components/ui/toast';
import { api, asList } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Customer, PaymentMethod } from '@/types';

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank transfer',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [methodFilter, setMethodFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state — no pre-selected customer and no made-up default amount.
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amount, setAmount] = useState<number | ''>('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [payList, custList] = await Promise.all([
        api.get('/payments', { paymentMethod: methodFilter || undefined, limit: 100 }),
        api.get('/parties/customers', { limit: 100 }),
      ]);
      setPayments(asList(payList, 'payments'));
      setCustomers(asList(custList, 'customers'));
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [methodFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openRecord = () => {
    setCustomerId('');
    setPaymentMethod('CASH');
    setAmount('');
    setReference('');
    setNotes('');
    setIsRecordModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast.error('Select a customer');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/payments', {
        customerId,
        paymentMethod,
        amount: Number(amount),
        transactionReference: reference || undefined,
        notes: notes || undefined,
      });
      toast.success('Payment recorded', 'The customer ledger has been updated.');
      setIsRecordModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Payment not recorded', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-5">
        <PageHeader
          title="Payments"
          description="Money received from customers against bills and udhaar."
          actions={
            <Button onClick={openRecord}>
              <Plus /> Record payment
            </Button>
          }
        />

        <div className="flex shrink-0 items-end gap-3">
          <Select
            label="Payment method"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            containerClassName="w-full max-w-xs"
          >
            <option value="">All methods</option>
            {Object.entries(METHOD_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-h-0 flex-1">
          {isLoading ? (
            <TableSkeleton cols={6} />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={loadData} />
          ) : payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payments yet"
              description="Payments taken at the POS and udhaar settlements will appear here."
              action={
                <Button variant="secondary" onClick={openRecord}>
                  <Plus /> Record payment
                </Button>
              }
            />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Customer</Th>
                  <Th>Method</Th>
                  <Th numeric>Amount</Th>
                  <Th>Reference</Th>
                  <Th>Invoice</Th>
                </Tr>
              </Thead>
              <Tbody>
                {payments.map((p) => (
                  <Tr key={p.id}>
                    <Td>{formatDate(p.paymentDate)}</Td>
                    <Td className="font-medium text-fg">{p.customer?.name || 'Walk-in customer'}</Td>
                    <Td>
                      <Badge variant="neutral">{METHOD_LABEL[p.paymentMethod] || p.paymentMethod}</Badge>
                    </Td>
                    <Td numeric className={Number(p.amount) < 0 ? 'font-medium text-danger' : 'font-medium text-fg'}>
                      {formatCurrency(p.amount)}
                    </Td>
                    <Td className="font-mono text-xs">{p.transactionReference || '—'}</Td>
                    <Td className="font-mono text-xs">{p.invoice?.invoiceNumber || '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      </div>

      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record payment received"
        description="For money already received (cash at the counter, card terminal, or a verified UPI/bank transfer)."
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Select
            label="Customer"
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            hint={selectedCustomer ? `Current due: ${formatCurrency(selectedCustomer.currentBalance)}` : undefined}
          >
            <option value="" disabled>
              Select a customer
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.phone ? ` · ${c.phone}` : ''}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              {Object.entries(METHOD_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <Input
              label="Amount (₹)"
              type="number"
              step="0.01"
              min={0.01}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
            />
          </div>

          <Input
            label="Reference number"
            hint="UPI UTR, card approval code, or cheque number."
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="flex items-start gap-2 rounded-card border border-info/30 bg-info-soft p-3 text-sm text-fg">
            <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
            Bill Pro only records payments — it does not collect money or store bank details.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsRecordModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Record payment
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
