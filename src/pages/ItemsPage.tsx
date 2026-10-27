
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Barcode, Package, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Badge, Input } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td, Modal } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency } from '@/lib/utils';
import { Item, TaxCategory, Unit } from '@/types';

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [taxCategories, setTaxCategories] = useState<TaxCategory[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
    api.get('/items/meta').then((meta) => {
      if (meta?.taxCategories) setTaxCategories(meta.taxCategories);
      if (meta?.units) setUnits(meta.units);
    }).catch(() => {});
  }, []);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/items', {
        name,
        sku: sku || undefined,
        barcode: barcode || undefined,
        hsnCode: hsnCode || undefined,
        category,
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        mrp: Number(mrp) || Number(sellingPrice),
        gstRate: Number(gstRate),
        openingStock: Number(openingStock),
        reorderLevel: Number(reorderLevel),
      });

      alert('Item added successfully!');
      setIsAddModalOpen(false);
      setName('');
      setBarcode('');
      setSku('');
      fetchItems();
    } catch (err: any) {
      alert(`Error creating item: ${err.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Items Catalog</h2>
            <p className="text-xs text-slate-400 mt-1">Manage master pricing, HSN codes, and barcodes</p>
          </div>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add New Item
          </Button>
        </div>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search items by name, barcode or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button variant="secondary" onClick={fetchItems}>
              Search
            </Button>
          </div>
        </Card>

        <Card>
          {items.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No items found. Click &quot;Add New Item&quot; to create one.</div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Item Details</Th>
                  <Th>Barcode / SKU</Th>
                  <Th>HSN</Th>
                  <Th>Cost</Th>
                  <Th>Selling Price</Th>
                  <Th>Tax (GST)</Th>
                  <Th>Current Stock</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {items.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-xs text-slate-400">{item.category || 'General'}</div>
                    </Td>
                    <Td className="font-mono text-xs text-slate-300">
                      <div>{item.barcode || '-'}</div>
                      <div className="text-slate-500 text-[10px]">{item.sku}</div>
                    </Td>
                    <Td className="font-mono text-xs">{item.hsnCode || '-'}</Td>
                    <Td className="text-slate-400">{formatCurrency(item.purchasePrice)}</Td>
                    <Td className="font-bold text-white">{formatCurrency(item.sellingPrice)}</Td>
                    <Td>
                      <span className="text-xs font-semibold text-indigo-400">{item.gstRate}%</span>
                    </Td>
                    <Td>
                      <span
                        className={`text-xs font-bold ${
                          Number(item.currentStock) <= Number(item.reorderLevel)
                            ? 'text-rose-400'
                            : 'text-emerald-400'
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
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>

      {/* Add Item Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Product to Master" maxWidth="lg">
        <form onSubmit={handleCreateItem} className="space-y-4">
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
              <label className="block text-xs font-medium text-slate-300 mb-1.5">GST Rate</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5% GST</option>
                <option value={12}>12% GST</option>
                <option value={18}>18% GST</option>
                <option value={28}>28% GST</option>
              </select>
            </div>
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
          </div>

          <Button type="submit" variant="primary" size="md" className="w-full mt-4">
            Save Product to Catalog
          </Button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
