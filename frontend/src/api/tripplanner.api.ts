import { requestBackend } from './client';
import type { PackingList, Trip, TripEvent } from '../lib/types';

export async function listTrips(token: string) {
  const response = await requestBackend<Trip[] | { results?: Trip[] }>('/tripplanner/trips/', { token });
  return Array.isArray(response) ? response : response.results ?? [];
}

export async function createTrip(
  token: string,
  payload: {
    name: string;
    destination: string;
    start_date: string;
    end_date: string;
    description?: string;
    trip_events?: Omit<TripEvent, 'id' | 'created_at' | 'updated_at'>[];
  },
) {
  return requestBackend<Trip>('/tripplanner/trips/', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function createTripEvent(
  token: string,
  tripId: string,
  payload: {
    name: string;
    date: string;
    formality_required: number;
    location?: string;
    notes?: string;
  },
) {
  return requestBackend<TripEvent>(`/tripplanner/trips/${tripId}/events/`, {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function generatePackingList(token: string, tripId: string) {
  return requestBackend<PackingList>(`/tripplanner/trips/${tripId}/generate-packing-list/`, {
    method: 'POST',
    token,
  });
}
