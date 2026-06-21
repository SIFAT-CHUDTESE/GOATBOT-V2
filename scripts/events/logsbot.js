"use strict";

const { getTime } = global.utils;

if (!global.temp._logsBotSent) global.temp._logsBotSent = new Set();

const DEDUP_TTL = 8000;

function dedupKey(threadID, type) {
    return `${threadID}:${type}:${Math.floor(Date.now() / DEDUP_TTL)}`;
}

function buildAddedMsg(authorName, authorID, threadName, threadID, memberCount, time) {
    return (
        `╔══ 𝗕𝗢𝗧 𝗟𝗢𝗚 ══╗\n` +
        `✅ 𝗔𝗗𝗗𝗘𝗗 𝗧𝗢 𝗚𝗥𝗢𝗨𝗣\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `◈ 𝗔𝗱𝗱𝗲𝗱 𝗯𝘆   : ${authorName}\n` +
        `◈ 𝗨𝘀𝗲𝗿 𝗜𝗗   : ${authorID}\n` +
        `◈ 𝗚𝗿𝗼𝘂𝗽      : ${threadName}\n` +
        `◈ 𝗧𝗵𝗿𝗲𝗮𝗱 𝗜𝗗  : ${threadID}\n` +
        `◈ 𝗠𝗲𝗺𝗯𝗲𝗿𝘀   : ${memberCount}\n` +
        `◈ 𝗧𝗶𝗺𝗲       : ${time}\n` +
        `╚══════════════════╝`
    );
}

function buildKickedMsg(authorName, authorID, threadName, threadID, time) {
    return (
        `╔══ 𝗕𝗢𝗧 𝗟𝗢𝗚 ══╗\n` +
        `❌ 𝗥𝗘𝗠𝗢𝗩𝗘𝗗 𝗙𝗥𝗢𝗠 𝗚𝗥𝗢𝗨𝗣\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `◈ 𝗞𝗶𝗰𝗸𝗲𝗱 𝗯𝘆  : ${authorName}\n` +
        `◈ 𝗨𝘀𝗲𝗿 𝗜𝗗   : ${authorID}\n` +
        `◈ 𝗚𝗿𝗼𝘂𝗽      : ${threadName}\n` +
        `◈ 𝗧𝗵𝗿𝗲𝗮𝗱 𝗜𝗗  : ${threadID}\n` +
        `◈ 𝗧𝗶𝗺𝗲       : ${time}\n` +
        `╚══════════════════╝`
    );
}

module.exports = {
    config: {
        name:      "logsbot",
        isBot:     true,
        version:   "2.0.0",
        author:    "SIFAT",
        envConfig: { allow: true },
        category:  "events"
    },

    onStart: async ({ usersData, threadsData, event, api }) => {
        const botID  = api.getCurrentUserID();
        const isAdd  =
            event.logMessageType === "log:subscribe" &&
            (event.logMessageData?.addedParticipants || []).some(p => p.userFbId == botID);
        const isKick =
            event.logMessageType === "log:unsubscribe" &&
            event.logMessageData?.leftParticipantFbId == botID;

        if (!isAdd && !isKick) return;

        return async function () {
            const { author, threadID } = event;
            if (String(author) === String(botID)) return;

            const key = dedupKey(threadID, isAdd ? "add" : "kick");
            if (global.temp._logsBotSent.has(key)) return;
            global.temp._logsBotSent.add(key);
            setTimeout(() => global.temp._logsBotSent.delete(key), DEDUP_TTL * 2);

            const time       = getTime("DD/MM/YYYY HH:mm:ss");
            const config     = global.GoatBot?.config || {};
            const adminList  = config.adminBot || [];

            let authorName = "Unknown";
            try { authorName = await usersData.getName(author); } catch (_) {}

            let threadName  = "Unknown Group";
            let memberCount = "?";

            if (isAdd) {
                try {
                    const tInfo  = await api.getThreadInfo(threadID);
                    threadName   = tInfo.threadName || "Unknown Group";
                    memberCount  = tInfo.participantIDs?.length || "?";

                    const nickName = config.nickNameBot;
                    if (nickName) {
                        try { api.changeNickname(nickName, threadID, botID); } catch (_) {}
                    }
                } catch (_) {}
            } else {
                try {
                    const td   = await threadsData.get(threadID);
                    threadName = td?.threadName || "Unknown Group";
                } catch (_) {}
            }

            const msg = isAdd
                ? buildAddedMsg(authorName, author, threadName, threadID, memberCount, time)
                : buildKickedMsg(authorName, author, threadName, threadID, time);

            for (const adminID of adminList) {
                try { await api.sendMessage(msg, adminID); } catch (_) {}
            }
        };
    }
};
