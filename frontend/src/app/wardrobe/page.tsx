'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { listWardrobeItems } from '@/api/wardrobe.api';
import { demoWardrobe } from '@/data/demo';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Upload, X } from 'lucide-react';
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

export default function WardrobePage() {
  const { session } = useAuth();
  const [items, setItems] = useState<WardrobeItem[]>(demoWardrobe);
  const [selected, setSelected] = useState<WardrobeItem | null>(null);

  useEffect(() => {
    if (!session?.accessToken) return;
    listWardrobeItems(session.accessToken).then(data => {
      if (data.length) setItems(data);
    }).catch(() => {});
  }, [session]);

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="serif text-4xl font-semibold text-[#1e1b18]">Library</h1>
              <p className="text-sm text-[#544342] mt-1">{items.length} Items curated in your collection.</p>
            </div>
            <div className="flex gap-2.5">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#d9c1c0] text-sm font-medium text-[#1e1b18] bg-white hover:border-[#380208] transition-colors">
                <Filter size={14} /> Filter
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#380208] text-white text-sm font-semibold hover:opacity-90 transition-all hover:-translate-y-0.5">
                <Upload size={14} /> Upload
              </button>
            </div>
          </div>

          <div className="flex gap-6">
            <div className={`grid gap-4 flex-1 align-start ${selected ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  className={`cursor-pointer flex flex-col gap-2.5 transition-transform hover:-translate-y-1 ${
                    selected?.id === item.id ? 'ring-2 ring-[#380208] ring-offset-2 rounded-lg' : ''
                  }`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelected(selected?.id === item.id ? null : item)}
                >
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#f5ece7]">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider">
                      {item.seasons?.[0]?.name?.slice(0, 2).toUpperCase() ?? 'AL'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <h3 className="serif text-base font-semibold text-[#1e1b18]">{item.name}</h3>
                      <span className="w-2.5 h-2.5 rounded-full border border-black/10 flex-shrink-0" style={{ background: item.primary_color }} />
                    </div>
                    <p className="text-xs text-[#544342]">{item.category}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <WearDots count={item.times_worn} />
                      <span className="text-[11px] text-[#544342]">{item.times_worn} Wears</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <AnimatePresence>
              {selected && (
                <motion.div
                  className="w-72 flex-shrink-0 bg-white rounded-xl border border-[#e1d8d4] p-5 sticky top-6 self-start flex flex-col gap-4 shadow-xl"
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 40, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25 }}
                >
                  <div className="flex justify-between items-center">
                    <h2 className="serif text-xl font-semibold text-[#1e1b18]">Item Details</h2>
                    <button onClick={() => setSelected(null)} className="text-[#544342] hover:text-[#380208]"><X size={18} /></button>
                  </div>
                  <div className="rounded-lg overflow-hidden aspect-square">
                    <img src={selected.image_url} alt={selected.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] uppercase tracking-wider text-[#544342] font-semibold">Item Name</label>
                      <p className="text-base font-medium text-[#1e1b18]">{selected.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] uppercase tracking-wider text-[#544342] font-semibold">Category</label>
                        <div className="flex justify-between items-center p-2 border border-[#d9c1c0] rounded-lg text-sm">
                          <span>{selected.category}</span>
                          <span>▾</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] uppercase tracking-wider text-[#544342] font-semibold">Color</label>
                        <div className="flex items-center gap-2 p-2 border border-[#d9c1c0] rounded-lg text-sm">
                          <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: selected.primary_color }} />
                          <span>{selected.primary_color}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2.5 mt-2">
                    <button className="flex-1 py-3 border border-[#d9c1c0] rounded-lg text-sm font-medium hover:border-[#380208] transition-colors">Archive</button>
                    <button className="flex-1 py-3 bg-[#380208] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">Save Changes</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <footer className="flex justify-between items-center pt-6 border-t border-[#e1d8d4]">
            <span className="text-xs text-[#544342]">© 2024 CHARIS EDITORIAL. ALL RIGHTS RESERVED.</span>
            <nav className="flex gap-4 text-xs text-[#544342]"><a href="#">Privacy</a><a href="#">Terms</a></nav>
          </footer>
        </motion.div>
      </AppShell>
    </AuthGuard>
  );
}
