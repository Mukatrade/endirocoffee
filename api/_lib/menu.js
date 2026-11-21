// Prices every crypto order again from data/menu.json. The browser never sets a price.
const fs = require("fs");
const path = require("path");
let index = null;

function walk(node, out) {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, out));
  if (!node || typeof node !== "object") return;
  const id = node.id || node.slug || node.sku;
  const price = Number(node.price ?? node.price_ugx ?? node.ugx);
  if (id && Number.isFinite(price) && price > 0) out.set(String(id), { name: node.name || node.title || String(id), price });
  Object.values(node).forEach((v) => typeof v === "object" && walk(v, out));
}

function loadMenu() {
  if (index) return index;
  const file = path.join(process.cwd(), "data", "menu.json");
  index = new Map();
  walk(JSON.parse(fs.readFileSync(file, "utf8")), index);
  return index;
}

// lines: [{ id, qty }] -> { lines: [{id,name,qty,price,total}], amountUgx }
function priceCart(lines) {
  const menu = loadMenu();
  if (!Array.isArray(lines) || !lines.length || lines.length > 50) throw new Error("Empty or too large cart");
  const out = [];
  let amountUgx = 0;
  for (const l of lines) {
    const item = menu.get(String(l && l.id));
    const qty = Math.floor(Number(l && l.qty));
    if (!item) throw new Error(`Unknown item: ${l && l.id}`);
    if (!(qty >= 1 && qty <= 50)) throw new Error(`Bad quantity for ${l.id}`);
    out.push({ id: String(l.id), name: item.name, qty, price: item.price, total: item.price * qty });
    amountUgx += item.price * qty;
  }
  return { lines: out, amountUgx };
}

module.exports = { priceCart, loadMenu, _reset: () => (index = null) };
