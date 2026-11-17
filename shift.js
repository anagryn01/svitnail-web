// Admin "Смена" (no money) and master "Моя смена" (no salon money).
(function () {
  const G = "#E6F4EC", Y = "#FFF0D6", R = "#FCE4E2", N = "#F3F1F8";
  const hh = (m) => (m / 60).toFixed(1).replace(".0", "") + " ч";
  const tm = (t) => String(t).slice(0, 5);
  const num = (v, l, bg) => `<div class="card" style="background:${bg || "transparent"}"><div class="lbl">${l}</div><div class="big">${v}</div></div>`;

  reg({ key: "shift", title: "Смена", roles: ["owner", "manager", "senior_admin", "admin"], async render() {
    const { data: d, error } = await sb.rpc("admin_today");
    if (error) return `<h1>Смена</h1><div class="card err">${esc(error.message)}</div>`;
    const reb = d.paid_today ? Math.round((100 * d.rebooked_today) / d.paid_today) : null;
    const grp = (day, title) => { const a = d.staff.filter((s) => s.day === day); return `<div class="card"><b>${title}</b>${a.length ? a.map((s) => { const free = s.shift_min - s.booked_min, bad = free > s.shift_min * 0.4; return `<div class="step" style="align-items:center;gap:10px"><b style="min-width:90px">${esc(s.name)}</b><span class="lbl">${tm(s.start)}–${tm(s.end)}</span><span class="pill" style="background:${bad ? R : G}">свободно ${hh(Math.max(free, 0))}</span></div>`; }).join("") : "<div class=lbl>Смен в графике нет.</div>"}</div>`; };
    const cs = d.cancels.length ? d.cancels.map((c) => `<div class="step"><b>${c.day === d.today ? "сегодня" : "завтра"} ${c.time}</b> ${esc(c.staff || "")} <span class="lbl">${esc(c.service || "")}</span></div>`).join("") : "<div class=lbl>Отмен нет.</div>";
    return `<h1>Смена</h1>
      <div class="grid">${num(d.visits_done + " / " + (d.visits_done + d.visits_left), "Визиты сегодня: прошли / всего")}${num(d.tomorrow_booked, "Записей на завтра")}${num(reb == null ? "—" : reb + "%", "Перезапись на кассе", reb == null ? N : reb >= 60 ? G : reb >= 40 ? Y : R)}${num(d.open_calls, "Звонки без перезвона", d.open_calls ? R : G)}${num(d.open_sms, "SMS без ответа", d.open_sms ? R : G)}${num(d.waitlist, "Лист ожидания")}</div>
      ${grp(d.today, "Пустые окна сегодня")}
      ${grp(new Date(new Date(d.today + "T12:00:00").getTime() + 864e5).toISOString().slice(0, 10), "Пустые окна завтра")}
      <div class="card"><b>Отмены на сегодня и завтра</b>${cs}</div>`;
  }, bind() {} });

  reg({ key: "mine", title: "Моя смена", roles: ["master", "owner", "manager", "senior_admin", "admin"], async render() {
    const { data: d, error } = await sb.rpc("my_shift");
    if (error) return `<h1>Моя смена</h1><div class="card err">${esc(error.message)}</div>`;
    if (!d || !d.name) return `<h1>Моя смена</h1><div class="card lbl">Профиль не найден.</div>`;
    const reb = d.week_paid ? Math.round((100 * d.week_rebooked) / d.week_paid) : null;
    const list = d.visits.length ? d.visits.map((v) => `<div class="step"><b>${v.time}–${v.end}</b> ${esc(v.client || "")} <span class="lbl">${esc(v.service || "")} · ${esc(v.status)}</span></div>`).join("") : "<div class=lbl>Записей на сегодня нет.</div>";
    return `<h1>Моя смена</h1>
      <div class="grid">${num(d.visits.length, "Визитов сегодня")}${num(hh(d.booked_min), "Занято сегодня")}${num(reb == null ? "—" : reb + "%", "Моя перезапись за неделю", reb == null ? N : reb >= 60 ? G : reb >= 40 ? Y : R)}${num(d.tomorrow, "Записей на завтра")}</div>
      <div class="card"><b>Мои записи сегодня</b>${list}</div>`;
  }, bind() {} });
})();
