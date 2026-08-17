'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { listWardrobeItems } from '@/api/wardrobe.api';
import { listOccasions, createOccasion, generateCombos, requestVerdict, fetchVerdict } from '@/api/styling.api';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Save, Share2, ChevronDown, Plus, X, Search, Filter } from 'lucide-react';
import type { WardrobeItem, Occasion, VerdictResponse } from '@/lib/types';

const SEASON_CHIPS = ['Autumn', 'Winter', 'Spring', 'Summer'];
const ITEM_CATEGORIES = ['All', 'top', 'bottom', 'outerwear', 'shoes', 'accessory'];

export default function StylingPage() {
  const { session } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [selectedOccasion, setSelectedOccasion] = useState<string>('');
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(['Autumn']);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Decluttering Filters for 50+ Wardrobe Items
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('All');

  const [verdict, setVerdict] = useState<VerdictResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Occasion Modal State
  const [showOccasionModal, setShowOccasionModal] = useState(false);
  const [newOccasionName, setNewOccasionName] = useState('');
  const [newOccasionFormality, setNewOccasionFormality] = useState(4);
  const [creatingOccasion, setCreatingOccasion] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    Promise.all([
      listWardrobeItems(session.accessToken).catch(() => []),
      listOccasions(session.accessToken).catch(() => []),
    ]).then(([items, occ]) => {
      setWardrobeItems(items);
      setOccasions(occ);
      if (items.length) {
        setSelectedItems(new Set(items.slice(0, 3).map((i) => i.id)));
      }
      if (occ.length) {
        setSelectedOccasion(occ[0].id);
      }
    });
  }, [session]);

  function toggleItem(id: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSeason(s: string) {
    setSelectedSeasons((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  const handleCreateOccasion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.accessToken || !newOccasionName.trim()) return;

    setCreatingOccasion(true);
    try {
      const newOcc = await createOccasion(session.accessToken, {
        name: newOccasionName.trim(),
        formalityLevel: Number(newOccasionFormality),
      });
      toastSuccess('Occasion Created', `"${newOccasionName}" created at Formality Level ${newOccasionFormality}.`);
      setOccasions((prev) => [...prev, newOcc]);
      setSelectedOccasion(newOcc.id);
      setShowOccasionModal(false);
      setNewOccasionName('');
    } catch (err) {
      toastError('Failed to create occasion', err instanceof Error ? err.message : 'Error calling styling service.');
    } finally {
      setCreatingOccasion(false);
    }
  };

  async function handleGenerateCombos() {
    if (selectedItems.size === 0) {
      toastError('No items selected', 'Please select at least 1 item from your wardrobe.');
      return;
    }
    setLoading(true);
    try {
      const itemsPayload = wardrobeItems
        .filter((i) => selectedItems.has(i.id))
        .map((i) => ({ wardrobeItemId: i.id, itemRole: i.category, imageUrl: i.image_url }));

      if (session?.accessToken) {
        // Step 1: Submit verdict request -> returns { outfitId, status: "pending" }
        const res = await requestVerdict(session.accessToken, {
          occasionId: selectedOccasion || undefined,
          items: itemsPayload,
        });

        const outfitId = res?.outfitId;
        if (outfitId) {
          setVerdict({
            outfitId,
            status: 'processing',
            score: 0,
            verdictText: 'Evaluating garment composition with Gemini Vision...',
          });

          // Step 2: Poll GET /verdict/<outfitId> until status === 'done' or 'failed'
          let attempts = 0;
          const maxAttempts = 10;
          let completed = false;

          while (attempts < maxAttempts && !completed) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            attempts++;
            try {
              const v = await fetchVerdict(session.accessToken, outfitId);
              if (v) {
                const normalizedVerdict = (v as any).body || (v as any).data || v;
                if (normalizedVerdict.status === 'done') {
                  setVerdict(normalizedVerdict);
                  completed = true;
                  toastSuccess('AI Verdict Complete', 'Outfit harmony score calculated.');
                  break;
                } else if (normalizedVerdict.status === 'failed') {
                  setVerdict({
                    outfitId,
                    status: 'failed',
                    score: 0,
                    verdictText: 'AI Verdict processing encountered a worker error.',
                  });
                  completed = true;
                  toastError('Verdict Worker Error', 'Styling service failed to process Gemini vision verdict.');
                  break;
                }
              }
            } catch {
              // keep polling
            }
          }

          if (!completed) {
            setVerdict(null);
            toastError('Verdict Timeout', 'Styling worker took too long to complete.');
          }
        } else {
          setVerdict(null);
          toastError('Verdict Failed', 'No outfitId returned from styling service.');
        }
      } else {
        toastError('Authentication Required', 'Please sign in to run AI verdict analysis.');
      }
    } catch (err) {
      setVerdict(null);
      toastError('AI Verdict Failed', err instanceof Error ? err.message : 'Server returned 500 Internal Error.');
    } finally {
      setLoading(false);
    }
  }

  const score = verdict?.score ?? 0;
  const selectedItemsList = wardrobeItems.filter((i) => selectedItems.has(i.id));

  // Decluttered Wardrobe List (Search + Category Filtered)
  const filteredWardrobeItems = useMemo(() => {
    return wardrobeItems.filter((item) => {
      const matchesCat =
        itemCategoryFilter === 'All' || item.category?.toLowerCase() === itemCategoryFilter.toLowerCase();
      const matchesSearch =
        !itemSearch.trim() ||
        item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        item.brand?.toLowerCase().includes(itemSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [wardrobeItems, itemCategoryFilter, itemSearch]);

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#867272]">
                <span className="w-6 h-px bg-[#d9c1c0]" />
                Interactive Ensemble Builder
              </div>
              <h1 className="serif text-4xl font-bold text-[#1e1b18] mt-1">Outfit Builder</h1>
              <p className="text-sm text-[#544342] max-w-lg leading-relaxed">
                Combine wardrobe pieces to evaluate formality score and generate AI verdict analysis.
              </p>
            </div>

            <button
              onClick={() => setShowOccasionModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#d9c1c0] text-xs font-semibold uppercase tracking-wider text-[#1e1b18] bg-white hover:border-[#380208] transition-colors"
            >
              <Plus size={14} /> Create Occasion
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
            {/* Left Panel */}
            <div className="flex flex-col gap-6">
              <div className="flex items-end gap-5 flex-wrap">
                <div className="flex flex-col gap-1.5">
                  <label className="eyebrow">Occasion Context</label>
                  <div className="relative inline-flex items-center">
                    <select
                      className="appearance-none py-3 pr-10 pl-4 border border-[#d9c1c0] rounded-xl serif text-lg font-semibold text-[#1e1b18] bg-white cursor-pointer min-w-52 outline-none focus:border-[#380208]"
                      value={selectedOccasion}
                      onChange={(e) => setSelectedOccasion(e.target.value)}
                    >
                      <option value="">Default Occasion</option>
                      {occasions.map((o, idx) => (
                        <option key={o.id || `occ-opt-${idx}`} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 pointer-events-none text-[#544342]" />
                  </div>
                </div>

                <div className="flex gap-2 mb-0.5">
                  {SEASON_CHIPS.map((s) => (
                    <button
                      key={s}
                      className={`px-4 py-2 rounded-full border text-xs font-semibold uppercase tracking-wider transition-colors ${
                        selectedSeasons.includes(s)
                          ? 'bg-[#1e1b18] text-white border-[#1e1b18]'
                          : 'bg-white text-[#544342] border-[#d9c1c0] hover:border-[#1e1b18]'
                      }`}
                      onClick={() => toggleSeason(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Outfit Canvas Display */}
              <div className="bg-[#fbf2ed] rounded-2xl p-8 min-h-[340px] flex items-center justify-center relative border border-[#d9c1c0]/40 overflow-hidden shadow-inner">
                {selectedItemsList.length === 0 ? (
                  <p className="text-sm text-[#867272] italic">Select items below to compose your outfit</p>
                ) : (
                  <div className="flex gap-4 flex-wrap justify-center items-center">
                    {selectedItemsList.map((item, i) => (
                      <motion.div
                        key={item.id || `item-canvas-${i}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="w-36 bg-white rounded-xl shadow-lg border border-[#d9c1c0] p-2 flex flex-col gap-2 relative group"
                      >
                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-[#f5ece7]">
                          <img
                            src={item.image_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&q=80'}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="px-1 pb-1">
                          <p className="serif text-xs font-bold text-[#1e1b18] truncate">{item.name}</p>
                          <p className="text-[10px] text-[#867272] capitalize">{item.category}</p>
                        </div>
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <X size={10} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Decluttered Wardrobe Picker with Search & Filter Tabs */}
              <div className="flex flex-col gap-3 bg-white rounded-2xl border border-[#d9c1c0] p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d9c1c0]/40 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="eyebrow">Select Wardrobe Items</span>
                    <span className="text-xs font-bold bg-[#380208] text-white px-2 py-0.5 rounded-full">
                      {selectedItems.size} Selected
                    </span>
                  </div>

                  <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#867272]" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-[#d9c1c0] rounded-lg text-xs outline-none focus:border-[#380208]"
                    />
                  </div>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {ITEM_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setItemCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                        itemCategoryFilter === cat
                          ? 'bg-[#380208] text-white'
                          : 'bg-[#fbf2ed] text-[#544342] hover:bg-[#d9c1c0]/50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Grid View */}
                {filteredWardrobeItems.length === 0 ? (
                  <p className="text-xs text-[#867272] italic py-4 text-center">No wardrobe items match your filter.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-56 overflow-y-auto pr-1 pt-2">
                    {filteredWardrobeItems.map((item, idx) => (
                      <button
                        key={item.id || `wardrobe-pick-${idx}`}
                        className={`aspect-square rounded-xl border-2 overflow-hidden transition-all relative ${
                          selectedItems.has(item.id)
                            ? 'border-[#380208] ring-2 ring-[#380208]/30 scale-95'
                            : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        onClick={() => toggleItem(item.id)}
                        title={item.name}
                      >
                        <img
                          src={item.image_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&q=80'}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        {selectedItems.has(item.id) && (
                          <div className="absolute inset-0 bg-[#380208]/20 flex items-center justify-center">
                            <span className="w-5 h-5 bg-[#380208] text-white rounded-full text-[10px] font-bold grid place-items-center">
                              ✓
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel — AI Verdict & Actions */}
            <div className="flex flex-col gap-4">
              <div className="bg-[#380208] text-white rounded-2xl p-6 flex flex-col gap-5 shadow-xl">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80">
                    <Sparkles size={14} className="text-amber-300" />
                    <span>AI Advisor Verdict</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider capitalize">
                    {verdict?.status || 'Idle'}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="serif text-6xl font-bold leading-none">{score}</span>
                  <span className="text-lg opacity-70">% Harmony</span>
                </div>

                <p className="serif text-xl font-bold leading-snug text-amber-100">
                  "{verdict?.verdictText || 'Select wardrobe items to analyze outfit composition.'}"
                </p>

                {verdict?.status === 'processing' && (
                  <div className="flex items-center gap-2 text-xs text-amber-200 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Worker evaluating Gemini Vision verdict...</span>
                  </div>
                )}
              </div>

              <button
                className="w-full py-4 bg-[#380208] text-white rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#54161b] transition-all shadow-md shadow-[#380208]/20 disabled:opacity-50"
                onClick={handleGenerateCombos}
                disabled={loading}
              >
                <Sparkles size={16} /> {loading ? 'Evaluating AI Verdict...' : 'Run AI Verdict Analysis'}
              </button>

              <button
                className="w-full py-3.5 border border-[#d9c1c0] rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 text-[#1e1b18] bg-white hover:border-[#380208] transition-colors"
                onClick={() => toastSuccess('Look Saved', 'Ensemble saved to your personal styling archive.')}
              >
                <Save size={16} /> Save Outfit to Archive
              </button>

              <button
                className="w-full py-3 border border-[#d9c1c0] rounded-xl text-xs font-medium flex items-center justify-center gap-2 text-[#544342] bg-transparent hover:text-[#380208] transition-colors"
                onClick={() => toastSuccess('Share Link Copied', 'Public outfit lookbook URL copied to clipboard.')}
              >
                <Share2 size={14} /> Share Lookbook URL
              </button>
            </div>
          </div>

          {/* Create Occasion Modal */}
          <AnimatePresence>
            {showOccasionModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-[#d9c1c0] flex flex-col gap-6"
                >
                  <div className="flex justify-between items-center border-b border-[#d9c1c0]/50 pb-4">
                    <div>
                      <span className="eyebrow">Styling Service</span>
                      <h2 className="serif text-2xl font-bold text-[#1e1b18]">New Occasion</h2>
                    </div>
                    <button onClick={() => setShowOccasionModal(false)} className="text-[#867272] hover:text-[#380208]">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateOccasion} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Occasion Name *</label>
                      <input
                        type="text"
                        value={newOccasionName}
                        onChange={(e) => setNewOccasionName(e.target.value)}
                        placeholder="e.g. Gallery Opening Gala"
                        className="py-2.5 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Formality Level (1: Casual → 5: Black Tie)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={newOccasionFormality}
                        onChange={(e) => setNewOccasionFormality(Number(e.target.value))}
                        className="py-2.5 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={creatingOccasion}
                      className="w-full py-3.5 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all shadow-md shadow-[#380208]/20 disabled:opacity-50 mt-2"
                    >
                      {creatingOccasion ? 'Creating...' : 'Create Occasion →'}
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
