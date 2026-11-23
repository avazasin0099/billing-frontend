import React, { useCallback, useEffect, useState } from 'react';
import { Wallet, Plus, Landmark, ReceiptIndianRupee as Receipt, BookOpen } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge, Input, Select } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table';
import { PageHeader, Tabs, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/page';
import { toast } from '@/components/ui/toast';
import { api, asList } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { localIsoDate } from '@/offline/pending-operations';
import { PaymentMethod } from '@/types';

type Tab = 'expenses' | 'cashbook' | 'bankbook';
const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank transfer',
  CHEQUE: 'Cheque',
};
const CATEGORIES = [
  'Tea & refreshments',
  'Electricity & utilities',
  'Shop rent',
  'Stationery & thermal rolls',
  'Staff advance',
  'Repairs & maintenance',
  'Transport & delivery',
  'Other',
];

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('expenses');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [cashBook, setCashBook] = useState<any>(null);
  const [bankBook, setBankBook] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [expenseDate, setExpenseDate] = useState(localIsoDate());
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [expData, cashData, bankData] = await Promise.all([
        api.get('/expenses', { limit: 100 }),
        api.get('/expenses/cash-book'),
        api.get('/expenses/bank-book'),
      ]);
      setExpenses(asList(expData, 'expenses'));
      setCashBook(cashData);
      setBankBook(bankData);
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setCategory(CATEGORIES[0]);
    setAmount('');
    setPaymentMethod('CASH');
    setExpenseDate(localIsoDate());
    setRecipientName('');
    setNotes('');
    setIsAddModalOpen(true);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/expenses', {
        category,
        amount: Number(amount),
        paymentMethod,
        expenseDate,
        recipientName: recipientName || undefined,
        notes: notes || undefined,
      });
      toast.success('Expense recorded', paymentMethod === 'CASH' ? 'Cash book updated.' : 'Bank book updated.');
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Expense not saved', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const bookTable = (book: any, withMethod: boolean) =>
    !book?.entries?.length ? (
      <EmptyState icon={BookOpen} title="No entries yet" />
    ) : (
      <Table>
        <Thead>
          <Tr>
            <Th>Date</Th>
            <Th>Description</Th>
            {withMethod && <Th>Method</Th>}
            <Th numeric>Money in</Th>
            <Th numeric>Money out</Th>
            {withMethod && <Th>Reference</Th>}
          </Tr>
        </Thead>
        <Tbody>
          {book.entries.map((e: any) => (
            <Tr key={e.id}>
              <Td>{formatDate(e.entryDate)}</Td>
              <Td className="text-fg">{e.description}</Td>
              {withMethod && (
                <Td>
                  <Badge variant="neutral">{METHOD_LABEL[e.paymentMethod] || e.paymentMethod}</Badge>
                </Td>
              )}
              <Td numeric className={Number(e.inflowAmount) > 0 ? 'text-success' : ''}>
                {Number(e.inflowAmount) > 0 ? formatCurrency(e.inflowAmount) : '—'}
              </Td>
              <Td numeric className={Number(e.outflowAmount) > 0 ? 'text-danger' : ''}>
                {Number(e.outflowAmount) > 0 ? formatCurrency(e.outflowAmount) : '—'}
              </Td>
              {withMethod && <Td className="font-mono text-xs">{e.transactionReference || '—'}</Td>}
            </Tr>
          ))}
        </Tbody>
      </Table>
    );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Expenses & cash book"
          description="Shop running costs, and every rupee in and out of the cash drawer and bank."
          actions={
            <Button onClick={openAdd}>
              <Plus /> Record expense
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Cash book balance"
            value={formatCurrency(cashBook?.netCashBalance || 0)}
            icon={Wallet}
            tone="success"
            isLoading={isLoading}
            footerLeft={`In ${formatCurrency(cashBook?.totalInflow || 0)} · Out ${formatCurrency(cashBook?.totalOutflow || 0)}`}
          />
          <StatCard
            label="Bank & digital balance"
            value={formatCurrency(bankBook?.netBankBalance || 0)}
            icon={Landmark}
            tone="info"
            isLoading={isLoading}
            footerLeft={`In ${formatCurrency(bankBook?.totalInflow || 0)} · Out ${formatCurrency(bankBook?.totalOutflow || 0)}`}
          />
        </div>

        <Tabs<Tab>
          label="Books"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { value: 'expenses', label: 'Expenses', icon: Receipt, count: expenses.length },
            { value: 'cashbook', label: 'Cash book', icon: Wallet },
            { value: 'bankbook', label: 'Bank book', icon: Landmark },
          ]}
        />

        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={loadData} />
        ) : activeTab === 'expenses' ? (
          expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses recorded"
              description="Record rent, electricity, tea and other shop costs to see your real profit."
              action={
                <Button variant="secondary" onClick={openAdd}>
                  <Plus /> Record expense
                </Button>
              }
            />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Category</Th>
                  <Th>Paid to</Th>
                  <Th>Method</Th>
                  <Th numeric>Amount</Th>
                  <Th>Note</Th>
                </Tr>
              </Thead>
              <Tbody>
                {expenses.map((exp) => (
                  <Tr key={exp.id}>
                    <Td>{formatDate(exp.expenseDate)}</Td>
                    <Td className="font-medium text-fg">{exp.category}</Td>
                    <Td>{exp.recipientName || '—'}</Td>
                    <Td>
                      <Badge variant="neutral">{METHOD_LABEL[exp.paymentMethod] || exp.paymentMethod}</Badge>
                    </Td>
                    <Td numeric className="font-medium text-fg">
                      {formatCurrency(exp.amount)}
                    </Td>
                    <Td className="max-w-xs truncate">{exp.notes || '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )
        ) : activeTab === 'cashbook' ? (
          bookTable(cashBook, false)
        ) : (
          bookTable(bankBook, true)
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Record expense" maxWidth="md">
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input label="Date" type="date" required value={expenseDate} max={localIsoDate()} onChange={(e) => setExpenseDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Select label="Paid by" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              {Object.entries(METHOD_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <Input label="Paid to" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Person or business" />
          <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Save expense
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
