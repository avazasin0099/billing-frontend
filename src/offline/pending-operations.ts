import { getLocalDb, PendingInvoice, SyncQueueEvent } from './local-db';
import { Item, Customer } from '../types';

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
    shopId: string;
    items: any[];
    payments: any[];
    totalAmount: number;
    customerId?: string;
    customerName?: string;
  }): Promise<PendingInvoice> {
    const db = await getLocalDb();
    const id = `off-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const pendingInvoice: PendingInvoice = {
      id,
      shopId: invoiceData.shopId,
      invoiceDate: new Date().toISOString().slice(0, 10),
      customerId: invoiceData.customerId,
      customerName: invoiceData.customerName,
      items: invoiceData.items,
      payments: invoiceData.payments,
      totalAmount: invoiceData.totalAmount,
      syncStatus: 'PENDING',
      createdAt: Date.now(),
    };

    const syncEvent: SyncQueueEvent = {
      id,
      eventType: 'CREATE_INVOICE',
      entityName: 'Invoice',
      entityId: id,
      payload: {
        id,
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

  public static async getSyncQueue(): Promise<SyncQueueEvent[]> {
    const db = await getLocalDb();
    return await db.getAll('sync_queue');
  }

  public static async markEventSynced(id: string): Promise<void> {
    const db = await getLocalDb();
    const tx = db.transaction(['pending_invoices', 'sync_queue'], 'readwrite');
    await tx.objectStore('sync_queue').delete(id);

    const pending = await tx.objectStore('pending_invoices').get(id);
    if (pending) {
      pending.syncStatus = 'SYNCED';
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
