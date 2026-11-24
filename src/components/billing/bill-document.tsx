import React from 'react';
import { createPortal } from 'react-dom';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

export type BillFormat = '3inch' | '2inch' | 'a4';

interface ShopInfo {
  name?: string;
  address?: string;
  phone?: string;
  gstin?: string;
  state?: string;
  stateCode?: string;
}

const PAPER_WIDTH: Record<Exclude<BillFormat, 'a4'>, string> = { '3inch': '80mm', '2inch': '58mm' };

/**
 * The printable bill (thermal receipt or A4 tax invoice).
 * `forPrint` renders the paper-exact version used inside <PrintPortal>; otherwise a screen preview.
 */
export const BillDocument: React.FC<{
  invoice: any;
  shop: ShopInfo | null | undefined;
  format: BillFormat;
  forPrint?: boolean;
}> = ({ invoice, shop, format, forPrint = false }) => {
  const inv = invoice || {};
  const lines: any[] = inv.lines || [];
  const shopName = shop?.name || 'Shop';
  const taxable = inv.taxableAmount ?? null;
  const tax =
    inv.cgstAmount != null
      ? Number(inv.cgstAmount || 0) + Number(inv.sgstAmount || 0) + Number(inv.igstAmount || 0) + Number(inv.cessAmount || 0)
      : null;
  const paid = Number(inv.paidAmount ?? 0);
  const due = Number(inv.balanceAmount ?? 0);
  const dateText = inv.invoiceDate ? formatDate(inv.invoiceDate) : formatDate(new Date());
  const docTitle = shop?.gstin ? 'Tax Invoice' : 'Bill of Supply';

  if (format !== 'a4') {
    return (
      <div
        className={cn('bill-thermal bg-white font-mono text-xs leading-tight text-black', !forPrint && 'mx-auto shadow-sm ring-1 ring-black/10')}
        style={{ width: PAPER_WIDTH[format], padding: forPrint ? '3mm' : '4mm' }}
      >
        <div className="border-b border-dashed border-black pb-2 text-center">
          <p className="text-sm font-bold uppercase">{shopName}</p>
          {shop?.address && <p>{shop.address}</p>}
          {shop?.phone && <p>Ph: {shop.phone}</p>}
          {shop?.gstin && <p>GSTIN: {shop.gstin}</p>}
          <p className="mt-1 font-bold uppercase">{docTitle}</p>
        </div>
        <div className="border-b border-dashed border-black py-2">
          <div className="flex justify-between gap-2">
            <span>No: {inv.invoiceNumber}</span>
            <span>{dateText}</span>
          </div>
          <div>Customer: {inv.customer?.name || 'Walk-in'}</div>
          {inv.customer?.gstin && <div>Cust. GSTIN: {inv.customer.gstin}</div>}
        </div>
        <div className="space-y-1 border-b border-dashed border-black py-2">
          {lines.map((line, idx) => (
            <div key={idx} className="bill-row">
              <div className="break-words">{line.itemName}</div>
              {line.description && <div className="whitespace-pre-line break-words pl-2">{line.description}</div>}
              <div className="flex justify-between gap-2">
                <span>
                  {Number(line.quantity)} × {formatCurrency(line.unitPrice)}
                </span>
                <span className="font-bold">{formatCurrency(line.lineTotal)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-0.5 border-b border-dashed border-black py-2">
          {taxable != null && (
            <div className="flex justify-between">
              <span>Taxable</span>
              <span>{formatCurrency(taxable)}</span>
            </div>
          )}
          {tax != null && (
            <div className="flex justify-between">
              <span>GST</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold">
            <span>TOTAL</span>
            <span>{formatCurrency(inv.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid</span>
            <span>{formatCurrency(paid)}</span>
          </div>
          {due > 0 && (
            <div className="flex justify-between font-bold">
              <span>Balance due</span>
              <span>{formatCurrency(due)}</span>
            </div>
          )}
        </div>
        <p className="pt-2 text-center">Thank you, visit again</p>
      </div>
    );
  }

  return (
    <div
      className={cn('bill-a4 bg-white text-xs text-black', !forPrint && 'mx-auto shadow-sm ring-1 ring-black/10')}
      // Print: fill the A4 page (avoids a blank 2nd page from rounding); screen: fixed A4 preview.
      style={forPrint ? { width: '100%', padding: '14mm' } : { width: '210mm', minHeight: '297mm', padding: '14mm' }}
    >
      <div className="flex items-start justify-between gap-6 border-b-2 border-black pb-3">
        <div>
          <h2 className="text-xl font-bold uppercase">{shopName}</h2>
          {shop?.address && <p>{shop.address}</p>}
          {shop?.phone && <p>Phone: {shop.phone}</p>}
          {shop?.gstin && <p>GSTIN: {shop.gstin}</p>}
          {shop?.state && (
            <p>
              State: {shop.state}
              {shop.stateCode ? ` (${shop.stateCode})` : ''}
            </p>
          )}
        </div>
        <div className="text-right">
          <h3 className="text-lg font-bold uppercase">{docTitle}</h3>
          <p>
            Invoice no: <span className="font-semibold">{inv.invoiceNumber || '—'}</span>
          </p>
          <p>Date: {dateText}</p>
        </div>
      </div>

      <div className="border-b border-black py-3">
        <p className="font-bold uppercase">Bill to</p>
        <p className="font-semibold">{inv.customer?.name || 'Walk-in customer'}</p>
        {inv.customer?.phone && <p>Phone: {inv.customer.phone}</p>}
        {inv.customer?.gstin && <p>GSTIN: {inv.customer.gstin}</p>}
      </div>

      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr className="border-y border-black">
            <th className="w-8 px-2 py-1.5 text-left">#</th>
            <th className="px-2 py-1.5 text-left">Item</th>
            <th className="px-2 py-1.5 text-left">HSN</th>
            <th className="px-2 py-1.5 text-right">Qty</th>
            <th className="px-2 py-1.5 text-right">Rate</th>
            <th className="px-2 py-1.5 text-right">GST %</th>
            <th className="px-2 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => (
            <tr key={idx} className="bill-row border-b border-black/20 align-top">
              <td className="px-2 py-1.5">{idx + 1}</td>
              <td className="px-2 py-1.5">
                <div>{line.itemName}</div>
                {line.description && <div className="whitespace-pre-line break-words text-black/70">{line.description}</div>}
              </td>
              <td className="px-2 py-1.5">{line.hsnCode || '—'}</td>
              <td className="px-2 py-1.5 text-right">{Number(line.quantity)}</td>
              <td className="px-2 py-1.5 text-right">{formatCurrency(line.unitPrice)}</td>
              <td className="px-2 py-1.5 text-right">{line.gstRate != null ? `${Number(line.gstRate)}%` : '—'}</td>
              <td className="px-2 py-1.5 text-right">{formatCurrency(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bill-row mt-4 flex justify-end">
        <div className="w-64 space-y-1">
          {taxable != null && (
            <div className="flex justify-between">
              <span>Taxable amount</span>
              <span>{formatCurrency(taxable)}</span>
            </div>
          )}
          {inv.isInterstate
            ? inv.igstAmount != null && (
                <div className="flex justify-between">
                  <span>IGST</span>
                  <span>{formatCurrency(inv.igstAmount)}</span>
                </div>
              )
            : inv.cgstAmount != null && (
                <>
                  <div className="flex justify-between">
                    <span>CGST</span>
                    <span>{formatCurrency(inv.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST</span>
                    <span>{formatCurrency(inv.sgstAmount)}</span>
                  </div>
                </>
              )}
          <div className="mt-1 flex justify-between border-t border-black pt-1 text-sm font-bold">
            <span>Grand total</span>
            <span>{formatCurrency(inv.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid</span>
            <span>{formatCurrency(paid)}</span>
          </div>
          {due > 0 && (
            <div className="flex justify-between font-semibold">
              <span>Balance due</span>
              <span>{formatCurrency(due)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bill-row mt-10 flex items-end justify-between">
        <p>This is a computer-generated invoice.</p>
        <div className="text-center">
          <div className="h-12" />
          <p className="border-t border-black px-6 pt-1">Authorised signatory</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Renders the print copy of the bill directly under <body>, OUTSIDE any modal or scroll
 * container. Print CSS hides everything else, so the whole bill prints (and long A4 bills
 * flow onto further pages) instead of being clipped to the on-screen dialog.
 */
export const PrintPortal: React.FC<{ format: BillFormat; children: React.ReactNode }> = ({ format, children }) =>
  createPortal(
    <div id="print-root" aria-hidden="true">
      <style>{format === 'a4' ? '@page { size: A4 portrait; margin: 0; }' : '@page { margin: 0; }'}</style>
      {children}
    </div>,
    document.body
  );
