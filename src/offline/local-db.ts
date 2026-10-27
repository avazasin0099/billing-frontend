import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Item, Customer } from '../types';

export interface PendingInvoice {
  id: string; // client uuid
  shopId: string;
  invoiceDate: string;
  customerId?: string;
  customerName?: string;
  items: any[];
  payments: any[];
  totalAmount: number;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  errorMessage?: string;
  createdAt: number;
}

export interface SyncQueueEvent {
  id: string;
  eventType: string; // 'CREATE_INVOICE'
  entityName: string;
  entityId: string;
  payload: any;
  retryCount: number;
  lastAttemptAt?: number;
  createdAt: number;
}

interface BillProOfflineDB extends DBSchema {
  items_cache: {
    key: string;
    value: Item;
    indexes: { 'by-barcode': string; 'by-name': string };
  };
  customers_cache: {
    key: string;
    value: Customer;
    indexes: { 'by-phone': string };
  };
  pending_invoices: {
    key: string;
    value: PendingInvoice;
    indexes: { 'by-status': string; 'by-created': number };
  };
  sync_queue: {
    key: string;
    value: SyncQueueEvent;
    indexes: { 'by-created': number };
  };
  app_meta: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<BillProOfflineDB>> | null = null;

export const getLocalDb = async (): Promise<IDBPDatabase<BillProOfflineDB>> => {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only accessible in the browser');
  }

  if (!dbPromise) {
    dbPromise = openDB<BillProOfflineDB>('BillProOfflineDB', 1, {
      upgrade(db) {
        // Items cache store
        if (!db.objectStoreNames.contains('items_cache')) {
          const itemStore = db.createObjectStore('items_cache', { keyPath: 'id' });
          itemStore.createIndex('by-barcode', 'barcode', { unique: false });
          itemStore.createIndex('by-name', 'name', { unique: false });
        }

        // Customers cache store
        if (!db.objectStoreNames.contains('customers_cache')) {
          const custStore = db.createObjectStore('customers_cache', { keyPath: 'id' });
          custStore.createIndex('by-phone', 'phone', { unique: false });
        }

        // Pending invoices store
        if (!db.objectStoreNames.contains('pending_invoices')) {
          const invStore = db.createObjectStore('pending_invoices', { keyPath: 'id' });
          invStore.createIndex('by-status', 'syncStatus', { unique: false });
          invStore.createIndex('by-created', 'createdAt', { unique: false });
        }

        // Sync events queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          syncStore.createIndex('by-created', 'createdAt', { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains('app_meta')) {
          db.createObjectStore('app_meta');
        }
      },
    });
  }

  return dbPromise;
};
