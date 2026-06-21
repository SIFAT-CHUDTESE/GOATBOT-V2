"use strict";

const DEFAULT_CFG = {
    enable:    true,
    adminOnly: false,
    maxWarns:  3,
    delete:    ["🤬", "😡"],
    kick:      ["🖕", "🦵"],
    warn:      ["⚠️"],
    adduser:   ["🫂"]
};

function getCurrentCfg(threadData) {
    const global_cfg = global.GoatBot?.config?.reactBy || {};
    const saved      = threadData?.data?.reactBy || {};
    return Object.assign({}, DEFAULT_CFG, global_cfg, saved);
}

function fmtList(arr) {
    return arr && arr.length ? arr.join(" ") : "—";
}

function buildStatusText(cfg, threadID) {
    return (
        `╔══ 𝗥𝗘𝗔𝗖𝗧𝗕𝗬 𝗦𝗬𝗦𝗧𝗘𝗠 ══╗\n` +
        `◈ 𝗦𝘁𝗮𝘁𝘂𝘀   : ${cfg.enable    ? "✅ ON"  : "❌ OFF"}\n` +
        `◈ 𝗔𝗱𝗺𝗶𝗻𝗢𝗻𝗹𝘆: ${cfg.adminOnly ? "✅ ON"  : "❌ OFF"}\n` +
        `◈ 𝗠𝗮𝘅𝗪𝗮𝗿𝗻𝘀 : ${cfg.maxWarns}\n` +
        `╠══ 𝗘𝗺𝗼𝗷𝗶 𝗠𝗮𝗽𝗽𝗶𝗻𝗴𝘀 ══╣\n` +
        `🗑️  𝗗𝗲𝗹𝗲𝘁𝗲  : ${fmtList(cfg.delete)}\n` +
        `🦵  𝗞𝗶𝗰𝗸    : ${fmtList(cfg.kick)}\n` +
        `⚠️  𝗪𝗮𝗿𝗻    : ${fmtList(cfg.warn)}\n` +
        `🫂  𝗔𝗱𝗱𝗨𝘀𝗲𝗿 : ${fmtList(cfg.adduser)}\n` +
        `╚═════════════════════╝\n` +
        `ᴛʜʀᴇᴀᴅ: ${threadID}`
    );
}

