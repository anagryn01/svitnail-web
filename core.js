// Core: client, helpers, view registry, login, shell, router. Views register themselves via reg().
const sb = supabase.createClient(window.SVIT.url, window.SVIT.key);
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ROLE = { owner: "владелец", manager: "управляющая", admin: "администратор", master: "мастер", finance: "финансы", viewer: "просмотр" };
const MONEY = ["owner", "manager", "finance"];
const money = (n) => "$" + Math.round(Number(n || 0)).toLocaleString("en-US");
const VIEWS = [];
const reg = (v) => VIEWS.push(v);
let me = null, view = "today", openProc = null;
window.APP = { sb, $, esc, ROLE, MONEY, money, rerender: () => render(), get me() { return me; }, set openProc(v) { openProc = v; }, get openProc() { return openProc; } };

function loginView(msg) {
  $("#root").innerHTML = `<div class="login"><form id="f" class="card" style="padding:32px">
    <h1 style="font-size:26px">Вход</h1>
    <input id="em" type="email" placeholder="Почта" autocomplete="username" required>
    <input id="pw" type="password" placeholder="Пароль" autocomplete="current-password">
    <div class="err" id="er">${esc(msg || "")}</div>
    <button class="btn">Войти</button>
    <a href="#" id="ml" style="font-size:13px;color:var(--accent);text-decoration:none">Получить ссылку для входа на почту</a>
    <a href="#" id="fg" style="font-size:13px;color:var(--accent);text-decoration:none">Забыли пароль</a></form></div>`;
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email: $("#em").value.trim(), password: $("#pw").value });
    if (error) $("#er").textContent = "Неверная почта или пароль"; else boot();
  };
  $("#ml").onclick = async (e) => {
    e.preventDefault();
    const em = $("#em").value.trim();
    if (!em) { $("#er").textContent = "Введите почту"; return; }
    const { error } = await sb.auth.signInWithOtp({ email: em, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } });
    $("#er").textContent = error ? "Не получилось отправить, попробуйте через минуту" : "Ссылка отправлена на почту";
  };
  $("#fg").onclick = async (e) => {
    e.preventDefault();
    const em = $("#em").value.trim();
    if (!em) { $("#er").textContent = "Введите почту"; return; }
    await sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname });
    $("#er").textContent = "Если почта есть в системе, письмо отправлено";
  };
}

const allowed = (v) => !v.roles || v.roles.includes(me.role);

function shell(inner) {
  $("#root").innerHTML = `<div class="app"><nav><div class="logo">SVITNAIL <span>OS</span></div>
    ${VIEWS.filter(allowed).filter((v) => !v.hidden).map((v) => `<button data-k="${v.key}" class="${view === v.key ? "on" : ""}">${v.title}</button>`).join("")}
    <div class="who">${esc(me.name || "")}<br>${esc(ROLE[me.role] || me.role)}<br><button id="acc" style="color:#D9D6E6;padding:6px 0">Мой аккаунт</button><br><button id="out" style="color:#E58BD3;padding:6px 0">Выйти</button></div></nav>
    <main>${inner}</main></div>`;
  document.querySelectorAll("nav button[data-k]").forEach((b) => (b.onclick = () => { view = b.dataset.k; openProc = null; render(); }));
  $("#acc").onclick = () => { view = "account"; render(); };
  $("#out").onclick = async () => { await sb.auth.signOut(); loginView(); };
}

async function render() {
  shell(`<div class="lbl">Загрузка…</div>`);
  const v = VIEWS.find((x) => x.key === view && allowed(x)) || VIEWS[0];
  $("main").innerHTML = await v.render();
  if (v.bind) v.bind();
}

async function boot() {
  const { data: s } = await sb.auth.getSession();
  if (!s.session) return loginView();
  const { data, error } = await sb.rpc("me");
  if (error || !data.length) { await sb.auth.signOut(); return loginView("Для этой почты не выдан доступ"); }
  me = data[0];
  render();
}
sb.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY") { view = "account"; boot(); } });

