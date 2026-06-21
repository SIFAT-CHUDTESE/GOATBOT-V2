"use strict";

if (!global.temp.reactByMsgCache) global.temp.reactByMsgCache = new Map();

const MSG_CACHE_MAX = 3000;

function cacheMsg(messageID, senderID) {
    const cache = global.temp.reactByMsgCache;
    cache.set(messageID, senderID);
    if (cache.size > MSG_CACHE_MAX) {
        cache.delete(cache.keys().next().value);
    }
}

function getDefaultCfg() {
    const g = global.GoatBot?.config?.reactBy || {};
    return {
        enable:    g.enable    ?? true,
        adminOnly: g.adminOnly ?? false,
        maxWarns:  g.maxWarns  ?? 3,
        delete:    g.delete    || ["🤬", "😡"],
        kick:      g.kick      || ["🖕", "🦵"],
        warn:      g.warn      || ["⚠️"],
        adduser:   g.adduser   || ["🫂"]
    };
}

function mergeConfig(threadData) {
    const def  = getDefaultCfg();
    const saved = threadData?.data?.reactBy || {};
    return { ...def, ...saved };
}

function isBotLevel(uid) {
    const cfg = global.GoatBot?.config || {};
    return [
        ...(cfg.adminBot     || []),
        ...(cfg.devUsers     || []),
        ...(cfg.premiumUsers || [])
    ].map(String).includes(String(uid));
}

module.exports = {
    config: {
        name:        "reactby",
        version:     "1.0.0",
        author:      "SIFAT",
        category:    "events",
        description: "React with emojis on messages to trigger actions: delete, kick, warn, add."
    },

    langs: {
        en: {
            warned:      "⚠️ %1 warned — %2/%3 warnings.",
            autoKicked:  "🦵 %1 auto-kicked after reaching %2 warnings.",
            kicked:      "🦵 %1 has been kicked.",
            added:       "🫂 Trying to re-add %1 ...",
            botNotAdmin: "❌ I need admin rights to perform this action.",
            noTarget:    "❌ Could not identify the message author.",
            selfProtect: "❌ Cannot perform action on an admin or bot."
        }
    },

    onStart: async function ({ api, event, threadsData, getLang }) {


        if (event.type === "message" || event.type === "message_reply") {
            const sid = event.senderID || event.author;
            if (event.messageID && sid) cacheMsg(event.messageID, sid);
            return;
        }


        if (event.type !== "message_reaction") return;
        if (!event.isGroup) return;

        return async function () {
            const { threadID, messageID, userID: reactorID, reaction, action } = event;


            if (action && action !== "add_reaction" && action !== "add") return;


            let threadData;
            try { threadData = await threadsData.get(threadID); } catch (_) { return; }
            const cfg = mergeConfig(threadData);
            if (!cfg.enable) return;


            let threadInfo;
            try { threadInfo = await api.getThreadInfo(threadID); } catch (_) { return; }

            const botID       = api.getCurrentUserID();
            const adminIDs    = threadInfo.adminIDs.map(a => String(a.id));
            const botIsAdmin  = adminIDs.includes(String(botID));


            const reactorIsGroupAdmin = adminIDs.includes(String(reactorID));
            const reactorIsBotLevel   = isBotLevel(reactorID);
            const reactorCanAct       = reactorIsGroupAdmin || reactorIsBotLevel;

            if (!reactorCanAct) return;
            if (cfg.adminOnly && !reactorIsGroupAdmin && !reactorIsBotLevel) return;


            const targetID = global.temp.reactByMsgCache?.get(messageID);
            if (!targetID) return api.sendMessage(getLang("noTarget"), threadID);


            if (String(targetID) === String(botID)) return;
            if (isBotLevel(targetID)) return;
            if (adminIDs.includes(String(targetID)) && !reactorIsBotLevel) {
                return api.sendMessage(getLang("selfProtect"), threadID);
            }


            let targetName = "Member";
            try {
                const info = await api.getUserInfo(targetID);
                targetName = info[targetID]?.name || "Member";
            } catch (_) {}


            if ((cfg.delete || []).includes(reaction)) {
                if (!botIsAdmin) return api.sendMessage(getLang("botNotAdmin"), threadID);
                try {
                    await api.unsendMessage(messageID);
                } catch (e) {
                    api.sendMessage(getLang("botNotAdmin"), threadID);
                }
                return;
            }


            if ((cfg.kick || []).includes(reaction)) {
                if (!botIsAdmin) return api.sendMessage(getLang("botNotAdmin"), threadID);
                try {
                    await api.removeUserFromGroup(String(targetID), threadID);
                    api.sendMessage({
                        body:     getLang("kicked", targetName),
                        mentions: [{ tag: targetName, id: targetID }]
                    }, threadID);
                } catch (_) {
                    api.sendMessage(getLang("botNotAdmin"), threadID);
                }
                return;
            }


            if ((cfg.warn || []).includes(reaction)) {
                const data     = threadData.data || {};
                const warnList = data.warnList   || {};

                if (!warnList[targetID]) warnList[targetID] = { count: 0, history: [] };
                warnList[targetID].count++;
                warnList[targetID].history.push({
                    time:   Date.now(),
                    by:     reactorID,
                    reason: "emoji warn (⚠️)"
                });

                const current  = warnList[targetID].count;
                const maxWarns = cfg.maxWarns || 3;

                data.warnList = warnList;
                try { await threadsData.set(threadID, data, "data"); } catch (_) {}

                if (current >= maxWarns) {

                    if (!botIsAdmin) return api.sendMessage(getLang("botNotAdmin"), threadID);
                    try {
                        await api.removeUserFromGroup(String(targetID), threadID);
                        api.sendMessage({
                            body:     getLang("autoKicked", targetName, maxWarns),
                            mentions: [{ tag: targetName, id: targetID }]
                        }, threadID);
                        warnList[targetID].count = 0;
                        data.warnList = warnList;
                        await threadsData.set(threadID, data, "data");
                    } catch (_) {
                        api.sendMessage(getLang("botNotAdmin"), threadID);
                    }
                } else {
                    api.sendMessage({
                        body:     getLang("warned", targetName, current, maxWarns),
                        mentions: [{ tag: targetName, id: targetID }]
                    }, threadID);
                }
                return;
            }


            if ((cfg.adduser || []).includes(reaction)) {
                if (!botIsAdmin) return api.sendMessage(getLang("botNotAdmin"), threadID);
                try {
                    await api.addUserToGroup(String(targetID), threadID);
                    api.sendMessage({
                        body:     getLang("added", targetName),
                        mentions: [{ tag: targetName, id: targetID }]
                    }, threadID);
                } catch (_) {
                    api.sendMessage(getLang("botNotAdmin"), threadID);
                }
                return;
            }
        };
    }
};
