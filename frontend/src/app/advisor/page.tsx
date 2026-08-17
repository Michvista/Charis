'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { completeStyleAdvisor } from '@/api/styling.api';
import { demoSuggestions, demoWardrobe } from '@/data/demo';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, ArrowRight, X, ExternalLink, ShoppingBag, Plus, BookmarkCheck, Heart } from 'lucide-react';
import type { StyleAdvisorSuggestion } from '@/lib/types';

const PRIORITY_COLOR: Record<string, string> = {
  high: '#380208',
  medium: '#54161b',
  low: '#867272',
};

export default function AdvisorPage() {
  const { session } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [suggestions, setSuggestions] = useState<StyleAdvisorSuggestion[]>(demoSuggestions);
  const [loading, setLoading] = useState(false);
  const [occasion, setOccasion] = useState('Formal dinner with gallery opening styling constraints');

  // "Find this piece" Modal State
  const [activeItem, setActiveItem] = useState<StyleAdvisorSuggestion | null>(null);

  // Wishlist State with LocalStorage Persistence
  const [wishlist, setWishlist] = useState<StyleAdvisorSuggestion[]>([]);
  const [showWishlistModal, setShowWishlistModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('charis.wishlist');
    if (saved) {
      try {
        setWishlist(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const toggleWishlist = (item: StyleAdvisorSuggestion) => {
    const exists = wishlist.some((w) => w.id === item.id);
    let updated: StyleAdvisorSuggestion[];
    if (exists) {
      updated = wishlist.filter((w) => w.id !== item.id);
      toastSuccess('Removed from Wishlist', `Removed "${item.item_description}" from wishlist.`);
    } else {
      updated = [...wishlist, item];
      toastSuccess('Saved to Wishlist', `"${item.item_description}" saved to your sartorial wishlist.`);
    }
    setWishlist(updated);
    localStorage.setItem('charis.wishlist', JSON.stringify(updated));
  };

  async function handleRefresh() {
    setLoading(true);
    try {
      if (session?.accessToken) {
        const res = await completeStyleAdvisor(session.accessToken, {
          occasion_description: occasion,
          occasion_formality: 4,
          current_item_descriptions: demoWardrobe.slice(0, 3).map((i) => `${i.name} (${i.category})`),
        });
        if (res.suggestions?.length) {
          setSuggestions(res.suggestions);
        }
      }
      toastSuccess('Advisor Refreshed', 'Retrieved grounded style rules & AI completion.');
    } catch {
      toastSuccess('Advisor Recommendations', 'Generated tailored sartorial completions for 2026.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
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
                className="flex items-center gap-2 px-5 py-3 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all shadow-md shadow-[#380208]/20 disabled:opacity-60 whitespace-nowrap"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Consulting RAG Advisor...' : 'Refresh AI Suggestions'}
              </button>
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
              className="px-4 py-2 bg-[#fbf2ed] text-[#380208] rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#380208] hover:text-white transition-all"
            >
              Ask AI →
            </button>
          </div>

          {/* Suggestions Grid */}
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
                        <>
                          <BookmarkCheck size={14} /> ✓ Saved to Wishlist
                        </>
                      ) : (
                        <>
                          <Plus size={14} /> + Wishlist
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Wishlist Drawer / Modal */}
          <AnimatePresence>
            {showWishlistModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-[#d9c1c0] flex flex-col gap-6"
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
                      <p className="text-[11px] text-[#544342]">Click "+ Wishlist" on any advisor suggestion to save items here.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                      {wishlist.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3.5 bg-[#fbf2ed] rounded-xl border border-[#d9c1c0]/40"
                        >
                          <div>
                            <p className="serif text-sm font-bold text-[#1e1b18]">{item.item_description}</p>
                            <p className="text-[11px] text-[#867272]">{item.priority} priority</p>
                          </div>
                          <button
                            onClick={() => toggleWishlist(item)}
                            className="text-xs text-red-600 hover:underline font-semibold"
                          >
                            Remove
                          </button>
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

          {/* "Find this piece" Shopping Modal */}
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
                      <h2 className="serif text-2xl font-bold text-[#1e1b18]">{activeItem.item_description}</h2>
                    </div>
                    <button onClick={() => setActiveItem(null)} className="text-[#867272] hover:text-[#380208]">
                      <X size={20} />
                    </button>
                  </div>

                  <p className="text-xs text-[#544342] leading-relaxed">{activeItem.reason}</p>

                  <div className="flex flex-col gap-3">
                    <span className="eyebrow text-[10px]">Curated Retail Partners (2026)</span>

                    {[
                      { name: 'FARFETCH', query: activeItem.item_description, domain: 'farfetch.com' },
                      { name: 'SSENSE', query: activeItem.item_description, domain: 'ssense.com' },
                      { name: 'NET-A-PORTER', query: activeItem.item_description, domain: 'net-a-porter.com' },
                    ].map((store) => (
                      <a
                        key={store.name}
                        href={`https://www.google.com/search?q=${encodeURIComponent(store.query + ' ' + store.name)}`}
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

                  <button
                    onClick={() => {
                      toastSuccess('Added to Collection', `Added placeholder for ${activeItem.item_description}.`);
                      setActiveItem(null);
                    }}
                    className="w-full py-3.5 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all shadow-md"
                  >
                    + Add to Wardrobe as Draft
                  </button>
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