/* ---- built-in views ---- */
reg({ key: "today", title: "Сегодня", async render() {
  if (!MONEY.includes(me.role)) return `<h1>Сегодня</h1><div class="card lbl">Задачи на сегодня появятся здесь.</div>`;
  const { data, error } = await sb.rpc("owner_kpis");
  if (error) return `<h1>Сегодня</h1><div class="card err">${esc(error.message)}</div>`;
  const rev = data.revenue || [], last = rev[rev.length - 1];
  const calls = (data.calls || []).filter((c) => c.calls_in > 0);
  const inC = calls.reduce((a, c) => a + c.calls_in, 0), miss = calls.reduce((a, c) => a + c.missed_in, 0);
  return `<h1>Сегодня</h1><div class="grid">
    <div class="card"><div class="lbl">Выручка, ${last ? last.month.slice(0, 7) : ""}</div><div class="big">${last ? money(last.revenue) : "—"}</div><div class="lbl">цель месяца $95 000</div></div>
    <div class="card"><div class="lbl">Пропущено входящих, 60 дней</div><div class="big" style="color:var(--bad)">${inC ? Math.round((100 * miss) / inC) + "%" : "—"}</div><div class="lbl">${miss} из ${inC}</div></div></div>
    <div class="card"><div class="lbl" style="margin-bottom:8px">Выручка по месяцам</div>${rev.slice(-8).map((r) => `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:14px"><span>${r.month.slice(0, 7)}</span><b>${money(r.revenue)}</b></div>`).join("")}</div>`;
} });

reg({ key: "chain", title: "Цепочка денег", render() {
  const s = [["1 Мастера", "мастеро-дни", "~43 → ~210"], ["2 Привлечение", "новые клиенты в месяц", "39 → 190"], ["3 Ответ и запись", "записей в месяц", "183 → ~700"], ["4 Визит", "отмены", "23% → ≤10%"], ["5 Услуга", "средний чек", "$154 → ≥$150"], ["6 Возврат", "выручка повторных", "$12,4k → $66,5k"], ["7 Репутация", "отзывы Google в месяц", "3 → 20"]];
  return `<h1>Цепочка денег</h1><div class="grid">${s.map(([a, b, c]) => `<div class="card"><b>${a}</b><div class="lbl">${b}</div><div class="big" style="font-size:22px">${c}</div></div>`).join("")}</div>`;
} });

reg({ key: "procs", title: "Процессы", async render() {
  const { data, error } = await sb.rpc("processes");
  if (error) return `<h1>Процессы</h1><div class="card err">${esc(error.message)}</div>`;
  if (openProc) {
    const p = data.find((x) => x.id === openProc);
    return `<h1>${esc(p.name)}</h1><div><button class="btn" id="bk" style="padding:8px 14px;background:#fff;color:var(--accent);border:1px solid var(--accent)">Все процессы</button></div>
      <div class="card">${p.stages.map((s, i) => `<div class="stage"><b>${i + 1}. ${esc(s.name)}</b>${s.steps.map((t) => `<div class="step"><span>${esc(t.title)}</span><span class="pill">${esc(t.agent ? "агент " + t.agent : ROLE[t.role] || t.role)}</span>${t.sla ? `<span class="pill">срок ${t.sla >= 1440 ? Math.round(t.sla / 1440) + " дн" : t.sla + " мин"}</span>` : ""}${t.auto ? `<span class="pill" style="background:#FBE9F8;color:var(--accent)">автоматизация</span>` : ""}</div>`).join("")}</div>`).join("")}</div>`;
  }
  return `<h1>Процессы</h1><div class="grid">${data.map((p) => `<div class="card proc" data-id="${p.id}"><b>${esc(p.name)}</b><div class="lbl">${p.stages.length} этапов, ${p.stages.reduce((a, s) => a + s.steps.length, 0)} шагов</div></div>`).join("")}</div>`;
}, bind() {
  document.querySelectorAll(".proc").forEach((c) => (c.onclick = () => { openProc = c.dataset.id; render(); }));
  const bk = $("#bk"); if (bk) bk.onclick = () => { openProc = null; render(); };
} });
