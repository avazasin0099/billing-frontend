
import React, { useState, useEffect } from 'react';
import { Users, Plus, Eye, Phone, FileText, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Badge, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td, Modal } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Customer } from '@/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerLedger, setCustomerLedger] = useState<any[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(5000);
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  const fetchCustomers = async () => {
    try {
      const data = await api.get('/parties/customers', { search });
      setCustomers(data.customers || data || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/parties/customers', {
        name,
        phone,
        email: email || undefined,
        gstin: gstin || undefined,
        creditLimit: Number(creditLimit),
        openingBalance: Number(openingBalance),
      });

      alert('Customer account created!');
      setIsAddModalOpen(false);
      setName('');
      setPhone('');
      fetchCustomers();
    } catch (err: any) {
      alert(`Failed to add customer: ${err.message}`);
    }
  };

  const handleViewLedger = async (cust: Customer) => {
    setSelectedCustomer(cust);
    try {
      const data = await api.get(`/parties/customers/${cust.id}/ledger`);
      setCustomerLedger(data.ledger || []);
      setIsLedgerModalOpen(true);
    } catch (err: any) {
      alert(`Failed to fetch ledger: ${err.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Customers & Udhaar Ledger</h2>
            <p className="text-xs text-slate-400 mt-1">Manage accounts receivable, credit limits, and ledger statements</p>
          </div>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Customer
          </Button>
        </div>

        <Card>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search customers by name, phone or GSTIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="secondary" onClick={fetchCustomers}>
              Search
            </Button>
          </div>
        </Card>

        <Card>
          {customers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No customers registered yet.</div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Customer Name</Th>
                  <Th>Mobile Phone</Th>
                  <Th>GSTIN (B2B)</Th>
                  <Th>Credit Limit</Th>
                  <Th>Current Balance (Udhaar)</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {customers.map((c) => (
                  <Tr key={c.id}>
                    <Td className="font-semibold text-white">{c.name}</Td>
                    <Td>{c.phone || '-'}</Td>
                    <Td className="font-mono text-xs">{c.gstin || '-'}</Td>
                    <Td>{formatCurrency(c.creditLimit)}</Td>
                    <Td>
                      <span
                        className={`font-bold ${
                          Number(c.currentBalance) > 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {formatCurrency(c.currentBalance)}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <Button variant="secondary" size="sm" onClick={() => handleViewLedger(c)}>
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View Statement
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>

      {/* Add Customer Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Customer Account" maxWidth="md">
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <Input label="Full Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Suresh Sharma" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Mobile Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9820011223" />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="suresh@gmail.com" />
          </div>
          <Input label="GSTIN (for B2B registered party)" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="27AABCM8891P1ZO" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Credit Limit (₹)" type="number" value={creditLimit} onChange={(e) => setCreditLimit(Number(e.target.value))} />
            <Input label="Opening Udhaar Balance (₹)" type="number" value={openingBalance} onChange={(e) => setOpeningBalance(Number(e.target.value))} />
          </div>
          <Button type="submit" variant="primary" size="md" className="w-full mt-4">
            Save Customer
          </Button>
        </form>
      </Modal>

      {/* Ledger Statement Modal */}
      <Modal isOpen={isLedgerModalOpen} onClose={() => setIsLedgerModalOpen(false)} title={`Statement of Account — ${selectedCustomer?.name}`} maxWidth="lg">
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-xs text-slate-500 block">Current Outstanding Balance:</span>
              <span className={`text-xl font-bold ${Number(selectedCustomer?.currentBalance) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {formatCurrency(selectedCustomer?.currentBalance)}
              </span>
            </div>
            <div className="text-right text-xs text-slate-400">
              <div>Phone: {selectedCustomer?.phone || '-'}</div>
              <div>GSTIN: {selectedCustomer?.gstin || 'None'}</div>
            </div>
          </div>

          <Table>
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th>Debit (Bill)</Th>
                <Th>Credit (Paid)</Th>
                <Th className="text-right">Running Balance</Th>
              </Tr>
            </Thead>
            <Tbody>
              {customerLedger.length === 0 ? (
                <Tr>
                  <Td colSpan={5} className="text-center py-6 text-slate-500">No ledger transactions posted yet.</Td>
                </Tr>
              ) : (
                customerLedger.map((row) => (
                  <Tr key={row.id}>
                    <Td className="text-xs">{formatDate(row.createdAt)}</Td>
                    <Td className="text-xs font-mono">{row.entryType}</Td>
                    <Td className="text-amber-400">{Number(row.debitAmount) > 0 ? formatCurrency(row.debitAmount) : '-'}</Td>
                    <Td className="text-emerald-400">{Number(row.creditAmount) > 0 ? formatCurrency(row.creditAmount) : '-'}</Td>
                    <Td className="text-right font-bold text-white">{formatCurrency(row.runningBalance)}</Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
