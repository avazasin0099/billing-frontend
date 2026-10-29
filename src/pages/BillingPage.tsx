import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  PauseCircle,
  PlayCircle,
  CreditCard,
  Printer,
  CheckCircle2,
  User,
  ShoppingBag,
  Percent,
  RotateCcw,
  QrCode,
  UserPlus,
  Volume2,
  VolumeX,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Badge, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency, cn } from '@/lib/utils';
import { Item, CartItem, Customer, PaymentMethod } from '@/types';
import { LocalDbService } from '@/offline/pending-operations';
import { posAudio } from '@/lib/sound';

// Soft, deterministic colour swatch for the product thumbnail placeholder (used when an item
// has no image). Light tint + readable accent, so it reads like a photo slot in both themes.
const THUMB_SWATCHES: Array<[string, string]> = [
  ['#ecfdf5', '#047857'], // emerald
  ['#eff6ff', '#1d4ed8'], // blue
  ['#fffbeb', '#b45309'], // amber
  ['#fdf4ff', '#a21caf'], // fuchsia
  ['#fff1f2', '#be123c'], // rose
  ['#f0f9ff', '#0369a1'], // sky
  ['#f0fdf4', '#15803d'], // green
  ['#f5f3ff', '#6d28d9'], // violet
];
function thumbSwatch(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const [bg, fg] = THUMB_SWATCHES[h % THUMB_SWATCHES.length];
  return { bg, fg };
}

