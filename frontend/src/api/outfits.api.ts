import { requestBackend } from './client';

export type OutfitItemSnapshot = {
  name: string;
  image_url?: string;
  category: string;
  color_hex?: string;
  formality_level?: number;
};

export type OutfitRecord = {
  id: string;
  user: string;
  user_email?: string;
  outfit_id: string;
  name: string;
  score: number;
  verdict: string;
  visual_notes: string;
  items: OutfitItemSnapshot[];
  item_count: number;
  created_at: string;
  updated_at: string;
};

export type CreateOutfitInput = {
  outfit_id: string;
  name?: string;
  score?: number;
  verdict?: string;
  visual_notes?: string;
  items?: OutfitItemSnapshot[];
};

export async function listOutfits(token: string): Promise<OutfitRecord[]> {
  const res = await requestBackend<any>('/outfits/', { method: 'GET', token });
  return Array.isArray(res) ? res : (res?.results ?? []);
}

export async function createOutfit(token: string, data: CreateOutfitInput): Promise<OutfitRecord> {
  return requestBackend<OutfitRecord>('/outfits/', { method: 'POST', token, body: data });
}

export async function getOutfit(token: string, id: string): Promise<OutfitRecord> {
  return requestBackend<OutfitRecord>(`/outfits/${id}/`, { method: 'GET', token });
}

export async function deleteOutfit(token: string, id: string): Promise<void> {
  await requestBackend(`/outfits/${id}/`, { method: 'DELETE', token });
}