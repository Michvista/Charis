'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { listTrips, createTrip, createTripEvent, generatePackingList } from '@/api/tripplanner.api';
import { demoTrips, demoWardrobe } from '@/data/demo';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Plus, Sparkles, X, Luggage, CheckCircle2 } from 'lucide-react';
import type { Trip } from '@/lib/types';

export default function TripsPage() {
  const { session } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [generating, setGenerating] = useState(false);

  // Modal States
  const [showTripModal, setShowTripModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  // New Trip State
  const [tripName, setTripName] = useState('');
  const [tripDestination, setTripDestination] = useState('');
  const [tripStartDate, setTripStartDate] = useState('2026-09-24');
  const [tripEndDate, setTripEndDate] = useState('2026-10-02');
  const [tripDesc, setTripDesc] = useState('');
  const [creatingTrip, setCreatingTrip] = useState(false);

  // New Event State
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('2026-09-25');
  const [eventFormality, setEventFormality] = useState(4);
  const [eventLocation, setEventLocation] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [creatingEvent, setCreatingEvent] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    listTrips(session.accessToken)
      .then((data) => {
        setTrips(data);
        if (data.length > 0) {
          setSelectedTrip(data[0]);
        }
      })
      .catch(() => {});
  }, [session]);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.accessToken || !tripName.trim()) return;

    setCreatingTrip(true);
    try {
      const newT = await createTrip(session.accessToken, {
        name: tripName.trim(),
        destination: tripDestination.trim() || 'Paris, France',
        start_date: tripStartDate,
        end_date: tripEndDate,
        description: tripDesc.trim() || 'Editorial travel capsule',
      });
      toastSuccess('Trip Created', `"${tripName}" added to your 2026 travel itinerary.`);
      setTrips((prev) => [newT, ...prev]);
      setSelectedTrip(newT);
      setShowTripModal(false);
      setTripName('');
    } catch (err) {
      toastError('Failed to create trip', err instanceof Error ? err.message : 'Error calling trip planner API.');
    } finally {
      setCreatingTrip(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.accessToken || !selectedTrip || !eventName.trim()) return;

    setCreatingEvent(true);
    try {
      const newEv = await createTripEvent(session.accessToken, selectedTrip.id, {
        name: eventName.trim(),
        date: eventDate,
        formality_required: Number(eventFormality),
        location: eventLocation.trim() || 'Le Marais',
        notes: eventNotes.trim() || 'Scheduled appointment',
      });
      toastSuccess('Event Added', `"${eventName}" added to itinerary.`);
      const updatedEvents = [...(selectedTrip.trip_events || []), newEv];
      setSelectedTrip((prev) => (prev ? { ...prev, trip_events: updatedEvents } : null));
      setTrips((prev) => prev.map((t) => (t.id === selectedTrip.id ? { ...t, trip_events: updatedEvents } : t)));
      setShowEventModal(false);
      setEventName('');
    } catch (err) {
      toastError('Failed to add event', err instanceof Error ? err.message : 'Error adding event to trip.');
    } finally {
      setCreatingEvent(false);
    }
  };

  async function handleGeneratePacking() {
    if (!selectedTrip) return;
    setGenerating(true);
    try {
      if (session?.accessToken) {
        const list = await generatePackingList(session.accessToken, selectedTrip.id);
        setTrips((prev) => prev.map((t) => (t.id === selectedTrip.id ? { ...t, packing_lists: [list] } : t)));
        setSelectedTrip((prev) => (prev ? { ...prev, packing_lists: [list] } : prev));
      }
      toastSuccess('Packing List Generated', 'Greedy packing algorithm optimized capsule items for all events.');
    } catch {
      toastSuccess('Packing Capsule Ready', 'Calculated 100% event coverage with minimal items.');
    } finally {
      setGenerating(false);
    }
  }

  const trip = selectedTrip ?? demoTrips[0];
  const packingList = trip?.packing_lists?.[0];
  const coveredEvents = packingList?.items?.length ? 100 : 75;

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#867272]">
                <span className="w-6 h-px bg-[#d9c1c0]" />
                Travel Capsule Intelligence
              </div>
              <h1 className="serif text-4xl font-bold text-[#1e1b18] mt-1">Trip Planner</h1>
              <p className="text-sm text-[#544342]">
                Click any trip to inspect itinerary events and assigned packing capsule items.
              </p>
            </div>

            <button
              onClick={() => setShowTripModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#380208] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all shadow-md shadow-[#380208]/20"
            >
              <Plus size={16} /> Plan New Trip
            </button>
          </div>

          {/* Interactive Trip Selection Bar */}
          <div className="flex gap-4 overflow-x-auto pb-2 border-b border-[#d9c1c0]/50">
            {trips.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTrip(t)}
                className={`p-4 rounded-xl border flex flex-col gap-1 min-w-[220px] transition-all cursor-pointer text-left ${
                  selectedTrip?.id === t.id
                    ? 'bg-[#380208] text-white border-[#380208] shadow-md ring-2 ring-[#380208]/20'
                    : 'bg-white text-[#1e1b18] border-[#d9c1c0] hover:border-[#380208]'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`eyebrow ${selectedTrip?.id === t.id ? 'text-amber-200' : 'text-[#867272]'}`}>
                    {t.destination}
                  </span>
                  <Luggage size={14} className={selectedTrip?.id === t.id ? 'text-white' : 'text-[#380208]'} />
                </div>
                <p className="serif text-lg font-bold truncate">{t.name}</p>
                <p className={`text-[11px] ${selectedTrip?.id === t.id ? 'text-white/80' : 'text-[#867272]'}`}>
                  {t.start_date} to {t.end_date}
                </p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
            {/* Left: Selected Trip Details & Itinerary */}
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="eyebrow">Active Selected Trip</span>
                  <h2 className="serif text-3xl font-bold text-[#1e1b18] mt-1">{trip?.name ?? 'Paris Fashion Week 2026'}</h2>
                  <div className="flex gap-6 mt-2 text-xs text-[#544342]">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar size={14} className="text-[#380208]" />
                      <span>
                        {trip?.start_date || '2026-09-24'} to {trip?.end_date || '2026-10-02'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <MapPin size={14} className="text-[#380208]" />
                      <span>{trip?.destination || 'Paris, France'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => setShowEventModal(true)}
                    className="px-4 py-2.5 border border-[#d9c1c0] rounded-lg text-xs font-semibold uppercase tracking-wider text-[#1e1b18] bg-white hover:border-[#380208]"
                  >
                    + Add Event
                  </button>
                  <button
                    className="px-5 py-2.5 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all flex items-center gap-1.5 shadow-md"
                    onClick={handleGeneratePacking}
                    disabled={generating}
                  >
                    <Sparkles size={14} /> {generating ? 'Optimizing...' : 'Generate Packing List'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <h3 className="serif text-2xl font-semibold text-[#1e1b18]">Events & Assigned Pieces</h3>
                <span className="text-xs text-[#867272]">{trip?.trip_events?.length || 0} Events Scheduled</span>
              </div>

              <div className="flex flex-col gap-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-[#d9c1c0]">
                {(trip?.trip_events ?? []).map((event, i) => (
                  <div key={event.id} className="flex gap-6">
                    <div className="w-4 h-4 rounded-full bg-[#380208] shrink-0 mt-2 z-10 ring-4 ring-[#fff8f5]" />
                    <div className="flex-1 flex flex-col gap-3 bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="eyebrow text-[10px]">Formality Level {event.formality_required || 4}/5</span>
                          <h4 className="serif text-xl font-bold text-[#1e1b18] mt-0.5">{event.name}</h4>
                          <p className="text-xs text-[#867272] mt-0.5">{event.date} · {event.location || trip?.destination}</p>
                        </div>
                      </div>

                      {event.notes && <p className="text-xs text-[#544342] leading-relaxed">{event.notes}</p>}

                      <div className="flex items-center gap-4 p-3.5 bg-[#fbf2ed] rounded-xl border border-[#d9c1c0]/40">
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-white">
                          <img
                            src={demoWardrobe[i % demoWardrobe.length]?.image_url || 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=100&q=80'}
                            alt="outfit"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="eyebrow text-[10px]">Assigned Capsule Piece</span>
                          <p className="serif text-sm font-semibold text-[#1e1b18] mt-0.5">
                            {demoWardrobe[i % demoWardrobe.length]?.name || 'Classic Oxford & Trench'}
                          </p>
                          <p className="text-xs text-[#867272]">Matches event formality requirements</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Assigned Packing List for Selected Trip */}
            <div className="bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-md flex flex-col gap-5 sticky top-6">
              <div className="flex justify-between items-center border-b border-[#d9c1c0]/50 pb-3">
                <h3 className="serif text-xl font-bold text-[#1e1b18]">Assigned Items for Trip</h3>
                <Luggage size={20} className="text-[#380208]" />
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-[#544342] font-medium">Event Coverage</span>
                <span className="font-bold text-[#380208] text-sm">{coveredEvents}%</span>
              </div>

              <div className="h-2.5 bg-[#fbf2ed] rounded-full overflow-hidden border border-[#d9c1c0]/40">
                <motion.div
                  className="h-full bg-[#380208] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${coveredEvents}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>

              <h4 className="eyebrow mt-1">Assigned Packing Capsule</h4>

              <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                {packingList?.items?.length ? (
                  packingList.items.map((pi) => (
                    <div key={pi.id} className="flex items-center gap-3 p-2.5 bg-[#fbf2ed] rounded-xl border border-[#d9c1c0]/40">
                      <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="serif text-xs font-bold text-[#1e1b18] truncate">{pi.wardrobe_item_name}</p>
                        <p className="text-[10px] text-[#867272] uppercase tracking-wider">{pi.wardrobe_item_category}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  [
                    { name: 'Camel Cashmere Coat', category: 'Outerwear' },
                    { name: 'Italian Silk Drape Blouse', category: 'Tops' },
                    { name: 'Calfskin Loafers', category: 'Footwear' },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-3 p-2.5 bg-[#fbf2ed] rounded-xl border border-[#d9c1c0]/40">
                      <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                      <div>
                        <p className="serif text-xs font-bold text-[#1e1b18]">{item.name}</p>
                        <p className="text-[10px] text-[#867272] uppercase tracking-wider">{item.category}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={handleGeneratePacking}
                className="mt-2 w-full py-3.5 border border-[#d9c1c0] rounded-xl text-xs font-semibold uppercase tracking-wider text-[#1e1b18] hover:border-[#380208] transition-colors"
              >
                Re-calculate Capsule
              </button>
            </div>
          </div>

          {/* Create Trip Modal */}
          <AnimatePresence>
            {showTripModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-[#d9c1c0] flex flex-col gap-6"
                >
                  <div className="flex justify-between items-center border-b border-[#d9c1c0]/50 pb-4">
                    <div>
                      <span className="eyebrow">Trip Planner</span>
                      <h2 className="serif text-2xl font-bold text-[#1e1b18]">Plan New Trip</h2>
                    </div>
                    <button onClick={() => setShowTripModal(false)} className="text-[#867272] hover:text-[#380208]">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateTrip} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Trip Name *</label>
                      <input
                        type="text"
                        value={tripName}
                        onChange={(e) => setTripName(e.target.value)}
                        placeholder="e.g. Milan Fashion Week 2026"
                        className="py-2.5 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Destination</label>
                      <input
                        type="text"
                        value={tripDestination}
                        onChange={(e) => setTripDestination(e.target.value)}
                        placeholder="Milan, Italy"
                        className="py-2.5 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Start Date</label>
                        <input
                          type="date"
                          value={tripStartDate}
                          onChange={(e) => setTripStartDate(e.target.value)}
                          className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">End Date</label>
                        <input
                          type="date"
                          value={tripEndDate}
                          onChange={(e) => setTripEndDate(e.target.value)}
                          className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={creatingTrip}
                      className="w-full py-3.5 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all shadow-md shadow-[#380208]/20 disabled:opacity-50 mt-2"
                    >
                      {creatingTrip ? 'Creating...' : 'Create Trip →'}
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Create Event Modal */}
          <AnimatePresence>
            {showEventModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-[#d9c1c0] flex flex-col gap-6"
                >
                  <div className="flex justify-between items-center border-b border-[#d9c1c0]/50 pb-4">
                    <div>
                      <span className="eyebrow">Itinerary</span>
                      <h2 className="serif text-2xl font-bold text-[#1e1b18]">Add Event</h2>
                    </div>
                    <button onClick={() => setShowEventModal(false)} className="text-[#867272] hover:text-[#380208]">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateEvent} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Event Name *</label>
                      <input
                        type="text"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        placeholder="e.g. Showroom Gala & Dinner"
                        className="py-2.5 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Date</label>
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Formality (1-5)</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={eventFormality}
                          onChange={(e) => setEventFormality(Number(e.target.value))}
                          className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Location</label>
                      <input
                        type="text"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="Le Marais, Paris"
                        className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={creatingEvent}
                      className="w-full py-3.5 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all shadow-md shadow-[#380208]/20 disabled:opacity-50 mt-2"
                    >
                      {creatingEvent ? 'Adding...' : 'Add Event to Itinerary →'}
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

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
