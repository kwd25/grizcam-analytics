import { Router } from "express";
import { appConfig } from "../config.js";
import { pool } from "../db.js";
import { resolveAnalyticsScope } from "../embed/analyticsScope.js";
import {
  getComposition,
  getDailyActivity,
  getDaySummary,
  getDevices,
  getEvents,
  getEventsCsv,
  getFilterOptions,
  getHourlyHeatmap,
  getKpis,
  getOverview,
  getMonthlyActivityByCategory,
  getSubjectByCamera,
  getAnalyticsLab,
  getTimeOfDayComposition
} from "../queries/dashboard.js";
import { withDashboardDiagnostics } from "./diagnostics.js";
import { parseEventQuery, parseFilters } from "../utils/requests.js";

export const dashboardRouter = Router();

dashboardRouter.get("/health", async (_request, response) => {
  try {
    await pool.query("select 1");
    response.json({
      ok: true,
      database: "ok",
      environment: appConfig.environment,
      databaseConnectionSource: appConfig.databaseConnectionSource,
      databaseEnvPresence: appConfig.databaseEnvPresence
    });
  } catch {
    response.status(503).json({
      ok: false,
      database: "unavailable",
      environment: appConfig.environment,
      databaseConnectionSource: appConfig.databaseConnectionSource,
      databaseEnvPresence: appConfig.databaseEnvPresence
    });
  }
});

dashboardRouter.get("/devices", async (request, response) => {
  const scope = await resolveAnalyticsScope(request, response);
  if (!scope) {
    return;
  }

  response.json(await getDevices(scope));
});

dashboardRouter.get("/filters/options", async (request, response) => {
  const scope = await resolveAnalyticsScope(request, response);
  if (!scope) {
    return;
  }

  await withDashboardDiagnostics(request, response, "filters/options", () => getFilterOptions(scope), (result) => ({
    cameras: result.cameras.length,
    macs: result.macs.length,
    categories: result.subjectCategories.length,
    classes: result.subjectClasses.length,
    luxMin: result.ranges.lux.min,
    luxMax: result.ranges.lux.max
  }));
});

dashboardRouter.get("/kpis", async (request, response) => {
  const scope = await resolveAnalyticsScope(request, response);
  if (!scope) {
    return;
  }

  response.json(await getKpis(parseFilters(request.query as Record<string, unknown>), scope));
});

dashboardRouter.get("/charts/daily-activity", async (request, response) => {
  const scope = await resolveAnalyticsScope(request, response);
  if (!scope) {
    return;
  }

  response.json(await getDailyActivity(parseFilters(request.query as Record<string, unknown>), scope));
});

dashboardRouter.get("/charts/hourly-heatmap", async (request, response) => {
  const scope = await resolveAnalyticsScope(request, response);
  if (!scope) {
    return;
  }

  response.json(await getHourlyHeatmap(parseFilters(request.query as Record<string, unknown>), scope));
});

dashboardRouter.get("/charts/time-of-day-composition", async (request, response) => {
  const scope = await resolveAnalyticsScope(request, response);
  if (!scope) {
    return;
  }

  response.json(await getTimeOfDayComposition(parseFilters(request.query as Record<string, unknown>), scope));
});

dashboardRouter.get("/charts/subject-by-camera", async (request, response) => {
  const scope = await resolveAnalyticsScope(request, response);
  if (!scope) {
    return;
  }

  response.json(await getSubjectByCamera(parseFilters(request.query as Record<string, unknown>), scope));
});

dashboardRouter.get("/charts/monthly-activity-by-category", async (request, response) => {
  const scope = await resolveAnalyticsScope(request, response);
  if (!scope) {
    return;
  }

  response.json(await getMonthlyActivityByCategory(parseFilters(request.query as Record<string, unknown>), scope));
});

dashboardRouter.get("/charts/composition", async (request, response) => {
  const scope = await resolveAnalyticsScope(request, response);
  if (!scope) {
    return;
  }

  response.json(await getComposition(parseFilters(request.query as Record<string, unknown>), scope));
});

dashboardRouter.get("/overview", async (request, response) => {
  const scope = await resolveAnalyticsScope(request, response);
  if (!scope) {
    return;
  }

  await withDashboardDiagnostics(
    request,
    response,
    "overview",
    () => getOverview(parseFilters(request.query as Record<string, unknown>), scope),
    (result) => ({
      totalEvents: result.kpis.totalEvents,
      activeCameras: result.kpis.activeCameras,
      categoryDistribution: result.categoryDistribution.length,
      hourlyActivity: result.hourlyActivity.length,
      notableEvents: result.notableEvents.length
    })
  );
});

dashboardRouter.get("/analytics-lab", async (request, response) => {
  const scope = await resolveAnalyticsScope(request, response);
  if (!scope) {
    return;
  }

  response.json(await getAnalyticsLab(parseFilters(request.query as Record<string, unknown>), scope));
});

dashboardRouter.get("/day/:date/summary", async (request, response) => {
  const scope = await resolveAnalyticsScope(request, response);
  if (!scope) {
    return;
  }

  response.json(await getDaySummary(request.params.date, parseFilters(request.query as Record<string, unknown>), scope));
});

dashboardRouter.get("/events", async (request, response) => {
  const scope = await resolveAnalyticsScope(request, response);
  if (!scope) {
    return;
  }

  response.json(await getEvents(parseEventQuery(request.query as Record<string, unknown>), scope));
});

dashboardRouter.get("/events/export", async (request, response) => {
  if (!appConfig.exportsEnabled) {
    response.status(404).json({ error: "Export is disabled for this demo deployment" });
    return;
  }

  const scope = await resolveAnalyticsScope(request, response);
  if (!scope) {
    return;
  }

  const csv = await getEventsCsv(parseEventQuery(request.query as Record<string, unknown>), scope);
  response.setHeader("content-type", "text/csv; charset=utf-8");
  response.setHeader("content-disposition", 'attachment; filename="grizcam-events.csv"');
  response.send(csv);
});
