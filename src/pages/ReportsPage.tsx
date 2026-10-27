
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, Download, DollarSign, PieChart, Printer } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, Badge, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ReportsPage() {
  const [salesData, setSalesData] = useState<any>(null);
  const [pnlData, setPnlData] = useState<any>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState(false);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const [sales, pnl] = await Promise.all([
        api.get('/reports/sales', { startDate, endDate }).catch(() => null),
        api.get('/reports/profit', { startDate, endDate }).catch(() => null),
      ]);

      if (sales) setSalesData(sales);
      if (pnl) setPnlData(pnl);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handlePrintZReport = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Business Reports & P&L Analysis</h2>
            <p className="text-xs text-slate-400 mt-1">Reconciled financial aggregates, gross margin, and day-end closing</p>
          </div>
          <Button variant="secondary" onClick={handlePrintZReport}>
            <Printer className="w-4 h-4 mr-1.5" />
            Print Day-End Z-Report
          </Button>
        </div>

        {/* Date Filter Bar */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-5">
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button variant="primary" className="w-full" onClick={fetchReports} isLoading={isLoading}>
                Update Reports
              </Button>
            </div>
          </div>
        </Card>

        {/* Profit & Loss Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="text-xs text-slate-400 uppercase font-medium">Billed Revenue (Gross)</div>
            <div className="text-2xl font-bold text-white mt-1">
              {formatCurrency(salesData?.totalBilled || 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">{salesData?.totalInvoices || 0} Invoices generated</div>
          </Card>

          <Card>
            <div className="text-xs text-slate-400 uppercase font-medium">Cost of Goods Sold (COGS)</div>
            <div className="text-2xl font-bold text-slate-300 mt-1">
              {formatCurrency(pnlData?.costOfGoodsSold || 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Procurement purchase cost</div>
          </Card>

          <Card>
            <div className="text-xs text-slate-400 uppercase font-medium">Gross Profit Margin</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {formatCurrency(pnlData?.grossProfit || 0)}
            </div>
            <div className="text-xs text-emerald-500/80 mt-1 font-semibold">
              {pnlData?.grossMarginPercent || 0}% Gross Margin
            </div>
          </Card>

          <Card>
            <div className="text-xs text-slate-400 uppercase font-medium">Net Operating Profit</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1">
              {formatCurrency(pnlData?.netProfit || 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              After {formatCurrency(pnlData?.totalOperatingExpenses || 0)} expenses
            </div>
          </Card>
        </div>

        {/* Payment Methods Collection Breakdown */}
        {salesData?.paymentMethodTotals && (
          <Card>
            <CardHeader>
              <CardTitle>Collections by Payment Channel</CardTitle>
              <Badge variant="neutral">Verified Counter Ledger</Badge>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(salesData.paymentMethodTotals).map(([method, amount]) => (
                <div key={method} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    {method.replace('_', ' ')}
                  </span>
                  <span className="text-base font-bold text-white">
                    {formatCurrency(amount as number)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
