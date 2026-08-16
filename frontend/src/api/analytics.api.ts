import { requestBackend } from './client';
import type { AnalyticsOverview } from '../lib/types';

export async function fetchAnalyticsOverview(token: string, start?: string, end?: string) {
  const query = new URLSearchParams();
  if (start) query.set('start', start);
  if (end) query.set('end', end);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return requestBackend<AnalyticsOverview>(`/analytics/overview/${suffix}`, { token });
}
