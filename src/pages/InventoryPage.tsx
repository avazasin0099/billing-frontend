import React, { useCallback, useEffect, useState } from 'react';
import { Boxes, TriangleAlert, History, Tag, SlidersHorizontal, Package, CircleCheck } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge, Input, Select } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table';
import { PageHeader, Tabs, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/page';
import { toast } from '@/components/ui/toast';
import { api, asList } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSession } from '@/lib/session';
import { Item } from '@/types';

type Tab = 'all' | 'alerts' | 'movements';

const MOVEMENT_LABEL: Record<string, string> = {
  OPENING_STOCK: 'Opening stock',
  PURCHASE: 'Purchase',
  SALE: 'Sale',
  SALE_RETURN: 'Sales return',
  PURCHASE_RETURN: 'Purchase return',
  ADJUSTMENT_IN: 'Count: added',
  ADJUSTMENT_OUT: 'Count: removed',
  STOCK_TAKE: 'Stock take',
  OFFLINE_OVERDRAFT: 'Offline oversell',
};

const REASONS = [
  { value: 'STOCK_TAKE_CORRECTION', label: 'Periodic stock count' },
  { value: 'DAMAGED', label: 'Damaged / broken' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'THEFT', label: 'Lost / stolen' },
  { value: 'FOUND', label: 'Extra stock found' },
  { value: 'OTHER', label: 'Other' },
];

