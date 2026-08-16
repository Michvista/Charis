import { requestStyling, requestBackend } from './client';
import type { Occasion, StylingItem, VerdictResponse, StyleAdvisorSuggestion } from '../lib/types';

export async function listOccasions(token: string) {
  const response = await requestStyling<Occasion[]>('/occasions', { token, method: 'GET' });
  return response;
}

export async function createOccasion(token: string, payload: { name: string; formalityLevel: number }) {
  return requestStyling<Occasion>('/occasions', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function generateVerdict(token: string, payload: {
  occasionId?: string;
  items: StylingItem[];
}) {
  return requestStyling<VerdictResponse>('/verdict', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function fetchVerdict(token: string, outfitId: string) {
  return requestStyling<VerdictResponse>(`/verdict/${outfitId}`, { token, method: 'GET' });
}

export async function generateCombos(token: string, payload: {
  occasionId?: string;
  targetSeason?: string;
  items: StylingItem[];
}) {
  return requestStyling<{ outfitId: string; status: string }>('/combos', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function completeStyleAdvisor(token: string, payload: {
  occasion_description: string;
  occasion_formality: number;
  current_item_descriptions: string[];
  occasion_id?: string | null;
}) {
  return requestBackend<{ suggestions: StyleAdvisorSuggestion[] }>('/styleadvisor/complete/', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function uploadStyleKnowledge(token: string, payload: { content: string; tags?: string[] }) {
  return requestBackend('/styleadvisor/knowledge/', {
    method: 'POST',
    token,
    body: payload,
  });
}
