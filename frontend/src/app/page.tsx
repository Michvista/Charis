'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { motion } from 'framer-motion';
import { ArrowRight, Thermometer, Sparkles, BarChart2, Luggage } from 'lucide-react';

const RECENT_ITEMS = [
  { id: '1', name: 'Structured Wool Blazer', brand: 'A.P.C.', season: 'FW24', category: 'Outerwear', image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80' },
  { id: '2', name: 'Silk Drape Blouse', brand: 'The Row', season: 'SS24', category: 'Tops', image: 'https://images.unsplash.com/photo-1604575408548-8c3a4afe3f07?w=400&q=80' },
  { id: '3', name: 'Classic Penny Loafer', brand: 'G.H. Bass', season: 'Core', category: 'Footwear', image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400&q=80' },
];

const QUICK_STATS = [
  { label: 'Items', value: '142', icon: Sparkles, color: '#380208' },
  { label: 'Outfits', value: '38', icon: BarChart2, color: '#5e5e5b' },
  { label: 'Trips', value: '4', icon: Luggage, color: '#191810' },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-16"
      >
        {/* Hero Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center min-h-[420px]">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#867272]">
              <span className="w-6 h-px bg-[#d9c1c0]" />
              Charis Wardrobe OS
            </div>
            <h1 className="serif text-5xl md:text-6xl font-bold leading-none text-[#1e1b18] tracking-tight">
              Your Wardrobe,<br />Curated.
            </h1>
            <p className="text-base leading-relaxed text-[#544342] max-w-96">
              Discover new combinations, manage your collection,<br />
              and elevate your personal style with intelligent insights.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                className="px-7 py-3.5 bg-[#380208] text-white rounded-lg font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-md shadow-[#380208]/20"
                onClick={() => router.push('/styling')}
              >
                Plan Today's Look
              </button>
              <button
                className="px-7 py-3.5 border border-[#d9c1c0] text-[#1e1b18] rounded-lg font-medium text-sm transition-all hover:border-[#380208] hover:-translate-y-0.5 bg-transparent"
                onClick={() => router.push('/wardrobe')}
              >
                Explore Collection
              </button>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6 pt-2">
              {QUICK_STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1">
                  <span className="text-2xl font-bold text-[#1e1b18] serif">{stat.value}</span>
                  <span className="text-xs text-[#867272] tracking-wider uppercase">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-xl overflow-hidden aspect-[4/3] shadow-2xl shadow-[#590713]/10">
              <img
                src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=700&q=80"
                alt="Curated wardrobe rack"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating card */}
            <div className="absolute -bottom-4 right-6 bg-white rounded-xl p-4 shadow-xl min-w-44 flex flex-col gap-2">
              <span className="eyebrow">Today's Suggestion</span>
              <p className="serif text-lg font-semibold text-[#1e1b18]">Cashmere &amp; Silk</p>
              <div className="flex items-center gap-1.5 text-xs text-[#544342]">
                <Thermometer size={14} />
                <span>Perfect for 68°F</span>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Additions */}
        <section className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="serif text-3xl font-semibold text-[#1e1b18]">Recent Additions</h2>
            <button
              className="flex items-center gap-1.5 text-sm font-medium text-[#544342] hover:text-[#380208] transition-colors"
              onClick={() => router.push('/wardrobe')}
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {RECENT_ITEMS.map((item, i) => (
              <motion.div
                key={item.id}
                className="cursor-pointer flex flex-col gap-3 group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                onClick={() => router.push('/wardrobe')}
              >
                <div className="relative rounded-lg overflow-hidden aspect-[3/4] bg-[#f5ece7] transition-transform duration-300 group-hover:-translate-y-1">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase">
                    {item.category}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="serif text-lg font-semibold text-[#1e1b18]">{item.name}</h3>
                  <p className="text-xs text-[#544342]">{item.brand} • {item.season}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </motion.div>
    </AppShell>
  );
}
