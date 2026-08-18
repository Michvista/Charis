'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { listWardrobeItems, createWardrobeItem, deleteWardrobeItem, logWear, updateWardrobeItem } from '@/api/wardrobe.api';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon, Cancel01Icon, Delete02Icon, TShirtIcon, Upload01Icon, PencilEdit01Icon, FloppyDiskIcon } from '@hugeicons/core-free-icons';
import type { WardrobeItem } from '@/lib/types';

function WearDots({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i < Math.min(count, 5) ? 'bg-[#380208]' : 'bg-[#e1d8d4]'}`}
        />
      ))}
    </div>
  );
}

const CATEGORIES = ['All', 'top', 'bottom', 'outerwear', 'shoes', 'accessory'];

export default function WardrobePage() {
  const { session } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WardrobeItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'wears' | 'name'>('newest');

  // Add Item Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('top');
  const [newItemBrand, setNewItemBrand] = useState('');
  const [newItemColor, setNewItemColor] = useState('black');
  const [newItemFormality, setNewItemFormality] = useState(3);
  const [newItemPrice, setNewItemPrice] = useState('150.00');
  const [newItemImageUrl, setNewItemImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Item Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<WardrobeItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editCategory, setEditCategory] = useState('top');
  const [editFormality, setEditFormality] = useState(3);
  const [editPrice, setEditPrice] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editFilePreview, setEditFilePreview] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchItems = async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const data = await listWardrobeItems(session.accessToken);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toastError('Failed to fetch wardrobe', 'Could not load your items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [session]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.accessToken || !newItemName.trim()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', newItemName.trim());
      formData.append('category', newItemCategory);
      formData.append('brand', newItemBrand.trim() || 'Charis Collection');
      formData.append('primary_color', newItemColor);
      formData.append('formality_level', String(newItemFormality));
      formData.append('purchase_price', newItemPrice);
      formData.append('purchase_date', new Date().toISOString().split('T')[0]);

      if (selectedFile) {
        formData.append('image', selectedFile);
      } else if (newItemImageUrl.trim()) {
        formData.append('image_url', newItemImageUrl.trim());
      }

      await createWardrobeItem(session.accessToken, formData);
      toastSuccess('Item Added', `"${newItemName}" has been curated to your wardrobe.`);
      setShowAddModal(false);
      setNewItemName('');
      setNewItemBrand('');
      setNewItemImageUrl('');
      setSelectedFile(null);
      setFilePreview('');
      fetchItems();
    } catch (err) {
      toastError('Failed to add item', err instanceof Error ? err.message : 'Error adding wardrobe item.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item: WardrobeItem) => {
    setEditItem(item);
    setEditName(item.name);
    setEditBrand(item.brand || '');
    setEditCategory(item.category || 'top');
    setEditFormality(item.formality_level || 3);
    setEditPrice(item.purchase_price || '');
    setEditColor(item.primary_color || '');
    setEditImageUrl(item.image_url || '');
    setEditFile(null);
    setEditFilePreview('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.accessToken || !editItem) return;

    setSavingEdit(true);
    try {
      let updated: WardrobeItem;
      if (editFile) {
        const formData = new FormData();
        formData.append('name', editName.trim());
        if (editBrand.trim()) formData.append('brand', editBrand.trim());
        formData.append('category', editCategory);
        formData.append('formality_level', String(editFormality));
        if (editPrice) formData.append('purchase_price', editPrice);
        if (editColor) formData.append('primary_color', editColor);
        formData.append('image', editFile);
        updated = await updateWardrobeItem(session.accessToken, editItem.id, formData as any);
      } else {
        updated = await updateWardrobeItem(session.accessToken, editItem.id, {
          name: editName.trim(),
          brand: editBrand.trim() || undefined,
          category: editCategory,
          formality_level: Number(editFormality),
          purchase_price: editPrice || undefined,
          primary_color: editColor || undefined,
          ...(editImageUrl !== editItem.image_url ? { image_url: editImageUrl } : {}),
        });
      }
      toastSuccess('Item Updated', `"${editName}" has been updated.`);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      if (selected?.id === updated.id) setSelected(updated);
      setShowEditModal(false);
      setEditItem(null);
      setEditFile(null);
      setEditFilePreview('');
    } catch (err) {
      toastError('Update Failed', err instanceof Error ? err.message : 'Could not update item.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!session?.accessToken) return;
    if (!confirm(`Are you sure you want to remove "${name}" from your collection?`)) return;

    try {
      await deleteWardrobeItem(session.accessToken, id);
      toastSuccess('Item Removed', `"${name}" was deleted from your collection.`);
      setSelected(null);
      fetchItems();
    } catch (err) {
      toastError('Delete Failed', err instanceof Error ? err.message : 'Could not delete item.');
    }
  };

  const handleLogWear = async (id: string, name: string) => {
    if (!session?.accessToken) return;
    try {
      await logWear(session.accessToken, id);
      toastSuccess('Wear Logged', `Logged +1 wear for "${name}".`);
      fetchItems();
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, times_worn: (prev.times_worn || 0) + 1 } : null));
      }
    } catch (err) {
      toastError('Log Wear Failed', err instanceof Error ? err.message : 'Could not log wear.');
    }
  };

  const filteredItems = useMemo(() => {
    let list = items;
    if (categoryFilter !== 'All') {
      list = list.filter((i) => i.category?.toLowerCase() === categoryFilter.toLowerCase());
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'wears') return (b.times_worn || 0) - (a.times_worn || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [items, categoryFilter, sortBy]);

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#867272]">
                <span className="w-6 h-px bg-[#d9c1c0]" />
                Personal Archive
              </div>
              <h1 className="serif text-4xl font-bold text-[#1e1b18] mt-1">Library</h1>
              <p className="text-sm text-[#544342]">
                {items.length} {items.length === 1 ? 'item' : 'items'} curated in your collection.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-white border border-[#d9c1c0] rounded-lg text-xs font-semibold text-[#1e1b18] outline-none cursor-pointer"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="wears">Sort: Most Worn</option>
                <option value="name">Sort: Alphabetical</option>
              </select>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#380208] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all shadow-md shadow-[#380208]/20"
              >
                <HugeiconsIcon icon={PlusSignIcon} size={16} /> Add Item
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-[#d9c1c0] overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-[5px] whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'border-[#380208] text-[#380208]'
                    : 'border-transparent text-[#867272] hover:text-[#1e1b18]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Content Grid / Empty State */}
          <div className="flex gap-6">
            <div className={`flex-1 ${filteredItems.length ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6' : ''}`}>
              {loading ? (
                <div className="col-span-full py-20 flex justify-center items-center">
                  <div className="w-8 h-8 border-2 border-[#380208]/30 border-t-[#380208] rounded-full animate-spin" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="col-span-full py-20 bg-white/60 border border-dashed border-[#d9c1c0] rounded-2xl flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-[#fbf2ed] text-[#380208] grid place-items-center mb-4">
                    <HugeiconsIcon icon={TShirtIcon} size={28} />
                  </div>
                  <h3 className="serif text-2xl font-semibold text-[#1e1b18]">Your library is empty</h3>
                  <p className="text-xs text-[#544342] max-w-sm mt-1 mb-6">
                    No wardrobe items found in this view. Start building your capsule by adding your first garment.
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-3 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] shadow-md shadow-[#380208]/20 transition-all hover:-translate-y-0.5"
                  >
                    + Add Your First Item
                  </button>
                </div>
              ) : (
                filteredItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    className={`cursor-pointer flex flex-col gap-3 group transition-all ${
                      selected?.id === item.id ? 'ring-2 ring-[#380208] ring-offset-4 rounded-xl' : ''
                    }`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(selected?.id === item.id ? null : item)}
                  >
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#f5ece7] shadow-sm group-hover:shadow-lg transition-all">
                      <img
                        src={item.image_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=1080&q=90'}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#1e1b18]">
                        {item.category}
                      </span>
                      {/* Edit button overlay */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(item);
                        }}
                        className="absolute top-3 left-3 w-7 h-7 bg-white/90 rounded-full grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-[#380208] hover:text-white text-[#380208]"
                        title="Edit Item"
                      >
                        <HugeiconsIcon icon={PencilEdit01Icon} size={12} />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 px-1">
                      <div className="flex justify-between items-center">
                        <h3 className="serif text-base font-semibold text-[#1e1b18] group-hover:text-[#380208] transition-colors">
                          {item.name}
                        </h3>
                        {item.primary_color && (
                          <span
                            className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                            style={{ background: item.primary_color }}
                            title={`Color: ${item.primary_color}`}
                          />
                        )}
                      </div>
                      <p className="text-xs text-[#867272]">{item.brand || 'Charis'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <WearDots count={item.times_worn || 0} />
                        <span className="text-[11px] text-[#544342] font-medium">{item.times_worn || 0} Wears</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Item Details Slide-Over Drawer */}
            <AnimatePresence>
              {selected && (
                <motion.div
                  className="w-80 shrink-0 bg-white rounded-2xl border border-[#d9c1c0] p-6 sticky top-6 self-start flex flex-col gap-5 shadow-2xl z-20"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 50, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25 }}
                >
                  <div className="flex justify-between items-center border-b border-[#d9c1c0]/50 pb-3">
                    <h2 className="serif text-xl font-bold text-[#1e1b18]">Item Specification</h2>
                    <button onClick={() => setSelected(null)} className="text-[#867272] hover:text-[#380208]">
                      <HugeiconsIcon icon={Cancel01Icon} size={18} />
                    </button>
                  </div>

                  <div className="rounded-xl overflow-hidden aspect-square shadow-inner bg-[#f5ece7]">
                    <img
                      src={selected.image_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=1080&q=90'}
                      alt={selected.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex flex-col gap-3 text-xs">
                    <div>
                      <span className="eyebrow">Name</span>
                      <p className="serif text-lg font-bold text-[#1e1b18]">{selected.name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-[#fbf2ed] p-2.5 rounded-lg border border-[#d9c1c0]/40">
                        <span className="eyebrow text-[10px]">Category</span>
                        <p className="font-semibold text-[#1e1b18] capitalize mt-0.5">{selected.category}</p>
                      </div>
                      <div className="bg-[#fbf2ed] p-2.5 rounded-lg border border-[#d9c1c0]/40">
                        <span className="eyebrow text-[10px]">Brand</span>
                        <p className="font-semibold text-[#1e1b18] mt-0.5">{selected.brand || 'Charis'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#fbf2ed] p-2.5 rounded-lg border border-[#d9c1c0]/40">
                        <span className="eyebrow text-[10px]">Formality</span>
                        <p className="font-semibold text-[#1e1b18] mt-0.5">Level {selected.formality_level || 3}/5</p>
                      </div>
                      <div className="bg-[#fbf2ed] p-2.5 rounded-lg border border-[#d9c1c0]/40">
                        <span className="eyebrow text-[10px]">Times Worn</span>
                        <p className="font-semibold text-[#380208] mt-0.5">{selected.times_worn || 0} times</p>
                      </div>
                    </div>

                    {selected.primary_color && (
                      <div className="flex items-center gap-2 bg-[#fbf2ed] p-2.5 rounded-lg border border-[#d9c1c0]/40">
                        <span
                          className="w-5 h-5 rounded-full border border-black/10 shrink-0"
                          style={{ background: selected.primary_color }}
                        />
                        <div>
                          <span className="eyebrow text-[10px]">Primary Color (Cloudinary Extracted)</span>
                          <p className="font-semibold text-[#1e1b18] mt-0.5">{selected.primary_color}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 pt-2 border-t border-[#d9c1c0]/50">
                    <button
                      onClick={() => handleLogWear(selected.id, selected.name)}
                      className="w-full py-3 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all"
                    >
                      + Log Wear Today
                    </button>
                    <button
                      onClick={() => openEditModal(selected)}
                      className="w-full py-2.5 border border-[#d9c1c0] text-[#1e1b18] hover:border-[#380208] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <HugeiconsIcon icon={PencilEdit01Icon} size={14} /> Edit Item Details
                    </button>
                    <button
                      onClick={() => handleDeleteItem(selected.id, selected.name)}
                      className="w-full py-2.5 border border-red-200 text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={14} /> Remove Item
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Add Item Modal */}
          <AnimatePresence>
            {showAddModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-[#d9c1c0] flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex justify-between items-center border-b border-[#d9c1c0]/50 pb-4">
                    <div>
                      <span className="eyebrow">Personal Collection</span>
                      <h2 className="serif text-2xl font-bold text-[#1e1b18]">Curate New Item</h2>
                    </div>
                    <button onClick={() => setShowAddModal(false)} className="text-[#867272] hover:text-[#380208]">
                      <HugeiconsIcon icon={Cancel01Icon} size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleAddItem} className="flex flex-col gap-4">
                    {/* System Image Upload */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Garment Image (Upload from System)</label>
                      <div className="relative border-2 border-dashed border-[#d9c1c0] hover:border-[#380208] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#fbf2ed]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        {filePreview ? (
                          <div className="relative w-full h-36 rounded-lg overflow-hidden">
                            <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                            <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                              File Loaded
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 py-3 text-[#544342]">
                            <HugeiconsIcon icon={Upload01Icon} size={24} className="text-[#380208]" />
                            <p className="text-xs font-semibold text-[#1e1b18]">Click or drag image file from your system</p>
                            <p className="text-[10px] text-[#867272]">PNG, JPG, WEBP — Cloudinary will extract primary color</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Item Name *</label>
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="e.g. Italian Double-Breasted Trench"
                        className="py-2.5 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Category</label>
                        <select
                          value={newItemCategory}
                          onChange={(e) => setNewItemCategory(e.target.value)}
                          className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208] cursor-pointer"
                        >
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                          <option value="outerwear">Outerwear</option>
                          <option value="shoes">Shoes</option>
                          <option value="accessory">Accessory</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Brand</label>
                        <input
                          type="text"
                          value={newItemBrand}
                          onChange={(e) => setNewItemBrand(e.target.value)}
                          placeholder="e.g. Burberry"
                          className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Primary Color</label>
                        <input
                          type="text"
                          value={newItemColor}
                          onChange={(e) => setNewItemColor(e.target.value)}
                          placeholder="e.g. Camel"
                          className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Formality (1-5)</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={newItemFormality}
                          onChange={(e) => setNewItemFormality(Number(e.target.value))}
                          className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Purchase Price ($)</label>
                        <input
                          type="text"
                          value={newItemPrice}
                          onChange={(e) => setNewItemPrice(e.target.value)}
                          placeholder="e.g. 150.00"
                          className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Or External Image URL (Optional)</label>
                      <input
                        type="url"
                        value={newItemImageUrl}
                        onChange={(e) => setNewItemImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all shadow-md shadow-[#380208]/20 disabled:opacity-50 mt-2"
                    >
                      {submitting ? 'Curating...' : 'Curate Item →'}
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Edit Item Modal */}
          <AnimatePresence>
            {showEditModal && editItem && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-[#d9c1c0] flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex justify-between items-center border-b border-[#d9c1c0]/50 pb-4">
                    <div>
                      <span className="eyebrow">Edit Garment</span>
                      <h2 className="serif text-2xl font-bold text-[#1e1b18]">Update Details</h2>
                    </div>
                    <button onClick={() => setShowEditModal(false)} className="text-[#867272] hover:text-[#380208]">
                      <HugeiconsIcon icon={Cancel01Icon} size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
                    {/* Image Section */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-[#544342]">Item Image</label>
                      <div className="relative aspect-[3/4] max-h-48 rounded-xl overflow-hidden bg-[#fbf2ed] border border-[#d9c1c0]">
                        <img
                          src={editFilePreview || editImageUrl || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&q=80'}
                          alt="Current"
                          className="w-full h-full object-cover"
                        />
                        <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                          <HugeiconsIcon icon={Upload01Icon} size={24} className="text-white" />
                          <span className="text-white text-xs font-semibold mt-1">Change Image</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) { setEditFile(f); setEditFilePreview(URL.createObjectURL(f)); }
                          }} />
                        </label>
                      </div>
                      {!editFile && (
                        <input
                          type="text"
                          value={editImageUrl}
                          onChange={(e) => setEditImageUrl(e.target.value)}
                          placeholder="Or paste image URL..."
                          className="py-2 border-b border-[#d9c1c0] bg-transparent text-xs text-[#1e1b18] outline-none focus:border-[#380208]"
                        />
                      )}
                      {editFile && (
                        <p className="text-[11px] text-emerald-700 font-medium">✓ New image selected: {editFile.name}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Item Name *</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="py-2.5 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Category</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="py-2 border-b border-[#d9c1c0] bg-white text-sm text-[#1e1b18] outline-none cursor-pointer"
                        >
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                          <option value="outerwear">Outerwear</option>
                          <option value="shoes">Shoes</option>
                          <option value="accessory">Accessory</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Brand</label>
                        <input
                          type="text"
                          value={editBrand}
                          onChange={(e) => setEditBrand(e.target.value)}
                          className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Formality (1-5)</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={editFormality}
                          onChange={(e) => setEditFormality(Number(e.target.value))}
                          className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Purchase Price</label>
                        <input
                          type="text"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          placeholder="e.g. 450.00"
                          className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Primary Color Override</label>
                      <input
                        type="text"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        placeholder="e.g. #c4a882 or 'camel'"
                        className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="w-full py-3.5 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all shadow-md shadow-[#380208]/20 disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                    >
                      <HugeiconsIcon icon={FloppyDiskIcon} size={14} /> {savingEdit ? 'Saving...' : 'Save Changes →'}
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <footer className="flex justify-between items-center pt-6 border-t border-[#d9c1c0]/50">
            <span className="text-xs text-[#867272]">© 2026 CHARIS EDITORIAL. ALL RIGHTS RESERVED.</span>
            <nav className="flex gap-4 text-xs text-[#867272]">
              <a href="#" className="hover:text-[#380208]">Privacy</a>
              <a href="#" className="hover:text-[#380208]">Terms</a>
            </nav>
          </footer>
        </motion.div>
      </AppShell>
    </AuthGuard>
  );
}
