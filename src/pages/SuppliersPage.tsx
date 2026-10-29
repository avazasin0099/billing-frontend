
import React, { useState, useEffect } from 'react';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td, Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const resetForm = () => {
    setName('');
    setCompanyName('');
    setPhone('');
    setEmail('');
    setGstin('');
    setOpeningBalance(0);
  };

  const openAdd = () => {
    resetForm();
    setEditingId(null);
    setIsAddModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setName(s.name || '');
    setCompanyName((s as any).companyName || '');
    setPhone(s.phone || '');
    setEmail((s as any).email || '');
    setGstin(s.gstin || '');
    setIsAddModalOpen(true);
  };

  const handleSubmitSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingId) {
        await api.patch(`/parties/suppliers/${editingId}`, {
          name,
          companyName: companyName || undefined,
          phone,
          email: email || undefined,
          gstin: gstin || undefined,
        });
      } else {
        await api.post('/parties/suppliers', {
          name,
          companyName: companyName || undefined,
          phone,
          email: email || undefined,
          gstin: gstin || undefined,
          openingBalance: Number(openingBalance),
        });
      }
      setIsAddModalOpen(false);
      setEditingId(null);
      resetForm();
      fetchSuppliers();
    } catch (err: any) {
      alert(`Failed to save supplier: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await api.delete(`/parties/suppliers/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchSuppliers();
    } catch (err: any) {
      alert(`Failed to remove supplier: ${err.message}`);
    } finally {
      setIsSaving(false);
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
      <div className="flex flex-col h-full min-h-0 gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-fg tracking-tight">Suppliers & Accounts Payable</h2>
            <p className="text-xs text-fg-subtle mt-1">Manage vendor ledgers, procurement terms, and payments</p>
          </div>
          <Button variant="primary" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Supplier
          </Button>
        </div>

        <Card className="shrink-0">
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

        <div className="flex-1 min-h-0">
          {suppliers.length === 0 ? (
            <Card className="h-full flex items-center justify-center text-fg-subtle text-sm">No suppliers registered yet.</Card>
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
                    <Td className="font-semibold text-fg">{s.name}</Td>
                    <Td>{s.companyName || '-'}</Td>
                    <Td>{s.phone || '-'}</Td>
                    <Td className="font-mono text-xs">{s.gstin || '-'}</Td>
                    <Td>
                      <span className={`font-bold ${Number(s.currentBalance) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-fg-subtle'}`}>
                        {formatCurrency(s.currentBalance)}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="secondary" size="sm" onClick={() => handleViewLedger(s)}>
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Ledger
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)} title="Edit supplier" className="hover:text-brand">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(s)} title="Remove supplier" className="hover:text-rose-600 dark:hover:text-rose-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingId ? 'Edit Supplier' : 'Add Supplier'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitSupplier} className="space-y-4">
          <Input label="Contact Person Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Shah" />
          <Input label="Company / Firm Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Shah Trading Co." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Mobile Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="022-24381122" />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="orders@shahtrading.com" />
          </div>
          <Input label="GSTIN" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="27AAACS1234K1ZZ" />
          {!editingId && (
            <Input label="Opening Balance We Owe (₹)" type="number" value={openingBalance} onChange={(e) => setOpeningBalance(Number(e.target.value))} />
          )}
          <Button type="submit" variant="primary" size="md" className="w-full mt-4" isLoading={isSaving}>
            {editingId ? 'Save Changes' : 'Save Supplier'}
          </Button>
        </form>
      </Modal>

      {/* Remove Supplier Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteSupplier}
        isLoading={isSaving}
        title="Remove Supplier"
        confirmLabel="Remove"
        message={
          <>
            <strong className="text-fg">{deleteTarget?.name}</strong> will be removed from your active
            supplier list. Ledger history is preserved. Suppliers with an outstanding payable can’t be
            removed until settled.
          </>
        }
      />

      {/* Ledger Modal */}
      <Modal isOpen={isLedgerModalOpen} onClose={() => setIsLedgerModalOpen(false)} title={`Supplier Ledger — ${selectedSupplier?.name}`} maxWidth="lg">
        <div className="space-y-4">
          <div className="bg-surface-2 p-4 rounded-xl border border-border flex justify-between items-center">
            <div>
              <span className="text-xs text-fg-subtle block">Current Balance Payable:</span>
              <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(selectedSupplier?.currentBalance)}</span>
            </div>
            <div className="text-right text-xs text-fg-subtle">
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
                  <Td colSpan={5} className="text-center py-6 text-fg-subtle">No ledger entries posted yet.</Td>
                </Tr>
              ) : (
                supplierLedger.map((row) => (
                  <Tr key={row.id}>
                    <Td className="text-xs">{formatDate(row.createdAt)}</Td>
                    <Td className="text-xs font-mono">{row.entryType}</Td>
                    <Td className="text-emerald-600 dark:text-emerald-400">{Number(row.debitAmount) > 0 ? formatCurrency(row.debitAmount) : '-'}</Td>
                    <Td className="text-rose-600 dark:text-rose-400">{Number(row.creditAmount) > 0 ? formatCurrency(row.creditAmount) : '-'}</Td>
                    <Td className="text-right font-bold text-fg">{formatCurrency(row.runningBalance)}</Td>
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
