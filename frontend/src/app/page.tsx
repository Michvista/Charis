'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Thermometer, RefreshCw, Sparkles, BookMarked, Shirt, Users, BarChart2 } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { requestBackend } from '@/api/client';
import type { WardrobeItem } from '@/lib/types';

// High resolution 1080p fashion images
const FALLBACK_RECENT_ITEMS = [
  {
    id: '1',
    name: 'Structured Double-Breasted Trench',
    brand: 'Burberry',
    season: 'FW24',
    category: 'Outerwear',
    image: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=1080&q=90',
  },
  {
    id: '2',
    name: 'Italian Silk Drape Blouse',
    brand: 'The Row',
    season: 'SS24',
    category: 'Tops',
    image: 'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?w=1080&q=90',
  },
  {
    id: '3',
    name: 'Handcrafted Calfskin Loafers',
    brand: 'G.H. Bass',
    season: 'Core',
    category: 'Footwear',
    image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=1080&q=90',
  },
];

type TodaySuggestion = {
  title: string;
  temp: string;
  detail: string;
};

export default function HomePage() {
  const router = useRouter();
  const { session } = useAuth();

  const [items, setItems] = useState<Array<{ id: string; name: string; brand: string; season: string; category: string; image: string }>>(FALLBACK_RECENT_ITEMS);
  const [suggestion, setSuggestion] = useState<TodaySuggestion>({
    title: 'Cashmere & Silk',
    temp: '68°F',
    detail: 'Light layering for crisp morning air',
  });
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Fetch AI Suggestion with Groq & localStorage fallback
  const fetchSuggestion = async () => {
    setLoadingSuggestion(true);
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch('/api/today-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: userTimezone, currentTime: new Date().toISOString() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title && data.temp) {
          const newSug = { title: data.title, temp: data.temp, detail: data.detail || '' };
          setSuggestion(newSug);
          localStorage.setItem('charis.today_suggestion', JSON.stringify(newSug));
        }
      } else {
        throw new Error('API response not ok');
      }
    } catch {
      // Fallback to last generated advice in localStorage
      const cached = localStorage.getItem('charis.today_suggestion');
      if (cached) {
        try {
          setSuggestion(JSON.parse(cached));
        } catch {}
      }
    } finally {
      setLoadingSuggestion(false);
    }
  };

  useEffect(() => {
    fetchSuggestion();

    // Fetch recent wardrobe items if user is logged in
    if (session?.accessToken) {
      requestBackend<WardrobeItem[]>('/wardrobe/items/?ordering=-created_at&page_size=3', {
        token: session.accessToken,
      })
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            setItems(
              res.slice(0, 3).map((item) => ({
                id: item.id,
                name: item.name,
                brand: item.brand || 'Charis Collection',
                season: item.season || 'FW24',
                category: item.category,
                image: item.image_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=1080&q=90',
              }))
            );
          }
        })
        .catch(() => {
          // Keep high-res fallbacks on network error
        });
    }
  }, [session]);

  return (
    <div className="min-h-screen bg-[#fff8f5] text-[#1e1b18] flex flex-col font-sans selection:bg-[#380208] selection:text-white">
      {/* Editorial Header — Clean, NO Sidebar on Landing Page */}
      <header className="w-full border-b border-[#d9c1c0]/50 bg-[#fff8f5]/90 backdrop-blur-md sticky top-0 z-50 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
          <span className="serif text-3xl font-bold tracking-tight text-[#380208]">CHARIS</span>
          <span className="text-xs uppercase tracking-widest text-[#867272] border-l border-[#d9c1c0] pl-3 py-0.5">
            Wardrobe OS
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#544342]">
          <button onClick={() => router.push('/wardrobe')} className="hover:text-[#380208] transition-colors flex items-center gap-1.5">
            <BookMarked size={16} /> Library
          </button>
          <button onClick={() => router.push('/styling')} className="hover:text-[#380208] transition-colors flex items-center gap-1.5">
            <Shirt size={16} /> Styling
          </button>
          <button onClick={() => router.push('/social')} className="hover:text-[#380208] transition-colors flex items-center gap-1.5">
            <Users size={16} /> Lookbook
          </button>
          <button onClick={() => router.push('/analytics')} className="hover:text-[#380208] transition-colors flex items-center gap-1.5">
            <BarChart2 size={16} /> Intelligence
          </button>
        </nav>

        <div className="flex items-center gap-4">
          {session ? (
            <button
              onClick={() => router.push('/wardrobe')}
              className="px-5 py-2 bg-[#380208] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-transform hover:-translate-y-0.5 shadow-md shadow-[#380208]/20"
            >
              Enter Workspace →
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="px-5 py-2 bg-[#380208] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-transform hover:-translate-y-0.5 shadow-md shadow-[#380208]/20"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-12 flex flex-col gap-20">
        {/* Hero Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center min-h-[460px]">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#867272]">
              <span className="w-6 h-px bg-[#d9c1c0]" />
              Institutional Wardrobe Intelligence
            </div>
            <h1 className="serif text-5xl md:text-7xl font-bold leading-[1.08] text-[#1e1b18] tracking-tight">
              Your Wardrobe,<br />Curated.
            </h1>
            <p className="text-base md:text-lg leading-relaxed text-[#544342] max-w-lg">
              Discover new combinations, manage your personal collection,
              and elevate your aesthetic narrative with AI-powered editorial insights.
            </p>
            <div className="flex gap-4 pt-2 flex-wrap">
              <button
                className="px-8 py-4 bg-[#380208] text-white rounded-lg font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-[#380208]/25"
                onClick={() => router.push('/styling')}
              >
                Plan Today's Look
              </button>
              <button
                className="px-8 py-4 border border-[#867272]/40 text-[#1e1b18] rounded-lg font-medium text-sm transition-all hover:border-[#380208] hover:-translate-y-0.5 bg-transparent"
                onClick={() => router.push('/wardrobe')}
              >
                Explore Collection
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-2xl shadow-[#590713]/15">
              <img
                src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1080&q=90"
                alt="Curated high-fashion collection"
                className="w-full h-full object-cover object-center"
              />
            </div>

            {/* AI Today's Suggestion Card — Real Groq AI powered */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -bottom-6 right-4 md:right-8 bg-white/95 backdrop-blur-xl border border-[#d9c1c0]/60 rounded-xl p-5 shadow-2xl min-w-[240px] max-w-[280px] flex flex-col gap-2.5"
            >
              <div className="flex justify-between items-center">
                <span className="eyebrow flex items-center gap-1.5 text-[#380208]">
                  <Sparkles size={12} className="text-[#380208]" /> Today's Suggestion
                </span>
                <button
                  onClick={fetchSuggestion}
                  disabled={loadingSuggestion}
                  title="Refresh AI Suggestion"
                  className="text-[#867272] hover:text-[#380208] transition-colors p-1"
                >
                  <RefreshCw size={12} className={loadingSuggestion ? 'animate-spin' : ''} />
                </button>
              </div>
              <p className="serif text-xl font-semibold text-[#1e1b18] leading-snug">{suggestion.title}</p>
              {suggestion.detail && <p className="text-xs text-[#544342] leading-normal">{suggestion.detail}</p>}
              <div className="flex items-center gap-2 text-xs font-medium text-[#380208] bg-[#fbf2ed] px-2.5 py-1.5 rounded-md w-fit mt-1">
                <Thermometer size={14} />
                <span>{suggestion.temp}</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Recent Additions — 1080p HD Imagery */}
        <section className="flex flex-col gap-8">
          <div className="flex justify-between items-end border-b border-[#d9c1c0]/40 pb-4">
            <div>
              <span className="eyebrow text-[#867272]">Latest Archives</span>
              <h2 className="serif text-3xl md:text-4xl font-semibold text-[#1e1b18] mt-1">Recent Additions</h2>
            </div>
            <button
              className="flex items-center gap-2 text-sm font-semibold text-[#380208] hover:gap-3 transition-all"
              onClick={() => router.push('/wardrobe')}
            >
              View Full Collection <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                className="cursor-pointer flex flex-col gap-3 group"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                onClick={() => router.push('/wardrobe')}
              >
                <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-[#f5ece7] shadow-md transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#1e1b18]">
                    {item.category}
                  </span>
                </div>
                <div className="flex flex-col gap-1 pt-1">
                  <h3 className="serif text-xl font-semibold text-[#1e1b18] group-hover:text-[#380208] transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-[#544342]">
                    {item.brand} • {item.season}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="w-full border-t border-[#d9c1c0]/50 bg-[#fbf2ed] px-8 py-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#867272]">
          <div className="flex items-center gap-2">
            <span className="serif font-bold text-sm text-[#380208]">CHARIS</span>
            <span>— The Wardrobe Operating System</span>
          </div>
          <p>© {new Date().getFullYear()} Charis Editorial. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
