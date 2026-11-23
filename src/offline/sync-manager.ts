import { LocalDbService } from './pending-operations';

/**
 * Automatic (online-event / background) syncs stop retrying an event after this many
 * failures, so a bill the server keeps rejecting (e.g. a deleted item) does not hammer the API
 * forever. It stays in the queue and is still sent on a MANUAL sync from the top bar.
 */
const MAX_AUTO_RETRIES = 10;

const currentShopId = (): string | null =>
  typeof window === 'undefined' ? null : localStorage.getItem('billpro_shop_id');

export class SyncManager {
  private static isSyncing = false;
  private static listeners: ((isSyncing: boolean, pendingCount: number) => void)[] = [];

  public static subscribe(listener: (isSyncing: boolean, pendingCount: number) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notify(pendingCount: number) {
    for (const listener of this.listeners) {
      listener(this.isSyncing, pendingCount);
    }
  }

  /** Pending bills for the shop currently logged in. */
  public static async getPendingCount(): Promise<number> {
    if (typeof window === 'undefined') return 0;
    const shopId = currentShopId();
    if (!shopId) return 0;
    try {
      const queue = await LocalDbService.getSyncQueue(shopId);
      return queue.length;
    } catch {
      return 0;
    }
  }

  /** Re-count the queue and tell subscribers (e.g. the top-bar "Pending Sync" pill). */
  public static async refreshPendingCount(): Promise<void> {
    this.notify(await this.getPendingCount());
  }

  /** Pending bills across ALL shops on this device (used to warn before logout). */
  public static async getTotalPendingCount(): Promise<number> {
    if (typeof window === 'undefined') return 0;
    try {
      return (await LocalDbService.getSyncQueue()).length;
    } catch {
      return 0;
    }
  }

  /**
   * Push queued offline bills for the CURRENT shop only. Bills queued while logged into a
   * different shop stay on the device until someone logs into that shop again — they are never
   * posted under the wrong shop.
   */
  public static async triggerSync(
    apiClient: any,
    options: { manual?: boolean } = {}
  ): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing || typeof window === 'undefined' || !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }
    const shopId = currentShopId();
    if (!shopId || !localStorage.getItem('billpro_token')) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const shopQueue = await LocalDbService.getSyncQueue(shopId);
      const queue = options.manual ? shopQueue : shopQueue.filter((e) => e.retryCount < MAX_AUTO_RETRIES);
      this.notify(shopQueue.length);

      if (queue.length === 0) {
        return { synced: 0, failed: 0 };
      }

      const eventsPayload = queue.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        entityName: e.entityName,
        entityId: e.entityId,
        payload: e.payload,
      }));

      const response = await apiClient.post('/sync/events', { events: eventsPayload });

      if (response && Array.isArray(response.results)) {
        for (const res of response.results) {
          if (res.status === 'PROCESSED') {
            await LocalDbService.markEventSynced(res.id);
            synced++;
          } else {
            await LocalDbService.markEventFailed(res.id, res.error || 'Server error during sync');
            failed++;
          }
        }
      }
    } catch (err: any) {
      console.error('Offline sync failed:', err);
    } finally {
      this.isSyncing = false;
      const remaining = await this.getPendingCount();
      this.notify(remaining);
    }

    return { synced, failed };
  }
}
