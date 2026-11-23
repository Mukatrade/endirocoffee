/* Café finder: search by name or town, filter by area, count. Used on the home and cafés pages.
   "Navigate" links open Google Maps directions with no start point, so Google starts from where you are. */
(function () {
  "use strict";
  document.querySelectorAll("[data-finder]").forEach(function (root) {
    var q = root.querySelector("[data-q]"), count = root.querySelector("[data-count]"), none = root.querySelector("[data-none]");
    var chips = root.querySelectorAll("[data-filter]"), items = root.querySelectorAll("[data-cafe]"), groups = root.querySelectorAll("[data-group]");
    var area = "all";
    function match(el) {
      var a = el.getAttribute("data-area"), text = el.getAttribute("data-text") || "";
      var okArea = area === "all" || (area === "Kampala" ? a === "Kampala" : a !== "Kampala");
      var words = (q && q.value || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
      return okArea && words.every(function (w) { return text.indexOf(w) >= 0; });
    }
    function run() {
      var shown = 0;
      items.forEach(function (el) { var ok = match(el); el.hidden = !ok; if (ok) shown++; });
      groups.forEach(function (g) { g.hidden = !g.querySelector("[data-cafe]:not([hidden])"); });
      if (count) count.textContent = shown === 1 ? "1 café" : shown + " cafés";
      if (none) none.hidden = shown > 0;
    }
    chips.forEach(function (ch) {
      ch.addEventListener("click", function () {
        area = ch.getAttribute("data-filter");
        chips.forEach(function (x) { x.setAttribute("aria-pressed", x === ch ? "true" : "false"); });
        run();
      });
    });
    if (q) q.addEventListener("input", run);
    run();
  });
})();
