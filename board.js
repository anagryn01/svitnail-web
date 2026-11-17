// Salon numbers: 7 control metrics, weekly trend vs previous week, daily detail. Owner + managers.
(function () {
  const G = "#E6F4EC", Y = "#FFF0D6", R = "#FCE4E2", N = "#F3F1F8";
  const DW = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const sum = (a, k) => a.reduce((s, x) => s + (+x[k] || 0), 0);
  const pct = (a, b) => (b > 0 ? Math.round((100 * a) / b) : null);
  const mon = (s) => { const d = new Date(s + "T12:00:00"); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return d.toISOString().slice(0, 10); };
  const lbl = (s) => { const d = new Date(s + "T12:00:00"); return d.getDate() + "." + String(d.getMonth() + 1).padStart(2, "0"); };
  const money = (v) => "$" + Math.round(v).toLocaleString("en-US");
  const M = [
    { k: "rev", t: "Выручка", f: (a) => sum(a, "revenue"), show: money, c: (v, n) => (v >= 720 * n ? G : v >= 612 * n ? Y : R), goal: "$720/день" },
    { k: "vis", t: "Оплаченные визиты", f: (a) => sum(a, "visits"), show: (v) => v, c: (v, n) => (v >= 5.3 * n ? G : v >= 4.5 * n ? Y : R), goal: "5–6/день", sub: (a) => "мастеров в день: " + (a.filter((x) => x.masters > 0).length ? (sum(a, "masters") / a.filter((x) => x.masters > 0).length).toFixed(1) : "—") },
    { k: "new", t: "Новые клиентки", f: (a) => sum(a, "new_clients"), show: (v) => v, c: (v, n) => (v >= 2.3 * n ? G : v >= 1.9 * n ? Y : R), goal: "2–3/день" },
    { k: "reb", t: "Перезапись на кассе", f: (a) => pct(sum(a, "rebooked"), sum(a, "paid")), show: (v) => (v == null ? "—" : v + "%"), c: (v) => (v == null ? N : v >= 60 ? G : v >= 40 ? Y : R), goal: "от 60%, ниже 40% красная" },
    { k: "book", t: "Новые записи", f: (a) => sum(a, "bookings"), show: (v) => v, c: () => N, goal: "", sub: (a) => "на первый визит: " + sum(a, "bookings_first") },
    { k: "can", t: "Отмены", f: (a) => pct(sum(a, "cancels"), sum(a, "visits") + sum(a, "cancels")), show: (v) => (v == null ? "—" : v + "%"), c: (v) => (v == null ? N : v <= 10 ? G : v <= 15 ? Y : R), goal: "до 10%", sub: (a) => "отмен " + sum(a, "cancels") + ", перенесено " + sum(a, "cancels_moved") },
    { k: "mis", t: "Звонки без перезвона", f: (a) => sum(a, "missed_open"), show: (v) => v, c: (v) => (v === 0 ? G : R), goal: "0", sub: (a) => "SMS ≤15 мин: " + (sum(a, "sms_in") ? pct(sum(a, "sms_15"), sum(a, "sms_in")) + "%" : "—") },
    { k: "rev2", t: "Google-отзывы", f: () => null, show: () => "нет данных", c: () => N, goal: "1–3★ сразу Вике" }
  ];
  let D = null, off = 0, SNAP = null;

  reg({ key: "board", title: "Цифры салона", roles: ["owner", "manager"], async render() {
    const { data, error } = await sb.rpc("week_board", { p_days: 126 });
    if (error) return `<h1>Цифры салона</h1><div class="card err">${esc(error.message)}</div>`;
    D = data || [];
    const today = D[D.length - 1].day, wk = (() => { const d = new Date(mon(today) + "T12:00:00"); d.setDate(d.getDate() + off * 7); return d.toISOString().slice(0, 10); })();
    const cur = D.filter((x) => mon(x.day) === wk), n = cur.length;
    const prevAll = D.filter((x) => mon(x.day) === mon(new Date(new Date(wk + "T12:00:00").getTime() - 7 * 864e5).toISOString().slice(0, 10)));
    const prev = prevAll.slice(0, n);
    const arrow = (m) => { if (m.k === "rev2") return ""; const a = m.f(cur), b = m.f(prev); if (a == null || b == null || b === 0) return ""; const d = a - b; if (!d) return "<span class=lbl>= как неделей ранее</span>"; const up = d > 0, good = m.k === "can" || m.k === "mis" ? !up : up; return `<span style="color:${good ? "#1F8A4C" : "#C0392B"}">${up ? "▲" : "▼"} ${m.k === "rev" ? money(Math.abs(d)) : Math.abs(d) + (m.k === "reb" || m.k === "can" ? " п.п." : "")}</span><span class="lbl"> к прошлой неделе</span>`; };
    const tiles = M.map((m) => { const v = m.f(cur); return `<div class="card" style="background:${v == null ? N : m.c(v, n)}"><div class="lbl">${m.t}</div><div class="big">${m.show(v)}</div><div style="font-size:13px">${arrow(m)}</div><div class="lbl">${m.sub ? m.sub(cur) : ""} ${m.goal ? "· цель " + m.goal : ""}</div></div>`; }).join("");
    const weeks = [...new Set(D.map((x) => mon(x.day)))].reverse();
    const rv = (await sb.rpc("week_review_get", { p_week: wk })).data || {};
    SNAP = { week: wk, days: n, values: Object.fromEntries(M.filter((m) => m.k !== "rev2").map((m) => [m.k, m.f(cur)])) };
    const th = "padding:6px 8px;text-align:right;white-space:nowrap;border-bottom:1px solid var(--line)";
    const wrow = (w) => { const a = D.filter((x) => mon(x.day) === w), nn = a.length; return `<tr><td style="${th};text-align:left"><b>${lbl(w)}</b>${w === wk ? " (идёт)" : ""}</td>${M.filter((m) => m.k !== "rev2").map((m) => { const v = m.f(a); return `<td style="${th};background:${v == null ? N : m.c(v, nn)}">${m.show(v)}</td>`; }).join("")}</tr>`; };
    const dd = D.slice(-14).reverse().map((x) => `<tr><td style="${th};text-align:left">${DW[x.dow]} ${lbl(x.day)}</td><td style="${th}">${money(x.revenue)}</td><td style="${th}">${x.visits} / ${x.masters} маст.</td><td style="${th}">${x.new_clients}</td><td style="${th}">${x.paid ? pct(x.rebooked, x.paid) + "%" : "—"}</td><td style="${th}">${x.bookings} (${x.bookings_first})</td><td style="${th}">${x.cancels}${x.cancels ? " / пер. " + x.cancels_moved : ""}</td><td style="${th}">${x.missed_open}</td></tr>`).join("");
    return `<h1>Цифры салона</h1>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><button class="btn" id="bprev">←</button><b>Неделя с ${lbl(wk)}</b><button class="btn" id="bnext">→</button><span class="lbl">дней: ${n}, сравнение с теми же днями прошлой недели</span></div>
      <div class="grid">${tiles}</div>
      <div class="card" style="overflow:auto"><b>По неделям</b><table style="border-collapse:collapse;width:100%;margin-top:8px;font-size:13px"><tr><th style="${th};text-align:left">Неделя</th><th style="${th}">Выручка</th><th style="${th}">Визиты</th><th style="${th}">Новые</th><th style="${th}">Перезапись</th><th style="${th}">Записи</th><th style="${th}">Отмены</th><th style="${th}">Звонки без перезвона</th></tr>${weeks.map(wrow).join("")}</table></div>
      <div class="card" style="overflow:auto"><b>По дням</b><table style="border-collapse:collapse;width:100%;margin-top:8px;font-size:13px"><tr><th style="${th};text-align:left">День</th><th style="${th}">Выручка</th><th style="${th}">Визиты / мастера</th><th style="${th}">Новые</th><th style="${th}">Перезапись</th><th style="${th}">Записи (первый визит)</th><th style="${th}">Отмены</th><th style="${th}">Без перезвона</th></tr>${dd}</table></div>
      <div class="card"><b>Итоги недели</b><div class="lbl" style="margin:4px 0">Почему так вышло</div><textarea id="rvr" rows="3" style="width:100%;padding:8px;border:1px solid var(--line);border-radius:8px">${esc(rv.reasons || "")}</textarea><div class="lbl" style="margin:8px 0 4px">Что решаем, кто и к какому сроку</div><textarea id="rvd" rows="3" style="width:100%;padding:8px;border:1px solid var(--line);border-radius:8px">${esc(rv.decisions || "")}</textarea><div style="margin-top:8px"><button class="btn" id="rvs">Сохранить итоги</button> <span class="lbl" id="rvm">${rv.updated_at ? "сохранено " + new Date(rv.updated_at).toLocaleString("ru-RU") : ""}</span></div></div>`;
  }, bind() {
    const go = (d) => () => { off = Math.min(0, off + d); APP.rerender(); };
    const p = document.getElementById("bprev"), n = document.getElementById("bnext");
    if (p) p.onclick = go(-1);
    if (n) n.onclick = go(1);
    const sv = document.getElementById("rvs");
    if (sv) sv.onclick = async () => {
      const { error } = await sb.rpc("week_review_save", { p_week: SNAP.week, p_reasons: document.getElementById("rvr").value, p_decisions: document.getElementById("rvd").value, p_snapshot: SNAP });
      document.getElementById("rvm").textContent = error ? error.message : "сохранено";
    };
  } });
})();
