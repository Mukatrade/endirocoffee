// Neon Postgres (free tier) for crypto orders. Long-term memory for every crypto payment.
let _sql = null;
function sql() {
  if (!process.env.DATABASE_URL) return null;
  if (!_sql) {
    const { neon } = require("@neondatabase/serverless");
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}
module.exports = { sql };
