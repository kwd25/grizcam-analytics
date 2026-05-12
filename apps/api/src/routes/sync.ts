import { Router } from "express";
import { getSyncStatus } from "../integration/health.js";

type SyncRouterDependencies = {
  getStatus?: typeof getSyncStatus;
};

export const createSyncRouter = (dependencies: SyncRouterDependencies = {}) => {
  const syncRouter = Router();
  const getStatus = dependencies.getStatus ?? getSyncStatus;

  syncRouter.get("/status", async (_request, response) => {
    const status = await getStatus();
    response.status(status.ok ? 200 : 503).json(status);
  });

  return syncRouter;
};

export const syncRouter = createSyncRouter();
