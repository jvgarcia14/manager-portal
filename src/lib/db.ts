// src/lib/db.ts
import { Pool } from "pg";

function makePool(url: string | undefined, name: string) {
  if (!url) throw new Error(`${name} missing in env`);
  return new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
}

// cache pools in dev to avoid hot-reload creating too many connections
const g = globalThis as unknown as {
  __salesPool?: Pool;
  __attendancePool?: Pool;
  __websitePool?: Pool;
};

export function salesDb() {
  if (!g.__salesPool) g.__salesPool = makePool(process.env.SALES_DATABASE_URL, "SALES_DATABASE_URL");
  return g.__salesPool;
}

export function attendanceDb() {
  if (!g.__attendancePool) g.__attendancePool = makePool(process.env.ATTENDANCE_DATABASE_URL, "ATTENDANCE_DATABASE_URL");
  return g.__attendancePool;
}

export function websiteDb() {
  // ✅ IMPORTANT: set WEBSITE_DATABASE_URL to Postgres-ObVD
  if (!g.__websitePool) {
    g.__websitePool = makePool(
      process.env.WEBSITE_DATABASE_URL || process.env.DATABASE_URL,
      "WEBSITE_DATABASE_URL/DATABASE_URL"
    );
  }
  return g.__websitePool;
}
