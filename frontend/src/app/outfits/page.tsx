'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { Shirt01Icon, Delete02Icon, Cancel01Icon, SparklesIcon, Copy01Icon } from '@hugeicons/core-free-icons';
import { useToast } from '@/lib/context/ToastContext';

type SavedOutfit = {
  outfitId: string;
  savedAt: string;
  score: number;
  verdict: string;
  visualNotes: string;
  items: Array<{ name: string; image_url?: string; category: string }>;
};

const STORAGE_KEY = 'charis.saved_outfits';

export default function OutfitsPage() {
  const { toastSuccess } = useToast();
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
  const [selectedOutfit, setSelectedOutfit] = useState<SavedOutfit | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setOutfits(JSON.parse(raw));
    } catch {}
  }, []);

  const handleDelete = (outfitId: string) => {
    const updated = outfits.filter((o) => o.outfitId !== outfitId);
    setOutfits(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (selectedOutfit?.outfitId === outfitId) setSelectedOutfit(null);
    toastSuccess('Outfit Removed', 'Removed from your saved outfits archive.');
  };

  const handleCopyUrl = (outfitId: string) => {
    const url = `${window.location.origin}/outfits/${outfitId}`;
    navigator.clipboard.writeText(url).then(() =>
      toastSuccess('URL Copied', `Lookbook URL copied: ${url}`)
    );
  };

  const verdictColor = (v: string) => {
    if (v === 'works') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (v === 'partially_works') return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const verdictLabel = (v: string) => {
    if (v === 'works') return '✓ Works';
    if (v === 'partially_works') return '~ Partial';
    return '✗ Doesn\'t Work';
  };

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#867272]">
              <span className="w-6 h-px bg-[#d9c1c0]" />
              Outfit Archive
            </div>
            <h1 className="serif text-4xl font-bold text-[#1e1b18] mt-1">Saved Outfits</h1>
            <p className="text-sm text-[#544342] mt-1">
              {outfits.length} outfit{outfits.length !== 1 ? 's' : ''} archived from your AI verdict sessions.
            </p>
          </div>

          {outfits.length === 0 ? (
            <div className="py-20 bg-white/60 border border-dashed border-[#d9c1c0] rounded-2xl flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-[#fbf2ed] text-[#d9c1c0] grid place-items-center mb-4">
                <HugeiconsIcon icon={Shirt01Icon} size={28} />
              </div>
              <h3 className="serif text-2xl font-semibold text-[#1e1b18]">No saved outfits yet</h3>
              <p className="text-xs text-[#544342] max-w-sm mt-2">
                Run the AI Verdict in the Styling page and click "Save to Archive" to store outfits here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {outfits.map((outfit, i) => (
                <motion.div
                  key={outfit.outfitId}
                  className="bg-white rounded-2xl border border-[#d9c1c0] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedOutfit(outfit)}
                >
                  {/* Items Preview Grid */}
                  <div className="grid grid-cols-3 gap-0.5 aspect-video bg-[#f5ece7]">
                    {outfit.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="relative overflow-hidden">
                        <img
                          src={item.image_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=300&q=80'}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {outfit.items.length === 0 && (
                      <div className="col-span-3 flex items-center justify-center">
                        <HugeiconsIcon icon={Shirt01Icon} size={32} className="text-[#d9c1c0]" />
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${verdictColor(outfit.verdict)}`}>
                        {verdictLabel(outfit.verdict)}
                      </span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="serif text-2xl font-bold text-[#380208]">{outfit.score}</span>
                        <span className="text-xs text-[#867272]">%</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#544342] leading-relaxed line-clamp-2">
                      {outfit.visualNotes || 'No visual notes recorded.'}
                    </p>

                    <div className="flex gap-2 items-center border-t border-[#d9c1c0]/30 pt-2">
                      <p className="text-[10px] text-[#867272] flex-1">
                        {outfit.items.length} pieces · {new Date(outfit.savedAt).toLocaleDateString()}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyUrl(outfit.outfitId); }}
                        className="p-1.5 text-[#867272] hover:text-[#380208] transition-colors"
                        title="Copy lookbook URL"
                      >
                        <HugeiconsIcon icon={Copy01Icon} size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(outfit.outfitId); }}
                        className="p-1.5 text-[#867272] hover:text-red-600 transition-colors"
                        title="Remove outfit"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Outfit Detail Modal */}
          <AnimatePresence>
            {selectedOutfit && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedOutfit(null)}>
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-[#d9c1c0] flex flex-col gap-5 max-h-[85vh] overflow-y-auto"
                >
                  <div className="flex justify-between items-center border-b border-[#d9c1c0]/50 pb-3">
                    <div>
                      <span className="eyebrow">Outfit Archive</span>
                      <h2 className="serif text-xl font-bold text-[#1e1b18] mt-0.5">Outfit Detail</h2>
                    </div>
                    <button onClick={() => setSelectedOutfit(null)} className="text-[#867272] hover:text-[#380208]">
                      <HugeiconsIcon icon={Cancel01Icon} size={20} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div>
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${verdictColor(selectedOutfit.verdict)}`}>
                        {verdictLabel(selectedOutfit.verdict)}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="serif text-4xl font-bold text-[#380208]">{selectedOutfit.score}</span>
                      <span className="text-sm text-[#867272]">% Harmony</span>
                    </div>
                  </div>

                  {selectedOutfit.visualNotes && (
                    <p className="text-sm text-[#544342] leading-relaxed bg-[#fbf2ed] rounded-xl p-4">
                      {selectedOutfit.visualNotes}
                    </p>
                  )}

                  <div>
                    <span className="eyebrow text-[10px]">Outfit Pieces ({selectedOutfit.items.length})</span>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {selectedOutfit.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-[#fbf2ed] rounded-xl border border-[#d9c1c0]/40">
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[#e9e1dc]">
                            <img
                              src={item.image_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=100&q=80'}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#1e1b18] truncate">{item.name}</p>
                            <p className="text-[10px] text-[#867272] capitalize">{item.category}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleCopyUrl(selectedOutfit.outfitId)}
                      className="flex-1 py-3 border border-[#d9c1c0] rounded-xl text-xs font-semibold uppercase tracking-wider text-[#1e1b18] hover:border-[#380208] flex items-center justify-center gap-2"
                    >
                      <HugeiconsIcon icon={Copy01Icon} size={14} /> Copy URL
                    </button>
                    <button
                      onClick={() => handleDelete(selectedOutfit.outfitId)}
                      className="px-4 py-3 border border-red-200 text-red-600 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-red-50 flex items-center justify-center gap-2"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={14} /> Remove
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <footer className="flex justify-between items-center pt-6 border-t border-[#d9c1c0]/50">
            <span className="text-xs text-[#867272]">© 2026 CHARIS EDITORIAL. ALL RIGHTS RESERVED.</span>
          </footer>
        </motion.div>
      </AppShell>
    </AuthGuard>
  );
}
