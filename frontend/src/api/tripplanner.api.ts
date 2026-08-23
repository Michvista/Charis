import { requestBackend } from './client';
import type { PackingList, Trip, TripEvent } from '../lib/types';

export async function listTrips(token: string): Promise<Trip[]> {
  const res = await requestBackend<any>('/tripplanner/trips/', {
    method: 'GET',
    token,
  });
  return Array.isArray(res) ? res : (res?.results ?? []);
}

export async function createTrip(token: string, data: { name: string; destination: string; start_date: string; end_date: string; description?: string }): Promise<Trip> {
  return requestBackend<Trip>('/tripplanner/trips/', {
    method: 'POST',
    token,
    body: data,
  });
}

export async function updateTrip(token: string, id: string, data: Partial<{ name: string; destination: string; start_date: string; end_date: string; description: string }>): Promise<Trip> {
  return requestBackend<Trip>(`/tripplanner/trips/${id}/`, {
    method: 'PATCH',
    token,
    body: data as Record<string, unknown>,
  });
}

export async function deleteTrip(token: string, id: string): Promise<void> {
  await requestBackend(`/tripplanner/trips/${id}/`, {
    method: 'DELETE',
    token,
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

export async function updateTripEvent(token: string, tripId: string, eventId: string, data: Partial<{ name: string; date: string; formality_required: number; location: string; notes: string }>): Promise<TripEvent> {
  return requestBackend<TripEvent>(`/tripplanner/trips/${tripId}/events/${eventId}/`, {
    method: 'PATCH',
    token,
    body: data as Record<string, unknown>,
  });
}

export async function deleteTripEvent(token: string, tripId: string, eventId: string): Promise<void> {
  await requestBackend(`/tripplanner/trips/${tripId}/events/${eventId}/`, {
    method: 'DELETE',
    token,
  });
}
