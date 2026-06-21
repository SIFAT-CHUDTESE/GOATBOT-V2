module.exports = {
    config: {
        name: "kick",
        version: "2.0",
        author: "SIFAT",
        countDown: 2,
        role: 1,
        description: {
            en: "Kick members by tag, reply, or multiple mentions with protection."
        },
        category: "box chat",
        guide: {
            en: "{pn} @tags: Kick tagged members\n{pn} reply: Kick the person you replied to"
        }
    },

    langs: {
        en: {
            botNotAdmin: "≽^• ˕ • ྀི≼ \n\n I need Admin privileges to kick members. Please promote me and try again.",
            kickSuccess: "˶˃ ᵕ ˂˶ \n\n Successfully kicked %1 member(s).",
            kickError: "ᡕᠵデᡁ᠊╾━ \n\n Could not kick: %1 (Member might be an Admin or Error occurred).",
            noSelfKick: "(¬`‸´¬) \n\n ᶠᶸᶜᵏᵧₒᵤ !!",
            noAdminKick: "ᡕᠵデᡁ᠊╾━\n\n| I cannot kick '%1' because they are an Admin of this group."
        }
    },

    onStart: async function ({ message, event, args, threadsData, api, getLang }) {
        const { threadID, messageID, senderID, mentions, messageReply } = event;
        const botID = api.getCurrentUserID();

        const threadInfo = await api.getThreadInfo(threadID);
        const adminIDs = threadInfo.adminIDs.map(item => item.id);

        if (!adminIDs.includes(botID)) {
            return message.reply(getLang("botNotAdmin"));
        }


        let uids = [];
        if (event.type === "message_reply") {
            uids.push(messageReply.senderID);
        } else if (Object.keys(mentions).length > 0) {
            uids = Object.keys(mentions);
        } else {
            return message.reply(" ⊹ ࣪ ﹏𓊝﹏𓂁﹏⊹ ࣪ ˖\n\n| Please tag someone or reply to their message to kick.");
        }

        let successCount = 0;
        let errors = [];


        for (const uid of uids) {

            if (uid == botID) {
                errors.push(getLang("noSelfKick"));
                continue;
            }

            if (adminIDs.includes(uid)) {
                const name = (await api.getUserInfo(uid))[uid].name;
                errors.push(getLang("noAdminKick", name));
                continue;
            }

            try {
                await api.removeUserFromGroup(uid, threadID);
                successCount++;
            } catch (e) {
                errors.push(`ID: ${uid}`);
            }
        }

        let response = "";
        if (successCount > 0) response += getLang("kickSuccess", successCount) + "\n";
        if (errors.length > 0) response += errors.join("\n");

        return message.reply(response.trim(), threadID, messageID);
    }
};
