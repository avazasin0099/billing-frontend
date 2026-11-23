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
  UserPlus,
  Volume2,
  VolumeX,
  PackageOpen,
  Pencil,
  Check,
  X,
  Info,
  Banknote,
  Smartphone,
  BookUser,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Badge, Input, Select } from '@/components/ui/card';
import { controlClass } from '@/components/ui/field';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState, Tabs } from '@/components/ui/page';
import { toast } from '@/components/ui/toast';
import { api, ApiError } from '@/services/api-client';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { categoryIcon } from '@/lib/category-icon';
import { useSession } from '@/lib/session';
import { Item, CartItem, Customer, PaymentMethod } from '@/types';
import { LocalDbService, newUuid, localIsoDate } from '@/offline/pending-operations';
import { SyncManager } from '@/offline/sync-manager';
import { posAudio } from '@/lib/sound';
import { NumberInput } from '@/components/ui/number-input';

// All GST state/UT codes — a customer in any state must be selectable, else intra/inter-state
// GST is mis-classified. Kept in sync with the backend INDIAN_STATES map.
const INDIAN_STATE_CODES: Array<[string, string]> = [
  ['01', 'Jammu & Kashmir'], ['02', 'Himachal Pradesh'], ['03', 'Punjab'], ['04', 'Chandigarh'],
  ['05', 'Uttarakhand'], ['06', 'Haryana'], ['07', 'Delhi'], ['08', 'Rajasthan'],
  ['09', 'Uttar Pradesh'], ['10', 'Bihar'], ['11', 'Sikkim'], ['12', 'Arunachal Pradesh'],
  ['13', 'Nagaland'], ['14', 'Manipur'], ['15', 'Mizoram'], ['16', 'Tripura'], ['17', 'Meghalaya'],
  ['18', 'Assam'], ['19', 'West Bengal'], ['20', 'Jharkhand'], ['21', 'Odisha'], ['22', 'Chhattisgarh'],
  ['23', 'Madhya Pradesh'], ['24', 'Gujarat'], ['26', 'Dadra & Nagar Haveli and Daman & Diu'],
  ['27', 'Maharashtra'], ['29', 'Karnataka'], ['30', 'Goa'], ['31', 'Lakshadweep'], ['32', 'Kerala'],
  ['33', 'Tamil Nadu'], ['34', 'Puducherry'], ['35', 'Andaman & Nicobar Islands'], ['36', 'Telangana'],
  ['37', 'Andhra Pradesh'], ['38', 'Ladakh'],
];

