// Operations screen: missed calls, unanswered SMS, freed slots, waitlist (live from ops_live).
(function () {
  const KIND = { call: "Пропущенные звонки", msg: "SMS без ответа", slot: "Освободившиеся окна" };
  const fmt = (d) => new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const WS = { waiting: "Ждёт", offered: "Предложено" };
  reg({ key: "ops", title: "Операционка", async render() {
    const { data, error } = await sb.rpc("ops_live");
    if (error) return `<h1>Операционка</h1><div class="card err">${esc(error.message)}</div>`;
    const now = Date.now();
    const col = (k) => {
      const l = data.tasks.filter((t) => t.kind === k);
      return `<div class="card" style="flex:1 1 260px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;font-weight:600"><span>${KIND[k]}</span><span class="lbl">${l.length}</span></div>${l.map((t) => { const late = new Date(t.due_at) < now; return `<div class="step" style="flex-direction:column;align-items:flex-start;gap:4px"><span class="pill" style="background:${late ? "#FCE4E2" : "#E4EEFB"};color:${late ? "#8F1D17" : "#1D4A8A"}">${late ? "Просрочено" : "До"} ${fmt(t.due_at)}</span><span style="font-size:14px">${esc(t.title)}</span><span class="lbl">${esc(t.assignee || "")}</span></div>`; }).join("") || `<div class="lbl">Пусто</div>`}</div>`;
    };
    const n = (v, l) => `<div class="card"><div class="lbl">${l}</div><div class="big">${v}</div></div>`;
    return `<h1>Операционка</h1>
      <div class="grid">${n(data.today.missed, "Пропущенные сегодня")}${n(data.today.cancelled, "Отмены сегодня")}${n(data.today.moved, "Переносы сегодня")}</div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">${col("call")}${col("msg")}${col("slot")}</div>
      <div class="card"><b>Лист ожидания</b>
        <form id="wf" style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0"><input id="wn" placeholder="Клиентка" required style="flex:1 1 140px"><input id="wp" placeholder="Телефон" style="flex:1 1 120px"><input id="ws" placeholder="Услуга" style="flex:1 1 140px"><input id="wm" placeholder="Мастер" style="flex:1 1 100px"><button class="btn">Добавить</button></form>
        <div id="werr" class="lbl" style="color:var(--bad)"></div>
        ${data.waitlist.map((w) => `<div class="step" data-id="${w.id}"><span style="min-width:140px;font-weight:600">${esc(w.client_name)}</span><span class="lbl">${esc([w.phone, w.service, w.staff].filter(Boolean).join(" · "))}</span><span class="pill">${WS[w.status]}</span><button class="btn" data-w="offered" style="padding:6px 10px;font-size:13px">Предложено</button><button class="btn" data-w="booked" style="padding:6px 10px;font-size:13px">Записана</button><button class="btn" data-w="dropped" style="padding:6px 10px;font-size:13px">Убрать</button></div>`).join("") || `<div class="lbl">Никого в листе ожидания</div>`}
      </div>`;
  }, bind() {
    const call = async (fn, a) => { const { error } = await sb.rpc(fn, a); if (error) { $("#werr").textContent = error.message; return; } APP.rerender(); };
    $("#wf").onsubmit = (e) => { e.preventDefault(); call("waitlist_add", { p_name: $("#wn").value, p_phone: $("#wp").value, p_service: $("#ws").value, p_staff: $("#wm").value, p_note: "" }); };
    document.querySelectorAll("button[data-w]").forEach((b) => (b.onclick = () => call("waitlist_set", { p_id: b.closest("[data-id]").dataset.id, p_status: b.dataset.w })));
  } });
})();
