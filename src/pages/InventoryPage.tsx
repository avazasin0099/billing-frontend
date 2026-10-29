
import React, { useState, useEffect } from 'react';
import { Boxes, AlertTriangle, History, ArrowDownRight, ArrowUpRight, Plus, Sliders } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, Badge, Input } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td, Modal } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Item } from '@/types';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'alerts' | 'movements'>('all');
  const [items, setItems] = useState<Item[]>([]);
  const [alerts, setAlerts] = useState<Item[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [physicalCount, setPhysicalCount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('DAMAGED');
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  const loadData = async () => {
    try {
      const [sum, alertList, itemList, movList] = await Promise.all([
        api.get('/inventory/summary').catch(() => null),
        api.get('/inventory/alerts').catch(() => []),
        api.get('/items', { limit: 100 }).catch(() => ({ items: [] })),
        api.get('/inventory/movements', { limit: 20 }).catch(() => ({ movements: [] })),
      ]);

      if (sum) setSummary(sum);
      setAlerts(alertList || []);
      setItems(itemList.items || itemList || []);
      setMovements(movList.movements || movList || []);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdjustModal = (item: Item) => {
    setSelectedItem(item);
    setPhysicalCount(Number(item.currentStock));
    setAdjustReason('DAMAGED');
    setAdjustNotes('');
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      await api.post('/inventory/adjustments', {
        itemId: selectedItem.id,
        physicalQty: Number(physicalCount),
        reason: adjustReason,
        notes: adjustNotes,
      });

      alert('Stock adjustment recorded and movement audit logged!');
      setIsAdjustModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Adjustment failed: ${err.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full min-h-0 gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-fg tracking-tight">Inventory & Stock Control</h2>
            <p className="text-xs text-fg-subtle mt-1">Real-time stock valuation, movements audit, and count reconciliation</p>
          </div>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
          <StatCard
            label="Stock Purchase Value"
            value={formatCurrency(summary?.totalPurchaseValuation || 0)}
            icon={Boxes}
            tone="brand"
            footerLeft={`${summary?.totalStockUnits || 0} total physical units`}
          />
          <StatCard
            label="Stock Retail Value (MRP)"
            value={formatCurrency(summary?.totalRetailValuation || 0)}
            icon={ArrowUpRight}
            tone="emerald"
            footerLeft={`${summary?.totalItemsCount || 0} registered catalog items`}
          />
          <StatCard
            label="Low Stock Warning"
            value={`${summary?.lowStockCount || 0} Products`}
            icon={AlertTriangle}
            tone="rose"
            footerLeft="Below defined reorder threshold"
          />
        </div>

        {/* Tab Selection */}
        <div className="flex bg-surface border border-border p-1 rounded-xl w-fit shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all' ? 'bg-emerald-600 text-white shadow-md' : 'text-fg-subtle hover:text-fg'
            }`}
          >
            All Stock ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'alerts' ? 'bg-emerald-600 text-white shadow-md' : 'text-fg-subtle hover:text-fg'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Low Stock Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'movements' ? 'bg-emerald-600 text-white shadow-md' : 'text-fg-subtle hover:text-fg'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Movements Audit Ledger
          </button>
        </div>

        {/* Tab 1: All Stock */}
        {activeTab === 'all' && (
          <div className="flex-1 min-h-0">
            <Table>
              <Thead>
                <Tr>
                  <Th>Product</Th>
                  <Th>SKU</Th>
                  <Th className="text-right">Cost</Th>
                  <Th className="text-right">Selling Price</Th>
                  <Th className="text-right">Current Shelf Stock</Th>
                  <Th className="text-right">Reorder Level</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {items.map((item) => (
                  <Tr key={item.id}>
                    <Td className="font-semibold text-fg">{item.name}</Td>
                    <Td className="font-mono text-xs">{item.sku}</Td>
                    <Td className="text-right text-fg-subtle">{formatCurrency(item.purchasePrice)}</Td>
                    <Td className="text-right font-bold text-fg">{formatCurrency(item.sellingPrice)}</Td>
                    <Td className="text-right">
                      <span
                        className={`font-bold ${
                          Number(item.currentStock) <= Number(item.reorderLevel)
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.currentStock} {item.unit?.code || 'pcs'}
                      </span>
                    </Td>
                    <Td className="text-right text-fg-subtle">{item.reorderLevel} {item.unit?.code || 'pcs'}</Td>
                    <Td className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenAdjustModal(item)}
                        className="text-xs"
                      >
                        <Sliders className="w-3.5 h-3.5 mr-1" />
                        Stock Count
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}

        {/* Tab 2: Low Stock Alerts */}
        {activeTab === 'alerts' && (
          <div className="flex-1 min-h-0">
            {alerts.length === 0 ? (
              <Card className="h-full flex items-center justify-center text-fg-subtle text-sm">All inventory levels are healthy! No reorder alerts.</Card>
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Alert Item</Th>
                    <Th>Current Available</Th>
                    <Th>Reorder Level</Th>
                    <Th>Deficit / Needed</Th>
                    <Th className="text-right">Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {alerts.map((item) => (
                    <Tr key={item.id}>
                      <Td className="font-semibold text-fg">{item.name}</Td>
                      <Td className="text-rose-600 dark:text-rose-400 font-bold">{item.currentStock} {item.unit?.code || 'pcs'}</Td>
                      <Td>{item.reorderLevel} {item.unit?.code || 'pcs'}</Td>
                      <Td className="text-amber-600 dark:text-amber-400 font-semibold">
                        {Math.max(0, Number(item.reorderLevel) - Number(item.currentStock) + 10)} units recommended
                      </Td>
                      <Td className="text-right">
                        <Button variant="secondary" size="sm" onClick={() => handleOpenAdjustModal(item)}>
                          Fix Count
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 3: Movements Audit Ledger */}
        {activeTab === 'movements' && (
          <div className="flex-1 min-h-0">
            <Table>
              <Thead>
                <Tr>
                  <Th>Timestamp</Th>
                  <Th>Item</Th>
                  <Th>Movement Type</Th>
                  <Th>Quantity Delta</Th>
                  <Th>Unit Cost</Th>
                  <Th>Reference / Notes</Th>
                </Tr>
              </Thead>
              <Tbody>
                {movements.map((mov) => (
                  <Tr key={mov.id}>
                    <Td className="text-xs">{formatDate(mov.createdAt)}</Td>
                    <Td className="font-semibold text-fg">{mov.item?.name}</Td>
                    <Td>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-2 border border-border text-brand">
                        {mov.movementType}
                      </span>
                    </Td>
                    <Td className={`font-bold ${Number(mov.quantity) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {Number(mov.quantity) > 0 ? `+${mov.quantity}` : mov.quantity}
                    </Td>
                    <Td>{formatCurrency(mov.unitCost)}</Td>
                    <Td className="text-xs text-fg-subtle">{mov.notes || mov.referenceType}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </div>

      {/* Stock Count / Adjustment Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={`Adjust Stock — ${selectedItem?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4">
          <div className="bg-surface-2 p-3 rounded-xl border border-border text-xs flex justify-between">
            <span className="text-fg-subtle">Current App Stock:</span>
            <span className="font-bold text-fg">{selectedItem?.currentStock} units</span>
          </div>

          <Input
            label="Physical Count Counted on Shelf"
            type="number"
            required
            value={physicalCount}
            onChange={(e) => setPhysicalCount(Number(e.target.value))}
          />

          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1.5">Adjustment Reason Code</label>
            <select
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-fg"
            >
              <option value="DAMAGED">Damaged / Broken Packaging</option>
              <option value="EXPIRED">Expired Past Expiry Date</option>
              <option value="FOUND">Physical Stock Found (Surplus)</option>
              <option value="THEFT">Pilferage / Loss</option>
              <option value="STOCK_TAKE_CORRECTION">Periodic Stock-Take Correction</option>
            </select>
          </div>

          <Input
            label="Notes (Optional)"
            value={adjustNotes}
            onChange={(e) => setAdjustNotes(e.target.value)}
            placeholder="e.g. Audit by store supervisor"
          />

          <Button type="submit" variant="primary" size="md" className="w-full mt-4">
            Record Adjustment & Update Balance
          </Button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
