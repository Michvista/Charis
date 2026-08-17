import { requestBackend } from './client';
import type { AnalyticsOverview } from '../lib/types';

export async function fetchAnalyticsOverview(token: string, dates?: { start?: string; end?: string }): Promise<AnalyticsOverview> {
  const query = new URLSearchParams();
  if (dates?.start) query.set('start', dates.start);
  if (dates?.end) query.set('end', dates.end);
  const path = query.toString() ? `/analytics/overview/?${query.toString()}` : '/analytics/overview/';

  return requestBackend<AnalyticsOverview>(path, {
    method: 'GET',
    token,
  });
}
