/* Job, internship and wholesale forms. They post JSON to /api/forms. */
(function () {
  "use strict";
  var q = new URLSearchParams(location.search), role = q.get("role");
  if (role) document.querySelectorAll('select[name="role"]').forEach(function (s) {
    Array.prototype.forEach.call(s.options, function (o) { if (o.text === role) s.value = o.text; });
  });
  document.querySelectorAll("[data-form]").forEach(function (f) {
    var msg = f.querySelector("[data-form-msg]"), btn = f.querySelector('button[type="submit"]');
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var bad = null;
      f.querySelectorAll("[required]").forEach(function (el) {
        var ok = String(el.value || "").trim() !== "" && (el.type !== "email" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value));
        el.setAttribute("aria-invalid", ok ? "false" : "true"); if (!ok && !bad) bad = el;
      });
      if (bad) { msg.textContent = "Fill in the marked fields."; msg.className = "note"; msg.style.color = "var(--alert)"; bad.focus(); return; }
      var data = {}; new FormData(f).forEach(function (v, k) { data[k] = data[k] ? data[k] + ", " + v : v; });
      btn.disabled = true; btn.classList.add("is-busy"); msg.style.color = ""; msg.textContent = "Sending...";
      fetch("/api/forms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: f.getAttribute("data-form"), data: data }) })
        .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then(function () { f.reset(); msg.textContent = "Thank you. We received it and reply soon."; })
        .catch(function () { msg.style.color = "var(--alert)"; msg.textContent = "We could not send it. Email contact@endirocoffee.com instead."; })
        .then(function () { btn.disabled = false; btn.classList.remove("is-busy"); });
    });
  });
})();
