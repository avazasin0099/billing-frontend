import { LocalDbService } from './pending-operations';

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

  public static async getPendingCount(): Promise<number> {
    if (typeof window === 'undefined') return 0;
    try {
      const queue = await LocalDbService.getSyncQueue();
      return queue.length;
    } catch {
      return 0;
    }
  }

  public static async triggerSync(apiClient: any): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing || typeof window === 'undefined' || !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const queue = await LocalDbService.getSyncQueue();
      this.notify(queue.length);

      if (queue.length === 0) {
        this.isSyncing = false;
        return { synced: 0, failed: 0 };
      }

      // Batch send to backend /api/v1/sync/events
      const eventsPayload = queue.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        entityName: e.entityName,
        entityId: e.entityId,
        payload: e.payload,
      }));

      const response = await apiClient.post('/sync/events', { events: eventsPayload });

      if (response && response.results) {
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
