
import React, { useState, useEffect } from 'react';
import { UserCog, Plus, ShieldCheck, KeyRound, Lock, User, Mail, Phone } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, Badge, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td, Modal } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatDate } from '@/lib/utils';
import { UserRole } from '@/types';

export default function StaffPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<UserRole>('CASHIER');

  const fetchStaff = async () => {
    try {
      const data = await api.get('/staff');
      setStaffList(data || []);
    } catch (err) {
      console.error('Failed to load staff:', err);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/staff', {
        name,
        email,
        phone,
        password,
        pin: pin || undefined,
        role,
      });

      alert('Staff member registered!');
      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setPin('');
      fetchStaff();
    } catch (err: any) {
      alert(`Failed to add staff: ${err.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-fg tracking-tight">Staff & Counter Permissions</h2>
            <p className="text-xs text-fg-subtle mt-1">Manage cashier access, manager overrides, and counter PIN logins</p>
          </div>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Staff Member
          </Button>
        </div>

        {/* Roles Permission Reference Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-brand/20 bg-brand/5 dark:bg-emerald-950/10">
            <h4 className="text-sm font-bold text-brand flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-4 h-4" />
              Owner
            </h4>
            <p className="text-xs text-fg-subtle leading-relaxed">
              Full unconstrained access to financial reports, P&L, supplier purchase costs, tax exports, and staff management.
            </p>
          </Card>

          <Card className="border-border">
            <h4 className="text-sm font-bold text-fg flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Manager
            </h4>
            <p className="text-xs text-fg-subtle leading-relaxed">
              Can add products, update prices, record inward stock purchases, approve stock-takes, and issue sales returns.
            </p>
          </Card>

          <Card className="border-border">
            <h4 className="text-sm font-bold text-fg flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-4 h-4 text-fg-subtle" />
              Cashier
            </h4>
            <p className="text-xs text-fg-subtle leading-relaxed">
              High-speed counter billing only. Cannot view shop purchase costs, overall profit margins, or alter master pricing.
            </p>
          </Card>
        </div>

        {/* Staff Table */}
        <Card>
          <Table>
            <Thead>
              <Tr>
                <Th>Staff Member</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Assigned Role</Th>
                <Th>Last Active Shift</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {staffList.map((m) => (
                <Tr key={m.membershipId}>
                  <Td className="font-semibold text-fg">{m.user?.name}</Td>
                  <Td>{m.user?.email}</Td>
                  <Td>{m.user?.phone || '-'}</Td>
                  <Td>
                    <Badge variant={m.role === 'OWNER' ? 'info' : m.role === 'MANAGER' ? 'success' : 'neutral'}>
                      {m.role}
                    </Badge>
                  </Td>
                  <Td className="text-xs">{m.user?.lastLoginAt ? formatDate(m.user.lastLoginAt) : 'Never'}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Active
                    </span>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      </div>

      {/* Add Staff Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Staff Member" maxWidth="md">
        <form onSubmit={handleAddStaff} className="space-y-4">
          <Input label="Staff Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" />
          <Input label="Login Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rahul@shop.com" />
          <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9820011223" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <Input label="Fast PIN (4-6 digits)" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="1234" />
          </div>

          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Role & Permissions</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-fg"
            >
              <option value="CASHIER">Cashier (Point of Sale counter billing only)</option>
              <option value="MANAGER">Manager (POS + Stock inward + Inventory count adjustments)</option>
              <option value="OWNER">Owner (Unrestricted administrator access)</option>
            </select>
          </div>

          <Button type="submit" variant="primary" size="md" className="w-full mt-4">
            Create Staff Account
          </Button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
