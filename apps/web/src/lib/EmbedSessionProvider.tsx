import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  consumeEmbedTokenFromUrl,
  fetchEmbedSession,
  getStoredEmbedToken,
  isEmbedRoute,
  storeEmbedToken,
  type EmbedSessionState
} from "./embedSession";

const initialState: EmbedSessionState = {
  status: "loading",
  token: null,
  session: null,
  error: null
};

const EmbedSessionContext = createContext<EmbedSessionState | null>(null);

const EmbedSessionShell = ({ title, detail }: { title: string; detail?: string | null }) => (
  <div className="embed-shell min-h-screen overflow-x-hidden bg-neutral-950 px-3 py-3 text-zinc-100">
    <div className="rounded-2xl border border-white/10 bg-neutral-900 px-4 py-8 text-center">
      <div className="text-sm font-medium text-white">{title}</div>
      {detail ? <div className="mt-2 text-sm text-zinc-400">{detail}</div> : null}
    </div>
  </div>
);

export const useEmbedSession = () => useContext(EmbedSessionContext);

export const EmbedSessionProvider = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const routeIsEmbedded = isEmbedRoute(location.pathname);
  const requestKey = `${location.pathname}${location.search}`;
  const loadedKey = useRef<string | null>(null);
  const [state, setState] = useState<EmbedSessionState>(() => {
    if (!routeIsEmbedded) {
      return {
        status: "ready",
        token: null,
        session: {
          authenticated: false,
          mode: "disabled",
          orgId: null,
          email: null,
          name: null,
          role: null,
          macs: [],
          expiresAt: null
        },
        error: null
      };
    }

    return initialState;
  });

  useEffect(() => {
    if (!routeIsEmbedded) {
      return;
    }

    let cancelled = false;
    const urlToken = consumeEmbedTokenFromUrl();
    const token = urlToken ?? getStoredEmbedToken();

    if (urlToken) {
      storeEmbedToken(urlToken);
    }

    const nextKey = `${location.pathname}|${token ?? ""}`;
    if (loadedKey.current === nextKey && state.status === "ready") {
      return;
    }

    loadedKey.current = nextKey;
    setState({ status: "loading", token, session: null, error: null });

    void fetchEmbedSession(token)
      .then((session) => {
        if (!cancelled) {
          setState({ status: "ready", token, session, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: "error",
            token,
            session: null,
            error: error instanceof Error ? error.message : "Embed session request failed."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, requestKey, routeIsEmbedded, state.status]);

  const contextValue = useMemo(() => state, [state]);

  if (!routeIsEmbedded) {
    return <>{children}</>;
  }

  if (state.status === "loading") {
    return (
      <EmbedSessionContext.Provider value={contextValue}>
        <EmbedSessionShell title="Loading portal analytics..." />
      </EmbedSessionContext.Provider>
    );
  }

  if (state.status === "error") {
    return (
      <EmbedSessionContext.Provider value={contextValue}>
        <EmbedSessionShell title="Analytics embed session could not be verified." detail={state.error} />
      </EmbedSessionContext.Provider>
    );
  }

  return <EmbedSessionContext.Provider value={contextValue}>{children}</EmbedSessionContext.Provider>;
};
