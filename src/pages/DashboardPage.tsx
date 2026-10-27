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
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui/card';
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
          api.get('/invoices', { limit: 5 }).catch(() => ({ invoices: [] })),
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 p-6 rounded-2xl border border-indigo-900/30">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Today&apos;s Store Overview</h2>
            <p className="text-xs text-slate-400 mt-1">Live point of sale and stock metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/billing">
              <Button variant="primary" size="md" className="shadow-lg shadow-indigo-600/30">
                <ShoppingCart className="w-4 h-4 mr-1.5" />
                Open POS Billing
              </Button>
            </Link>
            <Link to="/items">
              <Button variant="secondary" size="md">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Item
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Primary Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Sales */}
          <Card className="hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Sales</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(salesSummary?.totalBilled || 0)}
            </div>
            <div className="mt-2 flex items-center text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold mr-1.5">
                {salesSummary?.totalInvoices || 0} Bills
              </span>
              <span>posted</span>
            </div>
          </Card>

          {/* Customer Udhaar / Dues */}
          <Card className="hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Customer Udhaar</span>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-400">
              {formatCurrency(duesSummary?.totalOutstanding || 0)}
            </div>
            <div className="mt-2 flex items-center text-[11px] text-slate-400">
              <span className="text-slate-300 font-semibold mr-1.5">
                {duesSummary?.customerCount || 0} Accounts
              </span>
              <span>with pending balance</span>
            </div>
          </Card>

          {/* Total Stock Units */}
          <Card className="hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Stock Valuation</span>
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(inventorySummary?.totalPurchaseValuation || 0)}
            </div>
            <div className="mt-2 flex items-center text-[11px] text-slate-400">
              <span className="text-indigo-400 font-semibold mr-1.5">
                {inventorySummary?.totalStockUnits || 0} Units
              </span>
              <span>across catalog</span>
            </div>
          </Card>

          {/* Low Stock Alerts */}
          <Card className="hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Reorder Alerts</span>
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-400">
              {inventorySummary?.lowStockCount || 0} Items
            </div>
            <div className="mt-2 flex items-center text-[11px] text-slate-400">
              <Link to="/inventory" className="text-rose-400 hover:underline flex items-center">
                <span>View low stock</span>
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Payment Methods Collection Breakdown */}
        {salesSummary?.paymentMethodTotals && (
          <Card>
            <CardHeader>
              <CardTitle>Collections by Payment Method</CardTitle>
              <Badge variant="info">Manual Ledger Record</Badge>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(salesSummary.paymentMethodTotals).map(([method, amount]) => (
                <div key={method} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    {method.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {formatCurrency(amount as number)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Point-of-Sale Invoices</CardTitle>
            <Link to="/invoices">
              <Button variant="ghost" size="sm">
                View All Invoices
                <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>

          {recentInvoices.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No bills recorded yet. Tap &quot;Open POS Billing&quot; to issue your first bill.
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Invoice #</Th>
                  <Th>Date</Th>
                  <Th>Customer</Th>
                  <Th>Taxable</Th>
                  <Th>Total</Th>
                  <Th>Payment Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {recentInvoices.map((inv) => (
                  <Tr key={inv.id}>
                    <Td className="font-mono font-semibold text-white">{inv.invoiceNumber}</Td>
                    <Td>{formatDate(inv.invoiceDate)}</Td>
                    <Td>{inv.customer?.name || 'Walk-in Retail'}</Td>
                    <Td>{formatCurrency(inv.taxableAmount)}</Td>
                    <Td className="font-semibold text-white">{formatCurrency(inv.totalAmount)}</Td>
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
