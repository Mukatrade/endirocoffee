/* Menu and order page. Pickup uses the café menu, delivery uses the delivery menu (Glovo prices).
   The order is kept in localStorage (EndiroStore) and read by checkout.html. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var num = function (n) { return Number(n).toLocaleString("en-US"); };
  var ugx = function (n) { return "UGX " + num(n); };
  var MENU = null, BR = [], index = {};
  var saved = window.EndiroStore.read() || {};
  var st = { mode: saved.mode || "pickup", branch: saved.branch || "kisimenti", time: saved.time || "As soon as possible", group: "drinks",
    carts: saved.carts || { pickup: {}, delivery: {} } };
  var qp = new URLSearchParams(location.search).get("cafe"); if (qp) st.branch = qp;

  function save() {
    var cur = BR.filter(function (b) { return b.id === st.branch; })[0] || {};
    var cart = st.carts[st.mode], lines = Object.keys(cart).filter(function (k) { return index[k]; }).map(function (k) {
      return { key: k, name: index[k].name, price: index[k].price, qty: cart[k] };
    });
    window.EndiroStore.write({ mode: st.mode, branch: st.branch, branchName: cur.name, time: st.time, carts: st.carts, cart: cart, lines: lines,
      subtotal: lines.reduce(function (a, l) { return a + l.price * l.qty; }, 0) });
    window.EndiroCount && window.EndiroCount();
  }
  function setQty(k, q) { var c = st.carts[st.mode]; if (q <= 0) delete c[k]; else c[k] = q; save(); render(); }

  function renderSections() {
    var menu = st.mode === "pickup" ? MENU.cafe : MENU.delivery, cart = st.carts[st.mode];
    var html = (menu[st.group] || []).map(function (s) {
      var items = s.items.map(function (it) {
        var n = it.v.reduce(function (a, v) { return a + (cart[v.k] || 0); }, 0);
        var btns = it.v.length ? it.v.map(function (v) {
          var nm = it.name + (v.label ? ", " + v.label : "");
          return '<button class="add" type="button" data-add="' + esc(v.k) + '" aria-label="Add ' + esc(nm) + ", " + num(v.price) + ' shillings">' + (v.label ? esc(v.label) + " " : "") + num(v.price) + " +</button>";
        }).join("") : '<span class="small muted">Ask in the café</span>';
        return '<div class="mrow" style="align-items:center"><div><div class="row" style="gap:10px"><b>' + esc(it.name) + "</b>" + (n ? '<span class="badge">' + n + " in your order</span>" : "") +
          '</div><div class="muted small">' + esc(it.desc) + '</div><div class="tag">' + esc(it.tags) + '</div><div class="small muted">' + esc(it.addon) + '</div></div><div class="row" style="justify-content:flex-end;gap:8px">' + btns + "</div></div>";
      }).join("");
      return '<section style="margin-top:40px"><div class="paper-head"><h2 style="font-size:26px;color:var(--teal)">' + esc(s.name) + '</h2><span class="small muted">UGX</span></div>' +
        (s.note ? '<p class="small muted" style="margin-top:10px">' + esc(s.note) + "</p>" : "") + items + "</section>";
    }).join("");
    $("[data-sections]").innerHTML = html;
  }
  function renderCart() {
    var cart = st.carts[st.mode], keys = Object.keys(cart).filter(function (k) { return index[k]; });
    var cur = BR.filter(function (b) { return b.id === st.branch; })[0] || BR[0];
    var sub = keys.reduce(function (a, k) { return a + index[k].price * cart[k]; }, 0);
    $("[data-lines]").innerHTML = keys.length ? keys.map(function (k) {
      var it = index[k];
      return '<div class="cline"><div><div style="font-weight:500">' + esc(it.name) + '</div><div class="small muted">' + ugx(it.price) + ' each</div></div><b style="font-family:var(--font-display);white-space:nowrap">' + ugx(it.price * cart[k]) +
        '</b><div class="row" style="gap:10px"><button class="qty" type="button" data-minus="' + esc(k) + '" aria-label="One less ' + esc(it.name) + '">−</button><span aria-live="polite">' + cart[k] + '</span><button class="qty" type="button" data-plus="' + esc(k) + '" aria-label="One more ' + esc(it.name) + '">+</button></div></div>';
    }).join("") : '<p class="small muted" style="background:var(--white);padding:16px;border-radius:var(--radius-input)">Nothing here yet. Add something from the menu.</p>';
    $("[data-sub]").textContent = ugx(sub);
    $("[data-total]").textContent = st.mode === "pickup" ? ugx(sub) : ugx(sub) + " + delivery";
    $("[data-del-l]").hidden = $("[data-del-v]").hidden = st.mode === "pickup";
    $("[data-summary]").textContent = st.mode === "pickup" ? "Pickup at " + cur.name + ". " + st.time + "." : "Delivery from " + cur.name + ".";
    var go = $("[data-go]");
    if (keys.length) { go.removeAttribute("aria-disabled"); go.href = "checkout.html"; } else { go.setAttribute("aria-disabled", "true"); go.removeAttribute("href"); }
  }
  function renderTop() {
    var cur = BR.filter(function (b) { return b.id === st.branch; })[0] || BR[0];
    document.querySelectorAll("[data-mode]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-mode") === st.mode ? "true" : "false"); });
    document.querySelectorAll("[data-group]").forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-group") === st.group ? "true" : "false"); });
    document.querySelectorAll("[data-time]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-time") === st.time ? "true" : "false"); });
    $("[data-cafe-label]").textContent = st.mode === "pickup" ? "Pick up at" : "Delivered from";
    $("[data-times]").hidden = st.mode !== "pickup";
    $("[data-delivery-note]").hidden = st.mode === "pickup";
    $("[data-branch]").value = cur.id; $("[data-hours]").textContent = cur.hours; $("[data-address]").textContent = cur.address;
  }
  function render() { renderTop(); renderSections(); renderCart(); }

  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("button"); if (!t) return;
    if (t.hasAttribute("data-add")) { var k = t.getAttribute("data-add"); setQty(k, (st.carts[st.mode][k] || 0) + 1); var b = document.querySelector('[data-add="' + k + '"]'); if (b) b.focus(); }
    else if (t.hasAttribute("data-minus")) { var m = t.getAttribute("data-minus"); setQty(m, st.carts[st.mode][m] - 1); }
    else if (t.hasAttribute("data-plus")) { var p = t.getAttribute("data-plus"); setQty(p, st.carts[st.mode][p] + 1); }
    else if (t.hasAttribute("data-mode")) { st.mode = t.getAttribute("data-mode"); save(); render(); }
    else if (t.hasAttribute("data-group")) { st.group = t.getAttribute("data-group"); render(); }
    else if (t.hasAttribute("data-time")) { st.time = t.getAttribute("data-time"); save(); render(); }
  });
  $("[data-branch]").addEventListener("change", function (ev) { st.branch = ev.target.value; save(); render(); });

  Promise.all([fetch("data/menu.json").then(function (r) { return r.json(); }), fetch("data/branches.json").then(function (r) { return r.json(); })]).then(function (res) {
    MENU = res[0]; BR = res[1];
    ["cafe", "delivery"].forEach(function (m) { Object.keys(MENU[m]).forEach(function (g) { MENU[m][g].forEach(function (s) { s.items.forEach(function (it) { it.v.forEach(function (v) {
      index[v.k] = { name: it.name + (v.label ? ", " + v.label : ""), price: v.price };
    }); }); }); }); });
    $("[data-branch]").innerHTML = BR.map(function (b) { return '<option value="' + esc(b.id) + '">' + esc(b.name) + "</option>"; }).join("");
    if (!BR.some(function (b) { return b.id === st.branch; })) st.branch = BR[0].id;
    save(); render();
  }).catch(function () { $("[data-sections]").innerHTML = '<p class="err-box" style="margin-top:24px">The menu did not load. Refresh the page.</p>'; });
})();
