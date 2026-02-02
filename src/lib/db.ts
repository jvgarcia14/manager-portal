import { Pool } from "pg";

let websitePool: Pool | null = null;
let salesPool: Pool | null = null;
let attendancePool: Pool | null = null;

function mustGet(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/**
 * WEBSITE DB (users / approvals)
 * env: WEBSITE_DATABASE_URL
 */
export function websiteDb() {
  if (!websitePool) {
    websitePool = new Pool({
      connectionString: mustGet("WEBSITE_DATABASE_URL"),
      ssl: { rejectUnauthorized: false },
    });
  }
  return websitePool;
}

/**
 * SALES DB (sales bot)
 * env: SALES_DATABASE_URL
 */
export function salesDb() {
  if (!salesPool) {
    salesPool = new Pool({
      connectionString: mustGet("SALES_DATABASE_URL"),
      ssl: { rejectUnauthorized: false },
    });
  }
  return salesPool;
}

/**
 * ATTENDANCE DB (attendance bot)
 * env: ATTENDANCE_DATABASE_URL
 */
export function attendanceDb() {
  if (!attendancePool) {
    attendancePool = new Pool({
      connectionString: mustGet("ATTENDANCE_DATABASE_URL"),
      ssl: { rejectUnauthorized: false },
    });
  }
  return attendancePool;
}
