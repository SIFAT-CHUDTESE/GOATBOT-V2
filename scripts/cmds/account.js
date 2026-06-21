"use strict";

const path = require("path");
const fs   = require("fs-extra");

const BASE_DIR = process.cwd();

function accDir(...parts) { return path.join(BASE_DIR, "accounts", ...parts); }

const RULE_STR = "─────────────────";

const ui = {
    box(title, lines, opts) {
        const body = (lines || []).filter(l => l != null).join("\n");
        const foot = opts?.footer ? `\n${RULE_STR}\n${opts.footer}` : "";
        return `【 ${title} 】\n${RULE_STR}\n${body}${foot}`;
    },
    kv(k, v, icon) { return `${icon ? icon + " " : ""}${k}: ${v}`; },
    get RULE() { return RULE_STR; },
    warn(t, m) { return `⚠️ ${t}\n${m}`; },
    error(t, m) { return `❌ ${t}\n${m}`; },
    success(t, m) { return `✅ ${t}\n${m}`; },
};

function circuitIcon(state) {
    if (state === "CLOSED")    return "🟢";
    if (state === "HALF_OPEN") return "🟡";
    return "🔴";
}

function scoreBar(score) {
    const filled = Math.round((score / 100) * 10);
    return "█".repeat(filled) + "░".repeat(10 - filled) + ` ${score}%`;
}

function healthLabel(score) {
    if (score >= 85) return "EXCELLENT";
    if (score >= 60) return "GOOD";
    if (score >= 35) return "FAIR";
    return "POOR";
}

function now() {
    return new Date().toLocaleString();
}

module.exports = {
    config: {
        name    : "account",
        aliases : ["acc", "acct", "accsw"],
        version : "2.0.0",
        author  : "SIFAT",
        role    : 2,
        shortDescription: { en: "Manage bot Facebook accounts" },
        longDescription : { en: "View health, switch, rescan, reset circuit breakers — full account management from Messenger." },
        category : "system",
        guide    : { en: "{pn} [status|list|switch|rescan|reset|info <n>|pin <n>]" },
        priority : 1,
        countDown: 3,
    },

    onStart: async function ({ api, event, args, message, prefix }) {
        const sub = (args[0] || "status").toLowerCase();
        const mgr = require("../../core/auth/accountRegistry");
        const pfx = prefix || global.GoatBot?.config?.prefix || "'";

        switch (sub) {
            case "status":
            case "s":
            case "info":
                return showStatus(message, mgr, pfx);

            case "list":
            case "ls":
            case "l":
                return showList(message, mgr, pfx);

            case "switch":
            case "sw":
            case "next":
                return doSwitch(message, mgr, args[1]);

            case "rescan":
            case "scan":
            case "refresh":
                return doRescan(message, mgr);

            case "reset":
            case "fix":
            case "repair":
                return doReset(message, mgr);

            case "detail":
            case "view":
                return showDetail(message, mgr, parseInt(args[1]) || 1);

            case "pin":
            case "prefer":
                return doPin(message, mgr, args[1]);

            case "help":
            case "h":
            default:
                return showHelp(message, pfx);
        }
    },
};

async function showStatus(message, mgr, pfx) {
    const stats = mgr.getStats();
    const cur   = stats.currentAccount || "none";

    const rows = [
        ui.kv("Active Account", cur, "📡"),
        ui.kv("Slot",           `${(stats.currentIndex ?? 0) + 1} / ${stats.totalAccounts}`, "🔢"),
        ui.kv("Available",      `${stats.availableAccounts} / ${stats.totalAccounts}`, "✅"),
        ui.kv("Total Switches", String(stats.switchCount), "↻"),
        ui.kv("Can Switch",     stats.canSwitch ? "✅ Yes" : "⏳ Cooldown active", "🔄"),
        ui.kv("Uptime",         stats.uptime || "?", "⏱️"),
        ui.RULE,
    ];

    if (stats.accounts?.length) {
        for (const a of stats.accounts) {
            const isCur = a.name === cur;
            const icon  = circuitIcon(a.circuitState);
            const label = isCur ? `${a.name}  ◄ ACTIVE` : a.name;
            rows.push(ui.kv(`${icon} ${label}`, healthLabel(a.score), ""));
            rows.push(ui.kv("  Health Bar",    scoreBar(a.score), ""));
            rows.push(ui.kv("  Circuit",       a.circuitState, ""));
            rows.push(ui.kv("  Failures",      String(a.failureCount), ""));
            rows.push(ui.RULE);
        }
    }

    rows.push(`💡 ${pfx}account switch  •  ${pfx}account rescan`);

    return message.reply(ui.box("🔐 ACCOUNT STATUS", rows, { footer: `checked at ${now()}` }));
}

