
import React, { useState, useEffect } from 'react';
import { Printer, Save, Store, Sun, Moon, Monitor, Palette } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api-client';
import { applyTheme, getStoredTheme, type Theme } from '@/lib/theme';

export default function SettingsPage() {
  const [shopName, setShopName] = useState('Shree Ganesh Supermarket & Retail');
  const [phone, setPhone] = useState('022-24381122');
  const [address, setAddress] = useState('Shop No. 4-6, Station Road, Dadar West, Mumbai 400028');
  const [gstin, setGstin] = useState('27AAPFU0939F1ZV');
  const [printerWidth, setPrinterWidth] = useState<'3inch' | '2inch' | 'a4'>('3inch');
  const [enableNegativeStock, setEnableNegativeStock] = useState(false);
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<Theme>(getStoredTheme());

  const chooseTheme = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
  };

  const themeOptions: { value: Theme; label: string; hint: string; Icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', hint: 'Default — best in bright shops', Icon: Sun },
    { value: 'dark', label: 'Dark', hint: 'Low-light counters', Icon: Moon },
    { value: 'system', label: 'System', hint: 'Match the device setting', Icon: Monitor },
  ];

  useEffect(() => {
    api.get('/staff/settings').then((shop) => {
      if (shop) {
        if (shop.name) setShopName(shop.name);
        if (shop.phone) setPhone(shop.phone);
        if (shop.address) setAddress(shop.address);
        if (shop.gstin) setGstin(shop.gstin);
        if (shop.settings?.thermalPrinterWidth) setPrinterWidth(shop.settings.thermalPrinterWidth);
        if (shop.settings?.enableNegativeStock !== undefined) setEnableNegativeStock(shop.settings.enableNegativeStock);
        if (shop.settings?.invoicePrefix) setInvoicePrefix(shop.settings.invoicePrefix);
      }
    }).catch(() => {});
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.patch('/staff/settings', {
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

      alert('Shop settings and printer configuration saved!');
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-fg tracking-tight">Store Settings & Hardware Configuration</h2>
            <p className="text-xs text-fg-subtle mt-1">Receipt layout, thermal printer width, and GST details</p>
          </div>
        </div>

        {/* Appearance / Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-brand" />
              Appearance
            </CardTitle>
          </CardHeader>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-2">Color Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map(({ value, label, hint, Icon }) => {
                const active = theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => chooseTheme(value)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      active
                        ? 'bg-brand/20 border-brand text-fg font-bold'
                        : 'bg-surface-2 border-border text-fg-subtle hover:text-fg'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1.5 ${active ? 'text-brand' : 'text-fg-subtle'}`} />
                    {label}
                    <span className="block text-[10px] text-fg-subtle font-normal mt-0.5">{hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Shop Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-4 h-4 text-brand" />
                Store Business Profile
              </CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <Input
                label="Store Display Name (Printed on Bills)"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Contact Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  label="Store GSTIN"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                />
              </div>
              <Input
                label="Full Store Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </Card>

          {/* Printer & POS Hardware */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-brand" />
                Thermal Printer Configuration
              </CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-2">Default Receipt Format</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPrinterWidth('3inch')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      printerWidth === '3inch'
                        ? 'bg-brand/20 border-brand text-fg font-bold'
                        : 'bg-surface-2 border-border text-fg-subtle'
                    }`}
                  >
                    3-Inch (80mm ESC/POS)
                    <span className="block text-[10px] text-fg-subtle font-normal mt-0.5">Standard retail receipt printer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrinterWidth('2inch')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      printerWidth === '2inch'
                        ? 'bg-brand/20 border-brand text-fg font-bold'
                        : 'bg-surface-2 border-border text-fg-subtle'
                    }`}
                  >
                    2-Inch (58mm ESC/POS)
                    <span className="block text-[10px] text-fg-subtle font-normal mt-0.5">Mobile Bluetooth thermal printer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrinterWidth('a4')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      printerWidth === 'a4'
                        ? 'bg-brand/20 border-brand text-fg font-bold'
                        : 'bg-surface-2 border-border text-fg-subtle'
                    }`}
                  >
                    A4 / A5 Tax Invoice
                    <span className="block text-[10px] text-fg-subtle font-normal mt-0.5">Laser / Inkjet office printer</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                <Input
                  label="Invoice Number Prefix"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                  placeholder="INV"
                />
                <div className="flex flex-col justify-center">
                  <label className="text-xs font-medium text-fg-muted mb-1">Negative Stock Policy</label>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={enableNegativeStock}
                      onChange={(e) => setEnableNegativeStock(e.target.checked)}
                      className="rounded border-border bg-surface-2 text-emerald-600"
                    />
                    <span className="text-xs text-fg-subtle">Allow counter checkout when stock is 0 (overdraft)</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>

          <Button type="submit" variant="primary" size="lg" isLoading={isSaving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save Store Settings
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
