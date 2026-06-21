(function () {
  const $ = id => document.getElementById(id);
  const roleLabels = { 0: "ALL", 1: "MOD", 2: "ADMIN", 3: "PREMIUM", 4: "DEV" };
  let allCmds = [], activeCat = "all";

  function fmt(n) { return String(n).padStart(2, "0"); }

  function clock() {
    const now = new Date();
    const el = $("footerTime");
    if (el) el.textContent = `${fmt(now.getHours())}:${fmt(now.getMinutes())}:${fmt(now.getSeconds())}`;
  }
  setInterval(clock, 1000); clock();

  async function fetchJSON(url) {
    try { const r = await fetch(url); return await r.json(); }
    catch { return null; }
  }

  function statusClass(s) {
    const m = { running: "s-running", stopped: "s-stopped", crashed: "s-crashed", dead: "s-dead", restarting: "s-restarting", switching: "s-switching", starting: "s-starting" };
    return m[s] || "s-stopped";
  }

  function renderBots(bots) {
    const el = $("botList");
    const badge = $("botBadge");
    const running = (bots || []).filter(b => b.status === "running").length;
    if (badge) badge.textContent = (bots || []).length;

    const pill = $("globalStatus");
    if (pill) {
      if (running > 0) {
        pill.className = "status-pill";
        pill.querySelector(".pill-text").textContent = `${running} ONLINE`;
      } else {
        pill.className = "status-pill offline";
        pill.querySelector(".pill-text").textContent = "OFFLINE";
      }
    }

    if (!bots || bots.length === 0) {
      el.innerHTML = `<div class="empty-state"><span>No bots running</span></div>`;
      return;
    }

    el.innerHTML = bots.map(b => {
      const sc = statusClass(b.status);
      const accName = (b.accountFile || "").split("/").pop() || "—";
      return `<div class="bot-card ${sc}">
        <div class="bot-status-dot"></div>
        <div class="bot-info">
          <div class="bot-name">BOT-${b.id}</div>
          <div class="bot-acc">${accName}</div>
        </div>
        <div class="bot-meta">
          <div class="status-tag">${(b.status || "?").toUpperCase()}</div>
          <div class="bot-crashes">${b.restartCount || 0} crash(es)</div>
        </div>
      </div>`;
    }).join("");
  }

  function renderAccounts(accounts) {
    const el = $("accList");
    const badge = $("accBadge");
    if (badge) badge.textContent = (accounts || []).length;
    if (!accounts || accounts.length === 0) {
      el.innerHTML = `<div class="empty-state"><span>No account files found</span></div>`;
      return;
    }
    el.innerHTML = accounts.map(a => {
      const cls = a.inUse ? "acc-inuse" : a.valid ? "acc-ready" : "acc-empty";
      const label = a.inUse ? "IN USE" : a.valid ? "READY" : "EMPTY";
      return `<div class="acc-card ${cls}">
        <div class="acc-idx">${a.index}</div>
        <div class="acc-info">
          <div class="acc-name">${a.name}</div>
          <div class="acc-sub">${label}</div>
        </div>
        <div class="acc-dot"></div>
      </div>`;
    }).join("");
  }

  function renderCmds(cmds) {
    const grid = $("cmdGrid");
    const badge = $("cmdBadge");
    const tabs = $("filterTabs");
    if (badge) badge.textContent = cmds.length;

    const cats = ["all", ...new Set(cmds.map(c => c.category).filter(Boolean).sort())];
    if (tabs) {
      tabs.innerHTML = cats.map(c =>
        `<button class="ftab${c === activeCat ? " active" : ""}" data-cat="${c}">${c.toUpperCase()}</button>`
      ).join("");
      tabs.querySelectorAll(".ftab").forEach(btn => {
        btn.addEventListener("click", () => {
          activeCat = btn.dataset.cat;
          tabs.querySelectorAll(".ftab").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          filterCmds();
        });
      });
    }

    if (!cmds || cmds.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span>No commands found</span></div>`;
      return;
    }

    grid.innerHTML = cmds.map(c => {
      const roleN = c.role || 0;
      const aliases = c.aliases?.length ? `<span class="cmd-aliases">/ ${c.aliases.join(", ")}</span>` : "";
      const desc = c.description ? `<div class="cmd-desc">${c.description}</div>` : "";
      return `<div class="cmd-card" data-cat="${c.category || "other"}" data-name="${(c.name || "").toLowerCase()}" data-desc="${(c.description || "").toLowerCase()}">
        <div class="cmd-top">
          <span class="cmd-prefix">.</span><span class="cmd-name">${c.name}</span>
          <span class="cmd-role role-${roleN}">${roleLabels[roleN] || "ADMIN"}</span>
        </div>
        ${desc}
        <div class="cmd-meta">
          <span class="cmd-cat">${c.category || "other"}</span>
          ${c.author ? `<span class="cmd-author">${c.author}</span>` : ""}
          ${aliases}
        </div>
      </div>`;
    }).join("");

    filterCmds();
  }

  function filterCmds() {
    const q = ($("cmdSearch")?.value || "").toLowerCase();
    document.querySelectorAll(".cmd-card").forEach(card => {
      const cat = card.dataset.cat;
      const catMatch = activeCat === "all" || cat === activeCat;
      const searchMatch = !q || card.dataset.name.includes(q) || card.dataset.desc.includes(q);
      card.classList.toggle("hidden", !(catMatch && searchMatch));
    });
  }

  $("cmdSearch")?.addEventListener("input", filterCmds);

  function renderSystem(sys) {
    if (!sys) return;
    const u = $("statUptime"); if (u) u.textContent = sys.uptime?.formatted || "—";
    const m = $("statMem"); if (m) m.textContent = `${sys.memory?.rss || "—"} MB`;
  }

  async function refresh() {
    const [botsData, accsData, sysData] = await Promise.all([
      fetchJSON("/api/bots"),
      fetchJSON("/api/accounts"),
      fetchJSON("/api/system")
    ]);

    if (botsData) renderBots(botsData.bots || []);
    if (accsData) renderAccounts(accsData);
    renderSystem(sysData);

    const botCount = (botsData?.bots || []).filter(b => b.status === "running").length;
    const accCount = (accsData || []).length;
    const el = $("statBots"); if (el) el.textContent = botCount;
    const ae = $("statAccounts"); if (ae) ae.textContent = accCount;
  }

  async function loadCommands() {
    const cmds = await fetchJSON("/api/commands");
    allCmds = cmds || [];
    const ce = $("statCmds"); if (ce) ce.textContent = allCmds.length;
    renderCmds(allCmds);
  }

  refresh();
  loadCommands();
  setInterval(refresh, 5000);
})();
