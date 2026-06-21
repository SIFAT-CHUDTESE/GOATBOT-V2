"use strict";

const fs   = require("fs-extra");
const path = require("path");

const CONFIG_FILE = path.join(process.cwd(), "config.json");

const SEP  = "━━━━━━━━━━━━━━━━━━━━━";
const SEP2 = "─────────────────────";
const ON   = "✅ ON";
const OFF  = "⛔ OFF";

function box(title, lines, footer) {
    const body = lines.filter(l => l != null).join("\n");
    const foot = footer ? `\n${SEP2}\n${footer}` : "";
    return `『 ${title} 』\n${SEP}\n${body}${foot}`;
}
function ok(m)   { return `✅ ${m}`; }
function fail(m) { return `❌ ${m}`; }
function warn(m) { return `⚠️ ${m}`; }
function tip(m)  { return `💡 ${m}`; }

function getCfg() {
    return fs.readJsonSync(CONFIG_FILE);
}
function saveCfg(cfg) {
    fs.writeJsonSync(CONFIG_FILE, cfg, { spaces: 2 });
    global.GoatBot.config = { ...global.GoatBot.config, ...cfg };
}
function getUserWL(cfg) {
    return cfg.whiteListMode || { enable: false, whiteListIds: [] };
}
function getThreadWL(cfg) {
    return cfg.whiteListModeThread || { enable: false, whiteListThreadIds: [] };
}

function resolveUIDs(args, event, offset = 0) {
    const mentions = Object.keys(event.mentions || {});
    if (mentions.length) return mentions;
    if (event.messageReply?.senderID) return [event.messageReply.senderID];
    const ids = args.slice(offset).filter(a => /^\d{6,}$/.test(a));
    return ids;
}
function resolveThreadIDs(args, event, offset = 0) {
    const raw = args.slice(offset);
    if (raw[0] === "here" || raw[0] === "this" || !raw.length)
        return [event.threadID];
    return raw.filter(a => /^\d{6,}$/.test(a));
}

async function getUserName(api, uid) {
    try {
        const r = await new Promise((rs, rj) =>
            api.getUserInfo(uid, (e, x) => e ? rj(e) : rs(x)));
        return r?.[uid]?.name || "Unknown";
    } catch { return "Unknown"; }
}
async function getThreadName(api, tid) {
    try {
        const r = await new Promise((rs, rj) =>
            api.getThreadInfo(tid, (e, x) => e ? rj(e) : rs(x)));
        return r?.threadName || r?.name || "Unnamed";
    } catch { return "Unknown"; }
}

