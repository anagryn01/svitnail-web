// Path to $95k: plan vs fact by month, daily plan of the current month, leadership edits and approves targets.
(function () {
  const K = (v) => (v == null ? "—" : "$" + (Math.abs(v) >= 1000 ? (v / 1000).toFixed(1).replace(".0", "") + "k" : Math.round(v)));
  const MN = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const mname = (s) => MN[+s.slice(5, 7) - 1] + " " + s.slice(2, 4);
  const DW = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const col = (f, p) => (f == null || !p ? "#ECE9F3" : f / p >= 1 ? "#E6F4EC" : f / p >= 0.85 ? "#FFF0D6" : "#FCE4E2");
  let P = null;

  reg({ key: "plan", title: "Путь к $95k", roles: ["owner", "manager"], async render() {
    const { data, error } = await sb.rpc("plan_path");
    if (error) return `<h1>Путь к $95k</h1><div class="card err">${esc(error.message)}</div>`;
    P = data;
    const gp = (await sb.rpc("plan_gap")).data || [];
    const short = gp.filter((g) => g.need != null && g.have < Math.round(g.need));
    const gapBox = `<div class="card"><b>Мастеро-дни на 14 дней</b>${short.length ? `<div class="lbl" style="color:var(--bad);margin:4px 0 8px">Не хватает мастеро-дней: ${short.reduce((a, g) => a + Math.round(g.need) - g.have, 0)} в ${short.length} из 14 дней</div>` : ""}<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${gp.map((g) => { const n = Math.round(g.need || 0), bad = g.have < n; return `<div style="background:${bad ? "#FCE4E2" : "#E6F4EC"};border:1px solid var(--line);border-radius:8px;padding:6px 8px;min-width:70px;flex:1 1 70px"><div class="lbl">${DW[g.dow]} ${+g.day.slice(8)}</div><div style="font-size:13px">нужно ${n}</div><div style="font-size:13px"><b>есть ${g.have}</b></div></div>`; }).join("")}</div></div>`;
    const isOwner = me.role === "owner", cur = data.current;
    const rows = data.months.filter((m) => m.plan_artist_days || m.actual_revenue);
    const max = Math.max(...rows.map((m) => Math.max(m.plan_revenue || 0, m.actual_revenue || 0)), 1);
    const bar = (v, c) => `<div style="height:8px;border-radius:4px;background:${c};width:${Math.round(((v || 0) / max) * 100)}%"></div>`;
    const c = rows.find((m) => m.month === cur) || {};
    const n = (v, l, s) => `<div class="card"><div class="lbl">${l}</div><div class="big">${v}</div><div class="lbl">${s || ""}</div></div>`;
    const row = (m) => {
      const future = m.month >= cur, drafts = m.plan_artist_days && !m.approved;
      return `<div class="step" data-m="${m.month}" style="align-items:center">
        <b style="min-width:62px">${mname(m.month)}</b>
        <div style="flex:1 1 220px;min-width:180px;display:flex;flex-direction:column;gap:4px">${bar(m.plan_revenue, "#C9C3DA")}${bar(m.actual_revenue, "#8C2F7B")}</div>
        <span class="lbl" style="min-width:150px">Выручка ${K(m.plan_revenue)} / <b style="color:var(--ink)">${K(m.actual_revenue)}</b>${m.forecast_revenue != null ? `<br>прогноз <b style="color:var(--ink)">${K(m.forecast_revenue)}</b>` : ""}</span>
        <span class="lbl" style="min-width:130px">Мастеро-дни ${m.plan_artist_days ?? "—"} / <b style="color:var(--ink)">${m.actual_artist_days ?? "—"}</b></span>
        <span class="lbl" style="min-width:120px">$/день ${m.plan_rev_per_day ?? "—"} / <b style="color:var(--ink)">${m.actual_rev_per_day ?? "—"}</b></span>
        <span class="lbl" style="min-width:90px">Новых ${m.plan_new_clients ?? "—"}</span>
        ${m.plan_artist_days ? `<span class="pill">${m.approved ? "Утверждено" : "Черновик"}</span>` : ""}
        ${isOwner && future && m.plan_artist_days ? `<input class="pd" type="number" value="${m.plan_artist_days}" style="width:70px;padding:6px;border:1px solid var(--line);border-radius:8px"><input class="pr" type="number" value="${m.plan_rev_per_day}" style="width:70px;padding:6px;border:1px solid var(--line);border-radius:8px"><button class="btn" data-save="0" style="padding:6px 10px;font-size:13px">Сохранить</button><button class="btn" data-save="1" style="padding:6px 10px;font-size:13px">Утвердить</button>` : ""}
      </div>`;
    };
    const today = data.today;
    const days = data.days.map((d) => { const past = d.day < today; const fcol = past ? col(d.actual_revenue || 0, d.plan_revenue) : "#fff"; return `<div style="background:${fcol};border:1px solid var(--line);border-radius:8px;padding:6px 8px;min-width:78px;flex:1 1 78px"><div class="lbl">${DW[d.dow]} ${+d.day.slice(8)}</div><div style="font-size:13px">план ${K(d.plan_revenue)}</div>${past ? `<div style="font-size:13px"><b>${K(d.actual_revenue || 0)}</b></div>` : ""}</div>`; }).join("");
    return `<h1>Путь к $95k</h1>
      <div class="grid">${n(K(c.forecast_revenue), "Прогноз текущего месяца", "план " + K(c.plan_revenue))}${n(K(c.actual_revenue), "Факт на сегодня", c.actual_artist_days != null ? c.actual_artist_days + " мастеро-дней" : "")}${n("$95k", "Цель на апрель 2027", "211 мастеро-дней × $450")}</div>
      ${gapBox}<div class="card"><b>Месяцы: план и факт</b><div class="lbl" style="margin:4px 0 8px">Светлая полоса — план, тёмная — факт. Цифры плана — черновик, пока руководство не утвердило.</div>${rows.map(row).join("")}<div id="perr" class="lbl" style="color:var(--bad)"></div></div>
      <div class="card"><b>План по дням, ${mname(cur)}</b><div class="lbl" style="margin:4px 0 8px">Дневной план считает система из плана месяца и веса дня недели.</div><div style="display:flex;flex-wrap:wrap;gap:6px">${days}</div></div>`;
  }, bind() {
    document.querySelectorAll("button[data-save]").forEach((b) => (b.onclick = async () => {
      const r = b.closest("[data-m]");
      const { error } = await sb.rpc("plan_set", { p_month: r.dataset.m, p: { artist_days: +r.querySelector(".pd").value, rev_per_artist_day: +r.querySelector(".pr").value, approve: b.dataset.save === "1" } });
      if (error) { $("#perr").textContent = error.message; return; }
      APP.rerender();
    }));
  } });
})();
