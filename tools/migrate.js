// Creates the Neon tables. Usage: DATABASE_URL=... node tools/migrate.js
const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");
(async () => {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is missing"); process.exit(1); }
  const sql = neon(process.env.DATABASE_URL);
  const text = fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8")
    .split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  for (const stmt of text.split(";").map((s) => s.trim()).filter(Boolean)) {
    await sql.query(stmt);
  }
  console.log("Neon tables ready: crypto_orders, fx_rates");
})().catch((e) => { console.error("Migration failed:", e.message); process.exit(1); });
