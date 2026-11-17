// Tasks board: owner, deadline, definition of done, cycle take / question / cannot make it, escalation to the manager after 48h, on-time %.
(function () {
  const ST = { new: "Новая", accepted: "Взято", question: "Вопрос", reschedule_proposed: "Просит перенос", in_progress: "В работе", review: "На проверке", done: "Готово", returned: "Возвращена", not_accepted: "Не принята, у управляющей", overdue: "Просрочена" };
  const COLS = [["Новые", ["new"], "#E4EEFB"], ["В работе", ["accepted", "in_progress", "question", "reschedule_proposed", "returned"], "#E9E6F2"], ["На проверке", ["review"], "#FFF0D6"], ["Просрочено и эскалация", ["overdue", "not_accepted"], "#FDECEA"], ["Готово", ["done"], "#E6F4EC"]];
  const DEPT = { leadership: "Руководство", operations: "Операционка", front_desk: "Ресепшн", recruiting: "Найм", masters_quality: "Мастера и качество", marketing: "Маркетинг", finance: "Финансы", numbers: "Цифры" };
  const STAGE = { masters: "1 Мастера", acquisition: "2 Привлечение", response_booking: "3 Ответ и запись", visit: "4 Визит", service: "5 Услуга", return: "6 Возврат", reputation: "7 Репутация" };
  const fmt = (d) => new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const sel = (id, obj) => `<select id="${id}" style="flex:1 1 150px;border:1px solid var(--line);border-radius:10px;padding:12px;font:inherit;background:#FBFAFD">${Object.entries(obj).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>`;
  let TB = null;

  function card(t) {
    const me_ = TB.me, mine = t.assignee_id === me_, creator = t.creator_id === me_;
    const late = !["done", "review"].includes(t.status) && new Date(t.due) < new Date();
    let b = [];
    if (mine && ["new", "not_accepted", "overdue"].includes(t.status)) b.push(["take", "Беру"]);
    if (mine && ["new", "accepted", "in_progress", "returned", "not_accepted", "overdue"].includes(t.status)) { b.push(["ask", "Вопрос"], ["late", "Не успею"]); }
    if (mine && ["accepted", "in_progress", "returned", "overdue", "not_accepted"].includes(t.status)) b.push(["review", "На проверку"]);
    if (creator && t.status === "review") b.push(["ok", "Принять"], ["back", "Вернуть"]);
    if (creator && t.status === "reschedule_proposed") b.push(["agree", "Согласовать срок"], ["deny", "Отклонить"]);
    return `<div class="card" data-id="${t.id}" style="padding:12px;display:flex;flex-direction:column;gap:6px">
      <b style="font-size:14px">${esc(t.title)}</b>
      <div class="lbl">Готово, когда: ${esc(t.done)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px"><span class="pill">${esc(t.assignee || "—")}</span><span class="pill" style="${late ? "background:#FCE4E2;color:var(--bad)" : ""}">до ${fmt(t.due)}</span><span class="pill">${ST[t.status]}</span>${t.escalated ? `<span class="pill" style="background:#FCE4E2;color:var(--bad)">эскалация${t.orig ? ", было у " + esc(t.orig) : ""}</span>` : ""}${t.proposed ? `<span class="pill">предлагает ${fmt(t.proposed)}</span>` : ""}</div>
      <div class="lbl">${DEPT[t.dept] || t.dept}, ${STAGE[t.stage] || t.stage}, поставил(а) ${esc(t.creator || "—")}</div>
      ${b.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><input class="cm" placeholder="Комментарий" style="flex:1 1 120px;padding:8px"><input class="dt" type="datetime-local" style="flex:1 1 150px;padding:8px">${b.map(([a, l]) => `<button class="btn" data-act="${a}" style="padding:7px 12px;font-size:13px">${l}</button>`).join("")}</div>` : ""}
    </div>`;
  }

  reg({ key: "tasks", title: "Задачи и контроль", async render() {
    const { data, error } = await sb.rpc("tasks_board");
    if (error) return `<h1>Задачи и контроль</h1><div class="card err">${esc(error.message)}</div>`;
    TB = data;
    const rel = {};
    data.reliability.forEach((r) => { const x = (rel[r.person] = rel[r.person] || { total: 0, overdue: 0, w: 0, s: 0 }); x.total += r.total; x.overdue += r.overdue; if (r.pct_on_time != null) { x.w += r.total; x.s += r.pct_on_time * r.total; } });
    const people = Object.fromEntries(data.people.map((p) => [p.id, p.name + (p.kind === "agent" ? " (агент)" : "")]));
    return `<h1>Задачи и контроль</h1>
      <form id="tf" class="card" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
        <input id="tt" placeholder="Что сделать" required style="flex:2 1 220px"><input id="td" placeholder="Готово, когда" required style="flex:2 1 220px">
        ${sel("tdep", DEPT)}${sel("tst", STAGE)}${sel("tas", people)}
        <input id="tdu" type="datetime-local" required style="flex:1 1 170px"><button class="btn" style="padding:12px 20px">Поставить задачу</button>
        <div class="err" id="terr" style="flex:1 1 100%"></div></form>
      <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start">
      ${COLS.map(([n, sts, bg]) => { const l = data.tasks.filter((t) => sts.includes(t.status)); return `<div style="flex:1 1 260px;min-width:0;background:${bg};border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;font-weight:600;font-size:14px"><span>${n}</span><span class="lbl">${l.length}</span></div>${l.map(card).join("")}</div>`; }).join("")}</div>
      <div class="card"><b>В срок, последние 4 недели</b>${Object.entries(rel).map(([n, x]) => `<div class="step"><span style="min-width:120px">${esc(n)}</span><span class="pill">${x.w ? Math.round(x.s / x.w) + "%" : "нет закрытых"}</span><span class="lbl">задач ${x.total}, просрочено ${x.overdue}</span></div>`).join("") || `<div class="lbl" style="padding-top:8px">Данные появятся после первых закрытых задач.</div>`}</div>`;
  }, bind() {
    const call = async (fn, args) => { const { error } = await sb.rpc(fn, args); if (error) { $("#terr").textContent = error.message; return false; } APP.rerender(); return true; };
    $("#tf").onsubmit = (e) => { e.preventDefault(); call("task_create", { p_title: $("#tt").value.trim(), p_done: $("#td").value.trim(), p_dept: $("#tdep").value, p_stage: $("#tst").value, p_assignee: $("#tas").value, p_due: new Date($("#tdu").value).toISOString() }); };
    const map = { take: "accepted", ask: "question", late: "reschedule_proposed", review: "review", ok: "done", back: "returned", agree: "accepted", deny: "new" };
    document.querySelectorAll("button[data-act]").forEach((b) => (b.onclick = () => {
      const c = b.closest("[data-id]"), cm = c.querySelector(".cm"), dt = c.querySelector(".dt"), a = b.dataset.act;
      if (["ask", "back"].includes(a) && !cm.value.trim()) { cm.focus(); cm.placeholder = "Напишите комментарий"; return; }
      if (a === "late" && !dt.value) { dt.focus(); return; }
      call("task_status", { p_id: c.dataset.id, p_status: map[a], p_comment: cm.value.trim() || null, p_due: a === "late" ? new Date(dt.value).toISOString() : null });
    }));
  } });
})();
