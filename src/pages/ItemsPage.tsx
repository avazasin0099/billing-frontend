
import React, { useState, useEffect } from 'react';
import { Search, Plus, Pencil, Barcode, Power } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Badge, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td, Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { api } from '@/services/api-client';
import { formatCurrency } from '@/lib/utils';
import { Item } from '@/types';

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Item | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [category, setCategory] = useState('Grocery Staples');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(5);
  const [openingStock, setOpeningStock] = useState<number>(10);
  const [reorderLevel, setReorderLevel] = useState<number>(5);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const data = await api.get('/items', { search, limit: 100 });
      setItems(data.items || data || []);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetForm = () => {
    setName('');
    setSku('');
    setBarcode('');
    setHsnCode('');
    setCategory('Grocery Staples');
    setPurchasePrice(0);
    setSellingPrice(0);
    setMrp(0);
    setGstRate(5);
    setOpeningStock(10);
    setReorderLevel(5);
  };

  const openAddModal = () => {
    resetForm();
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingId(item.id);
    setName(item.name || '');
    setSku(item.sku || '');
    setBarcode(item.barcode || '');
    setHsnCode(item.hsnCode || '');
    setCategory(item.category || 'Grocery Staples');
    setPurchasePrice(Number(item.purchasePrice) || 0);
    setSellingPrice(Number(item.sellingPrice) || 0);
    setMrp(Number(item.mrp) || 0);
    setGstRate(Number(item.gstRate) || 0);
    setReorderLevel(Number(item.reorderLevel) || 0);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        name,
        sku: sku || undefined,
        barcode: barcode || undefined,
        hsnCode: hsnCode || undefined,
        category,
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        mrp: Number(mrp) || Number(sellingPrice),
        gstRate: Number(gstRate),
        reorderLevel: Number(reorderLevel),
      };

      if (editingId) {
        await api.patch(`/items/${editingId}`, payload);
      } else {
        await api.post('/items', { ...payload, openingStock: Number(openingStock) });
      }

      setIsModalOpen(false);
      resetForm();
      setEditingId(null);
      fetchItems();
    } catch (err: any) {
      alert(`Error saving item: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    setIsSaving(true);
    try {
      await api.patch(`/items/${toggleTarget.id}`, { isActive: !toggleTarget.isActive });
      setToggleTarget(null);
      fetchItems();
    } catch (err: any) {
      alert(`Failed to update item status: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full min-h-0 gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-fg tracking-tight">Items Catalog</h2>
            <p className="text-xs text-fg-subtle mt-1">Manage master pricing, HSN codes, and barcodes</p>
          </div>
          <Button variant="primary" onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add New Item
          </Button>
        </div>

        {/* Search */}
        <Card className="shrink-0">
          <form
            className="flex items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              fetchItems();
            }}
          >
            <div className="flex-1">
              <Input
                placeholder="Search items by name, barcode or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </Card>

        {/* Table (fills remaining height, sticky header scroll) */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <Card className="h-full flex items-center justify-center text-fg-subtle text-sm">
              Loading catalog…
            </Card>
          ) : items.length === 0 ? (
            <Card className="h-full flex items-center justify-center text-fg-subtle text-sm">
              No items found. Click “Add New Item” to create one.
            </Card>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Item Details</Th>
                  <Th>Barcode / SKU</Th>
                  <Th>HSN</Th>
                  <Th className="text-right">Cost</Th>
                  <Th className="text-right">Selling Price</Th>
                  <Th className="text-right">Tax (GST)</Th>
                  <Th className="text-right">Current Stock</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {items.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <div className="font-semibold text-fg">{item.name}</div>
                      <div className="text-xs text-fg-subtle">{item.category || 'General'}</div>
                    </Td>
                    <Td className="font-mono text-xs text-fg-muted">
                      <div>{item.barcode || '-'}</div>
                      <div className="text-fg-subtle text-[10px]">{item.sku}</div>
                    </Td>
                    <Td className="font-mono text-xs">{item.hsnCode || '-'}</Td>
                    <Td className="text-right text-fg-subtle">{formatCurrency(item.purchasePrice)}</Td>
                    <Td className="text-right font-bold text-fg">{formatCurrency(item.sellingPrice)}</Td>
                    <Td className="text-right">
                      <span className="text-xs font-semibold text-brand">{item.gstRate}%</span>
                    </Td>
                    <Td className="text-right">
                      <span
                        className={`text-xs font-bold ${
                          Number(item.currentStock) <= Number(item.reorderLevel)
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.currentStock} {item.unit?.code || 'pcs'}
                      </span>
                    </Td>
                    <Td>
                      <Badge variant={item.isActive ? 'success' : 'neutral'}>
                        {item.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(item)}
                          title="Edit item"
                          className="hover:text-brand"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setToggleTarget(item)}
                          title={item.isActive ? 'Deactivate item' : 'Activate item'}
                          className={item.isActive ? 'hover:text-rose-600 dark:hover:text-rose-400' : 'hover:text-emerald-600 dark:hover:text-emerald-400'}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Product' : 'Add Product to Master'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Product Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Parle-G Gold Biscuits 1kg"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Barcode / EAN"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="e.g. 8901234567890"
              icon={<Barcode className="w-4 h-4" />}
            />
            <Input
              label="HSN / SAC Code"
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
              placeholder="e.g. 19053100"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Purchase Cost (₹)"
              type="number"
              step="0.01"
              required
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
            />
            <Input
              label="Selling Price (₹)"
              type="number"
              step="0.01"
              required
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Number(e.target.value))}
            />
            <Input
              label="MRP (₹)"
              type="number"
              step="0.01"
              value={mrp}
              onChange={(e) => setMrp(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">GST Rate</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5% GST</option>
                <option value={12}>12% GST</option>
                <option value={18}>18% GST</option>
                <option value={28}>28% GST</option>
              </select>
            </div>
            {editingId ? (
              <Input label="Reorder Threshold" type="number" value={reorderLevel} onChange={(e) => setReorderLevel(Number(e.target.value))} />
            ) : (
              <>
                <Input
                  label="Initial Stock Units"
                  type="number"
                  value={openingStock}
                  onChange={(e) => setOpeningStock(Number(e.target.value))}
                />
                <Input
                  label="Reorder Threshold"
                  type="number"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(Number(e.target.value))}
                />
              </>
            )}
          </div>

          <Button type="submit" variant="primary" size="md" className="w-full mt-4" isLoading={isSaving}>
            {editingId ? 'Save Changes' : 'Save Product to Catalog'}
          </Button>
        </form>
      </Modal>

      {/* Activate / Deactivate Confirm */}
      <ConfirmDialog
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleActive}
        isLoading={isSaving}
        tone={toggleTarget?.isActive ? 'danger' : 'primary'}
        title={toggleTarget?.isActive ? 'Deactivate Item' : 'Activate Item'}
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        message={
          toggleTarget?.isActive ? (
            <>
              <strong className="text-fg">{toggleTarget?.name}</strong> will be hidden from POS billing and new
              invoices. Its history and stock are preserved and you can re-activate it anytime.
            </>
          ) : (
            <>
              <strong className="text-fg">{toggleTarget?.name}</strong> will be available again for POS billing and
              new invoices.
            </>
          )
        }
      />
    </DashboardLayout>
  );
}
