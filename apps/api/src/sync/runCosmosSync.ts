import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PortalEventRecord } from "./portalTypes.js";
import { transformPortalEvent } from "./transformPortalEvent.js";
import { upsertAnalyticsEvents } from "./upsertEvents.js";

type CliOptions = {
  dryRun: boolean;
  fixture: boolean;
  file: string | null;
  limit: number | null;
  write: boolean;
  liveRequested: boolean;
};

const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures", "portal-events.sample.json");

const parseArgs = (args: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    fixture: false,
    file: null,
    limit: null,
    write: false,
    liveRequested: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--fixture") {
      options.fixture = true;
    } else if (arg === "--write") {
      options.write = true;
      options.dryRun = false;
    } else if (arg === "--file") {
      options.file = args[index + 1] ?? null;
      index += 1;
    } else if (arg === "--limit") {
      const parsed = Number(args[index + 1]);
      options.limit = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
      index += 1;
    } else if (arg.startsWith("--cosmos") || arg === "--live") {
      options.liveRequested = true;
    }
  }

  if (!options.fixture && !options.file) {
    options.fixture = true;
  }

  return options;
};

const loadEvents = async (options: CliOptions): Promise<PortalEventRecord[]> => {
  const inputPath = options.file ? resolve(process.cwd(), options.file) : fixturePath;
  const contents = await readFile(inputPath, "utf8");
  const parsed: unknown = JSON.parse(contents);
  const events = Array.isArray(parsed) ? parsed : (parsed as { events?: unknown }).events;

  if (!Array.isArray(events)) {
    throw new Error("Sync input must be a JSON array or an object with an events array.");
  }

  const records = events.filter((event): event is PortalEventRecord => typeof event === "object" && event !== null && !Array.isArray(event));
  return options.limit === null ? records : records.slice(0, options.limit);
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));

  if (options.liveRequested || (!options.fixture && !options.file)) {
    console.error("Live Cosmos ingestion is not implemented in this scaffold. Use --fixture or --file with --dry-run or --write.");
    process.exitCode = 1;
    return;
  }

  if (process.env.COSMOS_ENDPOINT || process.env.COSMOS_KEY) {
    console.warn("COSMOS_* env vars are present, but this scaffold does not connect to live Cosmos yet.");
  }

  const events = await loadEvents(options);
  const results = events.map((event) => transformPortalEvent(event));
  const rows = results.flatMap((result) => (result.ok ? [result.row] : []));
  const skipped = results.filter((result) => !result.ok);
  const warningCount = results.reduce((count, result) => count + result.warnings.length, 0);

  console.log("Portal sync scaffold summary");
  console.log(`mode: ${options.write ? "write" : "dry-run"}`);
  console.log(`total input: ${events.length}`);
  console.log(`transformed count: ${rows.length}`);
  console.log(`skipped count: ${skipped.length}`);
  console.log(`warning count: ${warningCount}`);
  console.log(`sample transformed ids: ${rows.slice(0, 5).map((row) => row.id).join(", ") || "(none)"}`);

  if (skipped.length > 0) {
    console.log(`skipped reasons: ${skipped.map((result) => ("reason" in result ? result.reason : "")).filter(Boolean).join("; ")}`);
  }

  if (!options.write) {
    console.log("dry-run complete: no database writes performed");
    return;
  }

  const { pool } = await import("../db.js");
  const result = await upsertAnalyticsEvents(pool, rows);
  console.log(`upserted row count: ${result.rowCount}`);
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown sync error";
  console.error(`Portal sync scaffold failed: ${message}`);
  process.exitCode = 1;
});
