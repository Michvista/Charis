'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { completeStyleAdvisor } from '@/api/styling.api';
import { demoSuggestions, demoWardrobe } from '@/data/demo';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import type { StyleAdvisorSuggestion } from '@/lib/types';

const PRIORITY_COLOR: Record<string, string> = {
  high: '#380208',
  medium: '#c4a88a',
  low: '#867272',
};

export default function AdvisorPage() {
  const { session } = useAuth();
  const [suggestions, setSuggestions] = useState<StyleAdvisorSuggestion[]>(demoSuggestions);
  const [loading, setLoading] = useState(false);
  const [occasion, setOccasion] = useState('Formal dinner with editorial styling constraints');

  async function handleRefresh() {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const res = await completeStyleAdvisor(session.accessToken, {
        occasion_description: occasion,
        occasion_formality: 4,
        current_item_descriptions: demoWardrobe.slice(0, 3).map(i => `${i.name} (${i.category})`),
      });
      if (res.suggestions.length) setSuggestions(res.suggestions);
    } catch {} finally { setLoading(false); }
  }

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
          <div className="flex justify-between items-end gap-4 flex-wrap">
            <div>
              <h1 className="serif text-4xl font-bold text-[#380208]">Style Advisor</h1>
              <p className="text-sm text-[#544342] mt-1">AI-powered styling suggestions grounded in your wardrobe context.</p>
            </div>
            <button
              className="flex items-center gap-2 px-5 py-3 bg-[#380208] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 whitespace-nowrap"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Thinking...' : 'Refresh Suggestions'}
            </button>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#d9c1c0]">
            <Sparkles size={16} className="text-[#380208]" />
            <input
              className="flex-1 border-none outline-none text-base text-[#1e1b18] bg-transparent"
              value={occasion}
              onChange={e => setOccasion(e.target.value)}
              placeholder="Describe your occasion..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((s, i) => (
              <motion.div
                key={s.id}
                className="bg-white rounded-xl p-6 border border-[#e1d8d4] flex flex-col gap-3 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <span
                    className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider"
                    style={{ background: PRIORITY_COLOR[s.priority] + '18', color: PRIORITY_COLOR[s.priority] }}
                  >
                    {s.priority} priority
                  </span>
                  <span className="text-xs text-[#544342]">{s.occasion_description?.slice(0, 30)}...</span>
                </div>
                <h3 className="serif text-xl font-semibold text-[#1e1b18]">{s.item_description}</h3>
                <p className="text-sm text-[#544342] leading-relaxed flex-1">{s.reason}</p>
                <button className="flex items-center gap-1.5 text-xs font-semibold text-[#380208] mt-auto hover:gap-2.5 transition-all">
                  Find this piece <ArrowRight size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AppShell>
    </AuthGuard>
  );
}
