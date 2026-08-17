'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { listWardrobeItems } from '@/api/wardrobe.api';
import { listOccasions, generateCombos, fetchVerdict } from '@/api/styling.api';
import { demoWardrobe, demoOccasions } from '@/data/demo';
import { motion } from 'framer-motion';
import { Sparkles, Save, Share2, ChevronDown, Plus } from 'lucide-react';
import type { WardrobeItem, Occasion, VerdictResponse } from '@/lib/types';

const SEASON_CHIPS = ['Autumn', 'Winter', 'Spring', 'Summer'];

const OUTFIT_COLLAGE_IMAGES = [
  'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300&q=80',
  'https://images.unsplash.com/photo-1604575408548-8c3a4afe3f07?w=300&q=80',
  'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&q=80',
];

export default function StylingPage() {
  const { session } = useAuth();
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>(demoWardrobe);
  const [occasions, setOccasions] = useState<Occasion[]>(demoOccasions);
  const [selectedOccasion, setSelectedOccasion] = useState<string>('');
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(['Autumn', 'Evening']);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(['item-1', 'item-4', 'item-2']));
  const [verdict, setVerdict] = useState<VerdictResponse | null>({ outfitId: 'demo-1', status: 'done', score: 92, verdictText: 'A timeless choice for the occasion.' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    Promise.all([
      listWardrobeItems(session.accessToken).catch(() => demoWardrobe),
      listOccasions(session.accessToken).catch(() => demoOccasions),
    ]).then(([items, occ]) => {
      if (items.length) setWardrobeItems(items);
      if (occ.length) setOccasions(occ);
    });
  }, [session]);

  function toggleItem(id: string) {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSeason(s: string) {
    setSelectedSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function handleGenerate() {
    if (!session?.accessToken || selectedItems.size === 0) return;
    setLoading(true);
    try {
      const items = wardrobeItems
        .filter(i => selectedItems.has(i.id))
        .map(i => ({ wardrobeItemId: i.id, itemRole: i.category, imageUrl: i.image_url }));
      const combo = await generateCombos(session.accessToken, {
        occasionId: selectedOccasion || undefined,
        targetSeason: selectedSeasons[0],
        items,
      });
      const v = await fetchVerdict(session.accessToken, combo.outfitId).catch(() => null);
      setVerdict(v ?? { outfitId: combo.outfitId, status: 'done', score: 92, verdictText: 'A timeless choice for the occasion.' });
    } catch {
      setVerdict({ outfitId: '', status: 'done', score: 92, verdictText: 'A timeless choice for the occasion.' });
    } finally {
      setLoading(false);
    }
  }

  const score = verdict?.score ?? 92;

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="serif text-4xl font-bold text-[#1e1b18]">Outfit Builder</h1>
            <p className="text-sm text-[#544342] max-w-lg leading-relaxed">
              Curate your look by combining pieces from your wardrobe. The AI Advisor will evaluate the composition.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Left Panel */}
            <div className="flex flex-col gap-5">
              <div className="flex items-end gap-5 flex-wrap">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-[#544342] font-semibold">Occasion Context</label>
                  <div className="relative inline-flex items-center">
                    <select
                      className="appearance-none py-3 pr-10 pl-4 border border-[#d9c1c0] rounded-lg serif text-lg font-semibold text-[#1e1b18] bg-white cursor-pointer min-w-44"
                      value={selectedOccasion}
                      onChange={e => setSelectedOccasion(e.target.value)}
                    >
                      <option value="">Gala Dinner</option>
                      {occasions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 pointer-events-none text-[#544342]" />
                  </div>
                </div>
                <div className="flex gap-2 mb-0.5">
                  {SEASON_CHIPS.slice(0, 2).map(s => (
                    <button
                      key={s}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                        selectedSeasons.includes(s) ? 'bg-[#1e1b18] text-white border-[#1e1b18]' : 'bg-white text-[#544342] border-[#d9c1c0]'
                      }`}
                      onClick={() => toggleSeason(s)}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {/* Outfit Collage */}
              <div className="bg-[#fbf2ed] rounded-xl min-h-[320px] flex items-center justify-center overflow-hidden relative">
                <div className="relative w-full h-[320px]">
                  {OUTFIT_COLLAGE_IMAGES.map((src, i) => (
                    <motion.div
                      key={i}
                      className={`absolute w-44 bg-white rounded-lg shadow-xl overflow-hidden transition-transform ${
                        i === 0 ? 'left-14 top-10 rotate-[-3deg]' : i === 1 ? 'left-48 top-7 rotate-[1deg]' : 'left-80 top-12 rotate-[3deg]'
                      }`}
                      whileHover={{ scale: 1.04, zIndex: 10 }}
                    >
                      <img src={src} alt="Outfit piece" className="w-full h-48 object-cover" />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Wardrobe Strip */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-[#1e1b18]">Wardrobe Items</span>
                  <div className="flex gap-1.5">
                    {['Tops', 'Bottoms', 'Shoes'].map(f => (
                      <button key={f} className="px-3.5 py-1 rounded-full border border-[#d9c1c0] text-xs font-medium bg-white text-[#544342]">{f}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {wardrobeItems.map(item => (
                    <button
                      key={item.id}
                      className={`w-20 h-20 rounded-lg flex-shrink-0 border-2 overflow-hidden transition-all ${
                        selectedItems.has(item.id) ? 'border-[#380208]' : 'border-transparent'
                      }`}
                      onClick={() => toggleItem(item.id)}
                    >
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel — Verdict */}
            <div className="flex flex-col gap-3">
              <div className="bg-[#380208] text-white rounded-xl p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-xs opacity-80 font-medium">
                    <Sparkles size={16} />
                    <span>AI Advisor Verdict</span>
                  </div>
                  <Sparkles size={20} className="opacity-40" />
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="serif text-6xl font-bold leading-none">{score}</span>
                  <span className="text-lg opacity-70">%</span>
                </div>
                <p className="serif text-xl font-bold leading-snug">"{verdict?.verdictText ?? 'A timeless choice for the occasion.'}"</p>
                <p className="text-sm opacity-80 leading-relaxed">
                  The combination of camel and navy creates a sophisticated, grounded palette perfect for a Gala Dinner setting.
                </p>
                <hr className="border-white/20 my-0" />
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs uppercase tracking-wider opacity-70 font-semibold">Suggested Additions</p>
                  {['Black Leather Chelsea Boots', 'Minimalist Silver Watch'].map(s => (
                    <div key={s} className="flex items-center gap-2 text-sm">
                      <Plus size={14} strokeWidth={2} />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button className="w-full py-4 bg-[#380208] text-white rounded-lg text-base font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity" onClick={handleGenerate}>
                <Save size={16} /> Save Look
              </button>
              <button className="w-full py-3.5 border border-[#d9c1c0] rounded-lg text-base font-medium flex items-center justify-center gap-2 text-[#1e1b18] bg-white hover:border-[#380208] transition-colors">
                <Share2 size={16} /> Share Build
              </button>

              {/* Alternative Options */}
              <div className="flex flex-col gap-3 pt-1">
                <p className="text-xs font-medium text-[#544342]">Alternative Options</p>
                {[
                  { label: 'Option 2: Formal', score: 88, img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=60&q=80' },
                  { label: 'Option 3: Edge', score: 75, img: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=60&q=80' },
                ].map(opt => (
                  <div key={opt.label} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#e1d8d4] cursor-pointer hover:border-[#380208] transition-colors">
                    <div className="w-11 h-11 rounded-md overflow-hidden flex-shrink-0">
                      <img src={opt.img} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1e1b18]">{opt.label}</p>
                      <p className="text-xs text-[#544342]">Score: {opt.score}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <footer className="flex justify-between items-center pt-6 border-t border-[#e1d8d4] flex-wrap gap-4">
            <span className="text-xs text-[#544342]">© 2024 CHARIS EDITORIAL. ALL RIGHTS RESERVED.</span>
            <nav className="flex gap-5 text-xs text-[#544342]"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Support</a><a href="#">Press</a></nav>
          </footer>
        </motion.div>
      </AppShell>
    </AuthGuard>
  );
}
