// Recruiting: funnel board, candidate card, master account creation on acceptance.
(function () {
  const ST = { applied: "Отклик", qualified: "Квалифицирована", call: "Звонок", trial_set: "Пробная назначена", trial_done: "Пробная оценена", decision: "Решение", offer: "Оффер", accepted: "Принята", rejected: "Отказ", withdrew: "Сама отказалась", reserve: "Резерв" };
  const FLOW = ["applied", "qualified", "call", "trial_set", "trial_done", "decision", "offer", "accepted"];
  const LIC = { "": "—", ca: "Есть лицензия CA", in_progress: "В процессе", other_state: "Другой штат", none: "Нет" };
  let D = null, SEL = null;
  const dt = (v) => (v ? new Date(v).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
  const loc = (v) => (v ? new Date(new Date(v).getTime() - new Date(v).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
  const inp = (id, l, v, t) => `<label class="lbl" style="flex:1 1 170px;display:flex;flex-direction:column;gap:4px">${l}<input id="${id}" type="${t || "text"}" value="${esc(v || "")}" style="padding:9px;border:1px solid var(--line);border-radius:8px;font:inherit"></label>`;
  const sel = (id, l, opts, v) => `<label class="lbl" style="flex:1 1 170px;display:flex;flex-direction:column;gap:4px">${l}<select id="${id}" style="padding:9px;border:1px solid var(--line);border-radius:8px;font:inherit">${Object.entries(opts).map(([k, t]) => `<option value="${k}" ${String(v ?? "") === k ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
  const tri = { "": "—", true: "Да", false: "Нет" };

  function card(c) {
    const late = c.status === "applied" && Date.now() - new Date(c.applied_at) > 864e5;
    return `<div class="card" data-c="${c.id}" style="padding:10px;cursor:pointer;${SEL === c.id ? "outline:2px solid var(--accent)" : ""}"><b style="font-size:14px">${esc(c.name)}</b><div class="lbl">${esc(c.role || "")} · ${esc(c.experience || "")}</div><div class="lbl">${esc(c.source)} · ${dt(c.applied_at)}</div>${late ? `<span class="pill" style="background:#FCE4E2;color:#8F1D17">Без ответа больше суток</span>` : ""}</div>`;
  }

  function detail(c) {
    const i = FLOW.indexOf(c.status), next = i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null;
    const closed = ["rejected", "withdrew", "reserve"].includes(c.status);
    return `<div class="card" id="cd" data-id="${c.id}" style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between"><h2 style="font-size:20px">${esc(c.name)} <span class="pill">${ST[c.status]}</span></h2><span class="lbl">${esc([c.phone, c.email, c.telegram, c.instagram].filter(Boolean).join(" · "))}</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${sel("f_in_us", "В США", tri, c.in_us)}${sel("f_license", "Лицензия CA", LIC, c.license)}${inp("f_license_no", "Номер лицензии", c.license_no)}${inp("f_license_checked_on", "Проверена (DCA/BBC)", c.license_checked_on, "date")}
        ${inp("f_call_at", "Звонок", loc(c.call_at), "datetime-local")}${inp("f_call_result", "Итог звонка", c.call_result)}
        ${inp("f_trial_at", "Пробная", loc(c.trial_at), "datetime-local")}${sel("f_trial_kind", "Пробная на", { "": "—", model: "Живой модели", tips: "Типсах" }, c.trial_kind)}${inp("f_trial_score", "Баллы чек-листа", c.trial_score, "number")}${sel("f_trial_reco", "Рекомендация проверяющего", { "": "—", hire: "Брать", no: "Не брать", another: "Ещё пробная" }, c.trial_reco)}
        ${inp("f_decision", "Решение и почему", c.decision)}${inp("f_offer_at", "Дата оффера", c.offer_at, "date")}${inp("f_start_date", "Дата выхода", c.start_date, "date")}${sel("f_relocation_bonus", "Бонус за переезд", tri, c.relocation_bonus)}
        ${inp("f_note", "Заметка в журнал", "")}
      </div>
      <div id="herr" class="lbl" style="color:var(--bad)"></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <button class="btn" id="hsave">Сохранить</button>
        ${next ? `<button class="btn" id="hnext" data-next="${next}">→ ${ST[next]}</button>` : ""}
        ${c.status === "accepted" ? `<button class="btn" id="hacc">Создать кабинет мастера</button>` : ""}
        ${closed ? "" : `<input id="hreason" placeholder="Причина отказа или резерва" style="flex:1 1 200px;padding:9px;border:1px solid var(--line);border-radius:8px;font:inherit"><button class="btn" data-close="rejected">Отказ</button><button class="btn" data-close="withdrew">Сама отказалась</button><button class="btn" data-close="reserve">В резерв</button>`}
      </div>
      <div id="hlog" class="lbl"></div>
    </div>`;
  }

  reg({ key: "hr", title: "Найм", roles: ["owner", "manager"], async render() {
    const { data, error } = await sb.rpc("hr_board");
    if (error) return `<h1>Найм</h1><div class="card err">${esc(error.message)}</div>`;
    D = data;
    const s = data.stats, n = (v, l) => `<div class="card"><div class="lbl">${l}</div><div class="big">${v}</div></div>`;
    const col = (st) => { const l = data.candidates.filter((c) => c.status === st); return `<div style="flex:1 1 200px;min-width:190px;background:#E9E6F2;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;font-weight:600;font-size:14px"><span>${ST[st]}</span><span class="lbl">${l.length}</span></div>${l.map(card).join("")}</div>`; };
    const closed = data.candidates.filter((c) => ["rejected", "withdrew", "reserve"].includes(c.status));
    const cur = data.candidates.find((c) => c.id === SEL);
    return `<h1>Найм</h1>
      <div class="grid">${n(s.week, "Отклики за 7 дней")}${n(s.waiting24, "Без ответа больше 24 ч")}${n(s.qualified48, "Без звонка больше 48 ч")}${n((s.call48_pct ?? 0) + "%", "Звонок в 48 ч, цель 90%")}${n(s.hired90, "Приняты за 90 дней")}</div>
      ${cur ? detail(cur) : ""}
      <div style="display:flex;gap:12px;overflow-x:auto;align-items:flex-start">${FLOW.map(col).join("")}</div>
      <div class="card"><b>Закрытые</b>${closed.map((c) => `<div class="step" data-c="${c.id}" style="cursor:pointer"><span style="min-width:150px;font-weight:600">${esc(c.name)}</span><span class="pill">${ST[c.status]}</span><span class="lbl">${esc(c.closed_reason || "")}</span></div>`).join("") || `<div class="lbl">Пока никого</div>`}</div>`;
  }, bind() {
    document.querySelectorAll("[data-c]").forEach((e) => (e.onclick = () => { SEL = e.dataset.c; APP.rerender(); }));
    const box = $("#cd"); if (!box) return;
    const id = box.dataset.id, err = (m) => ($("#herr").textContent = m);
    const val = (k) => $("#f_" + k).value.trim();
    const collect = () => {
      const p = {};
      ["license", "license_no", "license_checked_on", "call_result", "trial_kind", "trial_reco", "decision", "offer_at", "start_date", "note"].forEach((k) => { if (val(k)) p[k] = val(k); });
      ["in_us", "relocation_bonus"].forEach((k) => { if (val(k)) p[k] = val(k) === "true"; });
      ["call_at", "trial_at"].forEach((k) => { if (val(k)) p[k] = new Date(val(k)).toISOString(); });
      if (val("trial_score")) p.trial_score = parseInt(val("trial_score"), 10);
      return p;
    };
    const go = async (extra) => { const { error } = await sb.rpc("hr_update", { p_id: id, p: Object.assign(collect(), extra || {}) }); if (error) return err(error.message); APP.rerender(); };
    $("#hsave").onclick = () => go();
    const nx = $("#hnext"); if (nx) nx.onclick = () => go({ status: nx.dataset.next });
    document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => { const r = $("#hreason").value.trim(); if (!r) return err("Напиши причину"); go({ status: b.dataset.close, closed_reason: r }); }));
    const ac = $("#hacc");
    if (ac) ac.onclick = async () => {
      const c = D.candidates.find((x) => x.id === id);
      if (!c.email) return err("Нужна почта кандидатки");
      const { error } = await sb.rpc("invite_member", { p_email: c.email, p_name: c.name, p_role: "master" });
      if (error) return err(error.message);
      await sb.rpc("hr_update", { p_id: id, p: { note: "Кабинет мастера создан, приглашение отправлено на " + c.email } });
      err(""); ac.textContent = "Приглашение отправлено"; ac.disabled = true;
    };
    sb.rpc("hr_events", { p_id: id }).then(({ data }) => { const l = $("#hlog"); if (l && data) l.innerHTML = "<b>Журнал</b><br>" + data.slice(0, 12).map((e) => dt(e.at) + " · " + esc(e.note || e.kind)).join("<br>"); });
  } });
})();
