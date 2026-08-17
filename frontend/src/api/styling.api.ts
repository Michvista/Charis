import { requestBackend, requestStyling } from './client';
import type { Occasion, StylingItem, StyleAdvisorSuggestion, VerdictResponse } from '../lib/types';

export async function listOccasions(token: string): Promise<Occasion[]> {
  try {
    const res = await requestStyling<Occasion[]>('/occasions', {
      method: 'GET',
      token,
    });
    return Array.isArray(res) && res.length > 0 ? res : DEFAULT_OCCASIONS;
  } catch (err) {
    console.warn('Styling occasions API unavailable, using default occasions', err);
    return DEFAULT_OCCASIONS;
  }
}

const DEFAULT_OCCASIONS: Occasion[] = [
  { id: 'occ-1', name: 'Formal Dinner / Gallery Opening', formalityLevel: 4 },
  { id: 'occ-2', name: 'Casual Weekend / City Exploring', formalityLevel: 2 },
  { id: 'occ-3', name: 'Executive Meeting / Business Formal', formalityLevel: 5 },
  { id: 'occ-4', name: 'Smart Casual / Cocktail Hour', formalityLevel: 3 },
];

export async function createOccasion(token: string, data: { name: string; formalityLevel: number }): Promise<Occasion> {
  return requestStyling<Occasion>('/occasions', {
    method: 'POST',
    token,
    body: data,
  });
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

export async function completeStyleAdvisor(token: string, data: { occasion_description: string; occasion_formality?: number; current_item_descriptions?: string[]; occasion_id?: string }): Promise<{ suggestions: StyleAdvisorSuggestion[] }> {
  return requestBackend<{ suggestions: StyleAdvisorSuggestion[] }>('/styleadvisor/complete/', {
    method: 'POST',
    token,
    body: data,
  });
}
