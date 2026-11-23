import { getLocalDb, PendingInvoice, SyncQueueEvent } from './local-db';
import { Item, Customer } from '../types';

/** RFC-4122 v4 UUID (server sync tables use UUID columns). */
export const newUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Fallback for very old browsers / non-secure contexts.
  const bytes = new Uint8Array(16);
  (typeof crypto !== 'undefined' ? crypto : (window as any).msCrypto).getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/** Local calendar date (YYYY-MM-DD) — toISOString() is UTC and gives yesterday before 05:30 IST. */
export const localIsoDate = (d: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export class LocalDbService {
  // --- Items Cache ---
  public static async cacheItems(items: Item[]): Promise<void> {
    const db = await getLocalDb();
    const tx = db.transaction('items_cache', 'readwrite');
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
  }

  public static async getCachedItems(): Promise<Item[]> {
    const db = await getLocalDb();
    return await db.getAll('items_cache');
  }

  public static async findCachedItemByBarcode(barcode: string): Promise<Item | undefined> {
    const db = await getLocalDb();
    return await db.getFromIndex('items_cache', 'by-barcode', barcode);
  }

  // --- Customers Cache ---
  public static async cacheCustomers(customers: Customer[]): Promise<void> {
    const db = await getLocalDb();
    const tx = db.transaction('customers_cache', 'readwrite');
    for (const c of customers) {
      await tx.store.put(c);
    }
    await tx.done;
  }

  public static async getCachedCustomers(): Promise<Customer[]> {
    const db = await getLocalDb();
    return await db.getAll('customers_cache');
  }

  // --- Pending Invoices & Queue ---
  public static async saveOfflineInvoice(invoiceData: {
    /**
     * The checkout's idempotency key. Re-using it as the offline id means that if the online
     * attempt actually reached the server before the network dropped, the later sync is
     * de-duplicated server-side instead of posting the bill twice.
     */
    id?: string;
    shopId: string;
    invoiceDate?: string;
    items: any[];
    payments: any[];
    totalAmount: number;
    customerId?: string;
    customerName?: string;
  }): Promise<PendingInvoice> {
    const db = await getLocalDb();
    const id = invoiceData.id || newUuid();

    const pendingInvoice: PendingInvoice = {
      id,
      shopId: invoiceData.shopId,
      invoiceDate: invoiceData.invoiceDate || localIsoDate(),
      customerId: invoiceData.customerId || undefined,
      customerName: invoiceData.customerName,
      items: invoiceData.items,
      payments: invoiceData.payments,
      totalAmount: invoiceData.totalAmount,
      syncStatus: 'PENDING',
      createdAt: Date.now(),
    };

    const syncEvent: SyncQueueEvent = {
      id,
      shopId: invoiceData.shopId,
      eventType: 'CREATE_INVOICE',
      entityName: 'Invoice',
      entityId: id,
      payload: {
        idempotencyKey: id,
        invoiceDate: pendingInvoice.invoiceDate,
        customerId: pendingInvoice.customerId,
        items: pendingInvoice.items,
        payments: pendingInvoice.payments,
      },
      retryCount: 0,
      createdAt: Date.now(),
    };

    const tx = db.transaction(['pending_invoices', 'sync_queue'], 'readwrite');
    await tx.objectStore('pending_invoices').put(pendingInvoice);
    await tx.objectStore('sync_queue').put(syncEvent);
    await tx.done;

    return pendingInvoice;
  }

  public static async getPendingInvoices(): Promise<PendingInvoice[]> {
    const db = await getLocalDb();
    return await db.getAllFromIndex('pending_invoices', 'by-created');
  }

  /**
   * Queued events, optionally only those belonging to `shopId`. Events saved by older builds
   * have no shopId on the event, so fall back to the shop recorded on the pending invoice.
   */
  public static async getSyncQueue(shopId?: string): Promise<SyncQueueEvent[]> {
    const db = await getLocalDb();
    const events = await db.getAll('sync_queue');
    if (!shopId) return events;

    const result: SyncQueueEvent[] = [];
    for (const e of events) {
      let eventShop = e.shopId;
      if (!eventShop) {
        const pending = await db.get('pending_invoices', e.id);
        eventShop = pending?.shopId;
      }
      if (eventShop === shopId) result.push(e);
    }
    return result;
  }

  public static async markEventSynced(id: string): Promise<void> {
    const db = await getLocalDb();
    const tx = db.transaction(['pending_invoices', 'sync_queue'], 'readwrite');
    await tx.objectStore('sync_queue').delete(id);

    const pending = await tx.objectStore('pending_invoices').get(id);
    if (pending) {
      pending.syncStatus = 'SYNCED';
      pending.errorMessage = undefined;
      await tx.objectStore('pending_invoices').put(pending);
    }
    await tx.done;
  }

  public static async markEventFailed(id: string, errorMessage: string): Promise<void> {
    const db = await getLocalDb();
    const tx = db.transaction(['pending_invoices', 'sync_queue'], 'readwrite');

    const event = await tx.objectStore('sync_queue').get(id);
    if (event) {
      event.retryCount += 1;
      event.lastAttemptAt = Date.now();
      event.lastError = errorMessage;
      await tx.objectStore('sync_queue').put(event);
    }

    const pending = await tx.objectStore('pending_invoices').get(id);
    if (pending) {
      pending.syncStatus = 'FAILED';
      pending.errorMessage = errorMessage;
      await tx.objectStore('pending_invoices').put(pending);
    }
    await tx.done;
  }
}
