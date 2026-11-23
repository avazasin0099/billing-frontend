import React, { useEffect, useState } from 'react';
import { Printer, Save, Store, Sun, Moon, Monitor, Palette, ReceiptIndianRupee as Receipt, Check } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader, ErrorState, Skeleton } from '@/components/ui/page';
import { toast } from '@/components/ui/toast';
import { api } from '@/services/api-client';
import { applyTheme, getStoredTheme, type Theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

type PrinterWidth = '3inch' | '2inch' | 'a4';

/** Radio-card group: a standard, keyboard-accessible single choice with a visible description. */
function ChoiceGroup<T extends string>({
  name,
  legend,
  value,
  onChange,
  options,
}: {
  name: string;
  legend: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint: string; Icon: React.ElementType }[];
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-fg">{legend}</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {options.map(({ value: v, label, hint, Icon }) => {
          const active = value === v;
          return (
            <label
              key={v}
              className={cn(
                'relative flex cursor-pointer gap-3 rounded-card border p-3 transition-colors focus-within:ring-2 focus-within:ring-ring',
                active ? 'border-primary bg-primary-soft' : 'border-border-strong bg-surface hover:bg-surface-2'
              )}
            >
              <input type="radio" name={name} value={v} checked={active} onChange={() => onChange(v)} className="sr-only" />
              <Icon className={cn('mt-0.5 size-5 shrink-0', active ? 'text-accent' : 'text-fg-subtle')} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-fg">{label}</span>
                <span className="block text-xs text-fg-muted">{hint}</span>
              </span>
              {active && <Check className="absolute right-3 top-3 size-4 text-accent" aria-hidden="true" />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function SettingsPage() {
  // Start EMPTY and load the real shop. (Previously these were pre-filled with a demo shop,
  // and saving without a successful load wrote that fake GSTIN/address onto the real shop.)
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [printerWidth, setPrinterWidth] = useState<PrinterWidth>('3inch');
  const [enableNegativeStock, setEnableNegativeStock] = useState(false);
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<Theme>(getStoredTheme());

  const load = () => {
    setIsLoading(true);
    setLoadError(null);
    api
      .get('/staff/settings')
      .then((shop) => {
        setShopName(shop?.name || '');
        setPhone(shop?.phone || '');
        setAddress(shop?.address || '');
        setGstin(shop?.gstin || '');
        setPrinterWidth(shop?.settings?.thermalPrinterWidth || '3inch');
        setEnableNegativeStock(!!shop?.settings?.enableNegativeStock);
        setInvoicePrefix(shop?.settings?.invoicePrefix || 'INV');
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const chooseTheme = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await api.patch('/staff/settings', {
        name: shopName,
        phone,
        address,
        gstin,
        settings: {
          thermalPrinterWidth: printerWidth,
          enableNegativeStock,
          invoicePrefix,
          roundOffTotal: true,
        },
      });
      // Keep the cached shop (used by the top bar and printed receipts) in sync.
      try {
        const cached = JSON.parse(localStorage.getItem('billpro_shop') || '{}');
        localStorage.setItem(
          'billpro_shop',
          JSON.stringify({
            ...cached,
            name: updated?.name ?? shopName,
            phone: updated?.phone ?? phone,
            address: updated?.address ?? address,
            gstin: updated?.gstin ?? gstin,
            settings: updated?.settings ?? cached.settings,
          })
        );
      } catch {
        /* ignore */
      }
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error('Settings not saved', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <PageHeader title="Settings" description="Shop details printed on bills, printing and billing preferences." />

        {loadError && (
          <Card>
            <ErrorState message={loadError} onRetry={load} />
          </Card>
        )}

        {!loadError && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="size-5 text-fg-subtle" aria-hidden="true" />
                  Shop details
                </CardTitle>
              </CardHeader>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    label="Shop name"
                    hint="Printed at the top of every bill."
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Your shop name"
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Shop phone number"
                    />
                    <Input
                      label="GSTIN"
                      hint="Leave blank if the shop is not GST-registered."
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/\s/g, ''))}
                      placeholder="15-character GSTIN"
                      maxLength={15}
                      className="font-mono uppercase"
                    />
                  </div>
                  <Input
                    label="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Shop number, street, area, city, PIN"
                  />
                </div>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="size-5 text-fg-subtle" aria-hidden="true" />
                  Printing
                </CardTitle>
              </CardHeader>
              <ChoiceGroup<PrinterWidth>
                name="printer-width"
                legend="Default bill format"
                value={printerWidth}
                onChange={setPrinterWidth}
                options={[
                  { value: '3inch', label: '80 mm thermal', hint: 'Standard counter receipt printer', Icon: Receipt },
                  { value: '2inch', label: '58 mm thermal', hint: 'Compact / Bluetooth printer', Icon: Receipt },
                  { value: 'a4', label: 'A4 tax invoice', hint: 'Laser or inkjet printer', Icon: Printer },
                ]}
              />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="size-5 text-fg-subtle" aria-hidden="true" />
                  Billing
                </CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Input
                  label="Invoice number prefix"
                  hint="1–10 letters or digits, e.g. INV → INV/2026-27/0001."
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10))}
                  placeholder="INV"
                />
                <div>
                  <p className="mb-1.5 text-sm font-medium text-fg">Stock</p>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={enableNegativeStock}
                      onChange={(e) => setEnableNegativeStock(e.target.checked)}
                      className="mt-0.5 size-4 rounded border-border-strong accent-[rgb(var(--primary))]"
                    />
                    <span className="text-sm">
                      <span className="block text-fg">Allow selling when stock is zero</span>
                      <span className="block text-xs text-fg-muted">Stock can go negative until the next purchase is recorded.</span>
                    </span>
                  </label>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" size="lg" isLoading={isSaving} disabled={isLoading}>
                <Save /> Save settings
              </Button>
            </div>
          </form>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-5 text-fg-subtle" aria-hidden="true" />
              Appearance
            </CardTitle>
          </CardHeader>
          <ChoiceGroup<Theme>
            name="theme"
            legend="Theme (this device only)"
            value={theme}
            onChange={chooseTheme}
            options={[
              { value: 'light', label: 'Light', hint: 'Best in bright shops', Icon: Sun },
              { value: 'dark', label: 'Dark', hint: 'Low-light counters', Icon: Moon },
              { value: 'system', label: 'System', hint: 'Follow the device setting', Icon: Monitor },
            ]}
          />
        </Card>
      </div>
    </DashboardLayout>
  );
}
