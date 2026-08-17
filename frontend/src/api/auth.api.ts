import { requestBackend, storeSession } from './client';
import type { AuthSession, UserProfile } from '../lib/types';

type LoginResponsePayload = {
  access: string;
  refresh: string;
  user: UserProfile;
};

type RegisterResponsePayload = {
  user: UserProfile;
  tokens?: {
    access: string;
    refresh: string;
  };
  access?: string;
  refresh?: string;
};

export async function login(usernameOrEmail: string, password: string): Promise<AuthSession> {
  const payload = await requestBackend<LoginResponsePayload>('/auth/login/', {
    method: 'POST',
    body: {
      username: usernameOrEmail,
      password,
    },
  });

  const session: AuthSession = {
    accessToken: payload.access,
    refreshToken: payload.refresh,
    user: payload.user,
  };

  storeSession(session);
  return session;
}

export async function register(email: string, password: string, username?: string): Promise<AuthSession> {
  const payload = await requestBackend<RegisterResponsePayload>('/auth/register/', {
    method: 'POST',
    body: {
      email,
      username: username || email.split('@')[0],
      password,
      password_confirm: password,
    },
  });

  const accessToken = payload.tokens?.access || payload.access || '';
  const refreshToken = payload.tokens?.refresh || payload.refresh || '';

  const session: AuthSession = {
    accessToken,
    refreshToken,
    user: payload.user,
  };

  storeSession(session);
  return session;
}

export async function logout(accessToken: string, refreshToken: string): Promise<void> {
  await requestBackend('/auth/logout/', {
    method: 'POST',
    token: accessToken,
    body: {
      refresh: refreshToken,
    },
  });
}

export async function fetchProfile(token: string): Promise<UserProfile> {
  return requestBackend<UserProfile>('/auth/profile/', {
    method: 'GET',
    token,
  });
}
