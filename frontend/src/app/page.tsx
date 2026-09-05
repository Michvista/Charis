'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowRight01Icon,
  ThermometerIcon,
  RefreshIcon,
  SparklesIcon,
  Book01Icon,
  TShirtIcon,
  UserGroupIcon,
  Analytics01Icon,
  PlusSignIcon
} from '@hugeicons/core-free-icons';
import { useAuth } from '@/lib/context/AuthContext';
import { requestBackend } from '@/api/client';
import type { WardrobeItem } from '@/lib/types';

type TodaySuggestion = {
  title: string;
  temp: string;
  detail: string;
};

const SEASON_BY_MONTH = [
  'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer',
  'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter',
];

function weatherCondition(code: number): string {
  if (code === 0) return 'clear sky';
  if (code <= 3) return 'partly cloudy';
  if (code <= 48) return 'foggy';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'snowy';
  if (code <= 82) return 'rain showers';
  if (code <= 99) return 'stormy';
  return 'cloudy';
}

export default function HomePage() {
  const router = useRouter();
  const { session } = useAuth();

  const [items, setItems] = useState<Array<{ id: string; name: string; brand: string; season: string; category: string; image: string }>>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [suggestion, setSuggestion] = useState<TodaySuggestion>({
    title: 'Silk Trench & Tailored Trousers',
    temp: '70°F',
    detail: 'Effortless elegance matched for your local climate',
  });
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [locationLabel, setLocationLabel] = useState('your location');

  // Get coordinates + a human-readable location label (city, region, country).
  // Browser geolocation first for coords; ipwho.is provides the label and a fallback.
  const getCoordinates = async (): Promise<{ latitude: number; longitude: number; locationLabel: string } | null> => {
    let coords: { latitude: number; longitude: number } | null = null;

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, maximumAge: 600000 });
        });
        coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch {}
    }

    let locationLabel = 'your location';
    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        const parts = [data?.city, data?.region, data?.country].filter((v) => typeof v === 'string' && v);
        if (parts.length) locationLabel = parts.join(', ');
        if (!coords && typeof data?.latitude === 'number' && typeof data?.longitude === 'number') {
          coords = { latitude: data.latitude, longitude: data.longitude };
        }
      }
    } catch {}

    if (!coords) return null;
    return { ...coords, locationLabel };
  };

  // Fetch real temperature via Geolocation / Open-Meteo API
  const fetchWeatherSuggestion = async () => {
    setLoadingSuggestion(true);
    try {
      const coords = await getCoordinates();
      if (coords) {
        const { latitude, longitude, locationLabel: label } = coords;
        setLocationLabel(label);
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
          );
          if (res.ok) {
            const data = await res.json();
            const tempF = Math.round(data.current?.temperature_2m ?? 70);
            const condition = weatherCondition(data.current?.weather_code ?? 0);
            const season = SEASON_BY_MONTH[new Date().getMonth()];
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

            try {
              const aiRes = await fetch('/api/today-suggestion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
                      timezone,
                      currentTime: new Date().toISOString(),
                      temp: tempF,
                      condition,
                      season,
                      location: label,
                    }),
              });
              const aiData = await aiRes.json();
              if (aiData?.title && aiData?.temp) {
                setSuggestion({
                  title: aiData.title,
                  temp: aiData.temp,
                  detail: aiData.detail || 'Curated recommendation',
                });
                return;
              }
            } catch {}

            // Fallback: temperature-based editorial rule
            let title = 'Silk Trench & Tailored Trousers';
            let detail = 'Effortless elegance matched for mild weather.';

            if (tempF > 75) {
              title = 'Linen Shirt & Wide Trousers';
              detail = 'Breathable lightweight layers for warm sun.';
            } else if (tempF < 60) {
              title = 'Cashmere Knit & Wool Coat';
              detail = 'Insulating warmth for crisp, chilly air.';
            }

            setSuggestion({
              title,
              temp: `${tempF}°F`,
              detail,
            });
          }
        } catch {}
      }
    } catch {} finally {
      setLoadingSuggestion(false);
    }
  };

  useEffect(() => {
    fetchWeatherSuggestion();

    // Fetch user's real recent wardrobe items
    if (session?.accessToken) {
      setLoadingItems(true);
      requestBackend<any>('/wardrobe/items/?ordering=-created_at&page_size=3', {
        token: session.accessToken,
      })
        .then((res) => {
          const list: WardrobeItem[] = Array.isArray(res) ? res : res?.results ?? [];
          if (list.length > 0) {
            setItems(
              list.slice(0, 3).map((item) => ({
                id: item.id,
                name: item.name,
                brand: item.brand || 'Charis Collection',
                season: (item.seasons && item.seasons[0]?.name) || '2026',
                category: item.category,
                image: item.image_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=1080&q=90',
              }))
            );
          } else {
            setItems([]);
          }
        })
        .catch(() => {
          setItems([]);
        })
        .finally(() => {
          setLoadingItems(false);
        });
    } else {
      setLoadingItems(false);
    }
  }, [session]);

  return (
    <div className="min-h-screen bg-[#fff8f5] text-[#1e1b18] flex flex-col font-sans selection:bg-[#380208] selection:text-white">
      {/* Editorial Header */}
      <header className="w-full border-b border-[#d9c1c0]/50 bg-[#fff8f5]/90 backdrop-blur-md sticky top-0 z-50 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
          <span className="serif text-3xl font-bold tracking-tight text-[#380208]">CHARIS</span>
          <span className="text-xs uppercase tracking-widest text-[#867272] border-l border-[#d9c1c0] pl-3 py-0.5">
            Wardrobe OS
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#544342]">
          <button onClick={() => router.push('/wardrobe')} className="hover:text-[#380208] transition-colors flex items-center gap-1.5">
            <HugeiconsIcon icon={Book01Icon} size={16} /> Library
          </button>
          <button onClick={() => router.push('/styling')} className="hover:text-[#380208] transition-colors flex items-center gap-1.5">
            <HugeiconsIcon icon={TShirtIcon} size={16} /> Styling
          </button>
          <button onClick={() => router.push('/social')} className="hover:text-[#380208] transition-colors flex items-center gap-1.5">
            <HugeiconsIcon icon={UserGroupIcon} size={16} /> Lookbook
          </button>
          <button onClick={() => router.push('/analytics')} className="hover:text-[#380208] transition-colors flex items-center gap-1.5">
            <HugeiconsIcon icon={Analytics01Icon} size={16} /> Intelligence
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

            {/* AI Today's Suggestion Card — Weather Geolocation Powered */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -bottom-6 right-4 md:right-8 bg-white/95 backdrop-blur-xl border border-[#d9c1c0]/60 rounded-xl p-5 shadow-2xl min-w-[240px] max-w-[280px] flex flex-col gap-2.5"
            >
              <div className="flex justify-between items-center">
                <span className="eyebrow flex items-center gap-1.5 text-[#380208]">
                  <HugeiconsIcon icon={SparklesIcon} size={12} className="text-[#380208]" /> Today's Suggestion
                </span>
                <button
                  onClick={fetchWeatherSuggestion}
                  disabled={loadingSuggestion}
                  title="Refresh Local Weather Suggestion"
                  className="text-[#867272] hover:text-[#380208] transition-colors p-1"
                >
                  <HugeiconsIcon icon={RefreshIcon} size={12} className={loadingSuggestion ? 'animate-spin' : ''} />
                </button>
              </div>
              <p className="serif text-xl font-semibold text-[#1e1b18] leading-snug">{suggestion.title}</p>
              {suggestion.detail && <p className="text-xs text-[#544342] leading-normal">{suggestion.detail}</p>}
              <div className="flex items-center gap-2 text-xs font-medium text-[#380208] bg-[#fbf2ed] px-2.5 py-1.5 rounded-md w-fit mt-1">
                <HugeiconsIcon icon={ThermometerIcon} size={14} />
                <span>{suggestion.temp} · {locationLabel}</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Recent Additions — Display Real User Items */}
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
              View Full Collection <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
            </button>
          </div>

          {loadingItems ? (
            <div className="py-12 flex justify-center items-center">
              <div className="w-8 h-8 border-2 border-[#380208]/30 border-t-[#380208] rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 bg-white/60 border border-dashed border-[#d9c1c0] rounded-2xl flex flex-col items-center justify-center text-center p-8">
              <p className="serif text-xl font-semibold text-[#1e1b18]">No garments added to your library yet</p>
              <p className="text-xs text-[#544342] mt-1 mb-4">Curate your wardrobe to see your recent additions here.</p>
              <button
                onClick={() => router.push('/wardrobe')}
                className="px-5 py-2.5 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] flex items-center gap-1.5 shadow-md"
              >
                <HugeiconsIcon icon={PlusSignIcon} size={14} /> Add Garment
              </button>
            </div>
          ) : (
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
          )}
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="w-full border-t border-[#d9c1c0]/50 bg-[#fbf2ed] px-8 py-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#867272]">
          <div className="flex items-center gap-2">
            <span className="serif font-bold text-sm text-[#380208]">CHARIS</span>
            <span>— The Wardrobe Operating System</span>
          </div>
          <p>© 2026 Charis Editorial. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