async function showList(message, mgr, pfx) {
    const stats = mgr.getStats();
    const cur   = stats.currentAccount || "";

    if (!stats.accounts?.length) {
        return message.reply(ui.box("🔐 ACCOUNT LIST", [
            "❌ No accounts registered.",
            ui.RULE,
            "Add cookies to:",
            "  accounts/account2.txt",
            "Then run:",
            `  ${pfx}account rescan`,
        ]));
    }

    const items = stats.accounts.map((a, i) => {
        const active  = a.name === cur ? " ◄ ACTIVE" : "";
        const icon    = circuitIcon(a.circuitState);
        const bar     = scoreBar(a.score);
        return `${i + 1}. ${icon} ${a.name}${active}\n   ${bar}  •  ${a.circuitState}`;
    });

    items.push(ui.RULE);
    items.push(`📊 Total: ${stats.totalAccounts}  •  Available: ${stats.availableAccounts}`);

    return message.reply(ui.box("🔐 ACCOUNT LIST", items, { footer: `${pfx}account detail <n>  for full info` }));
}

async function showDetail(message, mgr, idx) {
    const stats = mgr.getStats();
    const acc   = stats.accounts?.[idx - 1];

    if (!acc) {
        return message.reply(ui.warn("Not Found", `No account at slot ${idx}. Valid range: 1–${stats.accounts?.length || 0}`));
    }

    const cur = stats.currentAccount || "";
    return message.reply(ui.box(`🔍 ACCOUNT ${idx} DETAIL`, [
        ui.kv("Slot",         String(idx),                                          "▸"),
        ui.kv("Filename",     acc.name,                                            "▸"),
        ui.kv("Status",       acc.name === cur ? "🟢 ACTIVE" : "⚪ STANDBY",       "▸"),
        ui.RULE,
        ui.kv("Health Score", scoreBar(acc.score),                                 "▸"),
        ui.kv("Health Grade", healthLabel(acc.score),                              "▸"),
        ui.kv("Circuit",      `${circuitIcon(acc.circuitState)} ${acc.circuitState}`, "▸"),
        ui.RULE,
        ui.kv("Failures",     String(acc.failureCount),                            "▸"),
        ui.kv("Successes",    String(acc.successCount || 0),                       "▸"),
    ], { footer: `checked at ${now()}` }));
}

async function doSwitch(message, mgr, targetArg) {
    if (targetArg && !isNaN(targetArg)) {
        return doSwitchToSlot(message, mgr, parseInt(targetArg));
    }

    if (mgr.isSingleAccount()) {
        const a2 = accDir("account2.txt");
        const a3 = accDir("account3.txt");
        const has2 = fs.existsSync(a2) && fs.statSync(a2).size > 10;
        const has3 = fs.existsSync(a3) && fs.statSync(a3).size > 10;

        if (!has2 && !has3) {
            return message.reply(ui.box("🔐 ACCOUNT SWITCH", [
                "❌ Only 1 account registered.",
                ui.RULE,
                "To enable failover, add more accounts:",
                "  accounts/account2.txt",
                "  accounts/account3.txt",
                "",
                "Then run:",
                "  !account rescan",
            ]));
        }

        mgr.rescanNow();
        if (mgr.isSingleAccount()) {
            return message.reply(ui.warn("Invalid Cookies", "account2.txt found but cookies appear invalid."));
        }
    }

    if (!mgr.canSwitch()) {
        const cd = mgr.getCooldownRemaining?.() || 20000;
        return message.reply(ui.warn("Cooldown Active", `Please wait ${Math.ceil(cd / 1000)}s before switching again.`));
    }

    const prev = mgr.getStats().currentAccount || "?";
    let switched = false;

    try {
        const fn = global.switchToNextAccount;
        if (typeof fn === "function") {
            switched = await fn("Manual switch via account switch");
        }
    } catch (_) {}

    if (!switched) {
        try { mgr.nextAccount?.("manual_switch"); switched = true; } catch (_) {}
    }

    const after = mgr.getStats().currentAccount || "?";

    if (switched) {
        return message.reply(ui.box("🔄 ACCOUNT SWITCH", [
            "✅ Switch complete!",
            ui.RULE,
            ui.kv("From", prev,  "▸"),
            ui.kv("To",   after, "▸"),
            ui.kv("Time", now(), "▸"),
            ui.RULE,
            "Bot is reconnecting with new account...",
        ]));
    }

    return message.reply(ui.warn("Switch Failed", `Could not switch automatically.\nCurrent: ${after}\nTry: !account rescan first.`));
}

