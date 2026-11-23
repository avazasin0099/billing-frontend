import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Boxes,
  TriangleAlert,
  Users,
  ShoppingCart,
  ArrowRight,
  RotateCcw,
  ReceiptIndianRupee as Receipt,
  Banknote,
  Smartphone,
  CreditCard,
  Landmark,
  FileText,
  BookUser,
  CircleEllipsis,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table';
import { PageHeader, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/page';
import { StatusBadge } from '@/components/ui/status-badge';
import { api, asList } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { localIsoDate } from '@/offline/pending-operations';
import { useSession } from '@/lib/session';
import { Invoice } from '@/types';

const TENDER: Record<string, { label: string; Icon: React.ElementType }> = {
  CASH: { label: 'Cash', Icon: Banknote },
  UPI: { label: 'UPI', Icon: Smartphone },
  CARD: { label: 'Card', Icon: CreditCard },
  BANK_TRANSFER: { label: 'Bank transfer', Icon: Landmark },
  CHEQUE: { label: 'Cheque', Icon: FileText },
  CREDIT: { label: 'Credit (udhaar)', Icon: BookUser },
  OTHER: { label: 'Other', Icon: CircleEllipsis },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isManager, user } = useSession();
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [inventorySummary, setInventorySummary] = useState<any>(null);
  const [duesSummary, setDuesSummary] = useState<any>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    const today = localIsoDate();
    try {
      const [sales, inv, dues, invList] = await Promise.all([
        // Sales / dues reports are manager-only on the server; cashiers don't request them.
        isManager ? api.get('/reports/sales', { startDate: today, endDate: today }) : Promise.resolve(null),
        api.get('/inventory/summary'),
        isManager ? api.get('/reports/customer-dues') : Promise.resolve(null),
        api.get('/invoices', { limit: 8 }),
      ]);
      setSalesSummary(sales);
      setInventorySummary(inv);
      setDuesSummary(dues);
      setRecentInvoices(asList(invList, 'invoices'));
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalBilled = salesSummary?.totalBilled || 0;
  const totalBills = salesSummary?.totalInvoices || 0;
  const avgBillValue = totalBills > 0 ? totalBilled / totalBills : 0;
  const collections = Object.entries((salesSummary?.paymentMethodTotals || {}) as Record<string, number>).filter(
    ([, amount]) => Number(amount) !== 0
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={user?.name ? `Welcome, ${user.name.split(' ')[0]}` : 'Dashboard'}
          description="Today's sales, stock and dues at a glance."
          actions={
            <>
              {isManager && (
                <Button variant="secondary" onClick={() => navigate('/returns')}>
                  <RotateCcw /> Sales return
                </Button>
              )}
              <Button onClick={() => navigate('/billing')}>
                <ShoppingCart /> Open POS
              </Button>
            </>
          }
        />

        {loadError ? (
          <Card>
            <ErrorState message={loadError} onRetry={fetchData} />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {isManager && (
                <StatCard
                  label="Today's sales"
                  value={formatCurrency(totalBilled)}
                  icon={TrendingUp}
                  tone="highlight"
                  isLoading={isLoading}
                  footerLeft={`${totalBills} ${totalBills === 1 ? 'bill' : 'bills'}`}
                  footerRight={totalBills > 0 ? `Avg ${formatCurrency(avgBillValue)}` : undefined}
                />
              )}
              {isManager && (
                <StatCard
                  label="Outstanding udhaar"
                  value={formatCurrency(duesSummary?.totalOutstanding || 0)}
                  icon={Users}
                  tone="warning"
                  isLoading={isLoading}
                  footerLeft={`${duesSummary?.customerCount || 0} ${(duesSummary?.customerCount || 0) === 1 ? 'customer' : 'customers'} with dues`}
                  footerRight={
                    <Link to="/customers" className="font-medium text-accent hover:underline">
                      View
                    </Link>
                  }
                />
              )}
              <StatCard
                label="Stock value (at cost)"
                value={formatCurrency(inventorySummary?.totalPurchaseValuation || 0)}
                icon={Boxes}
                tone="info"
                isLoading={isLoading}
                footerLeft={`${inventorySummary?.totalItemsCount || 0} products`}
                footerRight={
                  <Link to="/inventory" className="font-medium text-accent hover:underline">
                    View stock
                  </Link>
                }
              />
              <StatCard
                label="Low stock"
                value={`${inventorySummary?.lowStockCount || 0} products`}
                icon={TriangleAlert}
                tone={(inventorySummary?.lowStockCount || 0) > 0 ? 'danger' : 'neutral'}
                isLoading={isLoading}
                footerLeft="At or below reorder level"
                footerRight={
                  isManager ? (
                    <Link to="/purchases" className="font-medium text-accent hover:underline">
                      Restock
                    </Link>
                  ) : undefined
                }
              />
            </div>

            {isManager && collections.length > 0 && (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Today's collections</CardTitle>
                    <p className="mt-0.5 text-sm text-fg-muted">Money received on today's bills, by payment method.</p>
                  </div>
                </CardHeader>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {collections.map(([method, amount]) => {
                    const t = TENDER[method] || { label: method, Icon: CircleEllipsis };
                    return (
                      <li key={method} className="rounded-card border border-border bg-surface-2 p-3">
                        <div className="mb-1 flex items-center gap-1.5 text-sm text-fg-muted">
                          <t.Icon className="size-4" aria-hidden="true" />
                          {t.label}
                        </div>
                        <p className="text-base font-semibold text-fg tabular-nums">{formatCurrency(amount)}</p>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}

            <section aria-labelledby="recent-invoices">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="recent-invoices" className="text-base font-semibold text-fg">
                  Recent invoices
                </h2>
                <Link to="/invoices" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                  All invoices <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>

              {isLoading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : recentInvoices.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={Receipt}
                    title="No bills yet"
                    description="Bills you issue at the counter will appear here."
                    action={
                      <Button onClick={() => navigate('/billing')}>
                        <ShoppingCart /> Open POS
                      </Button>
                    }
                  />
                </Card>
              ) : (
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Invoice</Th>
                      <Th>Date</Th>
                      <Th>Customer</Th>
                      <Th numeric>Taxable</Th>
                      <Th numeric>Total</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {recentInvoices.map((inv) => (
                      <Tr key={inv.id}>
                        <Td className="font-mono font-medium text-fg">{inv.invoiceNumber}</Td>
                        <Td>{formatDate(inv.invoiceDate)}</Td>
                        <Td>{inv.customer?.name || 'Walk-in customer'}</Td>
                        <Td numeric>{formatCurrency(inv.taxableAmount)}</Td>
                        <Td numeric className="font-medium text-fg">
                          {formatCurrency(inv.totalAmount)}
                        </Td>
                        <Td>
                          <StatusBadge status={inv.paymentStatus} />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