module.exports = {
    config: {
        name             : "wl",
        aliases          : ["whitelist"],
        version          : "2.0.0",
        author           : "SIFAT",
        countDown        : 3,
        role             : 2,
        shortDescription : { en: "Whitelist system" },
        longDescription  : { en: "Control who can use the bot — by user ID or thread ID" },
        category         : "owner",
        guide            : { en: "{pn} help" },
    },

    langs: {
        en: {
            noUID    : "⌀ Tag / Reply / provide a UID",
            noTID    : "⌀ Provide a thread ID or use 'here'",
            notFound : "⌀ Not found in whitelist",
        }
    },

    onStart: async function ({ api, event, args, message, getLang, prefix }) {
        const reply = t => message.reply(t);
        const P     = prefix || global.GoatBot?.config?.prefix || ".";
        const sub   = (args[0] || "status").toLowerCase();
        const rest  = args.slice(1);


        if (sub === "help" || sub === "?") {
            return reply(box("🛡️ WHITELIST SYSTEM", [
                "👤 USER WHITELIST",
                `  wl user on/off       — enable / disable`,
                `  wl user add          — add (tag / reply / uid)`,
                `  wl user del          — remove (tag / reply / uid)`,
                `  wl user list         — show all whitelisted users`,
                `  wl user check        — check if user is listed`,
                `  wl user clear        — clear all users`,
                SEP2,
                "💬 THREAD WHITELIST",
                `  wl thread on/off     — enable / disable`,
                `  wl thread add [id]   — add thread (or 'here')`,
                `  wl thread del [id]   — remove thread (or 'here')`,
                `  wl thread list       — show all whitelisted threads`,
                `  wl thread here       — add current thread`,
                `  wl thread clear      — clear all threads`,
                SEP2,
                "⚙️ OTHER",
                `  wl status            — full overview`,
                `  wl reset             — disable all + clear lists`,
                SEP2,
                tip("Both modes ON = user OR thread must match"),
                tip("Only one mode ON = that mode is enforced"),
            ], `${P}wl <subcommand>`));
        }


        if (sub === "status" || sub === "stat" || sub === "info") {
            const cfg      = getCfg();
            const uwl      = getUserWL(cfg);
            const twl      = getThreadWL(cfg);
            const uCount   = (uwl.whiteListIds || []).length;
            const tCount   = (twl.whiteListThreadIds || []).length;

            let modeNote = "";
            if (uwl.enable && twl.enable)
                modeNote = "🔀 Both ON — user OR thread must match";
            else if (uwl.enable)
                modeNote = "👤 User whitelist enforced";
            else if (twl.enable)
                modeNote = "💬 Thread whitelist enforced";
            else
                modeNote = "🔓 Whitelist OFF — everyone can use bot";

            return reply(box("🛡️ WHITELIST STATUS", [
                `👤 User mode   : ${uwl.enable ? ON : OFF}`,
                `   Users listed : ${uCount}`,
                SEP2,
                `💬 Thread mode : ${twl.enable ? ON : OFF}`,
                `   Threads listed: ${tCount}`,
                SEP2,
                modeNote,
            ], `${P}wl help — see all commands`));
        }


        if (sub === "user" || sub === "u") {
            const op = (rest[0] || "list").toLowerCase();
            const cfg = getCfg();
            const uwl = getUserWL(cfg);
            if (!uwl.whiteListIds) uwl.whiteListIds = [];


            if (op === "on" || op === "enable") {
                uwl.enable = true;
                cfg.whiteListMode = uwl;
                saveCfg(cfg);
                return reply(ok(`User whitelist ${ON}\nOnly whitelisted users can use the bot.`));
            }
            if (op === "off" || op === "disable") {
                uwl.enable = false;
                cfg.whiteListMode = uwl;
                saveCfg(cfg);
                return reply(ok(`User whitelist ${OFF}\nAll users can use the bot.`));
            }


            if (op === "add" || op === "a") {
                const uids = resolveUIDs(rest, event, 1);
                if (!uids.length) return reply(getLang("noUID"));
                const added = [], already = [];
                for (const uid of uids) {
                    if (uwl.whiteListIds.includes(uid)) { already.push(uid); continue; }
                    uwl.whiteListIds.push(uid);
                    added.push(uid);
                }
                cfg.whiteListMode = uwl;
                saveCfg(cfg);

                const names = await Promise.all(
                    added.map(async id => {
                        const name = await getUserName(api, id);
                        return `  ◦ ${name} [${id}]`;
                    })
                );
                const lines = [];
                if (added.length)   lines.push(`✅ Added (${added.length}):`, ...names);
                if (already.length) lines.push(`⌀ Already listed: ${already.join(", ")}`);
                lines.push(SEP2, `📋 Total: ${uwl.whiteListIds.length} user(s)`);
                if (!uwl.enable) lines.push(warn("User whitelist is OFF — run: wl user on"));
                return reply(box("👤 USER WHITELIST — ADD", lines));
            }


            if (op === "del" || op === "remove" || op === "rm") {
                const uids = resolveUIDs(rest, event, 1);
                if (!uids.length) return reply(getLang("noUID"));
                const removed = [], notFound = [];
                for (const uid of uids) {
                    if (!uwl.whiteListIds.includes(uid)) { notFound.push(uid); continue; }
                    uwl.whiteListIds = uwl.whiteListIds.filter(x => x !== uid);
                    removed.push(uid);
                }
                cfg.whiteListMode = uwl;
                saveCfg(cfg);

                const lines = [];
                if (removed.length)  lines.push(`✅ Removed (${removed.length}): ${removed.join(", ")}`);
                if (notFound.length) lines.push(`⌀ Not found: ${notFound.join(", ")}`);
                lines.push(`📋 Remaining: ${uwl.whiteListIds.length} user(s)`);
                return reply(box("👤 USER WHITELIST — REMOVE", lines));
            }


            if (op === "check") {
                const uids = resolveUIDs(rest, event, 1);
                if (!uids.length) return reply(getLang("noUID"));
                const lines = await Promise.all(uids.map(async uid => {
                    const name    = await getUserName(api, uid);
                    const listed  = uwl.whiteListIds.includes(uid);
                    return `${listed ? "✅" : "❌"} ${name} [${uid}] — ${listed ? "Whitelisted" : "Not listed"}`;
                }));
                return reply(box("👤 USER WHITELIST — CHECK", lines, `Mode: ${uwl.enable ? ON : OFF}`));
            }


            if (op === "clear" || op === "reset") {
                const count = uwl.whiteListIds.length;
                uwl.whiteListIds = [];
                cfg.whiteListMode = uwl;
                saveCfg(cfg);
                return reply(ok(`Cleared ${count} user(s) from whitelist.`));
            }


            if (op === "list" || op === "ls" || op === "show") {
                const ids = uwl.whiteListIds;
                if (!ids.length) return reply(warn("No users in whitelist.\nUse: wl user add"));
                const lines = await Promise.all(ids.map(async (id, i) => {
                    const name = await getUserName(api, id);
                    return `  ${i + 1}. ${name}\n     └ ${id}`;
                }));
                return reply(box(`👤 USER WHITELIST (${ids.length})`, [
                    `Mode: ${uwl.enable ? ON : OFF}`,
                    SEP2,
                    ...lines,
                ], `Total: ${ids.length} user(s)`));
            }

            return reply(warn("Usage: wl user on/off/add/del/list/check/clear"));
        }


        if (sub === "thread" || sub === "t" || sub === "grp" || sub === "group") {
            const op  = (rest[0] || "list").toLowerCase();
            const cfg = getCfg();
            const twl = getThreadWL(cfg);
            if (!twl.whiteListThreadIds) twl.whiteListThreadIds = [];


            if (op === "here") {
                const tid = event.threadID;
                if (twl.whiteListThreadIds.includes(tid))
                    return reply(warn(`This thread is already whitelisted.\nID: ${tid}`));
                twl.whiteListThreadIds.push(tid);
                cfg.whiteListModeThread = twl;
                saveCfg(cfg);
                const tname = await getThreadName(api, tid);
                const lines = [
                    `✅ Added current thread`,
                    `  ◦ ${tname}`,
                    `  ◦ ${tid}`,
                    SEP2,
                    `📋 Total: ${twl.whiteListThreadIds.length} thread(s)`,
                ];
                if (!twl.enable) lines.push(warn("Thread whitelist is OFF — run: wl thread on"));
                return reply(box("💬 THREAD WHITELIST — HERE", lines));
            }


            if (op === "on" || op === "enable") {
                twl.enable = true;
                cfg.whiteListModeThread = twl;
                saveCfg(cfg);
                return reply(ok(`Thread whitelist ${ON}\nOnly whitelisted threads can use the bot.`));
            }
            if (op === "off" || op === "disable") {
                twl.enable = false;
                cfg.whiteListModeThread = twl;
                saveCfg(cfg);
                return reply(ok(`Thread whitelist ${OFF}\nAll threads can use the bot.`));
            }


            if (op === "add" || op === "a") {
                const tids = resolveThreadIDs(rest, event, 1);
                if (!tids.length) return reply(getLang("noTID"));
                const added = [], already = [];
                for (const tid of tids) {
                    if (twl.whiteListThreadIds.includes(tid)) { already.push(tid); continue; }
                    twl.whiteListThreadIds.push(tid);
                    added.push(tid);
                }
                cfg.whiteListModeThread = twl;
                saveCfg(cfg);

                const names = await Promise.all(
                    added.map(async tid => {
                        const name = await getThreadName(api, tid);
                        return `  ◦ ${name}\n    └ ${tid}`;
                    })
                );
                const lines = [];
                if (added.length)   lines.push(`✅ Added (${added.length}):`, ...names);
                if (already.length) lines.push(`⌀ Already listed: ${already.join(", ")}`);
                lines.push(SEP2, `📋 Total: ${twl.whiteListThreadIds.length} thread(s)`);
                if (!twl.enable) lines.push(warn("Thread whitelist is OFF — run: wl thread on"));
                return reply(box("💬 THREAD WHITELIST — ADD", lines));
            }


            if (op === "del" || op === "remove" || op === "rm") {
                const tids = resolveThreadIDs(rest, event, 1);
                if (!tids.length) return reply(getLang("noTID"));
                const removed = [], notFound = [];
                for (const tid of tids) {
                    if (!twl.whiteListThreadIds.includes(tid)) { notFound.push(tid); continue; }
                    twl.whiteListThreadIds = twl.whiteListThreadIds.filter(x => x !== tid);
                    removed.push(tid);
                }
                cfg.whiteListModeThread = twl;
                saveCfg(cfg);

                const lines = [];
                if (removed.length)  lines.push(`✅ Removed (${removed.length}): ${removed.join(", ")}`);
                if (notFound.length) lines.push(`⌀ Not found: ${notFound.join(", ")}`);
                lines.push(`📋 Remaining: ${twl.whiteListThreadIds.length} thread(s)`);
                return reply(box("💬 THREAD WHITELIST — REMOVE", lines));
            }


            if (op === "list" || op === "ls" || op === "show") {
                const ids = twl.whiteListThreadIds;
                if (!ids.length) return reply(warn("No threads in whitelist.\nUse: wl thread add here"));
                const lines = await Promise.all(ids.map(async (tid, i) => {
                    const name = await getThreadName(api, tid);
                    return `  ${i + 1}. ${name}\n     └ ${tid}`;
                }));
                return reply(box(`💬 THREAD WHITELIST (${ids.length})`, [
                    `Mode: ${twl.enable ? ON : OFF}`,
                    SEP2,
                    ...lines,
                ], `Total: ${ids.length} thread(s)`));
            }


            if (op === "clear" || op === "reset") {
                const count = twl.whiteListThreadIds.length;
                twl.whiteListThreadIds = [];
                cfg.whiteListModeThread = twl;
                saveCfg(cfg);
                return reply(ok(`Cleared ${count} thread(s) from whitelist.`));
            }

            return reply(warn("Usage: wl thread on/off/add/del/list/here/clear"));
        }


        if (sub === "reset" || sub === "clear") {
            const cfg = getCfg();
            cfg.whiteListMode        = { enable: false, whiteListIds: [] };
            cfg.whiteListModeThread  = { enable: false, whiteListThreadIds: [] };
            saveCfg(cfg);
            return reply(ok("Whitelist fully reset.\n• User mode: OFF\n• Thread mode: OFF\n• All lists cleared."));
        }


        if (sub === "on") {
            const cfg = getCfg();
            cfg.whiteListMode.enable       = true;
            cfg.whiteListModeThread.enable = true;
            saveCfg(cfg);
            return reply(ok(`Both whitelists ${ON}\nUser + Thread mode active.`));
        }
        if (sub === "off") {
            const cfg = getCfg();
            cfg.whiteListMode.enable       = false;
            cfg.whiteListModeThread.enable = false;
            saveCfg(cfg);
            return reply(ok(`Both whitelists ${OFF}\nEveryone can use the bot.`));
        }

        return reply(warn(`Unknown: "${sub}"\nTry: ${P}wl help`));
    },
};
