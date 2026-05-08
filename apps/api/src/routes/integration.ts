import { Router } from "express";
import { getIntegrationHealth } from "../integration/health.js";

type IntegrationRouterDependencies = {
  getHealth?: typeof getIntegrationHealth;
};

export const createIntegrationRouter = (dependencies: IntegrationRouterDependencies = {}) => {
  const integrationRouter = Router();
  const getHealth = dependencies.getHealth ?? getIntegrationHealth;

  integrationRouter.get("/health", async (_request, response) => {
    const health = await getHealth();
    response.status(health.ok ? 200 : 503).json(health);
  });

  return integrationRouter;
};

export const integrationRouter = createIntegrationRouter();
