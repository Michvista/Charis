'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { listTrips, generatePackingList } from '@/api/tripplanner.api';
import { demoTrips, demoWardrobe } from '@/data/demo';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Plus } from 'lucide-react';
import type { Trip } from '@/lib/types';

export default function TripsPage() {
  const { session } = useAuth();
  const [trips, setTrips] = useState<Trip[]>(demoTrips);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(demoTrips[0]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    listTrips(session.accessToken).then(data => {
      if (data.length) { setTrips(data); setSelectedTrip(data[0]); }
    }).catch(() => { setSelectedTrip(demoTrips[0]); });
  }, [session]);

  async function handleGeneratePacking() {
    if (!session?.accessToken || !selectedTrip) return;
    setGenerating(true);
    try {
      const list = await generatePackingList(session.accessToken, selectedTrip.id);
      setTrips(prev => prev.map(t => t.id === selectedTrip.id ? { ...t, packing_lists: [list] } : t));
      setSelectedTrip(prev => prev ? { ...prev, packing_lists: [list] } : prev);
    } catch {} finally { setGenerating(false); }
  }

  const trip = selectedTrip ?? demoTrips[0];
  const packingList = trip?.packing_lists?.[0];
  const coveredEvents = 60;

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
            {/* Left: Itinerary */}
            <div className="flex flex-col gap-5">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <span className="eyebrow">Upcoming Trip</span>
                  <h1 className="serif text-3xl font-bold text-[#1e1b18] mt-1">{trip?.name ?? 'Paris Fashion Week'}</h1>
                  <div className="flex gap-5 mt-2 flex-wrap text-sm text-[#544342]">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} />
                      <span>{trip?.start_date ?? 'Sep 24'} - {trip?.end_date ?? 'Oct 2'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} />
                      <span>{trip?.destination ?? 'Paris, France'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2.5 items-center">
                  <button className="px-5 py-2.5 border border-[#d9c1c0] rounded-lg text-sm font-medium bg-white hover:border-[#380208] transition-colors">
                    Edit Details
                  </button>
                  <button className="px-5 py-2.5 bg-[#380208] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity" onClick={handleGeneratePacking} disabled={generating}>
                    {generating ? 'Generating...' : 'Generate Lookbook'}
                  </button>
                </div>
              </div>

              <h2 className="serif text-xl font-semibold text-[#1e1b18]">Itinerary</h2>

              <div className="flex flex-col gap-6 relative before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-[#d9c1c0]">
                {(trip?.trip_events ?? []).map((event, i) => (
                  <div key={event.id} className="flex gap-5">
                    <div className="w-3 h-3 rounded-full bg-[#380208] flex-shrink-0 mt-1.5 z-10" />
                    <div className="flex-1 flex flex-col gap-3 bg-white rounded-xl p-5 border border-[#e1d8d4]">
                      <h3 className="serif text-xl font-semibold text-[#1e1b18]">{event.name}</h3>
                      {event.notes && <p className="text-sm text-[#544342] leading-relaxed">{event.notes}</p>}
                      <div className="flex items-center gap-4 p-3 bg-[#fbf2ed] rounded-lg">
                        <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                          <img
                            src={demoWardrobe[i % demoWardrobe.length]?.image_url ?? 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=100&q=80'}
                            alt="outfit"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-[#544342] font-semibold">{i === 0 ? 'Travel Outfit' : 'Daytime'}</span>
                          <p className="serif text-base font-semibold mt-0.5">{i === 0 ? 'Comfortable Transit' : 'Marais Showrooms'}</p>
                          <p className="text-xs text-[#544342]">{i === 0 ? 'Camel Coat, Silk Blouse, Denim' : 'Charcoal Blazer, Wide Trousers'}</p>
                        </div>
                      </div>
                      {i === 1 && (
                        <div className="flex items-center gap-4 p-4 border border-dashed border-[#d9c1c0] rounded-lg text-[#544342] cursor-pointer hover:border-[#380208] transition-colors">
                          <div className="w-11 h-11 rounded-lg border border-[#d9c1c0] grid place-items-center flex-shrink-0">
                            <Plus size={20} />
                          </div>
                          <div>
                            <span className="text-[11px] uppercase tracking-wider text-[#544342] font-semibold">Evening</span>
                            <p className="text-sm font-medium text-[#1e1b18] mt-0.5">Plan Outfit for Dinner</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Packing Coverage */}
            <div className="bg-white rounded-xl p-6 border border-[#e1d8d4] flex flex-col gap-4 sticky top-6">
              <div className="flex justify-between items-center">
                <h2 className="serif text-xl font-semibold">Packing Coverage</h2>
                <span className="text-xs text-[#544342]">12 Items Total</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#544342]">Events Covered</span>
                <span className="font-semibold text-[#1e1b18]">{coveredEvents}%</span>
              </div>
              <div className="h-2 bg-[#e1d8d4] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#380208] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${coveredEvents}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>

              <h3 className="text-sm font-semibold text-[#1e1b18] mt-2">Key Pieces</h3>
              <div className="flex flex-col gap-3">
                {[
                  { name: 'Camel Cashmere Coat', meta: 'Outerwear · Worn 3x', img: demoWardrobe[0]?.image_url },
                  { name: 'Silk Midi Skirt', meta: 'Bottoms · Worn 2x', img: demoWardrobe[1]?.image_url },
                ].map(piece => (
                  <div key={piece.name} className="flex items-center gap-3">
                    <div className="w-13 h-13 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={piece.img} alt={piece.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="serif text-sm font-semibold">{piece.name}</p>
                      <p className="text-xs text-[#544342]">{piece.meta}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="mt-2 w-full py-3.5 border border-[#d9c1c0] rounded-lg text-sm font-medium hover:border-[#380208] transition-colors">
                View Full Packing List
              </button>
            </div>
          </div>
        </motion.div>
      </AppShell>
    </AuthGuard>
  );
}
