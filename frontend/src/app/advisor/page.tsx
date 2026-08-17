'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { completeStyleAdvisor } from '@/api/styling.api';
import { listWardrobeItems, createWardrobeItem } from '@/api/wardrobe.api';
import { listOccasions } from '@/api/styling.api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, RefreshCw, ArrowRight, X, ExternalLink, ShoppingBag,
  Plus, BookmarkCheck, Loader2, CheckCircle2, Info
} from 'lucide-react';
import type { StyleAdvisorSuggestion, WardrobeItem, Occasion } from '@/lib/types';

const PRIORITY_COLOR: Record<string, string> = {
  high: '#380208',
  medium: '#54161b',
  low: '#867272',
};

const RETAIL_PARTNERS = [
  { name: 'FARFETCH', domain: 'farfetch.com' },
  { name: 'SSENSE', domain: 'ssense.com' },
  { name: 'NET-A-PORTER', domain: 'net-a-porter.com' },
];

export default function AdvisorPage() {
  const { session } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [suggestions, setSuggestions] = useState<StyleAdvisorSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [occasion, setOccasion] = useState('Formal dinner with gallery opening styling constraints');

  // Real wardrobe context for RAG
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);

  // "Find this piece" Modal
  const [activeItem, setActiveItem] = useState<StyleAdvisorSuggestion | null>(null);
  const [addingDraft, setAddingDraft] = useState(false);

  // Wishlist State with LocalStorage Persistence
  const [wishlist, setWishlist] = useState<StyleAdvisorSuggestion[]>([]);
  const [showWishlistModal, setShowWishlistModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('charis.wishlist');
    if (saved) {
      try { setWishlist(JSON.parse(saved)); } catch {}
    }
  }, []);

  // Load real wardrobe + occasions for RAG context
  useEffect(() => {
    if (!session?.accessToken) return;
    setLoadingContext(true);
    Promise.all([
      listWardrobeItems(session.accessToken).catch(() => []),
      listOccasions(session.accessToken).catch(() => []),
    ]).then(([items, occ]) => {
      setWardrobeItems(Array.isArray(items) ? items : []);
      setOccasions(Array.isArray(occ) ? occ : []);
    }).finally(() => setLoadingContext(false));
  }, [session]);

  const toggleWishlist = (item: StyleAdvisorSuggestion) => {
    const exists = wishlist.some((w) => w.id === item.id);
    const updated = exists
      ? wishlist.filter((w) => w.id !== item.id)
      : [...wishlist, item];
    setWishlist(updated);
    localStorage.setItem('charis.wishlist', JSON.stringify(updated));
    if (exists) {
      toastSuccess('Removed from Wishlist', `Removed "${item.item_description}" from wishlist.`);
    } else {
      toastSuccess('Saved to Wishlist', `"${item.item_description}" saved to your sartorial wishlist.`);
    }
  };

  async function handleRefresh() {
    if (!session?.accessToken) {
      toastError('Not Authenticated', 'Please sign in to use the Style Advisor.');
      return;
    }
    setLoading(true);
    try {
      // Build real wardrobe context descriptions from actual items
      const itemDescriptions = wardrobeItems
        .slice(0, 10)
        .map((i) => `${i.name} (${i.category}${i.primary_color ? ', ' + i.primary_color : ''}${i.formality_level ? ', formality ' + i.formality_level + '/5' : ''})`);

      // Find best matching occasion context from styling service
      const matchingOccasion = occasions.find((o) =>
        o.name?.toLowerCase().includes(occasion.toLowerCase().split(' ')[0])
      );

      const res = await completeStyleAdvisor(session.accessToken, {
        occasion_description: occasion.trim(),
        occasion_formality: matchingOccasion?.formalityLevel ?? 4,
        current_item_descriptions: itemDescriptions.length > 0 ? itemDescriptions : undefined,
        occasion_id: matchingOccasion?.id,
      });

      if (res.suggestions?.length) {
        setSuggestions(res.suggestions);
        toastSuccess('Advisor Refreshed', `${res.suggestions.length} grounded style recommendations generated.`);
      } else {
        toastError('No Suggestions Returned', 'The Style Advisor returned an empty response. Try rephrasing your occasion.');
      }
    } catch (err) {
      toastError('Advisor Failed', err instanceof Error ? err.message : 'Style Advisor API returned an error.');
    } finally {
      setLoading(false);
    }
  }

  // Add Advisor suggestion as a draft wardrobe item
  const handleAddAsDraft = async (item: StyleAdvisorSuggestion) => {
    if (!session?.accessToken) {
      toastError('Not Authenticated', 'Sign in to add items.');
      return;
    }
    setAddingDraft(true);
    try {
      const formData = new FormData();
      formData.append('name', item.item_description.slice(0, 120));
      formData.append('category', guessCategoryFromDescription(item.item_description));
      formData.append('brand', 'Draft — To Source');
      formData.append('primary_color', 'TBD');
      formData.append('formality_level', '4');
      formData.append('purchase_price', '0');
      formData.append('purchase_date', new Date().toISOString().split('T')[0]);
      // No image — backend marks tagging_status as pending
      formData.append('image_url', 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80');

      await createWardrobeItem(session.accessToken, formData);
      toastSuccess('Draft Added to Library', `"${item.item_description.slice(0, 60)}..." added as a draft item. Upload an image to complete it.`);
      setActiveItem(null);
    } catch (err) {
      toastError('Draft Failed', err instanceof Error ? err.message : 'Could not add draft to wardrobe.');
    } finally {
      setAddingDraft(false);
    }
  };

  function guessCategoryFromDescription(desc: string): string {
    const d = desc.toLowerCase();
    if (d.includes('shoe') || d.includes('boot') || d.includes('loafer') || d.includes('heel') || d.includes('sneaker')) return 'shoes';
    if (d.includes('coat') || d.includes('jacket') || d.includes('blazer') || d.includes('outerwear') || d.includes('trench')) return 'outerwear';
    if (d.includes('trouser') || d.includes('skirt') || d.includes('pant') || d.includes('shorts') || d.includes('bottom')) return 'bottom';
    if (d.includes('bag') || d.includes('belt') || d.includes('scarf') || d.includes('jewelry') || d.includes('watch') || d.includes('accessory')) return 'accessory';
    return 'top';
  }

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#867272]">
                <span className="w-6 h-px bg-[#d9c1c0]" />
                RAG Style Intelligence
              </div>
              <h1 className="serif text-4xl font-bold text-[#1e1b18] mt-1">Style Advisor</h1>
              <p className="text-sm text-[#544342]">
                AI-powered sartorial recommendations grounded in your personal wardrobe context.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowWishlistModal(true)}
                className="flex items-center gap-2 px-4 py-3 border border-[#d9c1c0] text-[#1e1b18] rounded-lg text-xs font-semibold uppercase tracking-wider bg-white hover:border-[#380208] transition-colors"
              >
                <BookmarkCheck size={16} className="text-[#380208]" /> View Wishlist ({wishlist.length})
              </button>

              <button
                className="flex items-center gap-2 px-5 py-3 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all shadow-md shadow-[#380208]/20 disabled:opacity-60"
                onClick={handleRefresh}
                disabled={loading || loadingContext}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Consulting Advisor...' : 'Refresh AI Suggestions'}
              </button>
            </div>
          </div>

          {/* Context Info Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-white rounded-2xl border border-[#d9c1c0] shadow-sm">
            <Info size={18} className="text-[#380208] shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-[#544342]">
              <span className="font-semibold text-[#1e1b18]">Wardrobe-Grounded RAG: </span>
              The advisor reads your{' '}
              <span className="font-bold text-[#380208]">{wardrobeItems.length} garments</span> and{' '}
              <span className="font-bold text-[#380208]">{occasions.length} occasions</span> from your library to generate
              contextual styling gaps and recommendations — not generic advice.
              {wardrobeItems.length === 0 && (
                <span className="text-amber-700 font-semibold"> Add items to your wardrobe library first for personalized results.</span>
              )}
            </div>
          </div>

          {/* Occasion Prompt Box */}
          <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-[#d9c1c0] shadow-sm">
            <Sparkles size={20} className="text-[#380208] shrink-0" />
            <input
              className="flex-1 border-none outline-none text-sm text-[#1e1b18] bg-transparent font-medium placeholder:text-[#867272]"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="Describe your occasion or aesthetic query..."
            />
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-[#fbf2ed] text-[#380208] rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#380208] hover:text-white transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Ask AI →'}
            </button>
          </div>

          {/* Empty / Loading State */}
          {suggestions.length === 0 && !loading && (
            <div className="py-12 text-center bg-white/60 border border-dashed border-[#d9c1c0] rounded-2xl flex flex-col items-center gap-3">
              <Sparkles size={36} className="text-[#d9c1c0]" />
              <p className="serif text-xl font-semibold text-[#1e1b18]">No recommendations yet</p>
              <p className="text-xs text-[#544342] max-w-sm">
                Describe your occasion above and click "Refresh AI Suggestions" to get wardrobe-grounded style recommendations.
              </p>
            </div>
          )}

          {loading && (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-[#380208]/30 border-t-[#380208] rounded-full animate-spin" />
              <p className="text-sm text-[#544342] font-medium">Consulting RAG advisor with your {wardrobeItems.length} wardrobe items...</p>
            </div>
          )}

          {/* Suggestions Grid */}
          {suggestions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {suggestions.map((s, i) => {
                const inWishlist = wishlist.some((w) => w.id === s.id);
                return (
                  <motion.div
                    key={s.id}
                    className="bg-white rounded-2xl p-6 border border-[#d9c1c0] flex flex-col gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className="flex justify-between items-center gap-2 flex-wrap">
                      <span
                        className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                        style={{
                          background: PRIORITY_COLOR[s.priority] + '15',
                          color: PRIORITY_COLOR[s.priority],
                        }}
                      >
                        {s.priority} priority
                      </span>
                      <span className="text-[10px] text-[#867272] uppercase tracking-wider">
                        {s.occasion_description?.slice(0, 30) || 'Editorial'}
                      </span>
                    </div>

                    <h3 className="serif text-2xl font-bold text-[#1e1b18] group-hover:text-[#380208] transition-colors">
                      {s.item_description}
                    </h3>
                    <p className="text-xs text-[#544342] leading-relaxed flex-1">{s.reason}</p>

                    <div className="pt-3 border-t border-[#d9c1c0]/40 flex justify-between items-center">
                      <button
                        onClick={() => setActiveItem(s)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#380208] hover:gap-2.5 transition-all"
                      >
                        Find this piece <ArrowRight size={14} />
                      </button>

                      <button
                        onClick={() => toggleWishlist(s)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                          inWishlist
                            ? 'bg-[#380208] text-white'
                            : 'bg-[#fbf2ed] text-[#544342] hover:bg-[#380208] hover:text-white'
                        }`}
                      >
                        {inWishlist ? (
                          <><BookmarkCheck size={14} /> ✓ Saved</>
                        ) : (
                          <><Plus size={14} /> + Wishlist</>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Wishlist Modal */}
          <AnimatePresence>
            {showWishlistModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-[#d9c1c0] flex flex-col gap-6 max-h-[85vh] overflow-hidden"
                >
                  <div className="flex justify-between items-center border-b border-[#d9c1c0]/50 pb-4">
                    <div>
                      <span className="eyebrow">Personal Sourcing</span>
                      <h2 className="serif text-2xl font-bold text-[#1e1b18]">Sartorial Wishlist</h2>
                    </div>
                    <button onClick={() => setShowWishlistModal(false)} className="text-[#867272] hover:text-[#380208]">
                      <X size={20} />
                    </button>
                  </div>

                  {wishlist.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#867272] flex flex-col items-center gap-2">
                      <BookmarkCheck size={32} className="text-[#d9c1c0]" />
                      <p>Your wishlist is currently empty.</p>
                      <p className="text-[11px] text-[#544342]">Click "+ Wishlist" on any suggestion to save items here.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                      {wishlist.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3.5 bg-[#fbf2ed] rounded-xl border border-[#d9c1c0]/40 gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="serif text-sm font-bold text-[#1e1b18] truncate">{item.item_description}</p>
                            <p className="text-[11px] text-[#867272]">{item.priority} priority</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleAddAsDraft(item)}
                              disabled={addingDraft}
                              className="text-xs bg-[#380208] text-white px-2.5 py-1 rounded font-semibold hover:bg-[#54161b] transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              <Plus size={12} /> Draft
                            </button>
                            <button
                              onClick={() => { setActiveItem(item); setShowWishlistModal(false); }}
                              className="text-xs text-[#380208] font-semibold hover:underline"
                            >
                              Find
                            </button>
                            <button
                              onClick={() => toggleWishlist(item)}
                              className="text-xs text-red-600 hover:underline font-semibold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setShowWishlistModal(false)}
                    className="w-full py-3 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b]"
                  >
                    Close Wishlist
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* "Find this piece" Shopping + Draft Modal */}
          <AnimatePresence>
            {activeItem && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-[#d9c1c0] flex flex-col gap-6"
                >
                  <div className="flex justify-between items-center border-b border-[#d9c1c0]/50 pb-4">
                    <div>
                      <span className="eyebrow">Luxury Sourcing</span>
                      <h2 className="serif text-xl font-bold text-[#1e1b18] leading-tight">{activeItem.item_description}</h2>
                    </div>
                    <button onClick={() => setActiveItem(null)} className="text-[#867272] hover:text-[#380208] shrink-0 ml-2">
                      <X size={20} />
                    </button>
                  </div>

                  <p className="text-xs text-[#544342] leading-relaxed">{activeItem.reason}</p>

                  {/* Retail Partner Links */}
                  <div className="flex flex-col gap-3">
                    <span className="eyebrow text-[10px]">Curated Retail Partners (2026)</span>
                    {RETAIL_PARTNERS.map((store) => (
                      <a
                        key={store.name}
                        href={`https://www.google.com/search?q=${encodeURIComponent(activeItem.item_description + ' ' + store.name)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex justify-between items-center p-3.5 bg-[#fbf2ed] hover:bg-[#380208] hover:text-white rounded-xl border border-[#d9c1c0]/40 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <ShoppingBag size={16} className="text-[#380208] group-hover:text-white" />
                          <span className="text-xs font-bold tracking-wider">{store.name}</span>
                        </div>
                        <ExternalLink size={14} className="opacity-60 group-hover:opacity-100" />
                      </a>
                    ))}
                  </div>

                  {/* Add to Wardrobe as Draft — actually calls API */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-[#d9c1c0]/40">
                    <p className="text-[10px] text-[#867272]">
                      Add as a draft placeholder in your wardrobe library. You can upload the image and fill in details later.
                    </p>
                    <button
                      onClick={() => handleAddAsDraft(activeItem)}
                      disabled={addingDraft}
                      className="w-full py-3.5 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {addingDraft ? (
                        <><Loader2 size={14} className="animate-spin" /> Adding Draft...</>
                      ) : (
                        <><Plus size={14} /> + Add to Wardrobe as Draft</>
                      )}
                    </button>
                  </div>
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
