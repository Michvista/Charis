import { requestBackend } from './client';
import type { WardrobeItem, WearLog } from '../lib/types';

export async function listWardrobeItems(token: string): Promise<WardrobeItem[]> {
  const res = await requestBackend<any>('/wardrobe/items/', {
    method: 'GET',
    token,
  });
  return Array.isArray(res) ? res : (res?.results ?? []);
}

export async function createWardrobeItem(token: string, formData: FormData): Promise<WardrobeItem> {
  return requestBackend<WardrobeItem>('/wardrobe/items/', {
    method: 'POST',
    token,
    body: formData,
  });
}

export async function getWardrobeItem(token: string, id: string): Promise<WardrobeItem> {
  return requestBackend<WardrobeItem>(`/wardrobe/items/${id}/`, {
    method: 'GET',
    token,
  });
}

export async function updateWardrobeItem(token: string, id: string, data: Partial<WardrobeItem>): Promise<WardrobeItem> {
  return requestBackend<WardrobeItem>(`/wardrobe/items/${id}/`, {
    method: 'PATCH',
    token,
    body: data as Record<string, unknown>,
  });
}

export async function deleteWardrobeItem(token: string, id: string): Promise<void> {
  await requestBackend(`/wardrobe/items/${id}/`, {
    method: 'DELETE',
    token,
  });
}

export async function logWear(token: string, itemId: string, outfitId?: string): Promise<WearLog> {
  return requestBackend<WearLog>(`/wardrobe/items/${itemId}/wear/`, {
    method: 'POST',
    token,
    body: outfitId ? { outfit_id: outfitId } : {},
  });
}

export async function listWearLogs(token: string): Promise<WearLog[]> {
  const res = await requestBackend<any>('/wardrobe/wear-logs/', {
    method: 'GET',
    token,
  });
  return Array.isArray(res) ? res : (res?.results ?? []);
}
