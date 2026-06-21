"use strict";

if (!global.temp._cwarnCooldown) global.temp._cwarnCooldown = new Map();

const KICK_COOLDOWN_MS = 10000;

function isCoolingDown(threadID, uid) {
    const key = `${threadID}:${uid}`;
    const last = global.temp._cwarnCooldown.get(key) || 0;
    return (Date.now() - last) < KICK_COOLDOWN_MS;
}

function setCooldown(threadID, uid) {
    global.temp._cwarnCooldown.set(`${threadID}:${uid}`, Date.now());
}

function getWarnCount(data, uid) {
    if (!data) return 0;

    if (data.warnList && data.warnList[uid] !== undefined) {
        return data.warnList[uid]?.count || 0;
    }

    if (Array.isArray(data.warn)) {
        const entry = data.warn.find(e => String(e.userID) === String(uid));
        return entry?.list || 0;
    }

    return 0;
}

module.exports = {
    config: {
        name:     "checkwarn",
        version:  "2.0.0",
        author:   "SIFAT",
        category: "events"
    },

    langs: {
        en: {
            rejoinBanned:
                "⚠️ %1 rejoined but has %2 active warning(s) and has been removed.\n" +
                "◈ UID: %3\n" +
                "◈ Use .reactby clearwarn @user to pardon them.",
            needPermission:
                "❌ Bot needs group admin rights to remove warned members.",
            rejoinWarned:
                "⚠️ Welcome back %1 — you currently have %2 warning(s). " +
                "Reach %3 and you will be auto-removed."
        }
    },

    onStart: async ({ threadsData, message, event, api, getLang }) => {
        if (event.logMessageType !== "log:subscribe") return;

        return async function () {
            const { threadID } = event;
            const { addedParticipants = [] } = event.logMessageData || {};
            if (!addedParticipants.length) return;

            const botID = String(api.getCurrentUserID());

            let threadInfo;
            try { threadInfo = await api.getThreadInfo(threadID); }
            catch (_) { return; }

            const adminIDs = threadInfo.adminIDs.map(a => String(a.id));
            const botIsAdmin = adminIDs.includes(botID);

            const threadData = await threadsData.get(threadID);
            const data = threadData?.data || {};

            const reactByCfg = global.GoatBot?.config?.reactBy || {};
            const groupCfg   = data.reactBy || {};
            const maxWarns   = groupCfg.maxWarns ?? reactByCfg.maxWarns ?? 3;

            for (const user of addedParticipants) {
                const uid      = String(user.userFbId);
                const fullName = user.fullName || "Member";

                if (uid === botID) continue;

                const warnCount = getWarnCount(data, uid);
                if (!warnCount) continue;

                if (isCoolingDown(threadID, uid)) continue;
                setCooldown(threadID, uid);

                if (warnCount >= maxWarns) {
                    if (!botIsAdmin) {
                        message.send(getLang("needPermission"), threadID);
                        continue;
                    }
                    try {
                        await api.removeUserFromGroup(uid, threadID);
                        message.send({
                            body: getLang("rejoinBanned", fullName, warnCount, uid),
                            mentions: [{ tag: fullName, id: uid }]
                        }, threadID);
                    } catch (_) {
                        message.send(getLang("needPermission"), threadID);
                    }
                } else {
                    message.send({
                        body: getLang("rejoinWarned", fullName, warnCount, maxWarns),
                        mentions: [{ tag: fullName, id: uid }]
                    }, threadID);
                }
            }
        };
    }
};
