import { requestBackend, requestStyling } from './client';
import type { Occasion, StylingCombo, StylingItem, StyleAdvisorSuggestion, VerdictResponse } from '../lib/types';

export async function listOccasions(token: string): Promise<Occasion[]> {
  return requestStyling<Occasion[]>('/styling/occasions/', {
    method: 'GET',
    token,
  });
}

export async function createOccasion(token: string, data: { name: string; formalityLevel: number }): Promise<Occasion> {
  return requestStyling<Occasion>('/styling/occasions/', {
    method: 'POST',
    token,
    body: data,
  });
}

export async function generateCombos(token: string, data: { occasionId?: string; targetSeason?: string; items: StylingItem[] }): Promise<{ outfitId: string; status: string; combos: StylingCombo[] }> {
  return requestStyling<{ outfitId: string; status: string; combos: StylingCombo[] }>('/styling/combos/generate/', {
    method: 'POST',
    token,
    body: data,
  });
}

export async function fetchVerdict(token: string, outfitId: string): Promise<VerdictResponse> {
  return requestStyling<VerdictResponse>(`/styling/outfits/${outfitId}/verdict/`, {
    method: 'GET',
    token,
  });
}

export async function completeStyleAdvisor(token: string, data: { occasion_description: string; occasion_formality?: number; current_item_descriptions?: string[] }): Promise<{ suggestions: StyleAdvisorSuggestion[] }> {
  return requestBackend<{ suggestions: StyleAdvisorSuggestion[] }>('/styleadvisor/complete/', {
    method: 'POST',
    token,
    body: data,
  });
}
