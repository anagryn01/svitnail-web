// Week screen: plan vs fact per day, automatic reason, top-3 deviations, master-day gap.
(function () {
  const G = "#E6F4EC", Y = "#FFF0D6", R = "#FCE4E2", N = "#F3F1F8";
  const DW = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const money = (v) => (v == null ? "—" : "$" + Math.round(v).toLocaleString("en-US"));
  const lbl = (s) => { const d = new Date(s + "T12:00:00"); return d.getDate() + "." + String(d.getMonth() + 1).padStart(2, "0"); };
  const col = (f, p) => (!p ? N : f / p >= 1 ? G : f / p >= 0.85 ? Y : R);
  let off = 0;

  reg({ key: "week", title: "Неделя", roles: ["owner", "manager", "senior_admin"], async render() {
    const base = new Date(); base.setDate(base.getDate() + off * 7);
    const { data, error } = await sb.rpc("plan_week", off ? { p_start: (() => { const d = new Date(); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k + off * 7); return d.toISOString().slice(0, 10); })() } : {});
    if (error) return `<h1>Неделя</h1><div class="card err">${esc(error.message)}</div>`;
    const today = data.today, days = data.days;
    const past = (x) => x.day <= today;
    const reason = (x) => {
      if (!x.plan) return "план месяца не задан";
      const r = [];
      const m = past(x) ? x.masters : x.scheduled;
      if (x.need != null && m < Math.round(x.need)) r.push((past(x) ? "работало " : "в графике ") + m + " мастера из " + Math.round(x.need));
      if (x.cancels) r.push("отмен " + x.cancels + (x.moves ? ", переносов " + x.moves : ""));
      if (past(x) && x.revenue < x.plan && !r.length) r.push("визитов " + x.visits + ", средний чек ниже плана");
      return r.join("; ");
    };
    const done = days.filter((x) => x.day < today && x.plan);
    const top = done.map((x) => ({ x, gap: x.plan - x.revenue })).filter((o) => o.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 3);
    const sumPlan = done.reduce((s, x) => s + x.plan, 0), sumFact = done.reduce((s, x) => s + x.revenue, 0);
    const short = days.filter((x) => x.day >= today && x.need != null && x.scheduled < Math.round(x.need));
    const th = "padding:8px;text-align:right;border-bottom:1px solid var(--line);white-space:nowrap";
    const rows = days.map((x) => { const p = past(x) && x.day < today; return `<tr><td style="${th};text-align:left"><b>${DW[x.dow]} ${lbl(x.day)}</b></td><td style="${th}">${money(x.plan)}</td><td style="${th};background:${x.day < today ? col(x.revenue, x.plan) : "transparent"}">${x.day <= today ? money(x.revenue) : "—"}</td><td style="${th}">${x.day < today && x.plan ? (x.revenue - x.plan >= 0 ? "+" : "−") + money(Math.abs(x.revenue - x.plan)) : "—"}</td><td style="${th}">${x.day <= today ? x.masters : x.scheduled} / ${x.need == null ? "—" : Math.round(x.need)}</td><td style="${th};text-align:left;white-space:normal;min-width:200px">${x.day <= today || x.day > today ? esc(reason(x)) : ""}</td></tr>`; }).join("");
    return `<h1>Неделя</h1>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><button class="btn" id="wprev">←</button><b>${lbl(days[0].day)} – ${lbl(days[6].day)}</b><button class="btn" id="wnext">→</button></div>
      <div class="grid"><div class="card" style="background:${col(sumFact, sumPlan)}"><div class="lbl">Прошедшие дни: факт к плану</div><div class="big">${money(sumFact)}</div><div class="lbl">план ${money(sumPlan)}</div></div>
      <div class="card" style="background:${short.length ? R : G}"><div class="lbl">Мастера в графике</div><div class="big">${short.length ? "не хватает" : "хватает"}</div><div class="lbl">${short.length ? short.map((x) => DW[x.dow] + " " + lbl(x.day) + ": " + x.scheduled + " из " + Math.round(x.need)).join(", ") : "на оставшиеся дни недели"}</div></div></div>
      <div class="card"><b>Топ-3 отклонения недели</b>${top.length ? top.map((o) => `<div class="step"><b>${DW[o.x.dow]} ${lbl(o.x.day)}</b> −${money(o.gap)} <span class="lbl">${esc(reason(o.x))}</span></div>`).join("") : "<div class=lbl>Отставаний нет.</div>"}</div>
      <div class="card" style="overflow:auto"><table style="border-collapse:collapse;width:100%;font-size:13px"><tr><th style="${th};text-align:left">День</th><th style="${th}">План</th><th style="${th}">Факт</th><th style="${th}">Отклонение</th><th style="${th}">Мастера (факт или график / нужно)</th><th style="${th};text-align:left">Причина</th></tr>${rows}</table></div>`;
  }, bind() {
    const p = document.getElementById("wprev"), n = document.getElementById("wnext");
    if (p) p.onclick = () => { off -= 1; APP.rerender(); };
    if (n) n.onclick = () => { off += 1; APP.rerender(); };
  } });
})();
