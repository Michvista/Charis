'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { Shirt01Icon, Delete02Icon, Cancel01Icon, SparklesIcon, Copy01Icon } from '@hugeicons/core-free-icons';
import { useToast } from '@/lib/context/ToastContext';
import { useOutfits } from '@/lib/context/OutfitsContext';
import DragCarousel from '@/components/ui/DragCarousel';
import { verdictBadgeClass, verdictBadgeLabel } from '@/components/outfits/OutfitSnapshotCard';
import type { OutfitRecord } from '@/api/outfits.api';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&q=80';

export default function OutfitsPage() {
  const { toastSuccess, toastError } = useToast();
  const { outfits, loading, removeOutfit } = useOutfits();
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitRecord | null>(null);

  const handleDelete = async (outfitId: string) => {
    try {
      await removeOutfit(outfitId);
      if (selectedOutfit?.outfit_id === outfitId) setSelectedOutfit(null);
      toastSuccess('Outfit Removed', 'Removed from your saved outfits archive.');
    } catch (err) {
      toastError('Remove Failed', err instanceof Error ? err.message : 'Could not remove outfit.');
    }
  };

  const handleCopyUrl = (outfitId: string) => {
    const url = `${window.location.origin}/outfits/${outfitId}`;
    navigator.clipboard.writeText(url).then(() =>
      toastSuccess('URL Copied', `Lookbook URL copied: ${url}`)
    );
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

          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-8 h-8 border-2 border-[#380208]/30 border-t-[#380208] rounded-full animate-spin" />
            </div>
          ) : outfits.length === 0 ? (
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
                  key={outfit.id}
                  className="bg-white rounded-2xl border border-[#d9c1c0] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedOutfit(outfit)}
                >
                  {/* Items Preview Carousel */}
                  <div className="bg-[#f5ece7]">
                    {outfit.items.length === 0 ? (
                      <div className="aspect-video flex items-center justify-center">
                        <HugeiconsIcon icon={Shirt01Icon} size={32} className="text-[#d9c1c0]" />
                      </div>
                    ) : outfit.items.length > 1 ? (
                      <DragCarousel className="flex gap-3 px-4 py-4" snap>
                        {outfit.items.map((item, idx) => (
                          <figure key={idx} className="w-40 shrink-0 snap-start">
                            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white border border-[#d9c1c0] shadow-sm">
                              <img
                                src={item.image_url || PLACEHOLDER}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                draggable={false}
                              />
                            </div>
                            <figcaption className="mt-2 px-0.5">
                              <p className="serif text-[11px] font-bold text-[#1e1b18] truncate">{item.name}</p>
                              <p className="text-[10px] text-[#867272] capitalize">{item.category}</p>
                            </figcaption>
                          </figure>
                        ))}
                      </DragCarousel>
                    ) : (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={outfit.items[0].image_url || PLACEHOLDER}
                          alt={outfit.items[0].name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${verdictBadgeClass(outfit.verdict)}`}>
                        {verdictBadgeLabel(outfit.verdict)}
                      </span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="serif text-2xl font-bold text-[#380208]">{outfit.score}</span>
                        <span className="text-xs text-[#867272]">%</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#544342] leading-relaxed line-clamp-2">
                      {outfit.visual_notes || 'No visual notes recorded.'}
                    </p>

                    <div className="flex gap-2 items-center border-t border-[#d9c1c0]/30 pt-2">
                      <p className="text-[10px] text-[#867272] flex-1">
                        {outfit.item_count} pieces · {new Date(outfit.created_at).toLocaleDateString()}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyUrl(outfit.outfit_id); }}
                        className="p-1.5 text-[#867272] hover:text-[#380208] transition-colors"
                        title="Copy lookbook URL"
                      >
                        <HugeiconsIcon icon={Copy01Icon} size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(outfit.id); }}
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
                      <h2 className="serif text-xl font-bold text-[#1e1b18] mt-0.5">{selectedOutfit.name || 'Outfit Detail'}</h2>
                    </div>
                    <button onClick={() => setSelectedOutfit(null)} className="text-[#867272] hover:text-[#380208]">
                      <HugeiconsIcon icon={Cancel01Icon} size={20} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${verdictBadgeClass(selectedOutfit.verdict)}`}>
                      {verdictBadgeLabel(selectedOutfit.verdict)}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="serif text-4xl font-bold text-[#380208]">{selectedOutfit.score}</span>
                      <span className="text-sm text-[#867272]">% Harmony</span>
                    </div>
                  </div>

                  {selectedOutfit.visual_notes && (
                    <p className="text-sm text-[#544342] leading-relaxed bg-[#fbf2ed] rounded-xl p-4">
                      {selectedOutfit.visual_notes}
                    </p>
                  )}

                  <div>
                    <span className="eyebrow text-[10px]">Outfit Pieces ({selectedOutfit.item_count})</span>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {selectedOutfit.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-[#fbf2ed] rounded-xl border border-[#d9c1c0]/40">
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[#e9e1dc]">
                            <img
                              src={item.image_url || PLACEHOLDER}
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
                      onClick={() => handleCopyUrl(selectedOutfit.outfit_id)}
                      className="flex-1 py-3 border border-[#d9c1c0] rounded-xl text-xs font-semibold uppercase tracking-wider text-[#1e1b18] hover:border-[#380208] flex items-center justify-center gap-2"
                    >
                      <HugeiconsIcon icon={Copy01Icon} size={14} /> Copy URL
                    </button>
                    <button
                      onClick={() => handleDelete(selectedOutfit.id)}
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