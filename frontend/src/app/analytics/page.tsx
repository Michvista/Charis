'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { fetchAnalyticsOverview } from '@/api/analytics.api';
import { demoAnalytics, demoWardrobe } from '@/data/demo';
import { motion } from 'framer-motion';
import { TrendingUp, Landmark, PieChart } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from 'recharts';
import type { AnalyticsOverview } from '@/lib/types';

const CATEGORY_COLORS = ['#380208', '#54161b', '#867272', '#5e5e5b', '#191810'];

export default function AnalyticsPage() {
  const { session } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsOverview>(demoAnalytics);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!session?.accessToken) return;
    fetchAnalyticsOverview(session.accessToken)
      .then((data) => {
        if (data) setAnalytics(data);
      })
      .catch(() => {});
  }, [session]);

  const totalValue = demoWardrobe.reduce(
    (sum, item) => sum + (item.purchase_price ? parseFloat(item.purchase_price) : 0),
    0
  );

  const mostWorn = [...demoWardrobe].sort((a, b) => (b.times_worn || 0) - (a.times_worn || 0))[0];
  const mostWornCpw =
    mostWorn?.purchase_price && (mostWorn.times_worn || 0) > 0
      ? (parseFloat(mostWorn.purchase_price) / mostWorn.times_worn).toFixed(2)
      : '0.00';

  const radarData = analytics.category_breakdown.map((c) => ({
    subject: c.category?.toUpperCase() || 'TOP',
    value: c.count,
  }));

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const barData = weekDays.map((day, i) => ({
    day,
    count: analytics.wear_frequency[i]?.count ?? (i % 2 === 0 ? 8 : 4),
  }));
  const maxDay = barData.reduce((m, d) => (d.count > m.count ? d : m), barData[0]);

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#867272]">
              <span className="w-6 h-px bg-[#d9c1c0]" />
              Sartorial Intelligence
            </div>
            <h1 className="serif text-4xl font-bold text-[#1e1b18] mt-1">Wardrobe Intelligence</h1>
            <p className="text-sm text-[#544342]">
              A quantitative perspective on your collection value and wear habits in 2026.
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-sm flex flex-col justify-between gap-4">
              <div className="flex justify-between items-center border-b border-[#d9c1c0]/40 pb-3">
                <span className="eyebrow">Collection Valuation</span>
                <Landmark size={20} className="text-[#380208]" />
              </div>
              <div>
                <p className="serif text-5xl font-bold text-[#1e1b18] leading-none">
                  ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-[#544342] flex items-center gap-1 mt-3">
                  <TrendingUp size={14} className="text-emerald-700" />
                  <span className="font-semibold text-emerald-800">+4.2%</span> equity appreciation this season
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-sm flex flex-col justify-between gap-4">
              <span className="eyebrow border-b border-[#d9c1c0]/40 pb-3">Most Worn Piece</span>
              <div className="flex justify-between items-center gap-4">
                <div>
                  <p className="serif text-2xl font-bold text-[#1e1b18]">{mostWorn?.name ?? 'Structured Double-Breasted Trench'}</p>
                  <p className="text-xs text-[#544342] mt-1">
                    Worn {mostWorn?.times_worn ?? 24} times · Cost per wear: <span className="font-bold text-[#380208]">${mostWornCpw}</span>
                  </p>
                </div>
                <div className="w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-[#f5ece7] shadow-inner">
                  <img
                    src={mostWorn?.image_url ?? 'https://images.unsplash.com/photo-1544441893-675973e31985?w=300&q=80'}
                    alt={mostWorn?.name ?? 'Most worn'}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radar Category Distribution — Fixed Height Container to prevent scroll unmounting */}
            <div className="bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-[#d9c1c0]/40 pb-3">
                <span className="eyebrow">Category Distribution</span>
                <PieChart size={18} className="text-[#380208]" />
              </div>

              <div className="h-72 min-h-[280px] w-full flex items-center justify-center relative">
                {mounted ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={90}>
                      <PolarGrid stroke="#d9c1c0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#1e1b18', fontWeight: 600 }} />
                      <Radar dataKey="value" stroke="#380208" fill="#380208" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-8 h-8 border-2 border-[#380208] border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              <div className="flex gap-4 flex-wrap justify-center border-t border-[#d9c1c0]/40 pt-3">
                {analytics.category_breakdown.map((c, i) => (
                  <div key={c.category} className="flex items-center gap-1.5 text-xs text-[#544342]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className="capitalize font-medium">{c.category}: {c.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Wear Frequency Bar Chart with Custom Tooltip Formatter displaying Wears Count */}
            <div className="bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-[#d9c1c0]/40 pb-3">
                <span className="eyebrow">Weekly Wear Frequency</span>
                <span className="text-xs font-bold text-[#380208]">Peak: {maxDay.day} ({maxDay.count} Wears)</span>
              </div>

              <div className="h-72 min-h-[280px] w-full pt-4">
                {mounted ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} barSize={32}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#544342', fontWeight: 600 }} />
                      <YAxis hide />
                      <Tooltip
                        formatter={(value: any) => [`${value} Wears`, 'Wear Count']}
                        labelFormatter={(label) => `Day: ${label}`}
                        contentStyle={{
                          background: '#1e1b18',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        cursor={false}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {barData.map((d) => (
                          <Cell key={d.day} fill={d.day === maxDay.day ? '#380208' : '#f5ece7'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-8 h-8 border-2 border-[#380208] border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </div>
          </div>

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