async function doSwitchToSlot(message, mgr, slot) {
    const stats = mgr.getStats();
    const acc   = stats.accounts?.[slot - 1];

    if (!acc) return message.reply(ui.error("Invalid Slot", `Slot ${slot} doesn't exist. Valid: 1–${stats.accounts?.length || 1}`));
    if (acc.name === stats.currentAccount) return message.reply(ui.warn("Already Active", `${acc.name} is already active.`));
    if (!mgr.canSwitch()) return message.reply(ui.warn("Cooldown Active", "Wait a moment before switching."));

    try {
        const full = accDir(acc.name);
        const idx  = mgr.accounts.indexOf(full);
        if (idx > 0) { mgr.accounts.splice(idx, 1); mgr.accounts.unshift(full); mgr.currentIndex = 0; }
    } catch (_) {}

    const fn = global.switchToNextAccount;
    let ok = false;
    try { ok = await fn?.(`Switched to slot ${slot} via account switch ${slot}`); } catch (_) {}

    return message.reply(ok
        ? ui.box("🔄 ACCOUNT SWITCH", [
            `✅ Switched to slot ${slot}`,
            ui.RULE,
            ui.kv("Account", acc.name, "▸"),
            ui.kv("Time",    now(),    "▸"),
          ])
        : ui.warn("Partial Switch", `Pointer moved to ${acc.name}.\nFull reconnect may need bot restart.`)
    );
}

async function doRescan(message, mgr) {
    const before = mgr.accounts.length;
    let found = false;
    try { found = mgr.rescanNow(); } catch (_) {}
    const after = mgr.accounts.length;
    const stats = mgr.getStats();
    const added = after - before;

    if (added > 0 || found) {
        const names = stats.accounts.map((a, i) => `${i + 1}. ${a.name}`);
        return message.reply(ui.box("🔍 ACCOUNT RESCAN", [
            `✅ Found ${added} new account(s)!`,
            ui.RULE,
            ...names,
            ui.RULE,
            `Total: ${after}  •  Available: ${stats.availableAccounts}`,
            "Failover is now active.",
        ]));
    }

    return message.reply(ui.box("🔍 ACCOUNT RESCAN", [
        `ℹ️ No new accounts found.`,
        `Current total: ${after}`,
        ui.RULE,
        "To add more accounts:",
        "  1. Paste cookies into accounts/account2.txt",
        "  2. Run !account rescan again",
    ]));
}

async function doReset(message, mgr) {
    mgr.resetFailedAccounts();
    const stats = mgr.getStats();
    return message.reply(ui.box("🔧 ACCOUNT RESET", [
        "✅ All circuit breakers reset!",
        ui.RULE,
        ui.kv("Available", `${stats.availableAccounts} / ${stats.totalAccounts}`, "▸"),
        ui.kv("Can Switch", stats.canSwitch ? "✅ Yes" : "⏳ No",               "▸"),
        ui.kv("Time",       now(),                                               "▸"),
        ui.RULE,
        "All accounts are eligible for use again.",
    ]));
}

async function doPin(message, mgr, targetArg) {
    if (!targetArg) return message.reply(ui.warn("Usage", "!account pin <slot>  Example: !account pin 2"));

    const slot  = parseInt(targetArg);
    const stats = mgr.getStats();
    const acc   = stats.accounts?.[slot - 1];

    if (!acc) return message.reply(ui.error("Invalid Slot", `Slot ${slot} doesn't exist. Valid: 1–${stats.accounts?.length || 1}`));

    try {
        const { setPreferred } = require("../../core/auth/accountPreference.js");
        setPreferred(acc.name);
    } catch (_) {
        const full = accDir(acc.name);
        const idx  = mgr.accounts.indexOf(full);
        if (idx > 0) { mgr.accounts.splice(idx, 1); mgr.accounts.unshift(full); }
    }

    return message.reply(ui.box("📌 ACCOUNT PINNED", [
        `✅ ${acc.name} set as preferred account.`,
        ui.RULE,
        "On next startup, this account will be used first.",
    ]));
}

function showHelp(message, pfx) {
    return message.reply(ui.box("🔐 ACCOUNT MANAGER", [
        ui.kv("status",      "health dashboard of all accounts", "▸"),
        ui.kv("list",        "list all registered accounts",     "▸"),
        ui.kv("detail <n>",  "detailed info for account slot n", "▸"),
        ui.kv("switch",      "switch to next available account", "▸"),
        ui.kv("switch <n>",  "switch to specific account slot",  "▸"),
        ui.kv("pin <n>",     "set preferred account for startup","▸"),
        ui.kv("rescan",      "scan for newly added account files","▸"),
        ui.kv("reset",       "reset all circuit breakers",       "▸"),
        ui.RULE,
        `💡 Add cookies → accounts/account2.txt`,
        `   then run ${pfx}account rescan`,
    ], { footer: `${pfx}account status  to start` }));
}
