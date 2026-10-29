
import React, { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowDownRight, ArrowUpRight, DollarSign, Building } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Badge, Input } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td, Modal } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PaymentMethod } from '@/types';

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'cashbook' | 'bankbook'>('expenses');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [cashBook, setCashBook] = useState<any>(null);
  const [bankBook, setBankBook] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [category, setCategory] = useState('Tea & Refreshments');
  const [amount, setAmount] = useState<number>(100);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      const [expData, cashData, bankData] = await Promise.all([
        api.get('/expenses').catch(() => ({ expenses: [] })),
        api.get('/expenses/cash-book').catch(() => null),
        api.get('/expenses/bank-book').catch(() => null),
      ]);

      setExpenses(expData.expenses || expData || []);
      if (cashData) setCashBook(cashData);
      if (bankData) setBankBook(bankData);
    } catch (err) {
      console.error('Failed to load expenses/books:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/expenses', {
        category,
        amount: Number(amount),
        paymentMethod,
        recipientName: recipientName || undefined,
        notes: notes || undefined,
      });

      alert('Expense recorded! Cash/Bank book updated.');
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Failed to save expense: ${err.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-fg tracking-tight">Expenses, Cash Book & Bank Book</h2>
            <p className="text-xs text-fg-subtle mt-1">Operational overheads and physical drawer cash reconciliation</p>
          </div>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Record Expense
          </Button>
        </div>

        {/* 2 Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label="Physical Cash Drawer Balance"
            value={formatCurrency(cashBook?.netCashBalance || 0)}
            icon={Wallet}
            tone="emerald"
            footerLeft={`Inflows ${formatCurrency(cashBook?.totalInflow || 0)} • Outflows ${formatCurrency(cashBook?.totalOutflow || 0)}`}
          />
          <StatCard
            label="Bank & Digital Inflows Balance"
            value={formatCurrency(bankBook?.netBankBalance || 0)}
            icon={Building}
            tone="brand"
            footerLeft="UPI, Card & Bank settlements"
          />
        </div>

        {/* Tab Selection */}
        <div className="flex bg-surface border border-border p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'expenses' ? 'bg-emerald-600 text-white shadow-md' : 'text-fg-subtle hover:text-fg'
            }`}
          >
            Expenses Log
          </button>
          <button
            onClick={() => setActiveTab('cashbook')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'cashbook' ? 'bg-emerald-600 text-white shadow-md' : 'text-fg-subtle hover:text-fg'
            }`}
          >
            Cash Book Entries
          </button>
          <button
            onClick={() => setActiveTab('bankbook')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'bankbook' ? 'bg-emerald-600 text-white shadow-md' : 'text-fg-subtle hover:text-fg'
            }`}
          >
            Bank Book Entries
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'expenses' && (
          <Card>
            {expenses.length === 0 ? (
              <div className="text-center py-12 text-fg-subtle text-sm">No operational expenses recorded.</div>
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Category</Th>
                    <Th>Paid To</Th>
                    <Th>Method</Th>
                    <Th>Amount</Th>
                    <Th>Notes</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {expenses.map((exp) => (
                    <Tr key={exp.id}>
                      <Td>{formatDate(exp.expenseDate)}</Td>
                      <Td className="font-semibold text-fg">{exp.category}</Td>
                      <Td>{exp.recipientName || '-'}</Td>
                      <Td>
                        <Badge variant="neutral">{exp.paymentMethod}</Badge>
                      </Td>
                      <Td className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(exp.amount)}</Td>
                      <Td className="text-xs text-fg-subtle">{exp.notes || '-'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Card>
        )}

        {activeTab === 'cashbook' && (
          <Card>
            <Table>
              <Thead>
                <Tr>
                  <Th>Timestamp</Th>
                  <Th>Description</Th>
                  <Th>Inflow (+)</Th>
                  <Th>Outflow (-)</Th>
                  <Th>Type</Th>
                </Tr>
              </Thead>
              <Tbody>
                {cashBook?.entries?.map((e: any) => (
                  <Tr key={e.id}>
                    <Td className="text-xs">{formatDate(e.entryDate)}</Td>
                    <Td className="font-medium text-fg">{e.description}</Td>
                    <Td className="text-emerald-600 dark:text-emerald-400 font-bold">{Number(e.inflowAmount) > 0 ? formatCurrency(e.inflowAmount) : '-'}</Td>
                    <Td className="text-rose-600 dark:text-rose-400 font-bold">{Number(e.outflowAmount) > 0 ? formatCurrency(e.outflowAmount) : '-'}</Td>
                    <Td className="text-xs font-mono text-fg-subtle">{e.referenceType}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        )}

        {activeTab === 'bankbook' && (
          <Card>
            <Table>
              <Thead>
                <Tr>
                  <Th>Timestamp</Th>
                  <Th>Description</Th>
                  <Th>Channel</Th>
                  <Th>Inflow (+)</Th>
                  <Th>Outflow (-)</Th>
                  <Th>Reference</Th>
                </Tr>
              </Thead>
              <Tbody>
                {bankBook?.entries?.map((e: any) => (
                  <Tr key={e.id}>
                    <Td className="text-xs">{formatDate(e.entryDate)}</Td>
                    <Td className="font-medium text-fg">{e.description}</Td>
                    <Td>
                      <Badge variant="info">{e.paymentMethod}</Badge>
                    </Td>
                    <Td className="text-emerald-600 dark:text-emerald-400 font-bold">{Number(e.inflowAmount) > 0 ? formatCurrency(e.inflowAmount) : '-'}</Td>
                    <Td className="text-rose-600 dark:text-rose-400 font-bold">{Number(e.outflowAmount) > 0 ? formatCurrency(e.outflowAmount) : '-'}</Td>
                    <Td className="text-xs font-mono text-fg-subtle">{e.transactionReference || '-'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        )}
      </div>

      {/* Record Expense Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Record Operational Expense" maxWidth="md">
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Expense Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-fg"
            >
              <option value="Tea & Refreshments">Tea & Refreshments / Pantry</option>
              <option value="Electricity & Utilities">Electricity & Utilities</option>
              <option value="Shop Rent">Shop Rent</option>
              <option value="Stationery & Rolls">Stationery & Thermal Rolls</option>
              <option value="Staff Daily Advance">Staff Daily Advance</option>
              <option value="Repairs & Maintenance">Repairs & Maintenance</option>
              <option value="Other Overhead">Other Overhead</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount (₹)"
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-fg"
              >
                <option value="CASH">Cash Drawer</option>
                <option value="UPI">Counter UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
          </div>

          <Input
            label="Paid To (Recipient)"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="e.g. Ramesh Tea Stall"
          />

          <Input
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Daily tea & snacks for staff"
          />

          <Button type="submit" variant="primary" size="md" className="w-full mt-4">
            Post Expense & Update Drawer
          </Button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
