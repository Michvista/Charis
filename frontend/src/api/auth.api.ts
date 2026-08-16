import { requestBackend, storeSession, clearSession } from './client';
import type { AuthSession, UserProfile } from '../lib/types';

type LoginResponse = {
  access: string;
  refresh: string;
  user: UserProfile;
};

type RegisterResponse = {
  user: UserProfile;
  tokens: {
    access: string;
    refresh: string;
  };
};

export async function login(email: string, password: string): Promise<AuthSession> {
  const response = await requestBackend<LoginResponse>('/auth/login/', {
    method: 'POST',
    body: { email, password },
  });

  const session = {
    accessToken: response.access,
    refreshToken: response.refresh,
    user: response.user,
  };
  storeSession(session);
  return session;
}

export async function register(payload: {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  bio?: string;
  avatar_url?: string;
}): Promise<AuthSession> {
  const response = await requestBackend<RegisterResponse>('/auth/register/', {
    method: 'POST',
    body: payload,
  });

  const session = {
    accessToken: response.tokens.access,
    refreshToken: response.tokens.refresh,
    user: response.user,
  };
  storeSession(session);
  return session;
}

export async function fetchProfile(token: string) {
  return requestBackend<UserProfile>('/auth/profile/', { token });
}

export async function logout(token: string, refreshToken: string) {
  await requestBackend<{ message: string }>('/auth/logout/', {
    method: 'POST',
    token,
    body: { refresh: refreshToken },
  });
  clearSession();
}