// Standard 15-char GSTIN format.
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function BillingPosPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  // Inline per-line price editing (for the current bill only)
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState('');
  const [heldCarts, setHeldCarts] = useState<{ id: string; name: string; cart: CartItem[]; customerId?: string }[]>([]);

  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Quick Customer Modal
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');
  // Default new customers to the shop's own state (most walk-in B2C customers are local).
  const [newCustStateCode, setNewCustStateCode] = useState<string>(() => {
    try {
      return JSON.parse(localStorage.getItem('billpro_shop') || '{}').stateCode || '27';
    } catch {
      return '27';
    }
  });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ method: PaymentMethod; amount: number; reference?: string }[]>([]);
  const [transactionRef, setTransactionRef] = useState('');
  const [activePaymentTab, setActivePaymentTab] = useState<PaymentMethod>('CASH');

  // Receipt modal state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const { shop } = useSession();
  // Default print format comes from Settings (thermalPrinterWidth), not a hard-coded A4.
  const [printerWidth, setPrinterWidth] = useState<'3inch' | '2inch' | 'a4'>(
    (shop?.settings?.thermalPrinterWidth as '3inch' | '2inch' | 'a4') || '3inch'
  );
  const [confirmClear, setConfirmClear] = useState(false);

  const [soundActive, setSoundActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [checkoutKey, setCheckoutKey] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Only OWNER / MANAGER may change a line's price (the server enforces this too; offline
  // cashier overrides are flagged for manager review on sync).
  const canEditPrice = React.useMemo(() => {
    try {
      const role = JSON.parse(localStorage.getItem('billpro_user') || '{}').role;
      return role === 'OWNER' || role === 'MANAGER';
    } catch {
      return false;
    }
  }, []);

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

  // Supplier (shop) state code, persisted at login — needed to decide intra- vs inter-state GST.
  const shopStateCode = React.useMemo(() => {
    try {
      return (JSON.parse(localStorage.getItem('billpro_shop') || '{}').stateCode as string) || '';
    } catch {
      return '';
    }
  }, []);

  // Inter-state when the selected customer's state differs from the shop's. Walk-in (no customer)
  // defaults to intra-state, matching the backend's GstService.isInterstate.
  const isInterstate = React.useMemo(() => {
    const cust = customers.find((c) => c.id === selectedCustomerId);
    const custState = cust?.stateCode?.trim();
    if (!custState || !shopStateCode) return false;
    return custState !== shopStateCode.trim();
  }, [customers, selectedCustomerId, shopStateCode]);

  // Deterministic Line Math — mirrors backend GstService.calculateLine exactly (intra/inter-state
  // split, cess, tax-inclusive back-calc) so the on-screen breakup never drifts from what is stored.
  const recalculateCartItem = (
    item: Item,
    quantity: number,
    discountAmount: number,
    interstate: boolean,
    // Per-bill price override. When provided, this unit price is used for this line instead of the
    // catalogue sellingPrice — lets the cashier edit the rate for a single bill without touching the item master.
    unitPriceOverride?: number
  ): CartItem => {
    const round = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
    const unitPrice =
      unitPriceOverride != null && Number.isFinite(unitPriceOverride) && unitPriceOverride >= 0
        ? round(unitPriceOverride)
        : Number(item.sellingPrice);
    const grossAmount = round(unitPrice * quantity);
    const net = Math.max(0, grossAmount - discountAmount);

    const rate = Number(item.gstRate) || 0;
    const cessRate = Number(item.cessRate) || 0;
    const effectiveTotalRate = rate + cessRate;

    let taxableAmount: number;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let cessAmount = 0;

    if (item.isTaxInclusive) {
      taxableAmount = round(net / (1 + effectiveTotalRate / 100));
      const totalTaxPlusCess = round(net - taxableAmount);
      if (effectiveTotalRate > 0) {
        const totalGst = round(totalTaxPlusCess * (rate / effectiveTotalRate));
        cessAmount = round(totalTaxPlusCess - totalGst);
        if (interstate) {
          igstAmount = totalGst;
        } else {
          cgstAmount = round(totalGst / 2);
          sgstAmount = round(totalGst - cgstAmount);
        }
      }
    } else {
      taxableAmount = round(net);
      if (rate > 0) {
        if (interstate) {
          igstAmount = round(taxableAmount * (rate / 100));
        } else {
          cgstAmount = round(taxableAmount * (rate / 2 / 100));
          sgstAmount = round(taxableAmount * (rate / 2 / 100));
        }
      }
      if (cessRate > 0) cessAmount = round(taxableAmount * (cessRate / 100));
    }

    const totalTax = round(cgstAmount + sgstAmount + igstAmount + cessAmount);
    const lineTotal = round(taxableAmount + totalTax);

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

  // Re-split existing cart lines when the intra/inter-state status flips (e.g. customer changed).
  useEffect(() => {
    setCart((prev) =>
      prev.map((ci) => recalculateCartItem(ci.item, ci.quantity, ci.discountAmount, isInterstate, ci.unitPrice))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInterstate]);

  // Cart operations
  const addToCart = (item: Item) => {
    posAudio.playScanBeep();
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.item.id === item.id
            ? recalculateCartItem(item, ci.quantity + 1, ci.discountAmount, isInterstate, ci.unitPrice)
            : ci
        );
      }
      return [...prev, recalculateCartItem(item, 1, 0, isInterstate)];
    });
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((ci) =>
        ci.item.id === itemId ? recalculateCartItem(ci.item, newQty, ci.discountAmount, isInterstate, ci.unitPrice) : ci
      )
    );
  };

  const updateDiscount = (itemId: string, discount: number) => {
    setCart((prev) =>
      prev.map((ci) =>
        ci.item.id === itemId ? recalculateCartItem(ci.item, ci.quantity, discount, isInterstate, ci.unitPrice) : ci
      )
    );
  };

  // Edit the unit price for a single line of the current bill only. The catalogue sellingPrice is
  // left untouched — a blank/invalid entry falls back to the catalogue rate.
  const updateUnitPrice = (itemId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((ci) =>
        ci.item.id === itemId
          ? recalculateCartItem(ci.item, ci.quantity, ci.discountAmount, isInterstate, newPrice)
          : ci
      )
    );
  };

  // Open the inline price editor for a line, seeding the draft with the current unit price.
  const beginEditPrice = (ci: CartItem) => {
    setEditingPriceId(ci.item.id);
    setPriceDraft(String(ci.unitPrice));
  };

  // Commit the edited price (blank/invalid → revert to catalogue sellingPrice) and close the editor.
  const commitEditPrice = (itemId: string) => {
    const parsed = parseFloat(priceDraft);
    const item = cart.find((ci) => ci.item.id === itemId)?.item;
    const fallback = item ? Number(item.sellingPrice) : 0;
    updateUnitPrice(itemId, Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback);
    setEditingPriceId(null);
    setPriceDraft('');
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
      toast.error(`No product with barcode ${barcodeInput.trim()}`, 'Check the code or add the product in Items.');
      setBarcodeInput('');
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
    setCheckoutKey(newUuid());
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

  // CREDIT ("Udhaar") is not money collected — it is the balance left on the customer's account,
  // so it never reduces the amount still due (which in turn forces a registered customer to be selected).
  const totalAllocated = splitPayments.reduce(
    (sum, p) => sum + (p.method === 'CREDIT' ? 0 : Number(p.amount)),
    0
  );
  const remainingBalance = Math.max(0, roundedTotal - totalAllocated);

  // Global keyboard shortcuts (F2 search, F8 barcode, F4 hold, F9 pay). Esc is handled by <Modal>.
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isPaymentModalOpen, isReceiptModalOpen, isQuickCustomerOpen]);

  // Quick Customer Creation
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    const gstin = newCustGstin.trim().toUpperCase();
    if (gstin) {
      if (!GSTIN_REGEX.test(gstin)) {
        posAudio.playErrorBuzz();
        toast.error('Invalid GSTIN', 'Expected 15 characters, e.g. 27AAAAA0000A1Z5.');
        return;
      }
      if (gstin.slice(0, 2) !== newCustStateCode) {
        posAudio.playErrorBuzz();
        toast.error('GSTIN and state do not match', `GSTIN starts with ${gstin.slice(0, 2)} but the selected state is ${newCustStateCode}.`);
        return;
      }
    }
    setIsSavingCustomer(true);
    try {
      const created = await api.post('/parties/customers', {
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        gstin: gstin || undefined,
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
      toast.success(`${created.name} added to this bill`);
    } catch (err: any) {
      toast.error('Could not save customer', err.message);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Submit and Post Bill
  const handlePostInvoice = async () => {
    if (remainingBalance > 0 && !selectedCustomerId) {
      posAudio.playErrorBuzz();
      toast.error('Select a customer for udhaar', 'An unpaid balance can only be recorded against a registered customer.');
      return;
    }

    setIsSubmitting(true);

    // One key per checkout: used for the online POST *and* as the offline queue id, so a bill
    // whose online request reached the server just before the network dropped is never doubled.
    const billKey = checkoutKey || newUuid();

    const payload = {
      customerId: selectedCustomerId || undefined,
      invoiceDate: localIsoDate(),
      idempotencyKey: billKey,
      items: cart.map((ci) => ({
        itemId: ci.item.id,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        discountAmount: ci.discountAmount,
      })),
      payments: splitPayments
        // Drop CREDIT and zero tenders — the unpaid remainder is booked to the customer ledger server-side.
        .filter((p) => p.amount > 0 && p.method !== 'CREDIT')
        .map((p) => ({
          paymentMethod: p.method,
          amount: p.amount,
          transactionReference: transactionRef || undefined,
        })),
    };

    const saveOffline = async () => {
      const shopId = localStorage.getItem('billpro_shop_id');
      if (!shopId) throw new Error('No active shop on this device. Please log in again.');
      const cust = customers.find((c) => c.id === selectedCustomerId);
      const offlineRecord = await LocalDbService.saveOfflineInvoice({
        id: billKey,
        shopId,
        invoiceDate: payload.invoiceDate,
        items: payload.items,
        payments: payload.payments,
        totalAmount: roundedTotal,
        customerId: selectedCustomerId || undefined,
        customerName: cust?.name,
      });
      SyncManager.refreshPendingCount().catch(() => {});
      toast.warning('Saved offline', 'No connection — this bill is stored on the device and will sync automatically.');

      return {
        ...offlineRecord,
        invoiceNumber: `OFFLINE-${offlineRecord.id.slice(-6).toUpperCase()}`,
        totalAmount: roundedTotal,
        paidAmount: Math.min(roundedTotal, totalAllocated),
        balanceAmount: remainingBalance,
        customer: cust,
        lines: cart.map((ci) => ({
          itemName: ci.item.name,
          quantity: ci.quantity,
          unitPrice: ci.unitPrice,
          lineTotal: ci.lineTotal,
        })),
      };
    };

    try {
      let createdInvoice: any;

      if (!navigator.onLine) {
        createdInvoice = await saveOffline();
      } else {
        try {
          createdInvoice = await api.post('/invoices', payload);
        } catch (err: any) {
          // navigator.onLine is true whenever Wi-Fi is up, even with no internet. If the request
          // never got an answer, queue the bill instead of losing the sale. Validation / stock /
          // permission errors (4xx) are NOT queued — the cashier must fix those now.
          if (err instanceof ApiError && err.isNetworkError) {
            createdInvoice = await saveOffline();
          } else {
            throw err;
          }
        }
      }

      posAudio.playSuccessChime();
      setLastInvoice(createdInvoice);
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
      clearCart();
      setSelectedCustomerId('');
    } catch (err: any) {
      posAudio.playErrorBuzz();
      toast.error('Bill not issued', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const TENDER_LABEL: Record<string, string> = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', CREDIT: 'Udhaar', BANK_TRANSFER: 'Bank', CHEQUE: 'Cheque', OTHER: 'Other' };
  const tenderLabel = (m: PaymentMethod) => TENDER_LABEL[m] || m;

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 gap-4 lg:h-full lg:min-h-0 lg:grid-cols-12">
        {/* ─── Left: search, scan, categories, product grid ─── */}
        <section aria-label="Products" className="flex flex-col gap-3 lg:col-span-7 lg:h-full lg:min-h-0">
          <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-12">
            <div className="sm:col-span-6">
              <Input
                ref={searchInputRef}
                aria-label="Search products"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or SKU"
                icon={<Search />}
                suffix={<kbd>F2</kbd>}
              />
            </div>
            <form onSubmit={handleBarcodeSubmit} className="sm:col-span-5">
              <Input
                ref={barcodeInputRef}
                aria-label="Scan barcode"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode"
                icon={<Barcode />}
                suffix={<kbd>F8</kbd>}
                className="font-mono"
              />
            </form>
            <div className="flex justify-end sm:col-span-1">
              <IconButton
                variant="secondary"
                label={soundActive ? 'Mute scanner sounds' : 'Turn on scanner sounds'}
                onClick={toggleSound}
                aria-pressed={soundActive}
              >
                {soundActive ? <Volume2 /> : <VolumeX />}
              </IconButton>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex shrink-0 gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
            {['ALL', ...categories].map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  aria-pressed={active}
                  className={cn(
                    'h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-fg'
                      : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg'
                  )}
                >
                  {cat === 'ALL' ? `All items (${items.length})` : cat}
                </button>
              );
            })}
          </div>

          {/* Product grid */}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            {filteredItems.length === 0 ? (
              <Card className="h-full">
                <EmptyState
                  icon={items.length === 0 ? PackageOpen : Search}
                  title={items.length === 0 ? 'No products yet' : 'No matching products'}
                  description={
                    items.length === 0
                      ? 'Add your first product to start billing and tracking stock.'
                      : 'Try a different search term or category.'
                  }
                  action={
                    <Button onClick={() => navigate('/items')}>
                      <Plus /> Add product
                    </Button>
                  }
                />
              </Card>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3">
                {filteredItems.map((item) => {
                  const stockNum = Number(item.currentStock);
                  const isOutOfStock = stockNum <= 0;
                  const isLow = !isOutOfStock && stockNum <= Number(item.reorderLevel || 0);
                  const mrp = Number(item.mrp) || 0;
                  const price = Number(item.sellingPrice) || 0;
                  const cartLine = cart.find((ci) => ci.item.id === item.id);
                  const qty = cartLine?.quantity || 0;
                  const CategoryIcon = categoryIcon(item.category);
                  const unit = item.unit?.code || 'pcs';

                  return (
                    <li
                      key={item.id}
                      className={cn(
                        'flex flex-col overflow-hidden rounded-card border bg-surface transition-colors',
                        qty > 0 ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-border-strong',
                        isOutOfStock && 'opacity-60'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        disabled={isOutOfStock}
                        aria-label={`Add ${item.name}, ${formatCurrency(price)}`}
                        className="group text-left disabled:cursor-not-allowed"
                      >
                        <div className="relative flex h-20 items-center justify-center bg-surface-2">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt=""
                              loading="lazy"
                              width={160}
                              height={80}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <CategoryIcon className="size-8 text-fg-subtle" strokeWidth={1.5} aria-hidden="true" />
                          )}
                          {qty > 0 && (
                            <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-highlight px-1.5 text-xs font-semibold text-highlight-fg ring-1 ring-black/10 tabular-nums">
                              {qty}
                            </span>
                          )}
                        </div>
                        <div className="px-3 pt-2.5">
                          <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-fg group-hover:text-accent">
                            {item.name}
                          </p>
                          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                            <span className="text-sm font-semibold text-fg tabular-nums">{formatCurrency(price)}</span>
                            {mrp > price && (
                              <span className="text-xs text-fg-subtle line-through tabular-nums">MRP {formatCurrency(mrp)}</span>
                            )}
                          </div>
                          <p className="text-xs text-fg-subtle">{Number(item.gstRate) || 0}% GST</p>
                        </div>
                      </button>

                      <div className="mt-auto flex items-center justify-between gap-2 px-3 pb-3 pt-2">
                        <Badge variant={isOutOfStock ? 'danger' : isLow ? 'warning' : 'neutral'}>
                          {isOutOfStock ? 'Out of stock' : `${stockNum} ${unit}`}
                        </Badge>
                        {qty > 0 ? (
                          <div className="flex items-center rounded-control border border-primary/40 bg-primary-soft">
                            <IconButton size="sm" label={`Remove one ${item.name}`} onClick={() => updateQuantity(item.id, qty - 1)}>
                              <Minus />
                            </IconButton>
                            <span className="w-6 text-center text-sm font-semibold text-accent tabular-nums" aria-live="polite">
                              {qty}
                            </span>
                            <IconButton size="sm" label={`Add one more ${item.name}`} onClick={() => updateQuantity(item.id, qty + 1)}>
                              <Plus />
                            </IconButton>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => addToCart(item)} disabled={isOutOfStock} aria-label={`Add ${item.name}`}>
                            <Plus /> Add
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ─── Right: current bill ─── */}
        <section
          aria-label="Current bill"
          className="flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-sm lg:sticky lg:top-0 lg:col-span-5"
        >
          <div className="space-y-3 border-b border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
                <ShoppingBag className="size-5 text-fg-subtle" aria-hidden="true" />
                Current bill
                <Badge variant="highlight">{cart.length} {cart.length === 1 ? 'item' : 'items'}</Badge>
              </h2>
              {cart.length > 0 && (
                <div className="flex items-center gap-1">
                  <Button variant="secondary" size="sm" onClick={handleHoldCart} title="Hold this bill (F4)">
                    <PauseCircle /> Hold <kbd className="ml-1">F4</kbd>
                  </Button>
                  <IconButton variant="danger-ghost" label="Clear bill" onClick={() => setConfirmClear(true)}>
                    <Trash2 />
                  </IconButton>
                </div>
              )}
            </div>

            {heldCarts.length > 0 && (
              <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Held bills">
                {heldCarts.map((h) => (
                  <Button key={h.id} variant="secondary" size="sm" onClick={() => handleRecallCart(h.id)}>
                    <PlayCircle /> {h.name}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <Select
                aria-label="Customer"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                icon={<User />}
                containerClassName="flex-1"
              >
                <option value="">Walk-in customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` · ${c.phone}` : ''}
                    {Number(c.currentBalance) > 0 ? ` · Due ${formatCurrency(c.currentBalance)}` : ''}
                  </option>
                ))}
              </Select>
              <Button variant="secondary" onClick={() => setIsQuickCustomerOpen(true)}>
                <UserPlus /> New
              </Button>
            </div>
          </div>

          {/* Lines */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No items in this bill"
                description="Scan a barcode or pick products from the list."
              />
            ) : (
              <ul className="divide-y divide-border">
                {cart.map((ci) => (
                  <li key={ci.item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-fg">{ci.item.name}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
                        {!canEditPrice ? (
                          <span className="tabular-nums">{formatCurrency(ci.unitPrice)}</span>
                        ) : editingPriceId === ci.item.id ? (
                          <span className="inline-flex items-center gap-1">
                            <label htmlFor={`price-${ci.item.id}`} className="sr-only">
                              Price for {ci.item.name}
                            </label>
                            <input
                              id={`price-${ci.item.id}`}
                              type="number"
                              min={0}
                              step="0.01"
                              autoFocus
                              value={priceDraft}
                              onChange={(e) => setPriceDraft(e.target.value)}
                              onBlur={() => commitEditPrice(ci.item.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEditPrice(ci.item.id);
                                if (e.key === 'Escape') {
                                  e.stopPropagation();
                                  setEditingPriceId(null);
                                  setPriceDraft('');
                                }
                              }}
                              className="h-7 w-20 rounded-control border border-primary bg-surface px-2 font-mono text-xs text-fg focus:outline-none focus:ring-2 focus:ring-ring/40"
                            />
                            <IconButton
                              size="sm"
                              label="Save price"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => commitEditPrice(ci.item.id)}
                            >
                              <Check />
                            </IconButton>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => beginEditPrice(ci)}
                            className="inline-flex items-center gap-1 rounded tabular-nums hover:text-accent"
                            title="Change price for this bill only"
                          >
                            {formatCurrency(ci.unitPrice)}
                            {ci.unitPrice !== Number(ci.item.sellingPrice) && (
                              <span className="line-through">{formatCurrency(ci.item.sellingPrice)}</span>
                            )}
                            <Pencil className="size-3" aria-hidden="true" />
                          </button>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{ci.gstRate}% GST</span>
                        {ci.discountAmount > 0 && <span className="text-success">−{formatCurrency(ci.discountAmount)} off</span>}
                      </div>
                    </div>

                    <div className="flex items-center rounded-control border border-border-strong">
                      <IconButton size="sm" label={`Decrease ${ci.item.name}`} onClick={() => updateQuantity(ci.item.id, ci.quantity - 1)}>
                        <Minus />
                      </IconButton>
                      <span className="w-7 text-center text-sm font-semibold text-fg tabular-nums">{ci.quantity}</span>
                      <IconButton size="sm" label={`Increase ${ci.item.name}`} onClick={() => updateQuantity(ci.item.id, ci.quantity + 1)}>
                        <Plus />
                      </IconButton>
                    </div>

                    <div className="w-24 text-right text-sm font-semibold text-fg tabular-nums">{formatCurrency(ci.lineTotal)}</div>
                    <IconButton size="sm" variant="danger-ghost" label={`Remove ${ci.item.name}`} onClick={() => removeFromCart(ci.item.id)}>
                      <X />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Totals + checkout */}
          <div className="space-y-1.5 border-t border-border bg-surface-2/50 p-4 text-sm">
            <div className="flex justify-between text-fg-muted">
              <span>Taxable value</span>
              <span className="tabular-nums">{formatCurrency(totalTaxable)}</span>
            </div>
            <div className="flex justify-between text-fg-muted">
              <span>GST ({isInterstate ? 'IGST' : 'CGST + SGST'})</span>
              <span className="tabular-nums">{formatCurrency(totalTax)}</span>
            </div>
            {roundOff !== 0 && (
              <div className="flex justify-between text-fg-muted">
                <span>Round-off</span>
                <span className="tabular-nums">{roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-border pt-2">
              <span className="font-semibold text-fg">Total payable</span>
              <span className="text-xl font-semibold text-fg tabular-nums">{formatCurrency(roundedTotal)}</span>
            </div>
            <Button size="lg" className="mt-2 w-full" disabled={cart.length === 0} onClick={handleOpenCheckout}>
              <CreditCard /> Collect payment
              <kbd className="ml-auto border-primary-fg/30 bg-transparent text-primary-fg">F9</kbd>
            </Button>
          </div>
        </section>
      </div>

      {/* Clear bill confirmation */}
      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clearCart();
          setConfirmClear(false);
        }}
        title="Clear this bill?"
        confirmLabel="Clear bill"
        message={`All ${cart.length} item(s) will be removed from the current bill.`}
      />

      {/* Quick add customer */}
      <Modal isOpen={isQuickCustomerOpen} onClose={() => setIsQuickCustomerOpen(false)} title="New customer" maxWidth="md">
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <Input
            label="Customer name"
            placeholder="Full name"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            required
            autoFocus
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Mobile number"
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile"
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
            <Select label="State" value={newCustStateCode} onChange={(e) => setNewCustStateCode(e.target.value)}>
              {INDIAN_STATE_CODES.map(([code, name]) => (
                <option key={code} value={code}>
                  {code} · {name}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="GSTIN"
            hint="Optional — only for GST-registered businesses (B2B)."
            placeholder="15-character GSTIN"
            value={newCustGstin}
            onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
            maxLength={15}
            className="font-mono uppercase"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsQuickCustomerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingCustomer}>
              Save and add to bill
            </Button>
          </div>
        </form>
      </Modal>

      {/* Checkout */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Collect payment"
        maxWidth="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>
              Back to bill
            </Button>
            <Button onClick={handlePostInvoice} isLoading={isSubmitting}>
              <CheckCircle2 /> Issue bill
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-card border border-border bg-surface-2 p-3">
              <p className="text-xs font-medium text-fg-muted">Total payable</p>
              <p className="text-2xl font-semibold text-fg tabular-nums">{formatCurrency(roundedTotal)}</p>
            </div>
            <div
              className={cn(
                'rounded-card border p-3',
                remainingBalance > 0 ? 'border-warning/30 bg-warning-soft' : 'border-success/30 bg-success-soft'
              )}
            >
              <p className="text-xs font-medium text-fg-muted">Balance due</p>
              <p className={cn('text-2xl font-semibold tabular-nums', remainingBalance > 0 ? 'text-warning' : 'text-success')}>
                {formatCurrency(remainingBalance)}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-fg">Payment method</p>
            <Tabs
              label="Payment method"
              fullWidth
              value={activePaymentTab}
              onChange={(m) => handleSelectPaymentMethod(m)}
              items={(['CASH', 'UPI', 'CARD', 'CREDIT'] as PaymentMethod[]).map((m) => ({
                value: m,
                label: tenderLabel(m),
                icon: m === 'CASH' ? Banknote : m === 'UPI' ? Smartphone : m === 'CARD' ? CreditCard : BookUser,
              }))}
            />
          </div>

          {activePaymentTab === 'UPI' && (
            <div className="flex gap-3 rounded-card border border-info/30 bg-info-soft p-3 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
              <p className="text-fg">
                Ask the customer to pay <strong className="tabular-nums">{formatCurrency(roundedTotal)}</strong> to your
                shop's UPI ID, check the payment on your UPI app, then enter the UPI reference number below.
              </p>
            </div>
          )}
          {activePaymentTab === 'CREDIT' && (
            <div className="flex gap-3 rounded-card border border-warning/30 bg-warning-soft p-3 text-sm">
              <BookUser className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <p className="text-fg">
                The unpaid amount is added to the customer's udhaar ledger. A registered customer must be selected.
              </p>
            </div>
          )}

          <fieldset className="space-y-2">
            <div className="flex items-center justify-between">
              <legend className="text-sm font-medium text-fg">Amounts</legend>
              <Button variant="link" size="sm" onClick={() => handleAddSplitPayment('CASH')}>
                <Plus /> Split payment
              </Button>
            </div>
            {splitPayments.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-sm text-fg-muted">{tenderLabel(p.method)}</span>
                <label htmlFor={`tender-${idx}`} className="sr-only">
                  {tenderLabel(p.method)} amount
                </label>
                <NumberInput
                  id={`tender-${idx}`}
                  value={p.amount}
                  onChange={(e) => handleUpdateSplitAmount(idx, Number(e.target.value))}
                  className={cn(controlClass, 'h-10 border-border-strong px-3 text-right font-mono')}
                  placeholder="0.00"
                />
                {splitPayments.length > 1 && (
                  <IconButton variant="danger-ghost" label={`Remove ${tenderLabel(p.method)} amount`} onClick={() => handleRemoveSplitPayment(idx)}>
                    <Trash2 />
                  </IconButton>
                )}
              </div>
            ))}
          </fieldset>

          <Input
            label={activePaymentTab === 'UPI' ? 'UPI reference number' : 'Reference / note'}
            hint={activePaymentTab === 'UPI' ? '12-digit UTR shown in the customer\'s UPI app.' : 'Optional.'}
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder={activePaymentTab === 'UPI' ? 'e.g. 412345678901' : 'Optional'}
          />
        </div>
      </Modal>

      {/* Receipt */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Bill issued"
        description={lastInvoice?.invoiceNumber ? `Invoice ${lastInvoice.invoiceNumber}` : undefined}
        maxWidth={printerWidth === 'a4' ? '4xl' : 'md'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsReceiptModalOpen(false)}>
              New bill
            </Button>
            <Button onClick={() => window.print()}>
              <Printer /> Print
            </Button>
          </>
        }
      >
        {(() => {
          const inv = lastInvoice || {};
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

          return (
            <div className="space-y-4">
              <div className="flex justify-center no-print">
                <Tabs
                  label="Print format"
                  value={printerWidth}
                  onChange={setPrinterWidth}
                  items={[
                    { value: '3inch', label: '80 mm thermal' },
                    { value: '2inch', label: '58 mm thermal' },
                    { value: 'a4', label: 'A4 invoice' },
                  ]}
                />
              </div>

              {printerWidth !== 'a4' ? (
                <div
                  className={cn(
                    'printable-receipt mx-auto bg-white p-4 font-mono leading-tight text-black shadow-sm ring-1 ring-black/10',
                    printerWidth === '2inch' ? 'w-56 text-xs' : 'w-72 text-xs'
                  )}
                >
                  <div className="border-b border-dashed border-black pb-2 text-center">
                    <p className="text-sm font-bold uppercase">{shopName}</p>
                    {shop?.address && <p>{shop.address}</p>}
                    {shop?.phone && <p>Ph: {shop.phone}</p>}
                    {shop?.gstin && <p>GSTIN: {shop.gstin}</p>}
                    <p className="mt-1 font-bold">{shop?.gstin ? 'TAX INVOICE' : 'BILL OF SUPPLY'}</p>
                  </div>
                  <div className="border-b border-dashed border-black py-2">
                    <div className="flex justify-between">
                      <span>No: {inv.invoiceNumber}</span>
                      <span>{dateText}</span>
                    </div>
                    <div>Customer: {inv.customer?.name || 'Walk-in'}</div>
                    {inv.customer?.gstin && <div>Cust. GSTIN: {inv.customer.gstin}</div>}
                  </div>
                  <div className="space-y-1 border-b border-dashed border-black py-2">
                    {lines.map((line, idx) => (
                      <div key={idx}>
                        <div className="truncate">{line.itemName}</div>
                        <div className="flex justify-between">
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
              ) : (
                <div className="mx-auto max-h-[60vh] overflow-auto">
                  <div
                    className="printable-a4 mx-auto bg-white text-xs text-black shadow-sm ring-1 ring-black/10"
                    style={{ width: '210mm', minHeight: '297mm', padding: '14mm' }}
                  >
                    <div className="flex items-start justify-between border-b-2 border-black pb-3">
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
                        <h3 className="text-lg font-bold uppercase">{shop?.gstin ? 'Tax Invoice' : 'Bill of Supply'}</h3>
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
                          <tr key={idx} className="border-b border-black/20">
                            <td className="px-2 py-1.5">{idx + 1}</td>
                            <td className="px-2 py-1.5">{line.itemName}</td>
                            <td className="px-2 py-1.5">{line.hsnCode || '—'}</td>
                            <td className="px-2 py-1.5 text-right">{Number(line.quantity)}</td>
                            <td className="px-2 py-1.5 text-right">{formatCurrency(line.unitPrice)}</td>
                            <td className="px-2 py-1.5 text-right">{line.gstRate != null ? `${Number(line.gstRate)}%` : '—'}</td>
                            <td className="px-2 py-1.5 text-right">{formatCurrency(line.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="mt-4 flex justify-end">
                      <div className="w-64 space-y-1">
                        {taxable != null && (
                          <div className="flex justify-between">
                            <span>Taxable amount</span>
                            <span>{formatCurrency(taxable)}</span>
                          </div>
                        )}
                        {inv.isInterstate ? (
                          inv.igstAmount != null && (
                            <div className="flex justify-between">
                              <span>IGST</span>
                              <span>{formatCurrency(inv.igstAmount)}</span>
                            </div>
                          )
                        ) : (
                          inv.cgstAmount != null && (
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
                          )
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

                    <div className="mt-10 flex items-end justify-between">
                      <p>This is a computer-generated invoice.</p>
                      <div className="text-center">
                        <div className="h-12" />
                        <p className="border-t border-black px-6 pt-1">Authorised signatory</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </DashboardLayout>
  );
}
