'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { fetchAnalyticsOverview } from '@/api/analytics.api';
import { demoAnalytics, demoWardrobe } from '@/data/demo';
import { motion } from 'framer-motion';
import { TrendingUp, Landmark } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import type { AnalyticsOverview } from '@/lib/types';

const CATEGORY_COLORS = ['#380208', '#a65b5f', '#e1d8d4', '#c4a88a', '#867272'];

export default function AnalyticsPage() {
  const { session } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsOverview>(demoAnalytics);

  useEffect(() => {
    if (!session?.accessToken) return;
    fetchAnalyticsOverview(session.accessToken)
      .then(data => { if (data) setAnalytics(data); })
      .catch(() => {});
  }, [session]);

  const totalValue = demoWardrobe.reduce((sum, item) =>
    sum + (item.purchase_price ? parseFloat(item.purchase_price) : 0), 0);

  const mostWorn = [...demoWardrobe].sort((a, b) => b.times_worn - a.times_worn)[0];
  const mostWornCpw = mostWorn?.purchase_price && mostWorn.times_worn > 0
    ? (parseFloat(mostWorn.purchase_price) / mostWorn.times_worn).toFixed(2)
    : '0.00';

  const radarData = analytics.category_breakdown.map(c => ({
    subject: c.category,
    value: c.count,
  }));

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const barData = weekDays.map((day, i) => ({
    day,
    count: analytics.wear_frequency[i]?.count ?? Math.floor(Math.random() * 8 + 1),
  }));
  const maxDay = barData.reduce((m, d) => d.count > m.count ? d : m, barData[0]);

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-7 relative">
          <div className="absolute top-0 right-0">
            <div className="w-11 h-11 rounded-xl bg-[#380208]/10 text-[#380208] font-bold text-lg grid place-items-center">
              {session?.user?.username?.[0]?.toUpperCase() ?? 'C'}
            </div>
          </div>

          <h1 className="serif text-4xl font-bold text-[#380208]">Wardrobe Intelligence</h1>
          <p className="text-base text-[#544342]">A curated view of your sartorial habits and collection value.</p>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-5">
            <div className="bg-white rounded-xl p-6 border border-[#e1d8d4] flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="eyebrow">Total Value</span>
                <Landmark size={20} strokeWidth={1.5} className="text-[#544342]" />
              </div>
              <p className="serif text-5xl font-bold text-[#1e1b18] leading-none">
                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-[#544342] flex items-center gap-1">
                <TrendingUp size={13} className="text-[#2d6a4f]" />
                +2.4% this month
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-[#e1d8d4] flex flex-col gap-3">
              <span className="eyebrow">Most Worn Piece</span>
              <div className="flex justify-between items-center gap-4 flex-1">
                <div>
                  <p className="serif text-3xl font-semibold text-[#1e1b18]">{mostWorn?.name ?? 'Oversized Cashmere Knit'}</p>
                  <p className="text-xs text-[#544342] mt-1">Worn {mostWorn?.times_worn ?? 24} times · Cost per wear: ${mostWornCpw}</p>
                </div>
                <div className="w-36 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={mostWorn?.image_url ?? 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=300&q=80'}
                    alt={mostWorn?.name ?? 'Most worn'}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl p-6 border border-[#e1d8d4] flex flex-col gap-4">
              <span className="eyebrow">Category Distribution</span>
              <div className="relative">
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={90}>
                    <PolarGrid stroke="#d9c1c0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#544342' }} />
                    <Radar dataKey="value" stroke="#380208" fill="#380208" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <span className="serif text-4xl font-bold text-[#1e1b18] block">{demoWardrobe.length}</span>
                  <span className="text-xs text-[#544342]">Items</span>
                </div>
                <div className="flex gap-4 mt-2 flex-wrap">
                  {analytics.category_breakdown.slice(0, 3).map((c, i) => (
                    <div key={c.category} className="flex items-center gap-1.5 text-xs text-[#544342]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[i] }} />
                      <span>{c.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-[#e1d8d4] flex flex-col gap-4">
              <span className="eyebrow">Wear Frequency</span>
              <div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} barSize={32}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#544342' }} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: 'white', border: 'none', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                      cursor={false}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {barData.map(d => (
                        <Cell key={d.day} fill={d.day === maxDay.day ? '#380208' : '#f5ece7'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="flex justify-between items-center pt-8 border-t border-[#e1d8d4] flex-wrap gap-4 mt-4">
            <span className="serif text-xl font-bold text-[#380208]">CHARIS</span>
            <nav className="flex gap-5 text-xs text-[#544342]">
              <a href="#" className="hover:text-[#380208]">Privacy</a>
              <a href="#" className="hover:text-[#380208]">Terms</a>
              <a href="#" className="hover:text-[#380208]">Support</a>
              <a href="#" className="hover:text-[#380208]">Press</a>
            </nav>
            <span className="text-xs text-[#544342]">© 2024 CHARIS EDITORIAL. ALL RIGHTS RESERVED.</span>
          </footer>
        </motion.div>
      </AppShell>
    </AuthGuard>
  );
}
