// Team: members, invitations by email and role. Account: change own password.
reg({ key: "team", title: "Команда и доступы", roles: ["owner", "manager"], async render() {
  const { data, error } = await sb.rpc("team");
  if (error) return `<h1>Команда и доступы</h1><div class="card err">${esc(error.message)}</div>`;
  const row = (m, tag) => `<div class="step"><b>${esc(m.name || m.email)}</b><span class="lbl">${esc(m.email)}</span><span class="pill">${esc(ROLE[m.role] || m.role)}</span>${tag ? `<span class="pill" style="background:#FFF0D6;color:var(--warn)">ждёт первого входа</span>` : ""}</div>`;
  const canInvite = me.role === "owner";
  return `<h1>Команда и доступы</h1>
    <div class="card">${data.members.map((m) => row(m, false)).join("")}${data.invites.map((m) => row(m, true)).join("")}</div>
    ${canInvite ? `<form id="inv" class="card" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
      <input id="ie" type="email" placeholder="Почта" required style="flex:2 1 200px">
      <input id="in" placeholder="Имя" required style="flex:1 1 140px">
      <select id="ir" style="flex:1 1 140px;border:1px solid var(--line);border-radius:10px;padding:12px;font:inherit;background:#FBFAFD">
        ${["manager", "admin", "master", "finance", "viewer"].map((r) => `<option value="${r}">${ROLE[r]}</option>`).join("")}
      </select>
      <button class="btn" style="flex:0 0 auto;padding:12px 20px">Добавить</button>
      <div class="err" id="ier" style="flex:1 1 100%"></div></form>` : ""}`;
}, bind() {
  const f = $("#inv"); if (!f) return;
  f.onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await sb.rpc("invite_member", { p_email: $("#ie").value.trim(), p_name: $("#in").value.trim(), p_role: $("#ir").value });
    if (error) $("#ier").textContent = "Не получилось: " + error.message; else APP.rerender();
  };
} });

reg({ key: "account", title: "Мой аккаунт", hidden: true, render() {
  return `<h1>Мой аккаунт</h1><form id="pf" class="card" style="max-width:420px;display:flex;flex-direction:column;gap:12px">
    <div class="lbl">${esc(me.name || "")}, ${esc(ROLE[me.role] || me.role)}</div>
    <input id="np" type="password" placeholder="Новый пароль, не короче 8 символов" minlength="8" autocomplete="new-password" required>
    <div class="err" id="pe"></div><button class="btn">Сохранить пароль</button></form>`;
}, bind() {
  $("#pf").onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.updateUser({ password: $("#np").value });
    $("#pe").style.color = error ? "var(--bad)" : "var(--ok)";
    $("#pe").textContent = error ? "Не получилось: " + error.message : "Пароль сохранён";
  };
} });
