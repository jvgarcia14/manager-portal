import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __dbPools: Record<string, Pool> | undefined;
}

function getPool(url: string, key: string) {
  if (!global.__dbPools) global.__dbPools = {};
  if (!global.__dbPools[key]) {
    global.__dbPools[key] = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return global.__dbPools[key];
}

export function appDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return getPool(url, "app");
}

export function salesDb() {
  const url = process.env.SALES_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("SALES_DATABASE_URL (or DATABASE_URL) not set");
  return getPool(url, "sales");
}

export function attendanceDb() {
  const url = process.env.ATTENDANCE_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("ATTENDANCE_DATABASE_URL (or DATABASE_URL) not set");
  return getPool(url, "attendance");
}
