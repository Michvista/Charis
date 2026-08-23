// Use relative URL so Next.js proxy rewrites handle CORS transparently.
// next.config.ts rewrites /api/* → http://localhost:8000/api/*
const IS_SERVER = typeof window === 'undefined';
const BACKEND_URL = IS_SERVER
  ? (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000/api')
  : '/api';
const STYLING_URL = IS_SERVER
  ? (process.env.NEXT_PUBLIC_STYLING_URL ?? 'http://localhost:3300')
  : '/styling-api';

const TOKEN_KEY = 'charis.access_token';
const REFRESH_KEY = 'charis.refresh_token';
const USER_KEY = 'charis.user';

export type JsonPrimitive = string | number | boolean | null;

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type FetchOptions = Omit<RequestInit, 'body'> & {
  body?: Record<string, unknown> | FormData | string | null;
  token?: string | null;
};

function makeUrl(base: string, path: string) {
  const cleanBase = base.replace(/\/+$/, '');
  let cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!cleanPath.endsWith('/') && !cleanPath.includes('?') && !cleanPath.includes('.')) {
    cleanPath += '/';
  }
  return `${cleanBase}${cleanPath}`;
}

function friendlyMessage(status: number, message: string, payload: unknown): string {
  if (status === 401) {
    const obj = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;
    const text = `${obj.detail ?? obj.code ?? message}`.toLowerCase();
    const isLoginAttempt = /no active account|invalid password|credentials|password|register/i.test(text);
    // Only rewrite genuine token/session failures — leave login errors readable.
    if (!isLoginAttempt && /token|session|auth|expired|signature|jwt|bearer/i.test(text)) {
      return "Your session has expired. Please sign in again.";
    }
    return message;
  }
  if (status === 403) {
    return "You don't have permission to do that.";
  }
  if (status === 404) {
    return "We couldn't find what you were looking for.";
  }
  if (status === 429) {
    return "Too many requests — please try again in a moment.";
  }
  if (status >= 500) {
    return "Something went wrong on our end. Please try again.";
  }
  return message;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let message = response.statusText || 'Request failed';
    if (typeof payload === 'object' && payload !== null) {
      const obj = payload as Record<string, unknown>;
      if ('detail' in obj && typeof obj.detail === 'string') {
        message = obj.detail;
      } else if ('message' in obj && typeof obj.message === 'string') {
        message = obj.message;
      } else {
        const errors = Object.entries(obj)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        if (errors) message = errors;
      }
    } else if (typeof payload === 'string' && payload) {
      message = payload;
    }

    message = friendlyMessage(response.status, message, payload);

    if (response.status === 401 && typeof window !== 'undefined') {
      clearSession();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export async function requestBackend<T>(path: string, options: FetchOptions = {}) {
  const headers = new Headers(options.headers);
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (typeof options.body === 'string') {
    body = options.body;
    headers.set('Content-Type', 'application/json');
  } else if (options.body && typeof options.body === 'object') {
    body = JSON.stringify(options.body);
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(makeUrl(BACKEND_URL, path), {
    ...options,
    headers,
    body,
  });
  return parseResponse<T>(response);
}

export async function requestStyling<T>(path: string, options: FetchOptions = {}) {
  const headers = new Headers(options.headers);
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (typeof options.body === 'string') {
    body = options.body;
    headers.set('Content-Type', 'application/json');
  } else if (options.body && typeof options.body === 'object') {
    body = JSON.stringify(options.body);
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(makeUrl(STYLING_URL, path), {
    ...options,
    headers,
    body,
  });
  return parseResponse<T>(response);
}

export function getStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const accessToken = window.localStorage.getItem(TOKEN_KEY);
  const refreshToken = window.localStorage.getItem(REFRESH_KEY);
  const userRaw = window.localStorage.getItem(USER_KEY);

  if (!accessToken || !refreshToken || !userRaw) {
    return null;
  }

  try {
    return {
      accessToken,
      refreshToken,
      user: JSON.parse(userRaw),
    };
  } catch {
    return null;
  }
}

export function storeSession(session: { accessToken: string; refreshToken: string; user: unknown }) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(REFRESH_KEY, session.refreshToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
}
