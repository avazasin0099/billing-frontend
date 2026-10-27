
import React, { useState, useEffect } from 'react';
import { Building2, Plus, Eye, Phone } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td, Modal } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Supplier } from '@/types';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierLedger, setSupplierLedger] = useState<any[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  const fetchSuppliers = async () => {
    try {
      const data = await api.get('/parties/suppliers', { search });
      setSuppliers(data.suppliers || data || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/parties/suppliers', {
        name,
        companyName: companyName || undefined,
        phone,
        email: email || undefined,
        gstin: gstin || undefined,
        openingBalance: Number(openingBalance),
      });

      alert('Supplier account created!');
      setIsAddModalOpen(false);
      setName('');
      fetchSuppliers();
    } catch (err: any) {
      alert(`Failed to add supplier: ${err.message}`);
    }
  };

  const handleViewLedger = async (supp: Supplier) => {
    setSelectedSupplier(supp);
    try {
      const data = await api.get(`/parties/suppliers/${supp.id}/ledger`);
      setSupplierLedger(data.ledger || []);
      setIsLedgerModalOpen(true);
    } catch (err: any) {
      alert(`Failed to fetch supplier ledger: ${err.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Suppliers & Accounts Payable</h2>
            <p className="text-xs text-slate-400 mt-1">Manage vendor ledgers, procurement terms, and payments</p>
          </div>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Supplier
          </Button>
        </div>

        <Card>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search suppliers by name, company or GSTIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="secondary" onClick={fetchSuppliers}>
              Search
            </Button>
          </div>
        </Card>

        <Card>
          {suppliers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No suppliers registered yet.</div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Supplier / Contact</Th>
                  <Th>Company Name</Th>
                  <Th>Phone</Th>
                  <Th>GSTIN</Th>
                  <Th>Balance Payable (We Owe)</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {suppliers.map((s) => (
                  <Tr key={s.id}>
                    <Td className="font-semibold text-white">{s.name}</Td>
                    <Td>{s.companyName || '-'}</Td>
                    <Td>{s.phone || '-'}</Td>
                    <Td className="font-mono text-xs">{s.gstin || '-'}</Td>
                    <Td>
                      <span className={`font-bold ${Number(s.currentBalance) > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {formatCurrency(s.currentBalance)}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <Button variant="secondary" size="sm" onClick={() => handleViewLedger(s)}>
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View Ledger
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>

      {/* Add Supplier Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Supplier" maxWidth="md">
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          <Input label="Contact Person Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Shah" />
          <Input label="Company / Firm Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Shah Trading Co." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Mobile Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="022-24381122" />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="orders@shahtrading.com" />
          </div>
          <Input label="GSTIN" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="27AAACS1234K1ZZ" />
          <Input label="Opening Balance We Owe (₹)" type="number" value={openingBalance} onChange={(e) => setOpeningBalance(Number(e.target.value))} />
          <Button type="submit" variant="primary" size="md" className="w-full mt-4">
            Save Supplier
          </Button>
        </form>
      </Modal>

      {/* Ledger Modal */}
      <Modal isOpen={isLedgerModalOpen} onClose={() => setIsLedgerModalOpen(false)} title={`Supplier Ledger — ${selectedSupplier?.name}`} maxWidth="lg">
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-xs text-slate-500 block">Current Balance Payable:</span>
              <span className="text-xl font-bold text-rose-400">{formatCurrency(selectedSupplier?.currentBalance)}</span>
            </div>
            <div className="text-right text-xs text-slate-400">
              <div>{selectedSupplier?.companyName}</div>
              <div>GSTIN: {selectedSupplier?.gstin || 'None'}</div>
            </div>
          </div>

          <Table>
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th>Debit (Paid to Supplier)</Th>
                <Th>Credit (Purchased)</Th>
                <Th className="text-right">Balance Payable</Th>
              </Tr>
            </Thead>
            <Tbody>
              {supplierLedger.length === 0 ? (
                <Tr>
                  <Td colSpan={5} className="text-center py-6 text-slate-500">No ledger entries posted yet.</Td>
                </Tr>
              ) : (
                supplierLedger.map((row) => (
                  <Tr key={row.id}>
                    <Td className="text-xs">{formatDate(row.createdAt)}</Td>
                    <Td className="text-xs font-mono">{row.entryType}</Td>
                    <Td className="text-emerald-400">{Number(row.debitAmount) > 0 ? formatCurrency(row.debitAmount) : '-'}</Td>
                    <Td className="text-rose-400">{Number(row.creditAmount) > 0 ? formatCurrency(row.creditAmount) : '-'}</Td>
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
