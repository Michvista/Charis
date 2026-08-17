import { requestBackend } from './client';
import type { PackingList, Trip, TripEvent } from '../lib/types';

export async function listTrips(token: string): Promise<Trip[]> {
  return requestBackend<Trip[]>('/tripplanner/trips/', {
    method: 'GET',
    token,
  });
}

export async function createTrip(token: string, data: { name: string; destination: string; start_date: string; end_date: string; description?: string }): Promise<Trip> {
  return requestBackend<Trip>('/tripplanner/trips/', {
    method: 'POST',
    token,
    body: data,
  });
}

export async function getTrip(token: string, id: string): Promise<Trip> {
  return requestBackend<Trip>(`/tripplanner/trips/${id}/`, {
    method: 'GET',
    token,
  });
}

export async function generatePackingList(token: string, tripId: string): Promise<PackingList> {
  return requestBackend<PackingList>(`/tripplanner/trips/${tripId}/generate-packing-list/`, {
    method: 'POST',
    token,
  });
}

export async function createTripEvent(token: string, tripId: string, data: { name: string; date: string; formality_required: number; location?: string; notes?: string }): Promise<TripEvent> {
  return requestBackend<TripEvent>(`/tripplanner/trips/${tripId}/events/`, {
    method: 'POST',
    token,
    body: data,
  });
}
