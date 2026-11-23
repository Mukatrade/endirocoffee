// Vercel build step (npm run build). Copies the public site into public/, then runs the brand check
// on exactly what will be served. Fails the deploy if the crypto provider name can reach a customer.
// The name is built at run time, so this file does not contain it.
import fs from "node:fs";
import path from "node:path";

const OUT = "public";
const SKIP = new Set(["public", "api", "tools", "db", "node_modules", ".git", ".vercel", ".github",
  "package.json", "package-lock.json", "vercel.json", ".vercelignore", ".gitignore"]);
const skipFile = (n) => SKIP.has(n) || n.startsWith(".env") || /\.(md|sh|py|sql)$/i.test(n);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const e of fs.readdirSync(".", { withFileTypes: true })) {
  if (skipFile(e.name)) continue;
  fs.cpSync(e.name, path.join(OUT, e.name), { recursive: true });
}

const NAME = ["now", "pay", "ments"].join("");
const bad = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (/\.(png|jpe?g|webp|gif|ico|woff2?|ttf|otf)$/i.test(e.name)) continue;
    if (fs.readFileSync(full, "utf8").toLowerCase().includes(NAME)) bad.push(full);
  }
})(OUT);
// Server code may name it only in env names, the API host, the signature header and comments.
(function walkApi(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walkApi(full); continue; }
    fs.readFileSync(full, "utf8").split("\n").forEach((line, i) => {
      if (!line.toLowerCase().includes(NAME)) return;
      const ok = /^\s*\/\//.test(line) || new RegExp(`process\\.env\\.${NAME}_|api(-sandbox)?\\.${NAME}\\.io|x-${NAME}-sig`, "i").test(line);
      if (!ok) bad.push(`${full}:${i + 1}`);
    });
  }
})("api");
if (bad.length) { console.error("Brand check FAILED. The provider name can reach a customer here:\n" + bad.join("\n")); process.exit(1); }
const n = fs.readdirSync(OUT).length;
console.log(`public/ ready (${n} entries). Brand check OK: the provider name is not shown anywhere.`);
