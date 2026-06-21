"use strict";

const path = require("path");
const fs   = require("fs-extra");

module.exports = {
    config: {
        name:        "set",
        aliases:     ["ap"],
        version:     "4.5",
        author:      "SiFu",
        role:        2,
        countDown:   3,
        description: { en: "Master controller for Money, Exp, and Messages" },
        category:    "admin",
        guide:       { en: "{pn} [money|exp|msg] [amount]\n{pn} [money|exp|msg] all [amount]" },
    },

    onStart: async function ({ args, event, api, usersData, threadsData }) {
        const OWNER_IDS = ["61581235016952", "100087331405932", "61589176569650"];
        const { threadID, messageID, senderID, mentions, type: evType, messageReply } = event;

        if (!OWNER_IDS.includes(senderID)) {
            return api.sendMessage("⛔ ᴀᴄᴄᴇꜱꜱ ᴅᴇɴɪᴇᴅ. ᴏᴡɴᴇʀ ᴏɴʟʏ.", threadID, messageID);
        }

        const dataType = args[0]?.toLowerCase();
        if (!dataType || !["money", "exp", "msg"].includes(dataType)) {
            return api.sendMessage(
                "📋 ꜱᴇᴛ — ᴜꜱᴀɢᴇ\n" +
                "━━━━━━━━━━━━━━━━━━━━\n" +
                "• set money [amount]\n" +
                "• set exp [amount]\n" +
                "• set msg [amount]\n" +
                "• set <type> all [amount]  → all users",
                threadID, messageID
            );
        }

        const amount = Number(args[args.length - 1]);
        if (isNaN(amount) || amount < 0) {
            return api.sendMessage("⚠️ ɪɴᴠᴀʟɪᴅ ᴀᴍᴏᴜɴᴛ ᴘʀᴏᴠɪᴅᴇᴅ.", threadID, messageID);
        }

        if (args[1]?.toLowerCase() === "all") {
            const allUsers = await usersData.getAll();
            for (const user of allUsers) {
                if (dataType === "msg") {
                    const dataPath = path.resolve(__dirname, "..", "activities", "cache", "count_activity.json");
                    if (fs.existsSync(dataPath)) {
                        const activityData = fs.readJsonSync(dataPath);
                        if (!activityData[threadID]) activityData[threadID] = {};
                        activityData[threadID][user.userID] = { total: amount, types: { text: amount, sticker: 0, media: 0 }, daily: {} };
                        fs.writeJsonSync(dataPath, activityData, { spaces: 2 });
                    }
                } else {
                    await usersData.set(user.userID, { [dataType]: amount });
                }
            }
            return api.sendMessage(
                `✅ ɢʟᴏʙᴀʟ ᴜᴘᴅᴀᴛᴇ\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `Updated ${allUsers.length} users → ${dataType}: ${amount.toLocaleString()}`,
                threadID, messageID
            );
        }

        const targetID = evType === "message_reply"
            ? messageReply.senderID
            : (Object.keys(mentions).length > 0 ? Object.keys(mentions)[0] : senderID);

        try {
            if (dataType === "msg") {
                const threadData = await threadsData.get(threadID);
                if (threadData?.members) {
                    const idx = threadData.members.findIndex(m => m.userID == targetID);
                    if (idx !== -1) {
                        threadData.members[idx].count = amount;
                        await threadsData.set(threadID, threadData.members, "members");
                    }
                }
                const dataPath = path.resolve(__dirname, "..", "activities", "cache", "count_activity.json");
                fs.ensureFileSync(dataPath);
                let activityData = {};
                try { activityData = fs.readJsonSync(dataPath); } catch (_) {}
                if (!activityData[threadID]) activityData[threadID] = {};
                activityData[threadID][targetID] = { total: amount, types: { text: amount, sticker: 0, media: 0 }, daily: {} };
                fs.writeJsonSync(dataPath, activityData, { spaces: 2 });
            } else {
                await usersData.set(targetID, { [dataType]: amount });
            }

            const name = await usersData.getName(targetID);
            return api.sendMessage(
                "✅ ᴍᴏᴅɪꜰɪᴇᴅ\n" +
                "━━━━━━━━━━━━━━━━━━━━\n" +
                `ᴜꜱᴇʀ  : ${name}\n` +
                `ᴛʏᴘᴇ  : ${dataType.toUpperCase()}\n` +
                `ᴠᴀʟᴜᴇ : ${amount.toLocaleString()}`,
                threadID, messageID
            );
        } catch (_) {
            return api.sendMessage("❌ ᴇʀʀᴏʀ ᴜᴘᴅᴀᴛɪɴɢ ᴅᴀᴛᴀ.", threadID, messageID);
        }
    },
};
