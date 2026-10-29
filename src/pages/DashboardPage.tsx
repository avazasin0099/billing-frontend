import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Receipt,
  Boxes,
  AlertTriangle,
  Users,
  ShoppingCart,
  Plus,
  ArrowUpRight,
  Clock,
  Printer,
  ChevronRight,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight as ArrowUpRightIcon,
  Sparkles,
  QrCode,
  RotateCcw,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';

export default function DashboardPage() {
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [inventorySummary, setInventorySummary] = useState<any>(null);
  const [duesSummary, setDuesSummary] = useState<any>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sales, inv, dues, invList] = await Promise.all([
          api.get('/reports/sales').catch(() => null),
          api.get('/inventory/summary').catch(() => null),
          api.get('/reports/customer-dues').catch(() => null),
          api.get('/invoices', { limit: 8 }).catch(() => ({ invoices: [] })),
        ]);

        if (sales) setSalesSummary(sales);
        if (inv) setInventorySummary(inv);
        if (dues) setDuesSummary(dues);
        if (invList && invList.invoices) setRecentInvoices(invList.invoices);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalBilled = salesSummary?.totalBilled || 0;
  const totalBills = salesSummary?.totalInvoices || 0;
  const avgBillValue = totalBills > 0 ? Math.round(totalBilled / totalBills) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Standard Page Header (consistent with every other tab) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-fg tracking-tight">Dashboard</h2>
            <p className="text-xs text-fg-subtle mt-1">
              Real-time snapshot of sales, collections, inventory valuations, and customer credit ledger.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/billing">
              <Button variant="primary" className="font-semibold">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Open POS Counter [F9]
              </Button>
            </Link>
            <Link to="/returns">
              <Button variant="secondary">
                <RotateCcw className="w-4 h-4 mr-2 text-brand" />
                Process Return
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Primary Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(totalBilled)}
            icon={TrendingUp}
            tone="emerald"
            footerLeft={<span className="text-fg-muted font-medium">{totalBills} bills issued</span>}
            footerRight={`Avg ${formatCurrency(avgBillValue)}`}
          />
          <StatCard
            label="Customer Udhaar"
            value={formatCurrency(duesSummary?.totalOutstanding || 0)}
            icon={Users}
            tone="amber"
            footerLeft={`${duesSummary?.customerCount || 0} accounts pending`}
            footerRight={<Link to="/customers" className="text-brand hover:underline">View ledger</Link>}
          />
          <StatCard
            label="Stock Valuation"
            value={formatCurrency(inventorySummary?.totalPurchaseValuation || 0)}
            icon={Boxes}
            tone="brand"
            footerLeft={`${inventorySummary?.totalStockUnits || 0} units in stock`}
            footerRight={<Link to="/inventory" className="text-brand hover:underline">Audits</Link>}
          />
          <StatCard
            label="Low Stock Alert"
            value={`${inventorySummary?.lowStockCount || 0} Items`}
            icon={AlertTriangle}
            tone="rose"
            footerLeft="Requires PO inward"
            footerRight={
              <Link to="/purchases" className="text-brand hover:underline inline-flex items-center">
                Order stock
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </Link>
            }
          />
        </div>

        {/* Collections Breakdown by Payment Tender */}
        {salesSummary?.paymentMethodTotals && (
          <Card>
            <CardHeader className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Collections by Tender Method</CardTitle>
                  <p className="text-xs text-fg-subtle mt-0.5">Automated cash and bank book reconciliation</p>
                </div>
                <Badge variant="info">Multi-Tender Reconciled</Badge>
              </div>
            </CardHeader>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(salesSummary.paymentMethodTotals).map(([method, amount]) => (
                <div key={method} className="bg-surface-2 p-3.5 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-fg-subtle tracking-wider">
                      {method.replace('_', ' ')}
                    </span>
                    {method === 'UPI' && <QrCode className="w-3.5 h-3.5 text-brand" />}
                    {method === 'CASH' && <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <span className="text-base font-bold text-fg">
                    {formatCurrency(amount as number)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent Counter Invoices Table */}
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Recent Counter Invoices</CardTitle>
                <p className="text-xs text-fg-subtle mt-0.5">Real-time point-of-sale transaction audit</p>
              </div>
              <Link to="/invoices">
                <Button variant="ghost" size="sm" className="text-xs text-brand hover:text-fg">
                  View Full Audit Log
                  <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          {isLoading ? (
            <div className="text-center py-12 text-fg-subtle text-xs">Loading sales records...</div>
          ) : recentInvoices.length === 0 ? (
            <div className="text-center py-12 text-fg-subtle text-xs">
              No bills recorded yet. Tap &quot;Open POS Counter&quot; to issue your first bill.
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Invoice #</Th>
                  <Th>Date & Time</Th>
                  <Th>Customer</Th>
                  <Th>Taxable (₹)</Th>
                  <Th>Total (₹)</Th>
                  <Th>Payment Status</Th>
                  <Th className="text-right">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {recentInvoices.map((inv) => (
                  <Tr key={inv.id}>
                    <Td className="font-mono font-semibold text-fg">{inv.invoiceNumber}</Td>
                    <Td>{formatDate(inv.invoiceDate)}</Td>
                    <Td>{inv.customer?.name || 'Walk-in Retail'}</Td>
                    <Td>{formatCurrency(inv.taxableAmount)}</Td>
                    <Td className="font-semibold text-fg">{formatCurrency(inv.totalAmount)}</Td>
                    <Td>
                      <Badge
                        variant={
                          inv.paymentStatus === 'PAID'
                            ? 'success'
                            : inv.paymentStatus === 'PARTIALLY_PAID'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {inv.paymentStatus}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <Link to="/invoices" className="text-xs text-brand hover:underline">
                        Details
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
