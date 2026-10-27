export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER';

export type PaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'CHEQUE'
  | 'CREDIT'
  | 'OTHER';

export type InvoiceStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
}

export interface Shop {
  id: string;
  name: string;
  state: string;
  stateCode: string;
  gstin?: string;
  phone?: string;
  address?: string;
  settings?: any;
}

export interface TaxCategory {
  id: string;
  name: string;
  taxRate: number;
  cessRate: number;
}

export interface Unit {
  id: string;
  name: string;
  code: string;
  symbol: string;
}

export interface Item {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  hsnCode?: string;
  category?: string;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  isTaxInclusive: boolean;
  gstRate: number;
  cessRate: number;
  currentStock: number;
  reorderLevel: number;
  trackBatches: boolean;
  isActive: boolean;
  imageUrl?: string;
  taxCategory?: TaxCategory;
  unit?: Unit;
}

export interface CartItem {
  item: Item;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalTaxAmount: number;
  lineTotal: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  billingAddress?: string;
  state?: string;
  stateCode?: string;
  creditLimit: number;
  currentBalance: number;
  isActive: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  companyName?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  state?: string;
  stateCode?: string;
  currentBalance: number;
  isActive: boolean;
}

export interface PaymentRecord {
  id?: string;
  paymentMethod: PaymentMethod;
  amount: number;
  transactionReference?: string;
  paymentDate?: string;
  notes?: string;
}

export interface InvoiceLine {
  id: string;
  itemId: string;
  itemName: string;
  hsnCode?: string;
  quantity: number;
  unitCode: string;
  unitPrice: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  lineTotal: number;
}

export interface InvoiceTaxSummary {
  gstRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
}

export interface Invoice {
  id: string;
  shopId: string;
  customerId?: string;
  customer?: Customer;
  invoiceNumber: string;
  invoiceType: string;
  invoiceDate: string;
  dueDate?: string;
  placeOfSupplyStateCode: string;
  isInterstate: boolean;
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  roundOffAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  notes?: string;
  lines?: InvoiceLine[];
  taxSummaries?: InvoiceTaxSummary[];
  payments?: PaymentRecord[];
  createdAt: string;
}
