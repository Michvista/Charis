import { requestBackend } from './client';
import type { Friendship, OutfitShare } from '../lib/types';

export async function listSocialFeed(token: string) {
  const response = await requestBackend<OutfitShare[] | { results?: OutfitShare[] }>('/social/feed/', { token });
  return Array.isArray(response) ? response : response.results ?? [];
}

export async function listShares(token: string) {
  const response = await requestBackend<OutfitShare[] | { results?: OutfitShare[] }>('/social/shares/', { token });
  return Array.isArray(response) ? response : response.results ?? [];
}

export async function createShare(
  token: string,
  payload: { outfit_id: string; caption: string; visibility: 'public' | 'friends' | 'link_only' },
) {
  return requestBackend<OutfitShare>('/social/shares/', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function addComment(token: string, shareId: string, text: string) {
  return requestBackend(`/social/shares/${shareId}/comments/`, {
    method: 'POST',
    token,
    body: { text },
  });
}

export async function addVote(token: string, shareId: string, value: 1 | -1) {
  return requestBackend(`/social/shares/${shareId}/vote/`, {
    method: 'POST',
    token,
    body: { value },
  });
}

export async function listFriendships(token: string) {
  const response = await requestBackend<Friendship[] | { results?: Friendship[] }>('/social/friendships/', { token });
  return Array.isArray(response) ? response : response.results ?? [];
}

export async function createFriendship(token: string, friendUserId: string) {
  return requestBackend<Friendship>('/social/friendships/', {
    method: 'POST',
    token,
    body: { friend_user_id: friendUserId },
  });
}

export async function acceptFriendship(token: string, friendshipId: string) {
  return requestBackend<Friendship>(`/social/friendships/${friendshipId}/accept/`, {
    method: 'POST',
    token,
  });
}
