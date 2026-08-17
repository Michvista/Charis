import { requestBackend } from './client';
import type { Friendship, OutfitShare } from '../lib/types';

export async function listSocialFeed(token: string): Promise<OutfitShare[]> {
  return requestBackend<OutfitShare[]>('/social/feed/', {
    method: 'GET',
    token,
  });
}

export async function createOutfitShare(token: string, data: { outfit_id: string; caption: string; visibility?: 'public' | 'friends' | 'link_only' }): Promise<OutfitShare> {
  return requestBackend<OutfitShare>('/social/shares/', {
    method: 'POST',
    token,
    body: data,
  });
}

export async function getOutfitShare(token: string, id: string): Promise<OutfitShare> {
  return requestBackend<OutfitShare>(`/social/shares/${id}/`, {
    method: 'GET',
    token,
  });
}

export async function voteOutfitShare(token: string, shareId: string, value: 1 | -1): Promise<{ vote_count: number; vote_breakdown: { upvotes: number; downvotes: number } }> {
  return requestBackend(`/social/shares/${shareId}/vote/`, {
    method: 'POST',
    token,
    body: { value },
  });
}

export async function commentOutfitShare(token: string, shareId: string, text: string): Promise<OutfitShare['comments'][number]> {
  return requestBackend(`/social/shares/${shareId}/comments/`, {
    method: 'POST',
    token,
    body: { text },
  });
}

export async function listFriendships(token: string): Promise<Friendship[]> {
  return requestBackend<Friendship[]>('/social/friends/', {
    method: 'GET',
    token,
  });
}