export default function InventoryPage() {
  const { isManager } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [items, setItems] = useState<Item[]>([]);
  const [alerts, setAlerts] = useState<Item[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [physicalCount, setPhysicalCount] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('STOCK_TAKE_CORRECTION');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [sum, alertList, itemList, movList] = await Promise.all([
        api.get('/inventory/summary'),
        api.get('/inventory/alerts'),
        api.get('/items', { limit: 100, isActive: 'true' }),
        api.get('/inventory/movements', { limit: 50 }),
      ]);
      setSummary(sum);
      setAlerts(alertList || []);
      setItems(asList(itemList, 'items'));
      setMovements(asList(movList, 'movements'));
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdjust = (item: Item) => {
    setSelectedItem(item);
    setPhysicalCount(Number(item.currentStock));
    setAdjustReason('STOCK_TAKE_CORRECTION');
    setAdjustNotes('');
  };

  const variance = selectedItem && physicalCount !== '' ? Number(physicalCount) - Number(selectedItem.currentStock) : 0;

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || physicalCount === '') return;
    setIsSaving(true);
    try {
      await api.post('/inventory/adjustments', {
        itemId: selectedItem.id,
        physicalQty: Number(physicalCount),
        reason: adjustReason,
        notes: adjustNotes,
      });
      toast.success('Stock updated', `${selectedItem.name}: ${variance > 0 ? '+' : ''}${variance}`);
      setSelectedItem(null);
      loadData();
    } catch (err: any) {
      toast.error('Stock not updated', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const unit = (i: Item) => i.unit?.code || 'pcs';
  const stockBadge = (i: Item) => {
    const s = Number(i.currentStock);
    if (s <= 0) return <Badge variant="danger">Out of stock</Badge>;
    if (s <= Number(i.reorderLevel || 0)) return <Badge variant="warning">Low</Badge>;
    return <Badge variant="success">In stock</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-5">
        <PageHeader title="Stock" description="Current stock, low-stock alerts and every stock movement." />

        <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Stock value at cost"
            value={formatCurrency(summary?.totalPurchaseValuation || 0)}
            icon={Boxes}
            tone="info"
            isLoading={isLoading}
            footerLeft={`${summary?.totalStockUnits || 0} units`}
          />
          <StatCard
            label="Stock value at selling price"
            value={formatCurrency(summary?.totalRetailValuation || 0)}
            icon={Tag}
            tone="primary"
            isLoading={isLoading}
            footerLeft={`${summary?.totalItemsCount || 0} active products`}
          />
          <StatCard
            label="Low stock"
            value={`${summary?.lowStockCount || 0} products`}
            icon={TriangleAlert}
            tone={(summary?.lowStockCount || 0) > 0 ? 'danger' : 'neutral'}
            isLoading={isLoading}
            footerLeft="At or below reorder level"
          />
        </div>

        <Tabs<Tab>
          label="Stock views"
          value={activeTab}
          onChange={setActiveTab}
          className="shrink-0 self-start"
          items={[
            { value: 'all', label: 'All stock', icon: Package, count: items.length },
            { value: 'alerts', label: 'Low stock', icon: TriangleAlert, count: alerts.length },
            { value: 'movements', label: 'Movements', icon: History },
          ]}
        />

        <div className="min-h-0 flex-1">
          {isLoading ? (
            <TableSkeleton cols={6} />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={loadData} />
          ) : activeTab === 'all' ? (
            items.length === 0 ? (
              <EmptyState icon={Package} title="No products yet" description="Add products in Items to start tracking stock." />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Product</Th>
                    <Th>SKU</Th>
                    {isManager && <Th numeric>Cost</Th>}
                    <Th numeric>Selling price</Th>
                    <Th numeric>In stock</Th>
                    <Th numeric>Reorder at</Th>
                    <Th>Status</Th>
                    {isManager && (
                      <Th>
                        <span className="sr-only">Actions</span>
                      </Th>
                    )}
                  </Tr>
                </Thead>
                <Tbody>
                  {items.map((item) => (
                    <Tr key={item.id}>
                      <Td className="font-medium text-fg">{item.name}</Td>
                      <Td className="font-mono text-xs">{item.sku}</Td>
                      {isManager && <Td numeric>{formatCurrency(item.purchasePrice)}</Td>}
                      <Td numeric className="text-fg">
                        {formatCurrency(item.sellingPrice)}
                      </Td>
                      <Td numeric className="font-medium text-fg">
                        {Number(item.currentStock)} {unit(item)}
                      </Td>
                      <Td numeric>
                        {Number(item.reorderLevel)} {unit(item)}
                      </Td>
                      <Td>{stockBadge(item)}</Td>
                      {isManager && (
                        <Td className="text-right">
                          <Button variant="secondary" size="sm" onClick={() => openAdjust(item)}>
                            <SlidersHorizontal /> Count
                          </Button>
                        </Td>
                      )}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )
          ) : activeTab === 'alerts' ? (
            alerts.length === 0 ? (
              <EmptyState icon={CircleCheck} title="All stock levels are healthy" description="No product is at or below its reorder level." />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Product</Th>
                    <Th numeric>In stock</Th>
                    <Th numeric>Reorder at</Th>
                    <Th numeric>Short by</Th>
                    {isManager && (
                      <Th>
                        <span className="sr-only">Actions</span>
                      </Th>
                    )}
                  </Tr>
                </Thead>
                <Tbody>
                  {alerts.map((item) => (
                    <Tr key={item.id}>
                      <Td className="font-medium text-fg">{item.name}</Td>
                      <Td numeric className="font-medium text-danger">
                        {Number(item.currentStock)} {unit(item)}
                      </Td>
                      <Td numeric>
                        {Number(item.reorderLevel)} {unit(item)}
                      </Td>
                      <Td numeric>
                        {Math.max(0, Number(item.reorderLevel) - Number(item.currentStock))} {unit(item)}
                      </Td>
                      {isManager && (
                        <Td className="text-right">
                          <Button variant="secondary" size="sm" onClick={() => openAdjust(item)}>
                            <SlidersHorizontal /> Count
                          </Button>
                        </Td>
                      )}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )
          ) : movements.length === 0 ? (
            <EmptyState icon={History} title="No stock movements yet" />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Product</Th>
                  <Th>Type</Th>
                  <Th numeric>Change</Th>
                  {isManager && <Th numeric>Unit cost</Th>}
                  <Th>Note</Th>
                </Tr>
              </Thead>
              <Tbody>
                {movements.map((mov) => {
                  const q = Number(mov.quantity);
                  return (
                    <Tr key={mov.id}>
                      <Td>{formatDate(mov.createdAt)}</Td>
                      <Td className="font-medium text-fg">{mov.item?.name}</Td>
                      <Td>
                        <Badge variant="neutral">{MOVEMENT_LABEL[mov.movementType] || mov.movementType}</Badge>
                      </Td>
                      <Td numeric className={q > 0 ? 'font-medium text-success' : 'font-medium text-danger'}>
                        {q > 0 ? `+${q}` : q}
                      </Td>
                      {isManager && <Td numeric>{formatCurrency(mov.unitCost)}</Td>}
                      <Td className="max-w-sm truncate">{mov.notes || mov.referenceType}</Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={`Update stock count · ${selectedItem?.name || ''}`}
        description="Enter the quantity you physically counted on the shelf."
        maxWidth="md"
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-card border border-border bg-surface-2 p-3">
              <p className="text-xs text-fg-muted">In the system</p>
              <p className="text-lg font-semibold text-fg tabular-nums">
                {Number(selectedItem?.currentStock || 0)} {selectedItem ? unit(selectedItem) : ''}
              </p>
            </div>
            <div className="rounded-card border border-border bg-surface-2 p-3">
              <p className="text-xs text-fg-muted">Difference</p>
              <p className={`text-lg font-semibold tabular-nums ${variance > 0 ? 'text-success' : variance < 0 ? 'text-danger' : 'text-fg'}`}>
                {variance > 0 ? `+${variance}` : variance}
              </p>
            </div>
          </div>
          <Input
            label="Counted quantity"
            type="number"
            min={0}
            step="any"
            required
            autoFocus
            value={physicalCount}
            onChange={(e) => setPhysicalCount(e.target.value === '' ? '' : Number(e.target.value))}
          />
          <Select label="Reason" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          <Input label="Note" value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} placeholder="Optional" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setSelectedItem(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving} disabled={variance === 0 || physicalCount === ''}>
              Save count
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
