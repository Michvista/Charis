import type { Trip, WardrobeItem } from '../../lib/types';

export function getTripCoverage(trip: Trip, wardrobeItems: WardrobeItem[]) {
  const maxEventFormality = trip.trip_events.reduce((max, event) => Math.max(max, event.formality_required), 0);
  const dressedItems = wardrobeItems.filter((item) => item.formality_level >= maxEventFormality);
  const coverage = trip.trip_events.length === 0 ? 0 : Math.min(100, Math.round((dressedItems.length / Math.max(trip.trip_events.length, 1)) * 100));
  return { coverage };
}
