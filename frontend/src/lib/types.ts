export type PageId =
  | 'wardrobe'
  | 'styling'
  | 'trips'
  | 'social'
  | 'analytics'
  | 'advisor';

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  bio?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AuthSession = {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
};

export type Season = {
  id: number;
  name: string;
};

export type WardrobeItem = {
  id: string;
  user?: string;
  name: string;
  category: string;
  primary_color: string;
  secondary_color?: string | null;
  fabric?: string | null;
  formality_level: number;
  seasons: Season[];
  brand?: string | null;
  image_url: string;
  tagging_status: 'pending' | 'done' | 'failed';
  times_worn: number;
  purchase_price?: string | null;
  purchase_date?: string | null;
  created_at: string;
  updated_at: string;
};

export type WearLog = {
  id: string;
  wardrobe_item: string;
  wardrobe_item_name?: string;
  outfit_id?: string | null;
  worn_date: string;
  created_at: string;
  outfit_analytics?: unknown;
};

export type TripEvent = {
  id: string;
  trip?: string;
  name: string;
  date: string;
  formality_required: number;
  location?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type PackingListItem = {
  id: string;
  wardrobe_item_id: string;
  wardrobe_item_name: string;
  wardrobe_item_category: string;
  covers_event_ids: string[];
  created_at: string;
  updated_at: string;
};

export type PackingList = {
  id: string;
  trip: string;
  items: PackingListItem[];
  created_at: string;
  updated_at: string;
};

export type Trip = {
  id: string;
  user?: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string;
  trip_events: TripEvent[];
  packing_lists: PackingList[];
  created_at: string;
  updated_at: string;
};

export type OutfitShare = {
  id: string;
  user: string;
  user_email?: string;
  outfit_id: string;
  caption: string;
  visibility: 'public' | 'friends' | 'link_only';
  shared_at: string;
  vote_count: number;
  comment_count: number;
  vote_breakdown: { upvotes: number; downvotes: number };
  comments: Array<{
    id: string;
    share: string;
    user: string;
    user_email?: string;
    text: string;
    created_at: string;
    updated_at: string;
  }>;
  created_at: string;
  updated_at: string;
};

export type Friendship = {
  id: string;
  requester: string;
  requester_email?: string;
  addressee: string;
  addressee_email?: string;
  status: 'pending' | 'accepted' | 'rejected';
  accepted_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type AnalyticsOverview = {
  wear_frequency: Array<{ week: string; count: number }>;
  category_breakdown: Array<{ category: string; count: number }>;
  color_distribution: Array<{ color: string; count: number }>;
  cost_per_wear: Array<{
    item_id: string;
    name: string;
    purchase_price: string;
    times_worn: number;
    cost_per_wear: number;
  }>;
};

export type StyleAdvisorSuggestion = {
  id: string;
  user: string;
  occasion_id?: string | null;
  occasion_description: string;
  item_description: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
};

export type Occasion = {
  id: string;
  name: string;
  formalityLevel: number;
};

export type StylingItem = {
  wardrobeItemId: string;
  itemRole: string;
  imageUrl?: string;
  colorHex?: string;
  formalityLevel?: number;
  seasonTags?: string[];
};

export type StylingCombo = {
  comboId?: string;
  items: Array<{
    id: string;
    category: string;
    colorHex: string;
    formalityLevel?: number;
    seasonTags?: string[];
    imageUrl?: string;
  }>;
  score: number;
  finalScore?: number;
  visualScore?: number;
  visualNotes?: string;
  confirmed?: boolean;
};

export type AiVerdict = {
  verdict: 'works' | 'doesnt_work' | 'partially_works';
  confidence: number;
  visualNotes: string;
  patternClash: boolean;
  colourClash: boolean;
};

export type VerdictResponse = {
  outfitId: string;
  status: 'processing' | 'done' | 'failed';
  score?: number;
  verdictText?: string;
  aiVerdict?: AiVerdict;
  rankedCombos?: StylingCombo[];
  items?: StylingItem[];
};
