import React, { useCallback, useEffect, useState } from 'react';
import { Plus, ShieldCheck, UserCog, ShoppingCart, Crown } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Badge, Input, Select } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table';
import { PageHeader, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/page';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { api } from '@/services/api-client';
import { formatDate } from '@/lib/utils';
import { useSession } from '@/lib/session';
import { UserRole } from '@/types';

const ROLES: { role: UserRole; label: string; Icon: React.ElementType; description: string }[] = [
  { role: 'OWNER', label: 'Owner', Icon: Crown, description: 'Full access, including profit reports, tax exports and staff management.' },
  { role: 'MANAGER', label: 'Manager', Icon: ShieldCheck, description: 'Products and prices, purchases, stock counts, returns, expenses and reports.' },
  { role: 'CASHIER', label: 'Cashier', Icon: ShoppingCart, description: 'Counter billing and payments only. Cannot change prices or see costs.' },
];
const roleVariant = (r: string) => (r === 'OWNER' ? 'primary' : r === 'MANAGER' ? 'info' : 'neutral') as 'primary' | 'info' | 'neutral';

export default function StaffPage() {
  const { isOwner } = useSession();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<UserRole>('CASHIER');

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setStaffList((await api.get('/staff')) || []);
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const openAdd = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setPin('');
    setRole('CASHIER');
    setIsAddModalOpen(true);
  };

  const pinError = pin && !/^\d{4,6}$/.test(pin) ? 'PIN must be 4–6 digits' : undefined;
  const passwordError = password && password.length < 6 ? 'Use at least 6 characters' : undefined;

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinError || passwordError) return;
    setIsSaving(true);
    try {
      await api.post('/staff', { name, email, phone: phone || undefined, password, pin: pin || undefined, role });
      toast.success(`${name} added`, pin ? 'They can now sign in with their PIN at this counter.' : undefined);
      setIsAddModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      toast.error('Could not add staff member', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Staff & roles"
          description="Who can use Bill Pro at this shop, and what each role can do."
          actions={
            isOwner && (
              <Button onClick={openAdd}>
                <Plus /> Add staff member
              </Button>
            )
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {ROLES.map(({ role: r, label, Icon, description }) => (
            <Card key={r} className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-2 text-fg-muted">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-fg">{label}</p>
                <p className="mt-0.5 text-sm text-fg-muted">{description}</p>
              </div>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} rows={4} />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={fetchStaff} />
        ) : staffList.length === 0 ? (
          <EmptyState icon={UserCog} title="No staff yet" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Role</Th>
                <Th>Last sign-in</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {staffList.map((m) => (
                <Tr key={m.membershipId}>
                  <Td className="font-medium text-fg">{m.user?.name}</Td>
                  <Td>{m.user?.email || '—'}</Td>
                  <Td>{m.user?.phone || '—'}</Td>
                  <Td>
                    <Badge variant={roleVariant(m.role)}>{ROLES.find((r) => r.role === m.role)?.label || m.role}</Badge>
                  </Td>
                  <Td>{m.user?.lastLoginAt ? formatDate(m.user.lastLoginAt) : 'Never'}</Td>
                  <Td>
                    <StatusBadge status={m.user?.isActive === false ? 'INACTIVE' : 'ACTIVE'} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add staff member" maxWidth="md">
        <form onSubmit={handleAddStaff} className="space-y-4">
          <Input label="Full name" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Login email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordError}
            />
            <Input
              label="Counter PIN"
              hint={pinError ? undefined : 'Optional, 4–6 digits for fast sign-in.'}
              error={pinError}
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            hint={ROLES.find((r) => r.role === role)?.description}
          >
            {ROLES.map((r) => (
              <option key={r.role} value={r.role}>
                {r.label}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Add staff member
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
