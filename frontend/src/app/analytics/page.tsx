'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { fetchAnalyticsOverview } from '@/api/analytics.api';
import { listWardrobeItems } from '@/api/wardrobe.api';
import { motion } from 'framer-motion';
import { TrendingUp, BankIcon, PieChart01Icon, Analytics01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
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
import type { AnalyticsOverview, WardrobeItem } from '@/lib/types';

const CATEGORY_COLORS = ['#380208', '#54161b', '#867272', '#5e5e5b', '#191810', '#d9c1c0', '#867272'];
const DEFAULT_CATEGORIES = ['top', 'bottom', 'outerwear', 'shoes', 'accessory'];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const subject = entry.payload?.subject;
  const heading = subject
    ? `${subject} · ${entry.value} ${entry.value === 1 ? 'item' : 'items'}`
    : `Day: ${label}`;
  const subtext = subject ? 'Category distribution' : 'Wear frequency';
  return (
    <div className="bg-[#1e1b18] text-white rounded-lg px-3 py-2 shadow-xl border border-white/10 text-xs min-w-[150px]">
      <div className="font-bold tracking-wide text-white">{heading}</div>
      <div className="mt-0.5 text-white/80">{subtext}</div>
    </div>
  );
}

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

  // Category breakdown for Radar Chart
  const categoryCountMap: Record<string, number> = {};
  wardrobeItems.forEach((i) => {
    const cat = i.category?.toLowerCase() || 'other';
    categoryCountMap[cat] = (categoryCountMap[cat] || 0) + 1;
  });

  // Ensure all standard radar subjects are present
  const radarSubjects = DEFAULT_CATEGORIES.map((cat) => {
    return {
      subject: cat.toUpperCase(),
      value: categoryCountMap[cat] || 0,
    };
  });

  // Add any non-standard categories if they exist
  Object.keys(categoryCountMap).forEach((cat) => {
    if (!DEFAULT_CATEGORIES.includes(cat)) {
      radarSubjects.push({
        subject: cat.toUpperCase(),
        value: categoryCountMap[cat],
      });
    }
  });

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
                <HugeiconsIcon icon={BankIcon} size={20} className="text-[#380208]" />
              </div>
              <div>
                <p className="serif text-5xl font-bold text-[#1e1b18] leading-none">
                  ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-[#544342] flex items-center gap-1 mt-3">
                  <HugeiconsIcon icon={TrendingUp} size={14} className="text-emerald-700" />
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
            {/* Radar Category Distribution */}
            <div className="bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-[#d9c1c0]/40 pb-3">
                <span className="eyebrow">Category Distribution</span>
                <HugeiconsIcon icon={PieChart01Icon} size={18} className="text-[#380208]" />
              </div>

              {!mounted ? (
                <div className="h-72 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#380208] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div className="h-72 min-h-[280px] w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={radarSubjects} cx="50%" cy="50%" outerRadius={90}>
                        <PolarGrid stroke="#d9c1c0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#1e1b18', fontWeight: 600 }} />
                        <Radar dataKey="value" stroke="#380208" fill="#380208" fillOpacity={0.25} strokeWidth={2} />
                        <Tooltip content={<ChartTooltip />} cursor={false} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex gap-3 flex-wrap justify-center border-t border-[#d9c1c0]/40 pt-3">
                    {radarSubjects.map((c, i) => (
                      <div key={c.subject} className="flex items-center gap-1.5 text-xs text-[#544342]">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        <span className="capitalize font-medium">{c.subject}: {c.value}</span>
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
                  <HugeiconsIcon icon={Analytics01Icon} size={36} className="text-[#d9c1c0]" />
                  <p className="text-xs text-[#867272] italic">No wear logs yet. Log a wear in your Library to see trends here.</p>
                </div>
              ) : (
                <div className="h-72 w-full pt-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} barSize={32}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#544342', fontWeight: 600 }} />
                      <YAxis hide />
                      <Tooltip content={<ChartTooltip />} cursor={false} />
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
