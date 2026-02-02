import { Pool } from "pg";

let websitePool: Pool | null = null;
let salesPool: Pool | null = null;
let attendancePool: Pool | null = null;

function mustGet(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function makePool(connectionString: string) {
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
}

// WEBSITE DB (approvals/users)
export function websiteDb() {
  if (!websitePool) websitePool = makePool(mustGet("WEBSITE_DATABASE_URL"));
  return websitePool;
}

// SALES DB (sales bot)
export function salesDb() {
  if (!salesPool) salesPool = makePool(mustGet("SALES_DATABASE_URL"));
  return salesPool;
}

// ATTENDANCE DB (attendance bot)
export function attendanceDb() {
  if (!attendancePool) attendancePool = makePool(mustGet("ATTENDANCE_DATABASE_URL"));
  return attendancePool;
}
