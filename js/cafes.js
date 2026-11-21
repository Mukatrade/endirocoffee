/* Cafés page: filter chips and the map that follows the chosen café. */
(function () {
  "use strict";
  var map = document.querySelector("[data-map]"), label = document.querySelector("[data-map-label]");
  var cafes = document.querySelectorAll(".cafe");
  cafes.forEach(function (c) {
    var b = c.querySelector("[data-show-map]");
    if (!b) return;
    b.addEventListener("click", function () {
      cafes.forEach(function (x) { x.classList.toggle("is-on", x === c); });
      if (map) map.src = c.getAttribute("data-embed");
      if (label) label.textContent = c.querySelector("h3").textContent + ": " + c.querySelector(".muted").textContent;
      if (window.matchMedia("(max-width: 860px)").matches && map) map.scrollIntoView({ block: "start" });
    });
  });
  var chips = document.querySelectorAll("[data-filter]");
  chips.forEach(function (ch) {
    ch.addEventListener("click", function () {
      var f = ch.getAttribute("data-filter");
      chips.forEach(function (x) { x.setAttribute("aria-pressed", x === ch ? "true" : "false"); });
      document.querySelectorAll("[data-group]").forEach(function (g) {
        var k = g.getAttribute("data-group");
        g.hidden = !(f === "all" || (f === "Kampala" && k === "Kampala") || (f === "up" && k !== "Kampala"));
      });
    });
  });
  var id = (location.hash || "").replace("#cafe-", "");
  if (id) { var c = document.getElementById("cafe-" + id); if (c) { var b = c.querySelector("[data-show-map]"); if (b) b.click(); } }
})();
