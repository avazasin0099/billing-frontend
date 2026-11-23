import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, TrendingUp, PieChart, IndianRupee, Banknote, Smartphone, CreditCard, Landmark, FileText, BookUser, CircleEllipsis, Info } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, Input } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { PageHeader, ErrorState } from '@/components/ui/page';
import { api } from '@/services/api-client';
import { formatCurrency } from '@/lib/utils';
import { localIsoDate } from '@/offline/pending-operations';
import { useSession } from '@/lib/session';

const TENDER: Record<string, { label: string; Icon: React.ElementType }> = {
  CASH: { label: 'Cash', Icon: Banknote },
  UPI: { label: 'UPI', Icon: Smartphone },
  CARD: { label: 'Card', Icon: CreditCard },
  BANK_TRANSFER: { label: 'Bank transfer', Icon: Landmark },
  CHEQUE: { label: 'Cheque', Icon: FileText },
  CREDIT: { label: 'Credit (udhaar)', Icon: BookUser },
  OTHER: { label: 'Other', Icon: CircleEllipsis },
};

export default function ReportsPage() {
  const { isOwner } = useSession();
  const [salesData, setSalesData] = useState<any>(null);
  const [pnlData, setPnlData] = useState<any>(null);
  const [startDate, setStartDate] = useState(localIsoDate());
  const [endDate, setEndDate] = useState(localIsoDate());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const rangeError = startDate && endDate && startDate > endDate ? 'Start date must be on or before the end date' : undefined;

  const fetchReports = useCallback(async () => {
    if (rangeError) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [sales, pnl] = await Promise.all([
        api.get('/reports/sales', { startDate, endDate }),
        // Profit & loss is owner-only on the server.
        isOwner ? api.get('/reports/profit', { startDate, endDate }) : Promise.resolve(null),
      ]);
      setSalesData(sales);
      setPnlData(pnl);
    } catch (err: any) {
      setSalesData(null);
      setPnlData(null);
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const collections = Object.entries((salesData?.paymentMethodTotals || {}) as Record<string, number>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Reports" description="Sales, collections and profit for any date range." />

        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchReports();
            }}
            className="grid grid-cols-1 items-start gap-3 sm:grid-cols-12"
          >
            <Input
              label="From"
              type="date"
              value={startDate}
              max={localIsoDate()}
              onChange={(e) => setStartDate(e.target.value)}
              containerClassName="sm:col-span-4"
              error={rangeError}
            />
            <Input label="To" type="date" value={endDate} max={localIsoDate()} onChange={(e) => setEndDate(e.target.value)} containerClassName="sm:col-span-4" />
            <div className="flex gap-2 sm:col-span-4 sm:pt-[1.625rem]">
              <Button type="submit" isLoading={isLoading} disabled={!!rangeError}>
                Show report
              </Button>
            </div>
          </form>
        </Card>

        {loadError ? (
          <Card>
            <ErrorState message={loadError} onRetry={fetchReports} />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Sales (incl. GST)"
                value={formatCurrency(salesData?.totalBilled || 0)}
                icon={IndianRupee}
                tone="primary"
                isLoading={isLoading}
                footerLeft={`${salesData?.totalInvoices || 0} bills`}
              />
              <StatCard
                label="GST collected"
                value={formatCurrency(salesData?.totalTax || 0)}
                icon={FileText}
                tone="info"
                isLoading={isLoading}
                footerLeft={`Taxable ${formatCurrency(salesData?.totalTaxable || 0)}`}
              />
              {isOwner && (
                <StatCard
                  label="Gross profit"
                  value={formatCurrency(pnlData?.grossProfit || 0)}
                  icon={TrendingUp}
                  tone="success"
                  isLoading={isLoading}
                  footerLeft={`${pnlData?.grossMarginPercent || 0}% margin · cost ${formatCurrency(pnlData?.costOfGoodsSold || 0)}`}
                />
              )}
              {isOwner && (
                <StatCard
                  label="Net profit"
                  value={formatCurrency(pnlData?.netProfit || 0)}
                  icon={PieChart}
                  tone={(pnlData?.netProfit || 0) < 0 ? 'danger' : 'success'}
                  isLoading={isLoading}
                  footerLeft={`After ${formatCurrency(pnlData?.totalOperatingExpenses || 0)} expenses`}
                />
              )}
              {!isOwner && (
                <Card className="flex items-start gap-3 sm:col-span-2">
                  <Info className="mt-0.5 size-5 shrink-0 text-info" aria-hidden="true" />
                  <p className="text-sm text-fg-muted">Profit and cost figures are visible to the shop owner only.</p>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="size-5 text-fg-subtle" aria-hidden="true" />
                    Collections by payment method
                  </CardTitle>
                  <p className="mt-0.5 text-sm text-fg-muted">Payments recorded on bills dated in this range.</p>
                </div>
              </CardHeader>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
