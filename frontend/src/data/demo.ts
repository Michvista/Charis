import type { AnalyticsOverview, Occasion, OutfitShare, StyleAdvisorSuggestion, Trip, WardrobeItem } from '../lib/types';

export const demoWardrobe: WardrobeItem[] = [
  {
    id: 'item-1', name: 'Camel Cashmere Coat', category: 'Outerwear', primary_color: '#c4a882',
    formality_level: 4, seasons: [{ id: 1, name: 'FW' }], brand: 'Max Mara',
    image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80',
    tagging_status: 'done', times_worn: 24, purchase_price: '1250.00',
    purchase_date: '2023-09-15', created_at: '2023-09-15T10:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'item-2', name: 'Silk Midi Skirt', category: 'Bottoms', primary_color: '#1a1a1a',
    formality_level: 3, seasons: [{ id: 2, name: 'ALL' }], brand: 'The Row',
    image_url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400&q=80',
    tagging_status: 'done', times_worn: 12, purchase_price: '890.00',
    purchase_date: '2023-05-20', created_at: '2023-05-20T10:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'item-3', name: 'Structured Blazer', category: 'Tailoring', primary_color: '#2c3e50',
    formality_level: 4, seasons: [{ id: 1, name: 'SS' }], brand: 'Toteme',
    image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80',
    tagging_status: 'done', times_worn: 8, purchase_price: '1100.00',
    purchase_date: '2023-10-01', created_at: '2023-10-01T10:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'item-4', name: 'Silk Drape Blouse', category: 'Tops', primary_color: '#f5f0e8',
    formality_level: 3, seasons: [{ id: 2, name: 'SS' }], brand: 'The Row',
    image_url: 'https://images.unsplash.com/photo-1604575408548-8c3a4afe3f07?w=400&q=80',
    tagging_status: 'done', times_worn: 15, purchase_price: '750.00',
    purchase_date: '2023-06-10', created_at: '2023-06-10T10:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'item-5', name: 'Classic Penny Loafer', category: 'Footwear', primary_color: '#6b3a2a',
    formality_level: 3, seasons: [{ id: 3, name: 'Core' }], brand: 'G.H. Bass',
    image_url: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400&q=80',
    tagging_status: 'done', times_worn: 30, purchase_price: '320.00',
    purchase_date: '2022-11-01', created_at: '2022-11-01T10:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  },
];

export const demoOccasions: Occasion[] = [
  { id: 'occ-1', name: 'Gala Dinner', formalityLevel: 5 },
  { id: 'occ-2', name: 'Gallery Opening', formalityLevel: 4 },
  { id: 'occ-3', name: 'Business Meeting', formalityLevel: 3 },
  { id: 'occ-4', name: 'Weekend Brunch', formalityLevel: 2 },
];

export const demoShares: OutfitShare[] = [
  {
    id: 'share-1', user: 'user-1', user_email: 'elara@example.com', outfit_id: 'outfit-1',
    caption: 'Testing out the new Toteme trench. The drape is incredible, though considering tailoring the sleeves slightly. Layered over vintage silk.',
    visibility: 'public', shared_at: '2024-01-15T08:00:00Z',
    vote_count: 24, comment_count: 8,
    vote_breakdown: { upvotes: 24, downvotes: 0 },
    comments: [], created_at: '2024-01-15T08:00:00Z', updated_at: '2024-01-15T08:00:00Z',
  },
];

export const demoTrips: Trip[] = [
  {
    id: 'trip-1', name: 'Paris Fashion Week', destination: 'Paris, France',
    start_date: '2024-09-24', end_date: '2024-10-02',
    description: 'Showroom visits, presentations, and editorial shoots.',
    trip_events: [
      { id: 'ev-1', trip: 'trip-1', name: 'Sep 24: Arrival & Settling In', date: '2024-09-24', formality_required: 2, location: 'Hotel Lutetia', notes: 'Check-in at Hotel Lutetia. Light afternoon exploring Saint-Germain-des-Prés.' },
      { id: 'ev-2', trip: 'trip-1', name: 'Sep 25: Showroom Visits', date: '2024-09-25', formality_required: 4, location: 'Le Marais', notes: 'Morning appointments in Le Marais. Evening dinner at Loulou.' },
    ],
    packing_lists: [],
    created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  },
];

export const demoAnalytics: AnalyticsOverview = {
  wear_frequency: [
    { week: 'Mon', count: 3 }, { week: 'Tue', count: 5 }, { week: 'Wed', count: 8 },
    { week: 'Thu', count: 2 }, { week: 'Fri', count: 6 },
  ],
  category_breakdown: [
    { category: 'Outerwear', count: 42 }, { category: 'Tops', count: 38 },
    { category: 'Bottoms', count: 31 }, { category: 'Footwear', count: 18 }, { category: 'Accessories', count: 13 },
  ],
  color_distribution: [
    { color: 'Neutral', count: 48 }, { color: 'Black', count: 35 },
    { color: 'Camel', count: 22 }, { color: 'Navy', count: 18 }, { color: 'Burgundy', count: 12 },
  ],
  cost_per_wear: [
    { item_id: 'item-1', name: 'Camel Cashmere Coat', purchase_price: '1250.00', times_worn: 24, cost_per_wear: 52.08 },
    { item_id: 'item-2', name: 'Silk Midi Skirt', purchase_price: '890.00', times_worn: 12, cost_per_wear: 74.17 },
    { item_id: 'item-5', name: 'Classic Penny Loafer', purchase_price: '320.00', times_worn: 30, cost_per_wear: 10.67 },
  ],
};

export const demoSuggestions: StyleAdvisorSuggestion[] = [
  {
    id: 'sugg-1', user: 'user-1', occasion_description: 'Formal editorial dinner',
    item_description: 'Black Leather Chelsea Boots',
    reason: 'A sleek black leather boot would anchor your current neutral palette and elevate any dinner look. The contrast with camel tones is a classic editorial choice.',
    priority: 'high', created_at: '2024-01-15T00:00:00Z', updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'sugg-2', user: 'user-1', occasion_description: 'Gallery opening',
    item_description: 'Minimalist Silver Watch',
    reason: 'A thin, architectural silver timepiece completes a gallery-ready look. It acts as jewellery without competing with statement pieces.',
    priority: 'medium', created_at: '2024-01-15T00:00:00Z', updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'sugg-3', user: 'user-1', occasion_description: 'Autumn editorial',
    item_description: 'Structured Leather Tote',
    reason: 'Your wardrobe lacks a signature structured bag. A caramel or cognac leather tote in a large format would serve both utility and aesthetic.',
    priority: 'high', created_at: '2024-01-15T00:00:00Z', updated_at: '2024-01-15T00:00:00Z',
  },
];