module.exports = {
    config: {
        name:        "reactby",
        aliases:     ["rb"],
        version:     "1.0.0",
        author:      "SIFAT",
        countDown:   3,
        role:        1,
        description: { en: "Advanced reaction-action system control panel." },
        category:    "box chat",
        guide: {
            en:
                "  {pn} on/off           — enable/disable\n" +
                "  {pn} adminonly on/off  — restrict to group admins only\n" +
                "  {pn} maxwarns <N>      — warns before auto-kick\n" +
                "  {pn} set delete  🤬 😡 — emojis that delete a message\n" +
                "  {pn} set kick    🦵 🖕 — emojis that kick the author\n" +
                "  {pn} set warn    ⚠️    — emojis that warn the author\n" +
                "  {pn} set adduser 🫂    — emojis that re-add the author\n" +
                "  {pn} add <action> <emoji> — add emoji to an action\n" +
                "  {pn} remove <action> <emoji> — remove emoji from action\n" +
                "  {pn} clearwarn [@/uid/reply] — clear warns for a user\n" +
                "  {pn} warnlist         — show warn counts in this group\n" +
                "  {pn} status           — show current config\n" +
                "  {pn} reset            — reset to defaults"
        }
    },

    langs: {
        en: {
            enabled:        "✅ ReactBy system 𝗘𝗡𝗔𝗕𝗟𝗘𝗗 for this group.",
            disabled:       "❌ ReactBy system 𝗗𝗜𝗦𝗔𝗕𝗟𝗘𝗗 for this group.",
            adminOnOn:      "✅ AdminOnly mode 𝗢𝗡 — only group admins can trigger reactions.",
            adminOnOff:     "❌ AdminOnly mode 𝗢𝗙𝗙 — all members can trigger reactions.",
            maxWarnsSet:    "✅ MaxWarns set to %1. Users will be auto-kicked after %1 warnings.",
            invalidNum:     "❌ Please provide a valid number (1–10).",
            setOk:          "✅ %1 emojis set to: %2",
            addOk:          "✅ Added %1 to %2 action. Now: %3",
            removeOk:       "✅ Removed %1 from %2 action. Now: %3",
            alreadyIn:      "⚠️ %1 is already in the %2 action.",
            notIn:          "⚠️ %1 is not in the %2 action.",
            invalidAction:  "❌ Invalid action. Use: delete | kick | warn | adduser",
            noEmoji:        "❌ Please provide at least one emoji.",
            noArgs:         "❌ No arguments. Use {pn} to see the guide.",
            resetOk:        "✅ ReactBy config reset to defaults.",
            clearWarnOk:    "✅ Cleared %1 warnings for %2.",
            noWarn:         "⚠️ %1 has no warnings in this group.",
            noUID:          "❌ Tag someone, reply, or provide a UID.",
            warnListEmpty:  "📋 No warnings recorded in this group.",
            warnListHeader: "📋 𝗪𝗔𝗥𝗡 𝗟𝗜𝗦𝗧 (%1 users)\n━━━━━━━━━━━━━━\n",
            warnListItem:   "%1. %2 [%3] — %4 warn(s)\n",
            notGroup:       "❌ This command only works in group chats."
        }
    },

    onStart: async function ({ api, args, event, message, threadsData, usersData, getLang }) {
        const { threadID, senderID, mentions, messageReply } = event;

        if (!event.isGroup) return message.reply(getLang("notGroup"));

        const sub = (args[0] || "").toLowerCase();


        async function load() {
            const td = await threadsData.get(threadID);
            return td;
        }
        async function save(threadData, newCfg) {
            const data      = threadData.data || {};
            data.reactBy    = newCfg;
            await threadsData.set(threadID, data, "data");
        }


        if (!sub || sub === "status" || sub === "info") {
            const td  = await load();
            const cfg = getCurrentCfg(td);
            return message.reply(buildStatusText(cfg, threadID));
        }


        if (sub === "on" || sub === "off") {
            const td  = await load();
            const cfg = getCurrentCfg(td);
            cfg.enable = (sub === "on");
            await save(td, cfg);
            return message.reply(cfg.enable ? getLang("enabled") : getLang("disabled"));
        }


        if (sub === "adminonly" || sub === "adminOnly") {
            const val = (args[1] || "").toLowerCase();
            if (val !== "on" && val !== "off") {
                return message.reply(`Usage: ${event.body.split(" ")[0]} adminonly on/off`);
            }
            const td  = await load();
            const cfg = getCurrentCfg(td);
            cfg.adminOnly = (val === "on");
            await save(td, cfg);
            return message.reply(cfg.adminOnly ? getLang("adminOnOn") : getLang("adminOnOff"));
        }


        if (sub === "maxwarns" || sub === "maxwarn") {
            const n = parseInt(args[1]);
            if (isNaN(n) || n < 1 || n > 10) return message.reply(getLang("invalidNum"));
            const td  = await load();
            const cfg = getCurrentCfg(td);
            cfg.maxWarns = n;
            await save(td, cfg);
            return message.reply(getLang("maxWarnsSet", n));
        }


        if (sub === "set") {
            const action = (args[1] || "").toLowerCase();
            const validActions = ["delete", "kick", "warn", "adduser"];
            if (!validActions.includes(action)) return message.reply(getLang("invalidAction"));


            const emojiStr = args.slice(2).join(" ").trim();
            if (!emojiStr) return message.reply(getLang("noEmoji"));


            const emojis = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(emojiStr)]
                .map(s => s.segment.trim())
                .filter(Boolean);

            if (!emojis.length) return message.reply(getLang("noEmoji"));

            const td  = await load();
            const cfg = getCurrentCfg(td);
            cfg[action] = emojis;
            await save(td, cfg);
            return message.reply(getLang("setOk", action, fmtList(emojis)));
        }


        if (sub === "add") {
            const action = (args[1] || "").toLowerCase();
            const validActions = ["delete", "kick", "warn", "adduser"];
            if (!validActions.includes(action)) return message.reply(getLang("invalidAction"));

            const emojiStr = args.slice(2).join(" ").trim();
            if (!emojiStr) return message.reply(getLang("noEmoji"));

            const emojis = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(emojiStr)]
                .map(s => s.segment.trim()).filter(Boolean);

            const td  = await load();
            const cfg = getCurrentCfg(td);
            if (!cfg[action]) cfg[action] = [];

            const added = [];
            for (const e of emojis) {
                if (cfg[action].includes(e)) {

                } else {
                    cfg[action].push(e);
                    added.push(e);
                }
            }
            await save(td, cfg);
            return message.reply(getLang("addOk", added.join(" ") || emojis.join(" "), action, fmtList(cfg[action])));
        }


        if (sub === "remove" || sub === "rem") {
            const action = (args[1] || "").toLowerCase();
            const validActions = ["delete", "kick", "warn", "adduser"];
            if (!validActions.includes(action)) return message.reply(getLang("invalidAction"));

            const emojiStr = args.slice(2).join(" ").trim();
            if (!emojiStr) return message.reply(getLang("noEmoji"));

            const emojis = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(emojiStr)]
                .map(s => s.segment.trim()).filter(Boolean);

            const td  = await load();
            const cfg = getCurrentCfg(td);
            if (!cfg[action]) cfg[action] = [];

            for (const e of emojis) {
                const idx = cfg[action].indexOf(e);
                if (idx !== -1) cfg[action].splice(idx, 1);
            }
            await save(td, cfg);
            return message.reply(getLang("removeOk", emojis.join(" "), action, fmtList(cfg[action])));
        }


        if (sub === "clearwarn" || sub === "unwarn") {

            let targetID = null;
            const mentionKeys = Object.keys(mentions || {});
            if (mentionKeys.length) {
                targetID = mentionKeys[0];
            } else if (messageReply) {
                targetID = messageReply.senderID;
            } else if (args[1] && /^\d+$/.test(args[1])) {
                targetID = args[1];
            }

            if (!targetID) return message.reply(getLang("noUID"));

            const td       = await load();
            const data     = td.data || {};
            const warnList = data.warnList || {};

            if (!warnList[targetID] || !warnList[targetID].count) {
                let name = targetID;
                try { const i = await api.getUserInfo(targetID); name = i[targetID]?.name || targetID; } catch (_) {}
                return message.reply(getLang("noWarn", name));
            }

            const count = warnList[targetID].count;
            let name = targetID;
            try { const i = await api.getUserInfo(targetID); name = i[targetID]?.name || targetID; } catch (_) {}

            warnList[targetID] = { count: 0, history: [] };
            data.warnList = warnList;
            await threadsData.set(threadID, data, "data");

            return message.reply(getLang("clearWarnOk", count, name));
        }


        if (sub === "warnlist" || sub === "warns") {
            const td       = await load();
            const warnList = td?.data?.warnList || {};
            const entries  = Object.entries(warnList).filter(([, v]) => v.count > 0);

            if (!entries.length) return message.reply(getLang("warnListEmpty"));


            entries.sort((a, b) => b[1].count - a[1].count);

            let text = getLang("warnListHeader", entries.length);
            let idx  = 1;
            for (const [uid, val] of entries) {
                let name = uid;
                try { const i = await api.getUserInfo(uid); name = i[uid]?.name || uid; } catch (_) {}
                text += getLang("warnListItem", idx++, name, uid, val.count);
            }
            return message.reply(text.trim());
        }


        if (sub === "reset") {
            const td   = await load();
            const data = td.data || {};
            data.reactBy = { ...DEFAULT_CFG };
            await threadsData.set(threadID, data, "data");
            return message.reply(getLang("resetOk"));
        }


        return message.reply(getLang("noArgs").replace("{pn}", `${global.utils.getPrefix(threadID)}reactby`));
    }
};
