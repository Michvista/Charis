'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { listTrips, createTrip, createTripEvent, generatePackingList } from '@/api/tripplanner.api';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar01Icon, Location01Icon, PlusSignIcon, SparklesIcon, Cancel01Icon, Luggage01Icon, CheckmarkCircle02Icon, PackageIcon } from '@hugeicons/core-free-icons';
import type { Trip } from '@/lib/types';

export default function TripsPage() {
  const { session } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [generatingNew, setGeneratingNew] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

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
    setLoading(true);
    listTrips(session.accessToken)
      .then((data) => {
        setTrips(data);
        if (data.length > 0) setSelectedTrip(data[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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
      setTripDestination('');
      setTripDesc('');
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
        location: eventLocation.trim() || selectedTrip.destination,
        notes: eventNotes.trim(),
      });
      toastSuccess('Event Added', `"${eventName}" scheduled to your itinerary.`);
      const updatedTrip = {
        ...selectedTrip,
        trip_events: [...(selectedTrip.trip_events || []), newEv],
      };
      setTrips((prev) => prev.map((t) => (t.id === selectedTrip.id ? updatedTrip : t)));
      setSelectedTrip(updatedTrip);
      setShowEventModal(false);
      setEventName('');
      setEventLocation('');
      setEventNotes('');
    } catch (err) {
      toastError('Failed to add event', err instanceof Error ? err.message : 'Error adding event.');
    } finally {
      setCreatingEvent(false);
    }
  };

  async function handleGeneratePacking(isRecalculate = false) {
    if (!selectedTrip) return;
    if (isRecalculate) setRecalculating(true);
    else setGeneratingNew(true);
    try {
      if (session?.accessToken) {
        const raw = await generatePackingList(session.accessToken, selectedTrip.id);
        // Normalize response — handle wrapped response body
        const list = (raw as any).body ?? (raw as any).data ?? raw;
        const updatedTrip = { ...selectedTrip, packing_lists: [list] };
        setSelectedTrip(updatedTrip);
        setTrips((prev) => prev.map((t) => (t.id === selectedTrip.id ? updatedTrip : t)));
        toastSuccess('Packing List Generated', 'Greedy packing algorithm optimized capsule items for all events.');
      }
    } catch (err) {
      toastError('Packing List Failed', err instanceof Error ? err.message : 'Could not generate packing list.');
    } finally {
      if (isRecalculate) setRecalculating(false);
      else setGeneratingNew(false);
    }
  }

  const packingList = selectedTrip?.packing_lists?.[0];
  const packingItems = (packingList?.items ?? (packingList as any)?.body?.items ?? []) as any[];
  const eventCount = selectedTrip?.trip_events?.length || 0;
  const coveredEvents = new Set(packingItems.flatMap((pi: any) => pi.covers_event_ids || []));
  const coveredPercent = eventCount > 0 ? Math.round((coveredEvents.size / eventCount) * 100) : (packingItems.length > 0 ? 100 : 0);

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
              <HugeiconsIcon icon={PlusSignIcon} size={16} /> Plan New Trip
            </button>
          </div>

          {/* Trip Selector Bar */}
          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="w-8 h-8 border-2 border-[#380208]/30 border-t-[#380208] rounded-full animate-spin" />
            </div>
          ) : trips.length === 0 ? (
            <div className="py-12 bg-white/60 border border-dashed border-[#d9c1c0] rounded-2xl flex flex-col items-center justify-center text-center p-8">
              <HugeiconsIcon icon={Luggage01Icon} size={36} className="text-[#d9c1c0] mb-3" />
              <p className="serif text-xl font-semibold text-[#1e1b18]">No trips planned yet</p>
              <p className="text-xs text-[#544342] mt-1 mb-4">Plan your first editorial travel capsule.</p>
              <button
                onClick={() => setShowTripModal(true)}
                className="px-5 py-2.5 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] flex items-center gap-1.5"
              >
                <HugeiconsIcon icon={PlusSignIcon} size={14} /> Plan New Trip
              </button>
            </div>
          ) : (
            <>
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
                      <HugeiconsIcon icon={Luggage01Icon} size={14} className={selectedTrip?.id === t.id ? 'text-white' : 'text-[#380208]'} />
                    </div>
                    <p className="serif text-lg font-bold truncate">{t.name}</p>
                    <p className={`text-[11px] ${selectedTrip?.id === t.id ? 'text-white/80' : 'text-[#867272]'}`}>
                      {t.start_date} to {t.end_date}
                    </p>
                  </button>
                ))}
              </div>

              {selectedTrip && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
                  {/* Left: Trip Details & Events */}
                  <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <span className="eyebrow">Selected Trip</span>
                        <h2 className="serif text-3xl font-bold text-[#1e1b18] mt-1">{selectedTrip.name}</h2>
                        <div className="flex gap-6 mt-2 text-xs text-[#544342]">
                          <div className="flex items-center gap-1.5 font-medium">
                            <HugeiconsIcon icon={Calendar01Icon} size={14} className="text-[#380208]" />
                            <span>{selectedTrip.start_date} to {selectedTrip.end_date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-medium">
                            <HugeiconsIcon icon={Location01Icon} size={14} className="text-[#380208]" />
                            <span>{selectedTrip.destination}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 items-center flex-wrap">
                        <button
                          onClick={() => setShowEventModal(true)}
                          className="px-4 py-2.5 border border-[#d9c1c0] rounded-lg text-xs font-semibold uppercase tracking-wider text-[#1e1b18] bg-white hover:border-[#380208]"
                        >
                          + Add Event
                        </button>
                        <button
                          className="px-5 py-2.5 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
                          onClick={() => handleGeneratePacking(false)}
                          disabled={generatingNew}
                        >
                          <HugeiconsIcon icon={SparklesIcon} size={14} /> {generatingNew ? 'Optimizing...' : 'Generate Packing List'}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <h3 className="serif text-2xl font-semibold text-[#1e1b18]">Events & Assigned Pieces</h3>
                      <span className="text-xs text-[#867272]">{selectedTrip.trip_events?.length || 0} Events Scheduled</span>
                    </div>

                    {(selectedTrip.trip_events?.length ?? 0) === 0 ? (
                      <div className="py-10 text-center bg-white/60 border border-dashed border-[#d9c1c0] rounded-2xl">
                        <HugeiconsIcon icon={Calendar01Icon} size={32} className="text-[#d9c1c0] mx-auto mb-2" />
                        <p className="text-xs text-[#867272]">No events yet. Add itinerary events with formality levels so the AI can pack the right items.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-[#d9c1c0]">
                        {selectedTrip.trip_events?.map((event, i) => {
                          const assignedItems = packingItems.filter((pi) =>
                            (pi.covers_event_ids || []).includes(event.id)
                          );

                          return (
                            <div key={event.id} className="flex gap-6">
                              <div className="w-4 h-4 rounded-full bg-[#380208] shrink-0 mt-2 z-10 ring-4 ring-[#fff8f5]" />
                              <div className="flex-1 flex flex-col gap-3 bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-sm">
                                <div>
                                  <span className="eyebrow text-[10px]">Formality Level {event.formality_required || 4}/5</span>
                                  <h4 className="serif text-xl font-bold text-[#1e1b18] mt-0.5">{event.name}</h4>
                                  <p className="text-xs text-[#867272] mt-0.5">{event.date} · {event.location || selectedTrip.destination}</p>
                                </div>

                                {event.notes && <p className="text-xs text-[#544342] leading-relaxed">{event.notes}</p>}

                                {assignedItems.length > 0 ? (
                                  <div className="flex flex-col gap-2">
                                    <span className="eyebrow text-[10px]">Assigned Capsule Pieces</span>
                                    <div className="flex gap-2.5 flex-wrap">
                                      {assignedItems.map((pi) => (
                                        <div key={pi.id} className="flex items-center gap-2.5 p-2 bg-[#fbf2ed] rounded-xl border border-[#d9c1c0]/40 min-w-0">
                                          <div className="w-10 h-12 rounded-lg overflow-hidden shrink-0 bg-white border border-[#d9c1c0]/40">
                                            <img
                                              src={pi.wardrobe_item_image || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=100&q=80'}
                                              alt={pi.wardrobe_item_name}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="serif text-xs font-semibold text-[#1e1b18] truncate">{pi.wardrobe_item_name}</p>
                                            <p className="text-[10px] text-[#867272] capitalize">{pi.wardrobe_item_category}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3 p-3 bg-[#fbf2ed] rounded-xl border border-dashed border-[#d9c1c0]/40 text-xs text-[#867272]">
                                    <HugeiconsIcon icon={PackageIcon} size={14} className="text-[#d9c1c0]" />
                                    Generate packing list to assign capsule pieces
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right: Packing List */}
                  <div className="bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-md flex flex-col gap-5 sticky top-6">
                    <div className="flex justify-between items-center border-b border-[#d9c1c0]/50 pb-3">
                      <h3 className="serif text-xl font-bold text-[#1e1b18]">Packing Capsule</h3>
                      <HugeiconsIcon icon={Luggage01Icon} size={20} className="text-[#380208]" />
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#544342] font-medium">Event Coverage</span>
                      <span className="font-bold text-[#380208] text-sm">{coveredPercent}%</span>
                    </div>

                    <div className="h-2.5 bg-[#fbf2ed] rounded-full overflow-hidden border border-[#d9c1c0]/40">
                      <motion.div
                        className="h-full bg-[#380208] rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${coveredPercent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>

                    <h4 className="eyebrow mt-1">Assigned Packing Items</h4>

                    <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                      {packingItems.length === 0 ? (
                        <div className="py-8 flex flex-col items-center text-center gap-2">
                          <HugeiconsIcon icon={PackageIcon} size={28} className="text-[#d9c1c0]" />
                          <p className="text-xs text-[#867272]">No packing list generated yet.</p>
                          <p className="text-[11px] text-[#544342]">Add events with formality levels, then generate a packing list.</p>
                        </div>
                      ) : (
                        packingItems.map((pi) => (
                          <div key={pi.id} className="flex items-center gap-3 p-2.5 bg-[#fbf2ed] rounded-xl border border-[#d9c1c0]/40">
                            <div className="w-9 h-11 rounded-lg overflow-hidden shrink-0 bg-white border border-[#d9c1c0]/40">
                              <img
                                src={pi.wardrobe_item_image || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=100&q=80'}
                                alt={pi.wardrobe_item_name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="serif text-xs font-bold text-[#1e1b18] truncate">{pi.wardrobe_item_name}</p>
                              <p className="text-[10px] text-[#867272] uppercase tracking-wider">{pi.wardrobe_item_category}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => handleGeneratePacking(true)}
                      disabled={recalculating}
                      className="mt-2 w-full py-3.5 border border-[#d9c1c0] rounded-xl text-xs font-semibold uppercase tracking-wider text-[#1e1b18] hover:border-[#380208] transition-colors disabled:opacity-50"
                    >
                      {recalculating ? 'Optimizing...' : 'Re-calculate Capsule'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

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
                    <button onClick={() => setShowTripModal(false)} className="text-[#867272] hover:text-[#380208]"><HugeiconsIcon icon={Cancel01Icon} size={20} /></button>
                  </div>

                  <form onSubmit={handleCreateTrip} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Trip Name *</label>
                      <input type="text" value={tripName} onChange={(e) => setTripName(e.target.value)} placeholder="e.g. Paris Fashion Week 2026" className="py-2.5 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]" required />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Destination</label>
                      <input type="text" value={tripDestination} onChange={(e) => setTripDestination(e.target.value)} placeholder="e.g. Paris, France" className="py-2.5 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Start Date</label>
                        <input type="date" value={tripStartDate} onChange={(e) => setTripStartDate(e.target.value)} className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">End Date</label>
                        <input type="date" value={tripEndDate} onChange={(e) => setTripEndDate(e.target.value)} className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Description</label>
                      <textarea value={tripDesc} onChange={(e) => setTripDesc(e.target.value)} placeholder="Describe this travel capsule..." rows={2} className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208] resize-none" />
                    </div>
                    <button type="submit" disabled={creatingTrip} className="w-full py-3.5 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all disabled:opacity-50 mt-2">
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
                  className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-[#d9c1c0] flex flex-col gap-6"
                >
                  <div className="flex justify-between items-center border-b border-[#d9c1c0]/50 pb-4">
                    <div>
                      <span className="eyebrow">Trip: {selectedTrip?.name}</span>
                      <h2 className="serif text-2xl font-bold text-[#1e1b18]">Add Itinerary Event</h2>
                    </div>
                    <button onClick={() => setShowEventModal(false)} className="text-[#867272] hover:text-[#380208]"><HugeiconsIcon icon={Cancel01Icon} size={20} /></button>
                  </div>

                  <form onSubmit={handleCreateEvent} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Event Name *</label>
                      <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. Gala Dinner at Palais Royal" className="py-2.5 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Date</label>
                        <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#544342]">Formality (1-5)</label>
                        <input type="number" min="1" max="5" value={eventFormality} onChange={(e) => setEventFormality(Number(e.target.value))} className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Location</label>
                      <input type="text" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="e.g. Palais Royal, Paris" className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#544342]">Notes</label>
                      <textarea value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} placeholder="Additional event details..." rows={2} className="py-2 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208] resize-none" />
                    </div>
                    <button type="submit" disabled={creatingEvent} className="w-full py-3.5 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all disabled:opacity-50 mt-2">
                      {creatingEvent ? 'Adding...' : 'Add Event →'}
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
