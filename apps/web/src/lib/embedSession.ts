import { appEnv } from "./env";

export type EmbedSession = {
  authenticated: boolean;
  mode: "disabled" | "jwt";
  orgId: string | null;
  email: string | null;
  name: string | null;
  role: string | null;
  macs: string[];
  expiresAt: string | null;
};

export type EmbedSessionState =
  | { status: "loading"; token: string | null; session: null; error: null }
  | { status: "ready"; token: string | null; session: EmbedSession; error: null }
  | { status: "error"; token: string | null; session: null; error: string };

export const EMBED_TOKEN_STORAGE_KEY = "grizcam.embedToken";

const hasBrowserWindow = () => typeof window !== "undefined";

const getSessionStorage = () => {
  if (!hasBrowserWindow()) {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const isEmbedRoute = (pathname: string): boolean => pathname === "/embed" || pathname.startsWith("/embed/");

export const readEmbedTokenFromUrl = (search: string): string | null => {
  try {
    return new URLSearchParams(search).get("token");
  } catch {
    return null;
  }
};

export const consumeEmbedTokenFromUrl = (): string | null => {
  if (!hasBrowserWindow()) {
    return null;
  }

  const token = readEmbedTokenFromUrl(window.location.search);
  if (!token) {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  params.delete("token");
  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
  window.history.replaceState(window.history.state, document.title, nextUrl);

  return token;
};

export const getStoredEmbedToken = (): string | null => {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(EMBED_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const storeEmbedToken = (token: string): void => {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(EMBED_TOKEN_STORAGE_KEY, token);
  } catch {
    // Session continuity is best-effort when browser storage is unavailable.
  }
};

export const clearStoredEmbedToken = (): void => {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(EMBED_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures so auth error handling can continue.
  }
};

export const getEmbedTokenForRequest = (): string | null => {
  if (!hasBrowserWindow() || !isEmbedRoute(window.location.pathname)) {
    return null;
  }

  return getStoredEmbedToken();
};

const getPayloadString = (payload: unknown, key: "error" | "code") =>
  payload && typeof payload === "object" && key in payload && typeof (payload as Record<string, unknown>)[key] === "string"
    ? String((payload as Record<string, unknown>)[key])
    : null;

export const buildEmbedSessionErrorMessage = (payload: unknown, fallback: string) => {
  const message = getPayloadString(payload, "error") ?? fallback;
  const code = getPayloadString(payload, "code");
  return [message, code ? `Code: ${code}.` : null].filter(Boolean).join(" ");
};

export const fetchEmbedSession = async (token: string | null): Promise<EmbedSession> => {
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${appEnv.apiBaseUrl}/api/embed/session`, { headers });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredEmbedToken();
    }
    throw new Error(buildEmbedSessionErrorMessage(payload, `Embed session request failed: ${response.status}`));
  }

  return payload as EmbedSession;
};
