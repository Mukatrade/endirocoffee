// Runs on every Vercel build (npm run build). Fails if the crypto provider name can reach a customer.
// The name is built at run time, so this file does not contain it.
import fs from "node:fs";
import path from "node:path";
const NAME = ["now", "pay", "ments"].join("");
const SKIP_DIRS = new Set([".git", "node_modules", "api", ".vercel"]);
const IGNORED = fs.existsSync(".vercelignore") ? fs.readFileSync(".vercelignore", "utf8").split("\n").map((s) => s.trim()).filter(Boolean) : [];
const ignored = (rel) => IGNORED.some((p) => p.startsWith("*.") ? rel.endsWith(p.slice(1)) : p.endsWith("*") ? rel.startsWith(p.slice(0, -1)) : rel === p || rel.startsWith(p + "/"));
const bad = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name), rel = path.relative(".", full);
    if (SKIP_DIRS.has(e.name) || ignored(rel)) continue;
    if (e.isDirectory()) { walk(full); continue; }
    if (/\.(png|jpe?g|webp|gif|ico|woff2?|ttf)$/i.test(e.name)) continue;
    if (fs.readFileSync(full, "utf8").toLowerCase().includes(NAME)) bad.push(rel);
  }
})(".");
// Server code may name it only in env names, the API host, the signature header and comments.
(function walkApi(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walkApi(full); continue; }
    fs.readFileSync(full, "utf8").split("\n").forEach((line, i) => {
      const l = line.toLowerCase();
      if (!l.includes(NAME)) return;
      const ok = /^\s*\/\//.test(line) || new RegExp(`process\\.env\\.${NAME}_|api(-sandbox)?\\.${NAME}\\.io|x-${NAME}-sig`, "i").test(line);
      if (!ok) bad.push(`${full}:${i + 1}`);
    });
  }
})("api");
for (const p of ["*.md", "*.sh", "db", ".env*"]) if (!IGNORED.includes(p)) bad.push(`.vercelignore must list ${p}`);
if (bad.length) { console.error("Brand check FAILED. The provider name can reach a customer here:\n" + bad.join("\n")); process.exit(1); }
console.log("Brand check OK: the provider name is not shown anywhere.");
