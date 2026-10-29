
import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, ShieldCheck, Calendar } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function GstReportsPage() {
  const [gstData, setGstData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [isLoading, setIsLoading] = useState(false);

  const fetchGst = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/reports/gst');
      setGstData(data);
    } catch (err) {
      console.error('Failed to load GST reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGst();
  }, []);

  const handleDownloadJson = () => {
    const jsonBlob = new Blob([JSON.stringify(gstData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BillPro-GSTR1-Summary-${selectedMonth}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-fg tracking-tight">GST Reports (CA Ready)</h2>
            <p className="text-xs text-fg-subtle mt-1">GSTR-1 outward supplies summary & GSTR-3B tax liability schedules</p>
          </div>
          <Button variant="primary" onClick={handleDownloadJson}>
            <Download className="w-4 h-4 mr-1.5" />
            Export GSTR-1 JSON for CA
          </Button>
        </div>

        {/* 4 Tax Liability Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Taxable Turnover"
            value={formatCurrency(gstData?.summary?.totalTaxableValue || 0)}
            icon={FileSpreadsheet}
            tone="brand"
            footerLeft={`${gstData?.summary?.totalInvoices || 0} total outward invoices`}
          />
          <StatCard
            label="CGST Liability (Central)"
            value={formatCurrency(gstData?.summary?.totalCgst || 0)}
            icon={ShieldCheck}
            tone="sky"
            footerLeft="Intra-state central tax component"
          />
          <StatCard
            label="SGST / UTGST Liability"
            value={formatCurrency(gstData?.summary?.totalSgst || 0)}
            icon={ShieldCheck}
            tone="sky"
            footerLeft="Intra-state state tax component"
          />
          <StatCard
            label="Total Net Tax Liability"
            value={formatCurrency(gstData?.summary?.totalTaxLiability || 0)}
            icon={Calendar}
            tone="emerald"
            footerLeft="CGST + SGST + IGST + Cess"
          />
        </div>

        {/* Rate-Wise GST Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>GSTR-1 Outward Supplies by Tax Slab</CardTitle>
            <Badge variant="info">Table 4 & 5 Summary</Badge>
          </CardHeader>
          <Table>
            <Thead>
              <Tr>
                <Th>GST Tax Slab</Th>
                <Th>Taxable Value</Th>
                <Th>CGST Amount</Th>
                <Th>SGST Amount</Th>
                <Th>IGST Amount</Th>
                <Th>Cess Amount</Th>
                <Th className="text-right">Total Tax</Th>
              </Tr>
            </Thead>
            <Tbody>
              {!gstData?.rateWiseBreakdown || Object.keys(gstData.rateWiseBreakdown).length === 0 ? (
                <Tr>
                  <Td colSpan={7} className="text-center py-6 text-fg-subtle">No GST transactions recorded in this period.</Td>
                </Tr>
              ) : (
                Object.entries(gstData.rateWiseBreakdown).map(([rate, vals]: [string, any]) => (
                  <Tr key={rate}>
                    <Td className="font-bold text-fg">{rate}</Td>
                    <Td>{formatCurrency(vals.taxable)}</Td>
                    <Td>{formatCurrency(vals.cgst)}</Td>
                    <Td>{formatCurrency(vals.sgst)}</Td>
                    <Td>{formatCurrency(vals.igst)}</Td>
                    <Td>{formatCurrency(vals.cess)}</Td>
                    <Td className="text-right font-bold text-brand">
                      {formatCurrency(vals.cgst + vals.sgst + vals.igst + vals.cess)}
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Card>

        {/* B2B Invoices Section (Table 4A) */}
        <Card>
          <CardHeader>
            <CardTitle>B2B Tax Invoices (With Customer GSTIN)</CardTitle>
            <span className="text-xs text-fg-subtle">{gstData?.summary?.b2bCount || 0} Invoices</span>
          </CardHeader>
          <Table>
            <Thead>
              <Tr>
                <Th>Invoice #</Th>
                <Th>Date</Th>
                <Th>Customer Name</Th>
                <Th>Customer GSTIN</Th>
                <Th>Taxable</Th>
                <Th>Total Tax</Th>
                <Th className="text-right">Invoice Total</Th>
              </Tr>
            </Thead>
            <Tbody>
              {!gstData?.b2bInvoices || gstData.b2bInvoices.length === 0 ? (
                <Tr>
                  <Td colSpan={7} className="text-center py-6 text-fg-subtle">No B2B invoices in this period. Retail sales fall under B2C.</Td>
                </Tr>
              ) : (
                gstData.b2bInvoices.map((inv: any) => (
                  <Tr key={inv.id}>
                    <Td className="font-mono font-bold text-fg">{inv.invoiceNumber}</Td>
                    <Td>{formatDate(inv.invoiceDate)}</Td>
                    <Td>{inv.customer?.name}</Td>
                    <Td className="font-mono text-xs">{inv.customer?.gstin}</Td>
                    <Td>{formatCurrency(inv.taxableAmount)}</Td>
                    <Td>{formatCurrency(Number(inv.cgstAmount) + Number(inv.sgstAmount) + Number(inv.igstAmount))}</Td>
                    <Td className="text-right font-bold text-fg">{formatCurrency(inv.totalAmount)}</Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
