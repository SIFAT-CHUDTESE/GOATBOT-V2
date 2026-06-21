const deltaNext = global.GoatBot.configCommands.envCommands?.rank?.deltaNext || 5;
const expToLevel = exp => Math.floor((1 + Math.sqrt(1 + 8 * exp / deltaNext)) / 2);
const { drive } = global.utils;

module.exports = {
	config: {
		name: "rankup",
		version: "2.0.0",
		author: "SIFAT",
		countDown: 5,
		role: 0,
		description: { en: "ᴛᴏɢɢʟᴇ ʟᴇᴠᴇʟ-ᴜᴘ ɴᴏᴛɪꜰɪᴄᴀᴛɪᴏɴꜱ & ᴄᴜꜱᴛᴏᴍɪᴢᴇ ᴍᴇꜱꜱᴀɢᴇ" },
		category: "rank",
		guide: {
			en: "{pn} on | off\n{pn} msg <ᴍᴇꜱꜱᴀɢᴇ> — ꜱᴇᴛ ᴄᴜꜱᴛᴏᴍ ᴍꜱɢ\n{pn} msg reset — ʀᴇꜱᴇᴛ ᴍᴇꜱꜱᴀɢᴇ\n◈ ᴠᴀʀꜱ: {userName} {userNameTag} {oldRank} {currentRank}"
		},
		envConfig: { deltaNext: 5 }
	},

	langs: {
		en: {
			syntaxError: "⌀ ᴜꜱᴇ: rankup on ᴏʀ rankup off",
			turnedOn:    "✦ ʟᴇᴠᴇʟ-ᴜᴘ ɴᴏᴛɪꜰɪᴄᴀᴛɪᴏɴ: ᴏɴ",
			turnedOff:   "✦ ʟᴇᴠᴇʟ-ᴜᴘ ɴᴏᴛɪꜰɪᴄᴀᴛɪᴏɴ: ᴏꜰꜰ",
			msgSet:      "✦ ᴄᴜꜱᴛᴏᴍ ᴍᴇꜱꜱᴀɢᴇ ꜱᴀᴠᴇᴅ",
			msgReset:    "✦ ᴍᴇꜱꜱᴀɢᴇ ʀᴇꜱᴇᴛ ᴛᴏ ᴅᴇꜰᴀᴜʟᴛ",
			notiMessage: "★ ᴄᴏɴɢʀᴀᴛᴜʟᴀᴛɪᴏɴꜱ! ʟᴇᴠᴇʟ %1"
		}
	},

	onStart: async function ({ message, event, threadsData, args, getLang }) {
		const sub = (args[0] || "").toLowerCase();

		if (sub === "msg") {
			if ((args[1] || "").toLowerCase() === "reset") {
				await threadsData.set(event.threadID, null, "data.rankup.message");
				return message.reply(getLang("msgReset"));
			}
			const msg = args.slice(1).join(" ").trim();
			if (!msg) return message.reply("⌀ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴍᴇꜱꜱᴀɢᴇ");
			await threadsData.set(event.threadID, msg, "data.rankup.message");
			return message.reply(getLang("msgSet"));
		}

		if (!["on", "off"].includes(sub)) return message.reply(getLang("syntaxError"));
		await threadsData.set(event.threadID, sub === "on", "settings.sendRankupMessage");
		return message.reply(sub === "on" ? getLang("turnedOn") : getLang("turnedOff"));
	},

	onChat: async function ({ threadsData, usersData, event, message, getLang }) {
		const threadData = await threadsData.get(event.threadID);
		if (!threadData.settings.sendRankupMessage) return;
		const { exp } = await usersData.get(event.senderID);
		const currentLevel = expToLevel(exp);
		if (currentLevel > expToLevel(exp - 1)) {
			let customMessage = await threadsData.get(event.threadID, "data.rankup.message");
			let isTag = false;
			let userData;
			const formMessage = {};
			if (customMessage) {
				userData = await usersData.get(event.senderID);
				customMessage = customMessage.replace(/{oldRank}/g, currentLevel - 1).replace(/{currentRank}/g, currentLevel);
				if (customMessage.includes("{userNameTag}")) {
					isTag = true;
					customMessage = customMessage.replace(/{userNameTag}/g, `@${userData.name}`);
				} else {
					customMessage = customMessage.replace(/{userName}/g, userData.name);
				}
				formMessage.body = customMessage;
			} else {
				formMessage.body = getLang("notiMessage", currentLevel);
			}
			if (threadData.data.rankup?.attachments?.length > 0) {
				const files = threadData.data.rankup.attachments;
				formMessage.attachment = (await Promise.allSettled(files.map(f => drive.getFile(f, "stream")))).filter(({ status }) => status === "fulfilled").map(({ value }) => value);
			}
			if (isTag) formMessage.mentions = [{ tag: `@${userData.name}`, id: event.senderID }];
			message.reply(formMessage);
		}
	}
};
