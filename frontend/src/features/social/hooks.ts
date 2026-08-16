import type { OutfitShare } from '../../lib/types';

export function sortFeed(shares: OutfitShare[]) {
  return [...shares].sort((a, b) => new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime());
}
