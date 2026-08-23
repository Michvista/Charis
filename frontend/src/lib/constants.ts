// The canonical set of garment categories. Must match the backend
// `WardrobeItem.CATEGORY_CHOICES` in backend/apps/wardrobe/models.py.
export const ITEM_CATEGORIES = [
  'top',
  'bottom',
  'outerwear',
  'shoes',
  'accessory',
  'dress',
  'bag',
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const CATEGORY_FILTERS = ['All', ...ITEM_CATEGORIES] as const;