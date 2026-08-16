import { requestBackend } from './client';
import type { WearLog, WardrobeItem } from '../lib/types';

export async function listWardrobeItems(token: string) {
  const response = await requestBackend<{ results?: WardrobeItem[]; count?: number; next?: string | null; previous?: string | null } | WardrobeItem[]>('/wardrobe/items/', {
    token,
  });
  return Array.isArray(response) ? response : response.results ?? [];
}

export async function listWearLogs(token: string) {
  const response = await requestBackend<{ results?: WearLog[] } | WearLog[]>('/wardrobe/wear-logs/', {
    token,
  });
  return Array.isArray(response) ? response : response.results ?? [];
}

export async function createWardrobeItem(
  token: string,
  payload: {
    name: string;
    category: string;
    primary_color: string;
    secondary_color?: string;
    fabric?: string;
    formality_level: number;
    brand?: string;
    purchase_price?: string;
    purchase_date?: string;
    season_ids?: number[];
    image?: File | null;
  },
) {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('category', payload.category);
  formData.append('primary_color', payload.primary_color);
  formData.append('formality_level', String(payload.formality_level));
  if (payload.secondary_color) formData.append('secondary_color', payload.secondary_color);
  if (payload.fabric) formData.append('fabric', payload.fabric);
  if (payload.brand) formData.append('brand', payload.brand);
  if (payload.purchase_price) formData.append('purchase_price', payload.purchase_price);
  if (payload.purchase_date) formData.append('purchase_date', payload.purchase_date);
  payload.season_ids?.forEach((id) => formData.append('season_ids', String(id)));
  if (payload.image) formData.append('image', payload.image);

  return requestBackend<WardrobeItem>('/wardrobe/items/', {
    method: 'POST',
    token,
    body: formData,
  });
}

export async function logWear(token: string, itemId: string, outfitId?: string) {
  return requestBackend<{ message: string; wear_log_id: string; outfit_id: string | null; worn_date: string }>(`/wardrobe/items/${itemId}/wear/`, {
    method: 'POST',
    token,
    body: outfitId ? { outfit_id: outfitId } : {},
  });
}

export async function fetchWardrobeWearDetails(token: string, wearLogId: string) {
  return requestBackend<WearLog>(`/wardrobe/wear-logs/${wearLogId}/`, { token });
}
