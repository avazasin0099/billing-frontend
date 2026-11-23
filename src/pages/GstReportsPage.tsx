import React, { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet, Download, Landmark, Building2, ReceiptIndianRupee as Receipt, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, Input } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table';
import { PageHeader, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/page';
import { api } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { localIsoDate } from '@/offline/pending-operations';

/** First and last calendar day (YYYY-MM-DD) of a YYYY-MM month. */
const monthRange = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { startDate: `${ym}-01`, endDate: `${ym}-${String(last).padStart(2, '0')}` };
};

export default function GstReportsPage() {
  const [gstData, setGstData] = useState<any>(null);
  // Default to the current month (was hard-coded to 2026-10 and never sent to the API).
  const [selectedMonth, setSelectedMonth] = useState(localIsoDate().slice(0, 7));
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchGst = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setGstData(await api.get('/reports/gst', monthRange(selectedMonth)));
    } catch (err: any) {
      setGstData(null);
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchGst();
  }, [fetchGst]);

  const handleDownloadJson = () => {
    if (!gstData) return;
    const blob = new Blob([JSON.stringify({ period: selectedMonth, ...gstData }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BillPro-GST-summary-${selectedMonth}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const s = gstData?.summary;
  const rates = Object.entries((gstData?.rateWiseBreakdown || {}) as Record<string, any>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="GST reports"
          description="Monthly outward supplies and tax liability, for your CA or GST filing."
          actions={
            <Button variant="secondary" onClick={handleDownloadJson} disabled={!gstData || isLoading}>
              <Download /> Download summary (JSON)
            </Button>
          }
        />

        <Card>
          <Input
            label="Return period"
            type="month"
            value={selectedMonth}
            max={localIsoDate().slice(0, 7)}
            onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
            containerClassName="max-w-xs"
          />
        </Card>

        {loadError ? (
          <Card>
            <ErrorState message={loadError} onRetry={fetchGst} />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Taxable value"
                value={formatCurrency(s?.totalTaxableValue || 0)}
                icon={FileSpreadsheet}
                tone="primary"
                isLoading={isLoading}
                footerLeft={`${s?.totalInvoices || 0} invoices · ${s?.b2bCount || 0} B2B · ${s?.b2cCount || 0} B2C`}
              />
              <StatCard
                label="CGST + SGST"
                value={formatCurrency((s?.totalCgst || 0) + (s?.totalSgst || 0))}
                icon={Landmark}
                tone="info"
                isLoading={isLoading}
                footerLeft={`CGST ${formatCurrency(s?.totalCgst || 0)} · SGST ${formatCurrency(s?.totalSgst || 0)}`}
              />
              <StatCard
                label="IGST"
                value={formatCurrency(s?.totalIgst || 0)}
                icon={Building2}
                tone="info"
                isLoading={isLoading}
                footerLeft="Inter-state supplies"
              />
              <StatCard
                label="Total tax liability"
                value={formatCurrency(s?.totalTaxLiability || 0)}
                icon={Receipt}
                tone="warning"
                isLoading={isLoading}
                footerLeft={`Includes cess ${formatCurrency(s?.totalCess || 0)}`}
              />
            </div>

            <Card padded={false}>
              <div className="border-b border-border px-5 py-4">
                <CardTitle>Rate-wise summary</CardTitle>
              </div>
              <div className="p-4">
                {isLoading ? (
                  <TableSkeleton rows={4} cols={7} />
                ) : rates.length === 0 ? (
                  <EmptyState icon={FileText} title="No sales in this period" />
                ) : (
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>GST rate</Th>
                        <Th numeric>Taxable value</Th>
                        <Th numeric>CGST</Th>
                        <Th numeric>SGST</Th>
                        <Th numeric>IGST</Th>
                        <Th numeric>Cess</Th>
                        <Th numeric>Total tax</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {rates.map(([rate, v]) => (
                        <Tr key={rate}>
                          <Td className="font-medium text-fg">{rate}</Td>
                          <Td numeric>{formatCurrency(v.taxable)}</Td>
                          <Td numeric>{formatCurrency(v.cgst)}</Td>
                          <Td numeric>{formatCurrency(v.sgst)}</Td>
                          <Td numeric>{formatCurrency(v.igst)}</Td>
                          <Td numeric>{formatCurrency(v.cess)}</Td>
                          <Td numeric className="font-medium text-fg">
                            {formatCurrency(Number(v.cgst) + Number(v.sgst) + Number(v.igst) + Number(v.cess))}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </div>
            </Card>

            <Card padded={false}>
              <CardHeader className="mb-0 px-5 pt-4">
                <CardTitle>B2B invoices (customers with GSTIN)</CardTitle>
                <span className="text-sm text-fg-muted">{s?.b2bCount || 0} invoices</span>
              </CardHeader>
              <div className="p-4">
                {isLoading ? (
                  <TableSkeleton rows={3} cols={7} />
                ) : !gstData?.b2bInvoices?.length ? (
                  <EmptyState icon={Building2} title="No B2B invoices this period" description="Sales to customers without a GSTIN are reported as B2C." />
                ) : (
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Invoice</Th>
                        <Th>Date</Th>
                        <Th>Customer</Th>
                        <Th>GSTIN</Th>
                        <Th numeric>Taxable</Th>
                        <Th numeric>Tax</Th>
                        <Th numeric>Total</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {gstData.b2bInvoices.map((inv: any) => (
                        <Tr key={inv.id}>
                          <Td className="font-mono font-medium text-fg">{inv.invoiceNumber}</Td>
                          <Td>{formatDate(inv.invoiceDate)}</Td>
                          <Td>{inv.customer?.name}</Td>
                          <Td className="font-mono text-xs">{inv.customer?.gstin}</Td>
                          <Td numeric>{formatCurrency(inv.taxableAmount)}</Td>
                          <Td numeric>
                            {formatCurrency(Number(inv.cgstAmount) + Number(inv.sgstAmount) + Number(inv.igstAmount) + Number(inv.cessAmount || 0))}
                          </Td>
                          <Td numeric className="font-medium text-fg">
                            {formatCurrency(inv.totalAmount)}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
