/* Checkout: mobile money through MUDA Pay (MTN, Airtel) or USDT through NOWPayments.
   The server prices the order from data/menu.json again; the browser total is only for display.
   Without the API (a plain static preview) the page runs in demo mode and says so. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var ugx = function (n) { return "UGX " + Number(n).toLocaleString("en-US"); };
  var o = window.EndiroStore.read();
  var cfg = { ugxPerUsd: 3700, sampleRate: true, momo: false, crypto: false };
  var method = "mtn", busy = false, timer = null, order = null;

  if (!o || !o.lines || !o.lines.length) {
    document.querySelector("main .wrap").innerHTML = '<div class="stack" style="padding:64px 0"><h1>Your order is empty.</h1><p class="lead">Add something from the menu first.</p><a class="btn btn-main" href="menu.html" style="align-self:flex-start">Open the menu</a></div>';
    return;
  }
  var count = o.lines.reduce(function (a, l) { return a + l.qty; }, 0);
  var where = o.mode === "pickup" ? "Pickup at " + o.branchName + ". " + o.time + "." : "Delivery from " + o.branchName + ". Delivery fee: [set per zone].";
  $("[data-co-summary]").textContent = count + (count === 1 ? " item. " : " items. ") + where;
  try { $("[data-name]").value = localStorage.getItem("endiro-name") || ""; $("[data-phone]").value = localStorage.getItem("endiro-phone") || ""; } catch (e) {}

  function usdt() { return (Math.ceil(o.subtotal / cfg.ugxPerUsd * 100) / 100).toFixed(2); }
  function screen(label, st) {
    $("[data-label]").textContent = label;
    $("[data-label]").style.color = st === "error" ? "var(--alert)" : "";
    $("[data-ico-spin]").hidden = st !== "busy"; $("[data-ico-done]").hidden = st !== "done";
  }
  function showAmount() {
    var crypto = method === "crypto";
    $("[data-amt]").textContent = crypto ? usdt() + " USDT" : ugx(o.subtotal);
    $("[data-amt-note]").textContent = (crypto ? ugx(o.subtotal) + ", " : "") + count + (count === 1 ? " item" : " items") + (o.mode === "pickup" ? ", pickup at " + o.branchName : ", delivery from " + o.branchName);
    $("[data-usdt]").textContent = usdt() + " USDT";
    $("[data-rate]").textContent = (cfg.sampleRate ? "Sample rate: " : "Rate today: ") + "1 USD = " + Number(cfg.ugxPerUsd).toLocaleString("en-US") + " UGX. You pay on the NOWPayments page. Your order starts when the network confirms the payment.";
  }
  function pickMethod(m) {
    if (busy) return;
    method = m;
    document.querySelectorAll("[data-method]").forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-method") === m ? "true" : "false"); });
    $("[data-momo]").hidden = m === "crypto"; $("[data-crypto]").hidden = m !== "crypto";
    $("[data-momo-label]").textContent = (m === "airtel" ? "Airtel Money" : "MTN Mobile Money") + " number";
    $("[data-err]").hidden = true; screen(m === "crypto" ? "Ready to pay in USDT" : "Ready to pay"); showAmount();
  }
  document.querySelectorAll("[data-method]").forEach(function (b) {
    b.addEventListener("click", function () { pickMethod(b.getAttribute("data-method")); });
    b.addEventListener("keydown", function (ev) {
      var list = Array.prototype.slice.call(document.querySelectorAll("[data-method]")), i = list.indexOf(b);
      if (ev.key === "ArrowDown" || ev.key === "ArrowRight") { ev.preventDefault(); list[(i + 1) % list.length].focus(); list[(i + 1) % list.length].click(); }
      if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") { ev.preventDefault(); list[(i + list.length - 1) % list.length].focus(); list[(i + list.length - 1) % list.length].click(); }
    });
  });

  function fail(msg) {
    busy = false; screen("Not paid yet", "error");
    var e = $("[data-err]"); e.textContent = msg; e.hidden = false;
    $("[data-pay-momo]").disabled = $("[data-pay-crypto]").disabled = false;
    $("[data-pay-momo]").textContent = "Send the request again";
  }
  function check() {
    var bad = null;
    [["[data-name]", 2], ["[data-phone]", 9]].concat(method === "crypto" ? [] : [["[data-pay-phone]", 9]]).forEach(function (f) {
      var el = $(f[0]), ok = String(el.value).replace(/\s/g, "").length >= f[1];
      el.setAttribute("aria-invalid", ok ? "false" : "true"); if (!ok && !bad) bad = el;
    });
    if (bad) { fail("Fill in your name and a phone number."); bad.focus(); return false; }
    try { localStorage.setItem("endiro-name", $("[data-name]").value); localStorage.setItem("endiro-phone", $("[data-phone]").value); } catch (e) {}
    return true;
  }
  function printReceipt(paidWith) {
    busy = false; window.clearTimeout(timer);
    var r = $("[data-receipt]");
    r.innerHTML = '<div style="text-align:center;font-family:var(--font-head);font-weight:600;font-size:17px">Endiro Coffee, ' + esc(o.branchName) + "</div>" +
      '<div style="text-align:center" class="small muted">' + esc(order.id) + "</div><div class=\"rule\"></div>" +
      o.lines.map(function (l) { return '<div class="rl"><span>' + l.qty + " x " + esc(l.name) + "</span><span>" + Number(l.price * l.qty).toLocaleString("en-US") + "</span></div>"; }).join("") +
      '<div class="rule"></div><div class="rl" style="font-family:var(--font-head);font-weight:600;font-size:17px"><span>Total</span><span>' + ugx(order.amount) + "</span></div>" +
      '<div class="small muted" style="margin-top:6px">' + esc(paidWith) + (order.demo ? ". Demo, no money moved." : "") + "</div>" +
      '<div class="num"><div class="small muted">' + (o.mode === "pickup" ? "Show this number at the counter" : "Your order number") + "</div><b>" + esc(order.pickup) + "</b></div>" +
      '<div class="stamp" aria-hidden="true">Paid</div>';
    r.hidden = false; r.classList.remove("feed"); void r.offsetWidth; r.classList.add("feed");
    screen("Paid. Printing your receipt", "done"); $("[data-order-id]").textContent = "Order " + order.id;
    window.setTimeout(function () { screen("Paid. Order " + order.id + " is in the kitchen.", "done"); $("[data-after]").hidden = false; }, 2400);
    $("[data-pay-momo]").disabled = $("[data-pay-crypto]").disabled = true;
    o.carts[o.mode] = {}; o.cart = {}; o.lines = []; window.EndiroStore.write(o); window.EndiroCount && window.EndiroCount();
  }
  function poll(t0) {
    if (Date.now() - t0 > 3 * 60 * 1000) return fail("No answer from your phone. Check the phone and try again.");
    timer = window.setTimeout(function () {
      fetch("/api/pay/status?order=" + encodeURIComponent(order.id) + "&method=" + method).then(function (r) { return r.json(); }).then(function (s) {
        if (s.status === "PAID") return printReceipt(method === "crypto" ? "Paid with USDT (NOWPayments)" : "Paid with " + (method === "airtel" ? "Airtel Money" : "MTN Mobile Money") + " (MUDA Pay)");
        if (s.status === "FAILED") return fail(method === "crypto" ? "The crypto payment did not complete." : "Your phone did not approve the payment.");
        poll(t0);
      }).catch(function () { poll(t0); });
    }, 4000);
  }
  function start() {
    if (busy || !check()) return;
    busy = true; $("[data-err]").hidden = true;
    $("[data-pay-momo]").disabled = $("[data-pay-crypto]").disabled = true;
    screen(method === "crypto" ? "Making your crypto invoice" : "Sending the request to your phone", "busy");
    var body = { mode: o.mode, branch: o.branch, time: o.time, lines: o.lines.map(function (l) { return { key: l.key, qty: l.qty }; }),
      name: $("[data-name]").value.trim(), phone: $("[data-phone]").value.trim(), method: method, payPhone: ($("[data-pay-phone]").value || "").trim() };
    // Open the crypto tab now (inside the click) so pop-up blockers allow it.
    var tab = method === "crypto" ? window.open("", "_blank") : null;
    fetch("/api/pay/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "error"); return j; }); })
      .then(function (j) { order = j; run(tab); })
      .catch(function (err) {
        if (String(err && err.message).indexOf("Failed to fetch") >= 0 || err instanceof SyntaxError) { // static preview: no API
          order = { id: "E-DEMO", amount: o.subtotal, pickup: "47", demo: true }; run(tab);
        } else { if (tab) tab.close(); fail(String(err.message || "Something went wrong. Try again.")); }
      });
  }
  function run(tab) {
    $("[data-order-id]").textContent = "Order " + order.id;
    if (method === "crypto") {
      if (order.invoiceUrl && tab) tab.location.href = order.invoiceUrl; else if (tab) tab.close();
      screen("Waiting for the network to confirm", "busy");
    } else screen("Check your phone. Approve with your PIN.", "busy");
    if (order.demo) { timer = window.setTimeout(function () { printReceipt(method === "crypto" ? "Paid with USDT" : "Paid with " + (method === "airtel" ? "Airtel Money" : "MTN Mobile Money")); }, 3200); return; }
    poll(Date.now());
  }
  $("[data-pay-momo]").addEventListener("click", start);
  $("[data-pay-crypto]").addEventListener("click", start);

  fetch("/api/pay/config").then(function (r) { return r.json(); }).then(function (c) { cfg = c; showAmount(); }).catch(function () { showAmount(); });
  pickMethod("mtn");
})();
