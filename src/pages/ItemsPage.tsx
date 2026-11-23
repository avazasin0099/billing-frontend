import React, { useCallback, useEffect, useState } from 'react';
import { Search, Plus, Pencil, Barcode, Power, Check, X, Package } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Input, Select } from '@/components/ui/card';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/page';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { api, asList } from '@/services/api-client';
import { formatCurrency } from '@/lib/utils';
import { categoryIcon } from '@/lib/category-icon';
import { useSession } from '@/lib/session';
import { Item } from '@/types';

const GST_RATES = [0, 3, 5, 12, 18, 28, 40];

export default function ItemsPage() {
  const { isManager } = useSession();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Item | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state — no invented defaults (opening stock used to default to 10 phantom units).
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [category, setCategory] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [mrp, setMrp] = useState<number | ''>('');
  const [gstRate, setGstRate] = useState<number>(0);
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [openingStock, setOpeningStock] = useState<number | ''>('');
  const [reorderLevel, setReorderLevel] = useState<number | ''>('');

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const fetchCategories = async () => {
    try {
      setCategories((await api.get('/categories')) || []);
    } catch {
      /* the picker still allows typing a new category */
    }
  };

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.get('/items', { search, limit: 100 });
      setItems(asList(data, 'items'));
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [fetchItems]);

  const handleAddCategory = async () => {
    const value = newCategoryName.trim();
    if (!value) return;
    setIsSavingCategory(true);
    try {
      const created = await api.post('/categories', { name: value });
      await fetchCategories();
      setCategory(created?.name || value);
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (err: any) {
      toast.error('Category not added', err.message);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const resetForm = () => {
    setName('');
    setBarcode('');
    setHsnCode('');
    setCategory(categories[0]?.name || 'General');
    setPurchasePrice('');
    setSellingPrice('');
    setMrp('');
    setGstRate(0);
    setIsTaxInclusive(true);
    setOpeningStock('');
    setReorderLevel('');
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  const openAddModal = () => {
    resetForm();
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingId(item.id);
    setName(item.name || '');
    setBarcode(item.barcode || '');
    setHsnCode(item.hsnCode || '');
    setCategory(item.category || 'General');
    setPurchasePrice(Number(item.purchasePrice) || 0);
    setSellingPrice(Number(item.sellingPrice) || 0);
    setMrp(Number(item.mrp) || '');
    setGstRate(Number(item.gstRate) || 0);
    setIsTaxInclusive(item.isTaxInclusive !== false);
    setReorderLevel(Number(item.reorderLevel) || '');
    setIsAddingCategory(false);
    setIsModalOpen(true);
  };

  // Inline validation
  const mrpError =
    mrp !== '' && sellingPrice !== '' && Number(sellingPrice) > Number(mrp) ? 'Selling price cannot be more than MRP' : undefined;
  const hsnError = hsnCode && !/^\d{4,8}$/.test(hsnCode) ? 'HSN / SAC is 4–8 digits' : undefined;
  const marginHint =
    purchasePrice !== '' && sellingPrice !== '' && Number(sellingPrice) > 0
      ? `Margin ${(((Number(sellingPrice) - Number(purchasePrice)) / Number(sellingPrice)) * 100).toFixed(1)}%`
      : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mrpError || hsnError) return;
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        name,
        barcode: barcode.trim(),
        hsnCode: hsnCode.trim(),
        category,
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        mrp: mrp === '' ? Number(sellingPrice) : Number(mrp),
        gstRate: Number(gstRate),
        isTaxInclusive,
        reorderLevel: Number(reorderLevel) || 0,
      };
      if (editingId) {
        await api.patch(`/items/${editingId}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/items', { ...payload, openingStock: Number(openingStock) || 0 });
        toast.success('Product added');
      }
      setIsModalOpen(false);
      setEditingId(null);
      fetchItems();
    } catch (err: any) {
      toast.error('Product not saved', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    setIsSaving(true);
    try {
      await api.patch(`/items/${toggleTarget.id}`, { isActive: !toggleTarget.isActive });
      toast.success(toggleTarget.isActive ? `${toggleTarget.name} deactivated` : `${toggleTarget.name} activated`);
      setToggleTarget(null);
      fetchItems();
    } catch (err: any) {
      toast.error('Status not changed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-5">
        <PageHeader
          title="Items"
          description="Your product catalog: prices, GST, HSN codes and barcodes."
          actions={
            isManager && (
              <Button onClick={openAddModal}>
                <Plus /> Add product
              </Button>
            )
          }
        />

        <form
          className="flex shrink-0 items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            fetchItems();
          }}
        >
          <Input
            aria-label="Search products"
            placeholder="Search by name, barcode, SKU or HSN"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search />}
            containerClassName="max-w-md"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <div className="min-h-0 flex-1">
          {isLoading ? (
            <TableSkeleton cols={7} />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={fetchItems} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Package}
              title={search ? `No products match "${search}"` : 'No products yet'}
              description={search ? undefined : 'Add the products you sell to start billing.'}
              action={
                isManager && !search && (
                  <Button onClick={openAddModal}>
                    <Plus /> Add product
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Product</Th>
                  <Th>Barcode / SKU</Th>
                  <Th>HSN</Th>
                  {isManager && <Th numeric>Cost</Th>}
                  <Th numeric>Price</Th>
                  <Th numeric>GST</Th>
                  <Th numeric>Stock</Th>
                  <Th>Status</Th>
                  {isManager && (
                    <Th>
                      <span className="sr-only">Actions</span>
                    </Th>
                  )}
                </Tr>
              </Thead>
              <Tbody>
                {items.map((item) => {
                  const Icon = categoryIcon(item.category);
                  const stock = Number(item.currentStock);
                  return (
                    <Tr key={item.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-2 text-fg-subtle">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt="" width={36} height={36} loading="lazy" className="size-full object-cover" />
                            ) : (
                              <Icon className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-fg">{item.name}</span>
                            <span className="block text-xs text-fg-subtle">{item.category || 'General'}</span>
                          </span>
                        </div>
                      </Td>
                      <Td className="font-mono text-xs">
                        <span className="block">{item.barcode || '—'}</span>
                        <span className="block text-fg-subtle">{item.sku}</span>
                      </Td>
                      <Td className="font-mono text-xs">{item.hsnCode || '—'}</Td>
                      {isManager && <Td numeric>{formatCurrency(item.purchasePrice)}</Td>}
                      <Td numeric className="font-medium text-fg">
                        {formatCurrency(item.sellingPrice)}
                      </Td>
                      <Td numeric>{Number(item.gstRate)}%</Td>
                      <Td
                        numeric
                        className={stock <= 0 ? 'font-medium text-danger' : stock <= Number(item.reorderLevel) ? 'font-medium text-warning' : 'text-fg'}
                      >
                        {stock} {item.unit?.code || 'pcs'}
                      </Td>
                      <Td>
                        <StatusBadge status={item.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </Td>
                      {isManager && (
                        <Td>
                          <div className="flex justify-end gap-1">
                            <IconButton size="sm" label={`Edit ${item.name}`} onClick={() => openEditModal(item)}>
                              <Pencil />
                            </IconButton>
                            <IconButton
                              size="sm"
                              variant={item.isActive ? 'danger-ghost' : 'ghost'}
                              label={item.isActive ? `Deactivate ${item.name}` : `Activate ${item.name}`}
                              onClick={() => setToggleTarget(item)}
                            >
                              <Power />
                            </IconButton>
                          </div>
                        </Td>
                      )}
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit product' : 'Add product'} maxWidth="2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Product name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="As it should appear on the bill" autoFocus />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              {isAddingCategory ? (
                <div className="flex items-end gap-2">
                  <Input
                    label="New category"
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                  />
                  <IconButton variant="secondary" label="Save category" onClick={handleAddCategory} disabled={isSavingCategory}>
                    <Check />
                  </IconButton>
                  <IconButton
                    label="Cancel new category"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCategoryName('');
                    }}
                  >
                    <X />
                  </IconButton>
                </div>
              ) : (
                <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {category && !categories.some((c) => c.name === category) && <option value={category}>{category}</option>}
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
              {!isAddingCategory && (
                <Button variant="link" size="sm" className="mt-1.5 text-sm" onClick={() => setIsAddingCategory(true)}>
                  <Plus /> New category
                </Button>
              )}
            </div>
            <Input
              label="Barcode / EAN"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              icon={<Barcode />}
              placeholder="Scan or type"
              className="font-mono"
            />
          </div>

          <fieldset className="space-y-4">
            <legend className="mb-3 w-full border-b border-border pb-2 text-sm font-semibold text-fg">Pricing</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Purchase cost (₹)"
                type="number"
                step="0.01"
                min={0}
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <Input
                label="Selling price (₹)"
                type="number"
                step="0.01"
                min={0}
                required
                value={sellingPrice}
                hint={marginHint}
                error={mrpError}
                onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <Input
                label="MRP (₹)"
                type="number"
                step="0.01"
                min={0}
                hint="Optional. Defaults to selling price."
                value={mrp}
                onChange={(e) => setMrp(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select label="GST rate" value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))}>
                {!GST_RATES.includes(gstRate) && <option value={gstRate}>{gstRate}%</option>}
                {GST_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r === 0 ? '0% (exempt / nil)' : `${r}%`}
                  </option>
                ))}
              </Select>
              <Input
                label="HSN / SAC"
                value={hsnCode}
                inputMode="numeric"
                maxLength={8}
                error={hsnError}
                onChange={(e) => setHsnCode(e.target.value.replace(/\D/g, ''))}
                className="font-mono"
              />
              <div className="flex items-end pb-2.5">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-fg">
                  <input
                    type="checkbox"
                    checked={isTaxInclusive}
                    onChange={(e) => setIsTaxInclusive(e.target.checked)}
                    className="size-4 rounded border-border-strong accent-[rgb(var(--primary))]"
                  />
                  Selling price includes GST
                </label>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 w-full border-b border-border pb-2 text-sm font-semibold text-fg">Stock</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!editingId && (
                <Input
                  label="Opening stock"
                  hint="Quantity on the shelf right now."
                  type="number"
                  min={0}
                  step="any"
                  value={openingStock}
                  onChange={(e) => setOpeningStock(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                />
              )}
              <Input
                label="Reorder level"
                hint="Show a low-stock alert at or below this quantity."
                type="number"
                min={0}
                step="any"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving} disabled={!!mrpError || !!hsnError}>
              {editingId ? 'Save changes' : 'Add product'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleActive}
        isLoading={isSaving}
        tone={toggleTarget?.isActive ? 'danger' : 'primary'}
        title={toggleTarget?.isActive ? 'Deactivate product?' : 'Activate product?'}
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        message={
          toggleTarget?.isActive ? (
            <>
              <strong className="text-fg">{toggleTarget?.name}</strong> will be hidden from billing. Its history and stock are kept,
              and you can activate it again at any time.
            </>
          ) : (
            <>
              <strong className="text-fg">{toggleTarget?.name}</strong> will be available for billing again.
            </>
          )
        }
      />
    </DashboardLayout>
  );
}
