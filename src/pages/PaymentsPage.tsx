
import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Filter, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Badge, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td, Modal } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Customer, PaymentMethod } from '@/types';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [methodFilter, setMethodFilter] = useState('');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amount, setAmount] = useState<number>(500);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      const [payList, custList] = await Promise.all([
        api.get('/payments', { paymentMethod: methodFilter || undefined }),
        api.get('/parties/customers'),
      ]);
      setPayments(payList.payments || payList || []);
      const custs = custList.customers || custList || [];
      setCustomers(custs);
      if (custs.length > 0 && !customerId) {
        setCustomerId(custs[0].id);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [methodFilter]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/payments', {
        customerId,
        paymentMethod,
        amount: Number(amount),
        transactionReference: reference || undefined,
        notes: notes || undefined,
      });

      alert('Manual payment recorded! Customer ledger updated.');
      setIsRecordModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Payment failed: ${err.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Recorded Customer Payments</h2>
            <p className="text-xs text-slate-400 mt-1">Manual payment entries for bills and debt settlement</p>
          </div>
          <Button variant="primary" onClick={() => setIsRecordModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Record Payment Received
          </Button>
        </div>

        {/* Notice on Manual Settlement */}
        <div className="bg-indigo-950/40 border border-indigo-900/40 p-3.5 rounded-xl flex items-center gap-3 text-xs text-indigo-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-indigo-400" />
          <span>
            <strong>Manual Entry Mode:</strong> Payments recorded here reflect external settlement (cash handed over counter, card swiped on terminal, or verified counter UPI scan). Bill Pro does not initiate online transactions or store banking credentials.
          </span>
        </div>

        {/* Filter Card */}
        <Card>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Filter by Method:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
        </Card>

        {/* Payments Table */}
        <Card>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No payment records found.</div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Date & Time</Th>
                  <Th>Customer</Th>
                  <Th>Payment Method</Th>
                  <Th>Amount Received</Th>
                  <Th>Reference #</Th>
                  <Th>Invoice #</Th>
                </Tr>
              </Thead>
              <Tbody>
                {payments.map((p) => (
                  <Tr key={p.id}>
                    <Td className="text-xs">{formatDate(p.paymentDate)}</Td>
                    <Td className="font-semibold text-white">{p.customer?.name || 'Walk-in Retail'}</Td>
                    <Td>
                      <Badge variant="info">{p.paymentMethod}</Badge>
                    </Td>
                    <Td className="font-bold text-emerald-400">{formatCurrency(p.amount)}</Td>
                    <Td className="font-mono text-xs">{p.transactionReference || '-'}</Td>
                    <Td className="font-mono text-xs text-indigo-400">{p.invoice?.invoiceNumber || '-'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>

      {/* Record Payment Modal */}
      <Modal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title="Record Customer Payment Received" maxWidth="md">
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Customer Account</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — Current Due: {formatCurrency(c.currentBalance)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            <Input
              label="Amount Received (₹)"
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>

          <Input
            label="Transaction Reference (e.g. UPI UTR / RRN / Auth Code)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. 628192839182"
          />

          <Input
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Counter payment for partial clearance"
          />

          <Button type="submit" variant="primary" size="md" className="w-full mt-4">
            Record Payment & Deduct Debt
          </Button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
