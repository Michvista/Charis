import type { WardrobeItem } from '../../lib/types';

export function getWardrobeHighlights(items: WardrobeItem[]) {
  const topItem = [...items].sort((a, b) => b.times_worn - a.times_worn)[0] ?? items[0];
  return {
    topItem: topItem ?? {
      id: 'fallback',
      name: 'No item found',
      category: 'top',
      primary_color: 'var(--accent)',
      formality_level: 3,
      seasons: [],
      image_url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80',
      tagging_status: 'done',
      times_worn: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

export function formatCount(count: number) {
  return new Intl.NumberFormat('en-US').format(count);
}
