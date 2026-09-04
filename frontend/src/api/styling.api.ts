import { requestBackend, requestStyling } from './client';
import type { Occasion, StylingItem, StyleAdvisorSuggestion, VerdictResponse } from '../lib/types';

export async function listOccasions(token: string): Promise<Occasion[]> {
  try {
    const raw = await requestStyling<any[]>('/occasions', {
      method: 'GET',
      token,
    });
    if (!Array.isArray(raw)) return [];
    return raw.map((item: any) => ({
      id: String(item.id || item._id || item.props?.id || ''),
      name: String(item.name || item.props?.name || 'Unnamed Occasion'),
      formalityLevel: Number(item.formalityLevel ?? item.props?.formalityLevel ?? 1),
    }));
  } catch (err) {
    console.warn('Styling occasions API fetch error:', err);
    return [];
  }
}

export async function createOccasion(token: string, data: { name: string; formalityLevel: number }): Promise<Occasion> {
  const raw = await requestStyling<any>('/occasions', {
    method: 'POST',
    token,
    body: data,
  });
  return {
    id: String(raw.id || raw._id || raw.props?.id || ''),
    name: String(raw.name || raw.props?.name || data.name),
    formalityLevel: Number(raw.formalityLevel ?? raw.props?.formalityLevel ?? data.formalityLevel),
  };
}

export async function generateCombos(token: string, data: { occasionId?: string; targetSeason?: string; items: StylingItem[] }): Promise<{ outfitId: string; status: string }> {
  return requestStyling<{ outfitId: string; status: string }>('/combos', {
    method: 'POST',
    token,
    body: data,
  });
}

export async function requestVerdict(token: string, data: { occasionId?: string; items: Array<{ wardrobeItemId: string; itemRole: string; imageUrl?: string; colorHex?: string; formalityLevel?: number }> }): Promise<{ outfitId: string; status: string }> {
  return requestStyling<{ outfitId: string; status: string }>('/verdict', {
    method: 'POST',
    token,
    body: data,
  });
}

export async function fetchVerdict(token: string, outfitId: string): Promise<VerdictResponse> {
  return requestStyling<VerdictResponse>(`/verdict/${outfitId}`, {
    method: 'GET',
    token,
  });
}

export async function completeStyleAdvisor(token: string, data: { occasion_description: string; occasion_formality?: number; current_item_descriptions?: string[]; occasion_id?: string }): Promise<{ suggestions: StyleAdvisorSuggestion[]; summary?: string; source_files?: string[]; retrieval?: string }> {
  return requestBackend<{ suggestions: StyleAdvisorSuggestion[]; summary?: string; source_files?: string[]; retrieval?: string }>('/styleadvisor/complete/', {
    method: 'POST',
    token,
    body: data,
  });
}
