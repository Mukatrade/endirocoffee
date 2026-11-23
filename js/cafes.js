/* Cafés page: the map that follows the chosen café. Search and filters: finder.js. */
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
  // Filter chips and search live in finder.js.
  var id = (location.hash || "").replace("#cafe-", "");
  if (id) { var c = document.getElementById("cafe-" + id); if (c) { var b = c.querySelector("[data-show-map]"); if (b) b.click(); } }
})();