export default function BillingPosPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldCarts, setHeldCarts] = useState<{ id: string; name: string; cart: CartItem[]; customerId?: string }[]>([]);

  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Quick Customer Modal
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');
  const [newCustStateCode, setNewCustStateCode] = useState('27'); // Default Maharashtra
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ method: PaymentMethod; amount: number; reference?: string }[]>([]);
  const [transactionRef, setTransactionRef] = useState('');
  const [activePaymentTab, setActivePaymentTab] = useState<PaymentMethod>('CASH');

  // Receipt modal state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [printerWidth, setPrinterWidth] = useState<'3inch' | '2inch'>('3inch');

  const [soundActive, setSoundActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sound toggle
  const toggleSound = () => {
    const nextState = !soundActive;
    setSoundActive(nextState);
    posAudio.setSoundEnabled(nextState);
  };

  // Fetch items & customers (or use cached IndexedDB if offline)
  const loadCatalog = useCallback(async () => {
    try {
      const [itemsData, customersData] = await Promise.all([
        api.get('/items', { limit: 200 }).catch(async () => {
          const cached = await LocalDbService.getCachedItems();
          return { items: cached };
        }),
        api.get('/parties/customers').catch(async () => {
          const cached = await LocalDbService.getCachedCustomers();
          return { customers: cached };
        }),
      ]);

      const itemList = itemsData?.items || itemsData || [];
      setItems(itemList);
      if (itemList.length > 0) {
        LocalDbService.cacheItems(itemList);
      }

      const cats = Array.from(new Set(itemList.map((i: Item) => i.category || 'General'))) as string[];
      setCategories(cats);

      const custList = customersData?.customers || customersData || [];
      setCustomers(custList);
      if (custList.length > 0) {
        LocalDbService.cacheCustomers(custList);
      }
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || (item.category || 'General') === selectedCategory;
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.barcode && item.barcode.includes(searchQuery)) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery && item.isActive;
  });

  // Deterministic Line Math (GST, Tax Inclusive / Exclusive)
  const recalculateCartItem = (item: Item, quantity: number, discountAmount: number): CartItem => {
    const unitPrice = Number(item.sellingPrice);
    const grossAmount = unitPrice * quantity;
    const net = Math.max(0, grossAmount - discountAmount);

    let taxableAmount: number;
    let totalTax: number;
    let cgstAmount = 0;
    let sgstAmount = 0;
    const igstAmount = 0;
    const cessAmount = 0;

    const rate = Number(item.gstRate) || 0;

    if (item.isTaxInclusive) {
      taxableAmount = Math.round((net / (1 + rate / 100) + Number.EPSILON) * 100) / 100;
      totalTax = Math.round((net - taxableAmount + Number.EPSILON) * 100) / 100;
      cgstAmount = Math.round((totalTax / 2 + Number.EPSILON) * 100) / 100;
      sgstAmount = Math.round((totalTax - cgstAmount + Number.EPSILON) * 100) / 100;
    } else {
      taxableAmount = net;
      totalTax = Math.round((taxableAmount * (rate / 100) + Number.EPSILON) * 100) / 100;
      cgstAmount = Math.round((totalTax / 2 + Number.EPSILON) * 100) / 100;
      sgstAmount = Math.round((totalTax - cgstAmount + Number.EPSILON) * 100) / 100;
    }

    const lineTotal = Math.round((taxableAmount + totalTax + Number.EPSILON) * 100) / 100;

    return {
      item,
      quantity,
      unitPrice,
      discountAmount,
      taxableAmount,
      gstRate: rate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      cessAmount,
      totalTaxAmount: totalTax,
      lineTotal,
    };
  };

  // Cart operations
  const addToCart = (item: Item) => {
    posAudio.playScanBeep();
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.item.id === item.id ? recalculateCartItem(item, ci.quantity + 1, ci.discountAmount) : ci
        );
      }
      return [...prev, recalculateCartItem(item, 1, 0)];
    });
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((ci) => (ci.item.id === itemId ? recalculateCartItem(ci.item, newQty, ci.discountAmount) : ci))
    );
  };

  const updateDiscount = (itemId: string, discount: number) => {
    setCart((prev) =>
      prev.map((ci) => (ci.item.id === itemId ? recalculateCartItem(ci.item, ci.quantity, discount) : ci))
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.item.id !== itemId));
  };

  const clearCart = () => setCart([]);

  // Barcode enter handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = items.find((i) => i.barcode === barcodeInput.trim());
    if (matched) {
      addToCart(matched);
      setBarcodeInput('');
    } else {
      posAudio.playErrorBuzz();
      alert(`No product found with barcode "${barcodeInput}"`);
    }
  };

  // Bill totals
  const subtotal = cart.reduce((sum, ci) => sum + ci.unitPrice * ci.quantity, 0);
  const totalDiscounts = cart.reduce((sum, ci) => sum + ci.discountAmount, 0);
  const totalTaxable = cart.reduce((sum, ci) => sum + ci.taxableAmount, 0);
  const totalTax = cart.reduce((sum, ci) => sum + ci.totalTaxAmount, 0);
  const rawTotal = cart.reduce((sum, ci) => sum + ci.lineTotal, 0);
  const roundedTotal = Math.round(rawTotal);
  const roundOff = Math.round((roundedTotal - rawTotal + Number.EPSILON) * 100) / 100;

  // Hold / Recall cart
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const holdName = `Cart #${heldCarts.length + 1} (${cart.length} items - ${formatCurrency(roundedTotal)})`;
    setHeldCarts((prev) => [
      ...prev,
      { id: Date.now().toString(), name: holdName, cart, customerId: selectedCustomerId },
    ]);
    clearCart();
    setSelectedCustomerId('');
  };

  const handleRecallCart = (heldId: string) => {
    const target = heldCarts.find((h) => h.id === heldId);
    if (target) {
      setCart(target.cart);
      setSelectedCustomerId(target.customerId || '');
      setHeldCarts((prev) => prev.filter((h) => h.id !== heldId));
    }
  };

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setActivePaymentTab('CASH');
    setSplitPayments([{ method: 'CASH', amount: roundedTotal }]);
    // Fresh idempotency key per checkout so retries/double-clicks can't double-post this bill.
    setCheckoutKey(
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ck-${Date.now()}`
    );
    setIsPaymentModalOpen(true);
  };

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setActivePaymentTab(method);
    // Auto-set the amount to full remaining or full total
    setSplitPayments([{ method, amount: roundedTotal }]);
  };

  const handleAddSplitPayment = (method: PaymentMethod) => {
    const alreadyAllocated = splitPayments.reduce((s, p) => s + p.amount, 0);
    const remaining = Math.max(0, roundedTotal - alreadyAllocated);
    setSplitPayments((prev) => [...prev, { method, amount: remaining }]);
  };

  const handleRemoveSplitPayment = (idx: number) => {
    setSplitPayments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateSplitAmount = (idx: number, amount: number) => {
    setSplitPayments((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, amount: Math.max(0, amount) } : p))
    );
  };

  const totalAllocated = splitPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingBalance = Math.max(0, roundedTotal - totalAllocated);

  // Global Keyboard Shortcuts (F2 Search, F8 Barcode, F4 Hold, F9 Pay, Escape Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) handleHoldCart();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0 && !isPaymentModalOpen && !isReceiptModalOpen) {
          handleOpenCheckout();
        }
      } else if (e.key === 'Escape') {
        if (isPaymentModalOpen) setIsPaymentModalOpen(false);
        if (isReceiptModalOpen) setIsReceiptModalOpen(false);
        if (isQuickCustomerOpen) setIsQuickCustomerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isPaymentModalOpen, isReceiptModalOpen, isQuickCustomerOpen]);

  // Quick Customer Creation
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('Customer name is required');
      return;
    }
    setIsSavingCustomer(true);
    try {
      const created = await api.post('/parties/customers', {
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        gstin: newCustGstin.trim() || undefined,
        stateCode: newCustStateCode,
      });

      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomerId(created.id);
      LocalDbService.cacheCustomers([created, ...customers]);

      setIsQuickCustomerOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustGstin('');
      posAudio.playScanBeep();
    } catch (err: any) {
      alert(`Failed to save customer: ${err.message}`);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Submit and Post Bill
  const handlePostInvoice = async () => {
    if (remainingBalance > 0 && !selectedCustomerId) {
      posAudio.playErrorBuzz();
      alert('Outstanding balance (Udhaar) requires selecting a registered customer.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      customerId: selectedCustomerId || undefined,
      invoiceDate: new Date().toISOString().slice(0, 10),
      idempotencyKey: checkoutKey || undefined,
      items: cart.map((ci) => ({
        itemId: ci.item.id,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        discountAmount: ci.discountAmount,
      })),
      payments: splitPayments
        .filter((p) => p.amount > 0)
        .map((p) => ({
          paymentMethod: p.method,
          amount: p.amount,
          transactionReference: transactionRef || undefined,
        })),
    };

    try {
      let createdInvoice: any;

      if (navigator.onLine) {
        createdInvoice = await api.post('/invoices', payload);
      } else {
        const cust = customers.find((c) => c.id === selectedCustomerId);
        const offlineRecord = await LocalDbService.saveOfflineInvoice({
          shopId: localStorage.getItem('billpro_shop_id') || 'shop-1',
          items: payload.items,
          payments: payload.payments,
          totalAmount: roundedTotal,
          customerId: selectedCustomerId,
          customerName: cust?.name,
        });

        createdInvoice = {
          ...offlineRecord,
          invoiceNumber: `OFFLINE-${offlineRecord.id.slice(-6)}`,
          totalAmount: roundedTotal,
          lines: cart.map((ci) => ({
            itemName: ci.item.name,
            quantity: ci.quantity,
            unitPrice: ci.unitPrice,
            lineTotal: ci.lineTotal,
          })),
        };
      }

      posAudio.playSuccessChime();
      setLastInvoice(createdInvoice);
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
      clearCart();
      setSelectedCustomerId('');
    } catch (err: any) {
      posAudio.playErrorBuzz();
      alert(`Invoice posting failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic UPI Payment Link (BHIM / GPay / PhonePe standard)
  const upiPayLink = `upi://pay?pa=store@upi&pn=BillPro%20Retail&am=${roundedTotal}&cu=INR&tn=POS%20Bill`;
  const upiQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    upiPayLink
  )}`;

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:h-full lg:min-h-0">
        {/* Left Side: Product Search, Barcode & Grid (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3 lg:h-full lg:min-h-0">
          {/* Top Search, Barcode & Audio Toolbar (fixed) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center shrink-0">
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-fg-subtle absolute left-3.5 top-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items by name, SKU... [F2]"
                className="w-full bg-surface border border-border rounded-xl pl-10 pr-12 py-2.5 text-xs text-fg placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="absolute right-2.5 top-2.5 text-[10px] font-mono font-bold text-fg-subtle bg-surface-2 px-1.5 py-0.5 rounded border border-border">
                F2
              </span>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="sm:col-span-5 relative">
              <Barcode className="w-4 h-4 text-brand absolute left-3.5 top-3 pointer-events-none" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan Barcode (Enter)... [F8]"
                className="w-full bg-surface border border-border rounded-xl pl-10 pr-12 py-2.5 text-xs text-fg placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              />
              <span className="absolute right-2.5 top-2.5 text-[10px] font-mono font-bold text-fg-subtle bg-surface-2 px-1.5 py-0.5 rounded border border-border">
                F8
              </span>
            </form>

            <div className="sm:col-span-1 flex justify-end">
              <button
                type="button"
                onClick={toggleSound}
                title={soundActive ? 'Mute Counter Audio' : 'Enable Counter Audio'}
                className={`p-2.5 rounded-xl border transition-colors ${
                  soundActive
                    ? 'bg-surface border-border text-brand hover:text-fg'
                    : 'bg-surface border-border text-fg-subtle hover:text-fg-subtle'
                }`}
              >
                {soundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-surface text-fg-subtle hover:text-fg border border-border'
              }`}
            >
              All Items ({items.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-surface text-fg-subtle hover:text-fg border border-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Items Grid (scrolls; header above stays fixed) */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {filteredItems.map((item) => {
                const stockNum = Number(item.currentStock);
                const isOutOfStock = stockNum <= 0;
                const isLow = !isOutOfStock && stockNum <= 10;
                const discount = item.mrp && item.mrp > item.sellingPrice ? item.mrp - item.sellingPrice : 0;
                const cartLine = cart.find((ci) => ci.item.id === item.id);
                const qty = cartLine?.quantity || 0;
                const sw = thumbSwatch(item.category || item.name || 'x');
                const initial = (item.name || '?').trim().charAt(0).toUpperCase();

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'rounded-xl border bg-surface overflow-hidden flex flex-col transition-all',
                      qty > 0
                        ? 'border-brand ring-1 ring-brand/30 shadow-sm'
                        : 'border-border hover:border-brand/50 hover:shadow-md',
                      isOutOfStock && 'opacity-70'
                    )}
                  >
                    {/* Thumbnail + tap-to-add body */}
                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      disabled={isOutOfStock}
                      className="text-left w-full disabled:cursor-not-allowed group"
                    >
                      <div
                        className="h-20 flex items-center justify-center relative overflow-hidden"
                        style={{ backgroundColor: sw.bg }}
                      >
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-3xl font-black opacity-80 transition-transform group-hover:scale-110" style={{ color: sw.fg }}>
                            {initial}
                          </span>
                        )}
                        {discount > 0 && (
                          <span className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            Save {formatCurrency(discount)}
                          </span>
                        )}
                        <span className="absolute bottom-1.5 left-1.5 text-[9px] font-semibold text-fg bg-surface/90 backdrop-blur-sm border border-border px-1.5 py-0.5 rounded-full">
                          {item.gstRate}% GST
                        </span>
                        {qty > 0 && (
                          <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center shadow">
                            {qty}
                          </span>
                        )}
                      </div>

                      <div className="px-2.5 pt-2">
                        <h4 className="text-xs font-semibold text-fg line-clamp-2 leading-snug min-h-[2rem] group-hover:text-brand">
                          {item.name}
                        </h4>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-sm font-bold text-fg">{formatCurrency(item.sellingPrice)}</span>
                          {item.mrp > item.sellingPrice && (
                            <span className="text-[10px] text-fg-subtle line-through">
                              {formatCurrency(item.mrp)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Footer: stock + ADD / stepper */}
                    <div className="px-2.5 pb-2.5 pt-2 mt-auto flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'text-[9px] font-semibold px-1.5 py-0.5 rounded',
                          isOutOfStock
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            : isLow
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-surface-2 text-fg-subtle'
                        )}
                      >
                        {isOutOfStock ? 'Out of stock' : `${stockNum} ${item.unit?.code || 'pcs'}`}
                      </span>

                      {qty > 0 ? (
                        <div className="flex items-center gap-0.5 bg-brand/10 border border-brand/30 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, qty - 1)}
                            className="p-1 text-brand hover:bg-brand/20 rounded"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-brand">{qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, qty + 1)}
                            className="p-1 text-brand hover:bg-brand/20 rounded"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          disabled={isOutOfStock}
                          className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-lg shadow-sm active:scale-95 transition-transform"
                        >
                          <Plus className="w-3.5 h-3.5" /> ADD
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Active Cart, Hold Drawer & Checkout (5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-0 flex flex-col max-h-[calc(100vh-7rem)] bg-surface border border-border rounded-2xl overflow-hidden shadow-xl">
          {/* Cart Header: Customer Selection & Quick Add */}
          <div className="p-3.5 border-b border-border bg-surface-2 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand/20 text-brand flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="font-bold text-fg text-sm">Active Cart</span>
                <span className="text-xs bg-brand/20 text-brand font-bold px-2 py-0.5 rounded-full">
                  {cart.length}
                </span>
              </div>

              {/* Hold Cart & Clear */}
              <div className="flex items-center gap-1.5">
                {cart.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleHoldCart}
                    className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 text-xs py-1 px-2.5"
                    title="Hold current bill (F4)"
                  >
                    <PauseCircle className="w-3.5 h-3.5 mr-1" />
                    Hold [F4]
                  </Button>
                )}
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="text-fg-subtle hover:text-rose-600 dark:hover:text-rose-400 p-1.5"
                    title="Clear Cart"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Held Carts Bar (if any held) */}
            {heldCarts.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto py-1">
                {heldCarts.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => handleRecallCart(h.id)}
                    className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <PlayCircle className="w-3 h-3" />
                    <span>{h.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Customer Dropdown + Quick Add Button */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <User className="w-3.5 h-3.5 text-fg-subtle absolute left-2.5 top-2.5 pointer-events-none" />
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Walk-in Retail Customer (Cash / Counter)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} — Bal: {formatCurrency(c.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsQuickCustomerOpen(true)}
                className="shrink-0 text-xs py-1 px-2.5 bg-surface-2 hover:bg-surface-2 text-brand border-border"
                title="Register New Customer"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                + New
              </Button>
            </div>
          </div>

          {/* Cart Item Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-border p-3 space-y-1">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 text-fg-subtle">
                <ShoppingBag className="w-10 h-10 text-fg-subtle mb-2.5 stroke-[1.5]" />
                <p className="text-xs font-semibold text-fg-subtle">Cart is empty</p>
                <p className="text-[11px] text-fg-subtle mt-1">Scan barcode [F8] or search products [F2]</p>
              </div>
            ) : (
              cart.map((ci) => (
                <div key={ci.item.id} className="py-2 flex items-center justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-semibold text-fg truncate">{ci.item.name}</h5>
                    <div className="flex items-center gap-2 text-[10px] text-fg-subtle mt-0.5">
                      <span>{formatCurrency(ci.unitPrice)}</span>
                      <span>•</span>
                      <span className="text-brand">{ci.gstRate}% GST</span>
                      {ci.discountAmount > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">-₹{ci.discountAmount} off</span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-0.5 bg-surface-2 border border-border rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(ci.item.id, ci.quantity - 1)}
                      className="p-1 hover:bg-surface-2 text-fg-subtle hover:text-fg rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-fg">
                      {ci.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(ci.item.id, ci.quantity + 1)}
                      className="p-1 hover:bg-surface-2 text-fg-subtle hover:text-fg rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right w-20">
                    <div className="text-xs font-bold text-fg">
                      {formatCurrency(ci.lineTotal)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Checkout Footer */}
          <div className="p-3.5 border-t border-border bg-surface-2 space-y-1.5">
            <div className="flex justify-between text-xs text-fg-subtle">
              <span>Taxable Value</span>
              <span>{formatCurrency(totalTaxable)}</span>
            </div>
            <div className="flex justify-between text-xs text-fg-subtle">
              <span>GST (CGST + SGST)</span>
              <span>{formatCurrency(totalTax)}</span>
            </div>
            {roundOff !== 0 && (
              <div className="flex justify-between text-xs text-fg-subtle">
                <span>Round-off</span>
                <span>{roundOff > 0 ? `+${roundOff}` : roundOff}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-fg pt-1.5 border-t border-border">
              <span>Payable Total</span>
              <span className="text-brand text-base">{formatCurrency(roundedTotal)}</span>
            </div>

            <Button
              variant="primary"
              size="lg"
              disabled={cart.length === 0}
              onClick={handleOpenCheckout}
              className="w-full mt-2 font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              <span>Collect Payment ({formatCurrency(roundedTotal)})</span>
              <span className="bg-brand/60 text-brand text-[10px] px-1.5 py-0.5 rounded font-mono">
                [F9]
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={isQuickCustomerOpen}
        onClose={() => setIsQuickCustomerOpen(false)}
        title="Quick Register Customer"
        maxWidth="md"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <Input
            label="Customer Name *"
            placeholder="e.g. Ramesh Sharma"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="e.g. 9876543210"
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              maxLength={10}
            />

            <div>
              <label className="text-xs font-semibold text-fg-muted block mb-1">State Code</label>
              <select
                value={newCustStateCode}
                onChange={(e) => setNewCustStateCode(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="27">27 - Maharashtra</option>
                <option value="24">24 - Gujarat</option>
                <option value="29">29 - Karnataka</option>
                <option value="07">07 - Delhi</option>
                <option value="33">33 - Tamil Nadu</option>
                <option value="09">09 - Uttar Pradesh</option>
                <option value="19">19 - West Bengal</option>
              </select>
            </div>
          </div>

          <Input
            label="GSTIN (Optional)"
            placeholder="e.g. 27AAAAA0000A1Z5"
            value={newCustGstin}
            onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
            maxLength={15}
          />

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setIsQuickCustomerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 font-bold"
              isLoading={isSavingCustomer}
            >
              Save & Attach
            </Button>
          </div>
        </form>
      </Modal>

      {/* POS Checkout & Tender Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="POS Checkout & Tender"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Total Payable Banner */}
          <div className="bg-surface-2 p-4 rounded-xl border border-border flex items-center justify-between">
            <div>
              <span className="text-xs text-fg-subtle block">Total Payable</span>
              <span className="text-2xl font-bold text-fg">{formatCurrency(roundedTotal)}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-fg-subtle block">Remaining Due</span>
              <span className={`text-xl font-bold ${remainingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatCurrency(remainingBalance)}
              </span>
            </div>
          </div>

          {/* Quick Tender Tabs */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-fg-subtle block mb-2">
              Select Tender Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['CASH', 'UPI', 'CARD', 'CREDIT'] as PaymentMethod[]).map((method) => {
                const isActive = activePaymentTab === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => handleSelectPaymentMethod(method)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border ${
                      isActive
                        ? 'bg-emerald-600 border-brand text-white shadow-lg shadow-emerald-600/30'
                        : 'bg-surface-2 hover:bg-surface-2 border-border text-fg-muted'
                    }`}
                  >
                    <span>{method === 'CREDIT' ? 'Credit (Udhaar)' : method}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic UPI Payment Display */}
          {activePaymentTab === 'UPI' && (
            <div className="p-4 bg-surface-2 border border-brand/30 rounded-xl flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-white p-2 rounded-lg shrink-0">
                <img
                  src={upiQrImageUrl}
                  alt="Dynamic UPI QR Code"
                  className="w-28 h-28 object-contain"
                />
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-brand text-xs font-bold">
                  <QrCode className="w-4 h-4" />
                  <span>Dynamic Counter UPI QR</span>
                </div>
                <p className="text-xs text-fg-muted font-medium">
                  Scan & pay <strong className="text-fg">{formatCurrency(roundedTotal)}</strong> via GPay, PhonePe, Paytm
                </p>
                <p className="text-[10px] text-fg-subtle">
                  Transaction auto-links to this bill
                </p>
              </div>
            </div>
          )}

          {/* Recorded Payment Entries */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                Payment Allocations
              </label>
              <button
                type="button"
                onClick={() => handleAddSplitPayment('CASH')}
                className="text-[11px] text-brand hover:text-brand font-semibold"
              >
                + Add Split Tender
              </button>
            </div>
            {splitPayments.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-surface-2 p-2.5 rounded-xl border border-border">
                <span className="text-xs font-bold text-brand w-24 px-2 py-1 bg-brand/10 rounded">
                  {p.method}
                </span>
                <input
                  type="number"
                  value={p.amount}
                  onChange={(e) => handleUpdateSplitAmount(idx, Number(e.target.value))}
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-fg font-mono"
                  placeholder="Amount"
                />
                {splitPayments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSplitPayment(idx)}
                    className="text-fg-subtle hover:text-rose-600 dark:hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Input
            label="Transaction Reference / Note (Optional)"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="e.g. UPI Ref # or Cash drawer note"
          />

          {/* Submit Button */}
          <Button
            variant="primary"
            size="lg"
            onClick={handlePostInvoice}
            isLoading={isSubmitting}
            className="w-full font-bold shadow-lg shadow-emerald-600/30 py-3"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Issue Bill & Open Thermal Receipt
          </Button>
        </div>
      </Modal>

      {/* Printable Thermal Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Invoice Issued Successfully"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex justify-center gap-2 pb-2 border-b border-border no-print">
            <button
              onClick={() => setPrinterWidth('3inch')}
              className={`px-3 py-1 text-xs rounded-lg font-medium ${
                printerWidth === '3inch' ? 'bg-emerald-600 text-white' : 'bg-surface-2 text-fg-subtle'
              }`}
            >
              3-Inch Thermal (80mm)
            </button>
            <button
              onClick={() => setPrinterWidth('2inch')}
              className={`px-3 py-1 text-xs rounded-lg font-medium ${
                printerWidth === '2inch' ? 'bg-emerald-600 text-white' : 'bg-surface-2 text-fg-subtle'
              }`}
            >
              2-Inch Thermal (58mm)
            </button>
          </div>

          {/* Physical Receipt Container */}
          <div
            className={`mx-auto bg-white text-black font-mono text-[11px] p-4 rounded shadow-lg leading-tight printable-receipt ${
              printerWidth === '2inch' ? 'w-56 text-[10px]' : 'w-72'
            }`}
          >
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h3 className="font-bold text-sm tracking-tight uppercase">Bill Pro Retail Store</h3>
              <p className="text-[10px]">Station Road, Dadar West, Mumbai</p>
              <p className="text-[10px]">GSTIN: 27AAPFU0939F1ZV</p>
              <p className="text-[9px]">TAX INVOICE</p>
            </div>

            <div className="py-2 border-b border-dashed border-black text-[10px]">
              <div className="flex justify-between">
                <span>Inv: {lastInvoice?.invoiceNumber}</span>
                <span>{lastInvoice?.invoiceDate || 'Today'}</span>
              </div>
              <div>Customer: {lastInvoice?.customer?.name || 'Walk-in Retail'}</div>
            </div>

            {/* Lines */}
            <div className="py-2 border-b border-dashed border-black space-y-1">
              {lastInvoice?.lines?.map((line: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <div className="truncate mr-2">
                    {line.itemName} x{line.quantity}
                  </div>
                  <div className="font-bold">{formatCurrency(line.lineTotal)}</div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2 border-b border-dashed border-black space-y-1 font-bold">
              <div className="flex justify-between text-sm">
                <span>TOTAL:</span>
                <span>{formatCurrency(lastInvoice?.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-700">
                <span>Paid Amount:</span>
                <span>{formatCurrency(lastInvoice?.paidAmount || lastInvoice?.totalAmount)}</span>
              </div>
              {lastInvoice?.balanceAmount > 0 && (
                <div className="flex justify-between text-[10px] text-red-600">
                  <span>Due Balance:</span>
                  <span>{formatCurrency(lastInvoice?.balanceAmount)}</span>
                </div>
              )}
            </div>

            {/* Thank you message */}
            <div className="text-center pt-3 flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 border border-gray-300 flex items-center justify-center p-1 rounded">
                <QrCode className="w-12 h-12 text-black" />
              </div>
              <p className="text-[9px] mt-1 text-gray-600">UPI Verified Payment</p>
              <p className="text-[10px] font-bold mt-2">*** THANK YOU VISIT AGAIN ***</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 no-print">
            <Button
              variant="primary"
              size="md"
              className="flex-1 font-bold"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print Receipt [Ctrl+P]
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsReceiptModalOpen(false)}
            >
              New Bill [Esc]
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
