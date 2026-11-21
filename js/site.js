/* Shared: cart storage, cart count in the header, tabs on the home page. */
(function () {
  "use strict";
  var KEY = "endiro-order-v1";
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || "null") || null; } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* storage off: the order lives in memory only */ } }
  window.EndiroStore = { read: read, write: write };

  function countLabel() {
    var o = read(), n = 0;
    if (o && o.cart) Object.keys(o.cart).forEach(function (k) { n += o.cart[k]; });
    document.querySelectorAll("[data-cart-count]").forEach(function (a) {
      a.textContent = n ? (n === 1 ? "1 item in your order" : n + " items in your order") : "Your order";
    });
  }
  window.EndiroCount = countLabel;
  countLabel();

  // Tabs: a [data-tabs] list with [data-tab] buttons that show #mt-<id> panels.
  document.querySelectorAll("[data-tabs]").forEach(function (list) {
    var btns = list.querySelectorAll("[data-tab]");
    function pick(b) {
      btns.forEach(function (x) {
        var on = x === b; x.setAttribute("aria-selected", on ? "true" : "false"); x.tabIndex = on ? 0 : -1;
        var p = document.getElementById(x.getAttribute("aria-controls")); if (p) p.hidden = !on;
      });
    }
    btns.forEach(function (b, i) {
      b.addEventListener("click", function () { pick(b); });
      b.addEventListener("keydown", function (ev) {
        if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
        var n = btns[(i + (ev.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length]; pick(n); n.focus();
      });
    });
  });
})();
