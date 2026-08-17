'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { fetchAnalyticsOverview } from '@/api/analytics.api';
import { listWardrobeItems } from '@/api/wardrobe.api';
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
  PieChart as RechartsPieChart,
  Pie,
  Legend,
} from 'recharts';
import type { AnalyticsOverview, WardrobeItem } from '@/lib/types';

const CATEGORY_COLORS = ['#380208', '#54161b', '#867272', '#5e5e5b', '#191810', '#d9c1c0', '#867272'];

export default function AnalyticsPage() {
  const { session } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!session?.accessToken) return;
    Promise.all([
      fetchAnalyticsOverview(session.accessToken).catch(() => null),
      listWardrobeItems(session.accessToken).catch(() => []),
    ]).then(([data, items]) => {
      if (data) setAnalytics(data);
      setWardrobeItems(Array.isArray(items) ? items : []);
    });
  }, [session]);

  // Real wardrobe calculations
  const totalValue = wardrobeItems.reduce(
    (sum, item) => sum + (item.purchase_price ? parseFloat(item.purchase_price) : 0),
    0
  );
  const mostWorn = [...wardrobeItems].sort((a, b) => (b.times_worn || 0) - (a.times_worn || 0))[0];
  const mostWornCpw =
    mostWorn?.purchase_price && (mostWorn.times_worn || 0) > 0
      ? (parseFloat(mostWorn.purchase_price) / mostWorn.times_worn).toFixed(2)
      : '0.00';

  // Build category breakdown from real wardrobe if analytics doesn't have it
  const categoryBreakdown: Array<{ category: string; count: number }> = (() => {
    if (analytics?.category_breakdown?.length) return analytics.category_breakdown;
    const map: Record<string, number> = {};
    wardrobeItems.forEach((i) => {
      const cat = i.category || 'other';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([category, count]) => ({ category, count }));
  })();

  const pieData = categoryBreakdown.map((c, i) => ({
    name: c.category?.charAt(0).toUpperCase() + c.category?.slice(1) || 'Other',
    value: c.count,
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const barData = weekDays.map((day, i) => ({
    day,
    count: analytics?.wear_frequency?.[i]?.count ?? 0,
  }));
  const maxDay = barData.reduce((m, d) => (d.count > m.count ? d : m), barData[0]);

  const hasAnyWear = barData.some((d) => d.count > 0);

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
                  <span className="font-semibold text-emerald-800">Based on {wardrobeItems.length} garments</span>
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-sm flex flex-col justify-between gap-4">
              <span className="eyebrow border-b border-[#d9c1c0]/40 pb-3">Most Worn Piece</span>
              {mostWorn ? (
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <p className="serif text-2xl font-bold text-[#1e1b18]">{mostWorn.name}</p>
                    <p className="text-xs text-[#544342] mt-1">
                      Worn {mostWorn.times_worn ?? 0} times · Cost per wear:{' '}
                      <span className="font-bold text-[#380208]">${mostWornCpw}</span>
                    </p>
                  </div>
                  <div className="w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-[#f5ece7] shadow-inner">
                    <img
                      src={mostWorn.image_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=300&q=80'}
                      alt={mostWorn.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#867272] italic">No wear logs yet. Log a wear in your Library to track data.</p>
              )}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie Category Distribution — uses real wardrobe data */}
            <div className="bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-[#d9c1c0]/40 pb-3">
                <span className="eyebrow">Category Distribution</span>
                <PieChart size={18} className="text-[#380208]" />
              </div>

              {!mounted ? (
                <div className="h-72 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#380208] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pieData.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-center gap-2">
                  <PieChart size={36} className="text-[#d9c1c0]" />
                  <p className="text-xs text-[#867272] italic">Add garments to your library to see category breakdown.</p>
                </div>
              ) : (
                <>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsPieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name: string) => [`${value} items`, name]}
                          contentStyle={{
                            background: '#1e1b18',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex gap-3 flex-wrap justify-center border-t border-[#d9c1c0]/40 pt-3">
                    {pieData.map((c) => (
                      <div key={c.name} className="flex items-center gap-1.5 text-xs text-[#544342]">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.fill }} />
                        <span className="capitalize font-medium">{c.name}: {c.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Wear Frequency Bar Chart */}
            <div className="bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-[#d9c1c0]/40 pb-3">
                <span className="eyebrow">Weekly Wear Frequency</span>
                {hasAnyWear && (
                  <span className="text-xs font-bold text-[#380208]">Peak: {maxDay.day} ({maxDay.count} Wears)</span>
                )}
              </div>

              {!mounted ? (
                <div className="h-72 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#380208] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !hasAnyWear ? (
                <div className="h-72 flex flex-col items-center justify-center text-center gap-2">
                  <BarChart size={36} className="text-[#d9c1c0]" />
                  <p className="text-xs text-[#867272] italic">No wear logs yet. Log a wear in your Library to see trends here.</p>
                </div>
              ) : (
                <div className="h-72 w-full pt-4">
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
                </div>
              )}
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
