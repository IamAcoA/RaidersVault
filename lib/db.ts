import postgres from "postgres";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
let client: ReturnType<typeof postgres> | null = null;
let readyPromise: Promise<boolean> | null = null;

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!client) {
    client = postgres(process.env.DATABASE_URL, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false
    });
  }
  return client;
}

export async function ensureDatabaseReady(): Promise<boolean> {
  if (!databaseConfigured()) return false;
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    try {
      const sql = db();
      const check = await sql`select to_regclass('public.entities')::text as entities`;
      if (!check[0]?.entities) {
        console.log("[db] schema not found; running migration");
        const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/migrate-db.mjs"], {
          cwd: process.cwd(),
          env: process.env,
          timeout: 30000
        });
        if (stdout.trim()) console.log(stdout.trim());
        if (stderr.trim()) console.warn(stderr.trim());
      }
      console.log("[db] database ready");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[db] initialization failed:", message);
      readyPromise = null;
      return false;
    }
  })();

  return readyPromise;
}

export async function databaseHealthy(): Promise<boolean> {
  if (!(await ensureDatabaseReady())) return false;
  try {
    const sql = db();
    await sql`select 1 as ok`;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[db] health check failed:", message);
    return false;
  }
}
