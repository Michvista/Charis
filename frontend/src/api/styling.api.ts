import { requestBackend, requestStyling } from './client';
import type { Occasion, StylingItem, StyleAdvisorSuggestion, VerdictResponse } from '../lib/types';

export async function listOccasions(token: string): Promise<Occasion[]> {
  return requestStyling<Occasion[]>('/occasions', {
    method: 'GET',
    token,
  });
}

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
