// Neon Postgres (free tier) for crypto orders. Long-term memory for every crypto payment.
import { neon } from "@neondatabase/serverless";
let _sql = null;
export function sql() {
  if (!process.env.DATABASE_URL) return null;
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}
