const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
};

export const appEnv = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "",
  exportsEnabled:
    import.meta.env.VITE_DEMO_EXPORTS_ENABLED === "true" || import.meta.env.VITE_ENABLE_EVENT_EXPORTS === "true",
  demoLabel: import.meta.env.VITE_DEMO_LABEL ?? "Synthetic data demo",
  appTitle: import.meta.env.VITE_APP_TITLE ?? "GrizCam Demo",
  portalEmbed: {
    enabled: parseBoolean(import.meta.env.VITE_PORTAL_EMBED_MODE_ENABLED, false),
    parentOrigin: import.meta.env.VITE_PORTAL_PARENT_ORIGIN ?? "",
    brandLabel: import.meta.env.VITE_PORTAL_BRAND_LABEL ?? "GrizCam Portal",
    defaultRoute: import.meta.env.VITE_EMBED_DEFAULT_ROUTE ?? "/embed/overview"
  }
};
