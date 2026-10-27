
import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Badge, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency } from '@/lib/utils';
import { Item, CartItem, Customer, PaymentMethod } from '@/types';
import { LocalDbService } from '@/offline/pending-operations';

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

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [splitPayments, setSplitPayments] = useState<{ method: PaymentMethod; amount: number; reference?: string }[]>([]);
  const [transactionRef, setTransactionRef] = useState('');

  // Receipt modal state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [printerWidth, setPrinterWidth] = useState<'3inch' | '2inch' | 'a4'>('3inch');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Fetch items & customers (or use cached IndexedDB if offline)
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [itemsData, customersData] = await Promise.all([
          api.get('/items', { limit: 100 }).catch(async () => {
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
    };

    loadCatalog();
  }, []);

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || (item.category || 'General') === selectedCategory;
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.barcode && item.barcode.includes(searchQuery)) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery && item.isActive;
  });

  // Barcode enter handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = items.find((i) => i.barcode === barcodeInput.trim());
    if (matched) {
      addToCart(matched);
      setBarcodeInput('');
    } else {
      alert(`No item found with barcode "${barcodeInput}"`);
    }
  };

  // Cart operations
  const addToCart = (item: Item) => {
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

  // Deterministic Line Math
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

  // Bill totals
  const subtotal = cart.reduce((sum, ci) => sum + ci.unitPrice * ci.quantity, 0);
  const totalDiscounts = cart.reduce((sum, ci) => sum + ci.discountAmount, 0);
  const totalTaxable = cart.reduce((sum, ci) => sum + ci.taxableAmount, 0);
  const totalCgst = cart.reduce((sum, ci) => sum + ci.cgstAmount, 0);
  const totalSgst = cart.reduce((sum, ci) => sum + ci.sgstAmount, 0);
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
    setPaymentAmount(roundedTotal);
    setSplitPayments([{ method: 'CASH', amount: roundedTotal }]);
    setIsPaymentModalOpen(true);
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

  // Submit and Post Bill
  const handlePostInvoice = async () => {
    if (remainingBalance > 0 && !selectedCustomerId) {
      alert('Outstanding balance (Udhaar) requires selecting a registered customer.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      customerId: selectedCustomerId || undefined,
      invoiceDate: new Date().toISOString().slice(0, 10),
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
        // Save into IndexedDB offline pending queue
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

      setLastInvoice(createdInvoice);
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
      clearCart();
      setSelectedCustomerId('');
    } catch (err: any) {
      alert(`Invoice posting failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-6.5rem)]">
        {/* Left Side: Product Search, Barcode & Grid (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full space-y-4">
          {/* Top Search & Barcode Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name, SKU or brand..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <form onSubmit={handleBarcodeSubmit} className="sm:col-span-5 relative">
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan Barcode (Enter)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </form>
          </div>

          {/* Category Chips Bar */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
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
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Items Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map((item) => {
                const isOutOfStock = Number(item.currentStock) <= 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    disabled={isOutOfStock}
                    className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isOutOfStock
                        ? 'bg-slate-900/40 border-slate-800/40 opacity-50 cursor-not-allowed'
                        : 'bg-slate-900 border-slate-800 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 active:scale-[0.98]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {item.category || 'General'}
                        </span>
                        <span className="text-[10px] text-indigo-400 font-bold">
                          {item.gstRate}% GST
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white line-clamp-2 leading-snug">
                        {item.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="text-base font-bold text-white">
                          {formatCurrency(item.sellingPrice)}
                        </div>
                        {item.mrp > item.sellingPrice && (
                          <span className="text-[10px] text-slate-500 line-through">
                            MRP {formatCurrency(item.mrp)}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          isOutOfStock
                            ? 'bg-rose-500/20 text-rose-300'
                            : Number(item.currentStock) <= 10
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.currentStock} {item.unit?.code || 'pcs'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Active Cart, Hold Drawer & Checkout (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Cart Header: Customer Selection & Hold Bills */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-white text-base">Active Cart</span>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                  {cart.length}
                </span>
              </div>

              {/* Hold Cart Button */}
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleHoldCart}
                    className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    title="Hold current cart to serve another customer"
                  >
                    <PauseCircle className="w-3.5 h-3.5 mr-1" />
                    Hold
                  </Button>
                )}
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart} className="text-slate-500 hover:text-rose-400 p-1.5">
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
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-xs rounded-lg transition-colors whitespace-nowrap"
                  >
                    <PlayCircle className="w-3 h-3" />
                    <span>{h.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Customer Dropdown */}
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Walk-in Retail Customer (Cash / Counter)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} — Balance: {formatCurrency(c.currentBalance)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cart Item Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 text-slate-500">
                <ShoppingBag className="w-12 h-12 text-slate-700 mb-3 stroke-[1.5]" />
                <p className="text-sm font-medium text-slate-400">Cart is empty</p>
                <p className="text-xs text-slate-600 mt-1">Scan barcode or tap products on the left</p>
              </div>
            ) : (
              cart.map((ci) => (
                <div key={ci.item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-semibold text-white truncate">{ci.item.name}</h5>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{formatCurrency(ci.unitPrice)}</span>
                      <span>•</span>
                      <span className="text-indigo-400">{ci.gstRate}% GST</span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(ci.item.id, ci.quantity - 1)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold text-white">
                      {ci.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(ci.item.id, ci.quantity + 1)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right w-20">
                    <div className="text-xs font-bold text-white">
                      {formatCurrency(ci.lineTotal)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Checkout Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/90 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Taxable Value</span>
              <span>{formatCurrency(totalTaxable)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>GST (CGST + SGST)</span>
              <span>{formatCurrency(totalTax)}</span>
            </div>
            {roundOff !== 0 && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>Round-off</span>
                <span>{roundOff > 0 ? `+${roundOff}` : roundOff}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
              <span>Payable Total</span>
              <span className="text-indigo-400 text-lg">{formatCurrency(roundedTotal)}</span>
            </div>

            <Button
              variant="primary"
              size="lg"
              disabled={cart.length === 0}
              onClick={handleOpenCheckout}
              className="w-full mt-3 font-bold text-base shadow-lg shadow-indigo-600/30"
            >
              Collect Payment ({formatCurrency(roundedTotal)})
            </Button>
          </div>
        </div>
      </div>

      {/* Manual Payment Recording Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment (POS Checkout)"
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Total Payable Banner */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Invoice Net Total</span>
              <span className="text-2xl font-bold text-white">{formatCurrency(roundedTotal)}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Remaining Due</span>
              <span className={`text-xl font-bold ${remainingBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {formatCurrency(remainingBalance)}
              </span>
            </div>
          </div>

          {/* Quick Payment Method Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Add Payment Allocation
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(['CASH', 'UPI', 'CARD', 'CREDIT'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => handleAddSplitPayment(method)}
                  className="py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
                >
                  <span>{method === 'CREDIT' ? 'Credit (Udhaar)' : method}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recorded Payment Entries */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Payment Split Entries
            </label>
            {splitPayments.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-indigo-400 w-24 px-2 py-1 bg-indigo-500/10 rounded">
                  {p.method}
                </span>
                <input
                  type="number"
                  value={p.amount}
                  onChange={(e) => handleUpdateSplitAmount(idx, Number(e.target.value))}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
                  placeholder="Amount"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSplitPayment(idx)}
                  className="text-slate-500 hover:text-rose-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Reference note (optional) */}
          <Input
            label="Transaction Reference / Note (Optional)"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="e.g. UPI Ref / Cash drawer receipt"
          />

          {/* Submit Button */}
          <Button
            variant="primary"
            size="lg"
            onClick={handlePostInvoice}
            isLoading={isSubmitting}
            className="w-full font-bold shadow-lg shadow-indigo-600/30"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Complete & Issue Invoice
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
          <div className="flex justify-center gap-2 pb-2 border-b border-slate-800 no-print">
            <button
              onClick={() => setPrinterWidth('3inch')}
              className={`px-3 py-1 text-xs rounded-lg font-medium ${
                printerWidth === '3inch' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              3-Inch Thermal (80mm)
            </button>
            <button
              onClick={() => setPrinterWidth('2inch')}
              className={`px-3 py-1 text-xs rounded-lg font-medium ${
                printerWidth === '2inch' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              2-Inch Thermal (58mm)
            </button>
          </div>

          {/* Physical Receipt Container */}
          <div
            className={`mx-auto bg-white text-black font-mono text-[11px] p-4 rounded shadow-lg leading-tight ${
              printerWidth === '2inch' ? 'w-56 text-[10px]' : 'w-72'
            }`}
          >
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h3 className="font-bold text-sm tracking-tight uppercase">Shree Ganesh Supermarket</h3>
              <p className="text-[10px]">Station Road, Dadar West, Mumbai</p>
              <p className="text-[10px]">GSTIN: 27AAPFU0939F1ZV</p>
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

            {/* Simulated UPI Scan QR */}
            <div className="text-center pt-3 flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-100 border border-gray-300 flex items-center justify-center p-1 rounded">
                <QrCode className="w-16 h-16 text-black" />
              </div>
              <p className="text-[9px] mt-1 text-gray-600">Scan & Pay via any UPI App</p>
              <p className="text-[10px] font-bold mt-2">*** THANK YOU VISIT AGAIN ***</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 no-print">
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print Receipt
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsReceiptModalOpen(false)}
            >
              New Bill
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
