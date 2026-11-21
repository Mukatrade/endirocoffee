/* Endiro crypto checkout widget. The customer stays on this page.
   Use: EndiroCrypto.mount(element, { lines:[{id,qty}], amountUgx, name, phone, branch, mode, time, onPaid }) */
(function () {
  const $ = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const fmtUgx = (n) => "UGX " + Math.round(n).toLocaleString("en-UG");
  const api = async (url, opts) => {
    const r = await fetch(url, opts); const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Something went wrong. Try again.");
    return j;
  };

  async function mount(root, o) {
    root.innerHTML = ""; root.classList.add("ecp");
    const head = $("div", "ecp-head"); head.append($("h3", null, "Pay with crypto"), $("p", "ecp-sub", "Send the exact amount from your wallet. The network fee is added to the amount."));
    const err = $("p", "ecp-err"); err.setAttribute("role", "alert");
    root.append(head, err);

    let rate;
    try { rate = await api("/api/crypto/rate"); } catch (e) { err.textContent = e.message; return; }
    const usd = Math.ceil((o.amountUgx / rate.ugxPerUsd) * 100) / 100;
    if (usd < rate.minUsd) { err.textContent = `Crypto needs an order of at least USD ${rate.minUsd}. Use mobile money for this order.`; return; }
    const sum = $("p", "ecp-sum"); sum.innerHTML = `<strong>${fmtUgx(o.amountUgx)}</strong> = about USD ${usd.toFixed(2)}`;
    if (rate.sandbox && rate.live) sum.append($("span", "ecp-tag", "TEST MODE"));
    if (!rate.live) sum.append($("span", "ecp-tag", "DEMO"));
    root.append(sum);

    let coins;
    try { coins = (await api(`/api/crypto/coins?usd=${usd}`)).coins; } catch (e) { err.textContent = e.message; return; }
    const lab = $("label", "ecp-lab", "Coin and network");
    const sel = $("select", "ecp-sel"); sel.id = "ecp-coin"; lab.htmlFor = "ecp-coin";
    coins.forEach((c) => { const op = $("option", null, c.ok ? c.label : `${c.label}  (minimum USD ${c.minUsd})`); op.value = c.code; op.disabled = !c.ok; sel.append(op); });
    const firstOk = coins.find((c) => c.ok); if (firstOk) sel.value = firstOk.code;
    const btn = $("button", "ecp-btn", "Get payment address"); btn.type = "button";
    root.append(lab, sel, btn);

    btn.onclick = async () => {
      err.textContent = ""; btn.disabled = true; btn.textContent = "Please wait...";
      try {
        const p = await api("/api/crypto/pay", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines: o.lines, coin: sel.value, name: o.name, phone: o.phone, branch: o.branch, mode: o.mode, time: o.time }) });
        showPay(root, p, o);
      } catch (e) { err.textContent = e.message; btn.disabled = false; btn.textContent = "Get payment address"; }
    };
  }

  function copyRow(label, value) {
    const row = $("div", "ecp-row"); const v = $("code", "ecp-val", value); const b = $("button", "ecp-copy", "Copy"); b.type = "button";
    b.onclick = async () => { try { await navigator.clipboard.writeText(value); b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1500); } catch (_) {} };
    row.append($("span", "ecp-k", label), v, b); return row;
  }

  function showPay(root, p, o) {
    root.innerHTML = "";
    root.append($("h3", null, `Send ${p.coinLabel}`));
    if (p.demo) root.append($("p", "ecp-tag", "DEMO: no money is taken."));
    const box = $("div", "ecp-box");
    const qr = $("div", "ecp-qr"); qr.innerHTML = p.qrSvg; qr.setAttribute("aria-label", "QR code of the payment address");
    const info = $("div", "ecp-info");
    info.append(copyRow("Amount", `${p.payAmount} ${p.ticker}`), copyRow("Address", p.payAddress));
    if (p.extraId) info.append(copyRow("Memo / tag (required)", String(p.extraId)));
    info.append($("p", "ecp-note", `Order ${p.orderId}. Send the full amount in one payment. If you send less, the order is cancelled.`));
    box.append(qr, info); root.append(box);
    const timer = $("p", "ecp-timer"); const status = $("p", "ecp-status", "Waiting for your payment."); status.setAttribute("aria-live", "polite");
    root.append(timer, status);

    const end = new Date(p.expiresAt).getTime();
    const tick = setInterval(() => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000));
      timer.textContent = s ? `Time left for this rate: ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "The time for this rate ended.";
    }, 1000);
    const poll = setInterval(async () => {
      try {
        const s = await api(`/api/crypto/status?id=${encodeURIComponent(p.orderId)}`);
        status.textContent = s.message; status.dataset.state = s.status;
        if (!["PENDING", "CONFIRMING"].includes(s.status)) { clearInterval(poll); clearInterval(tick); if (s.status === "PAID" && o.onPaid) o.onPaid(p.orderId); }
      } catch (_) {}
    }, 10000);
  }

  window.EndiroCrypto = { mount };
})();
