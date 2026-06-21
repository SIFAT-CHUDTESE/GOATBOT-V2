const { getTime } = global.utils;

function resolveUID(arg, event) {
	const mentions = Object.keys(event.mentions || {});
	if (mentions.length) return mentions[0];
	if (event.type === "message_reply") return event.messageReply.senderID;
	if (arg && /^\d{10,}$/.test(arg)) return arg;
	return null;
}

module.exports = {
	config: {
		name: "user",
		version: "2.0.0",
		author: "SIFAT",
		countDown: 5,
		role: 2,
		description: { en: "ᴍᴀɴᴀɢᴇ ᴜꜱᴇʀꜱ ɪɴ ʙᴏᴛ ꜱʏꜱᴛᴇᴍ" },
		category: "owner",
		guide: {
			en: "   {pn} find <ɴᴀᴍᴇ>\n   {pn} ban [@|ᴜɪᴅ|ʀᴇᴘʟʏ] <ʀᴇᴀꜱᴏɴ>\n   {pn} unban [@|ᴜɪᴅ|ʀᴇᴘʟʏ]\n   {pn} info [@|ᴜɪᴅ|ʀᴇᴘʟʏ]"
		}
	},

	langs: {
		en: {
			noUserFound:  "⌀ ɴᴏ ᴜꜱᴇʀ ꜰᴏᴜɴᴅ: \"%1\"",
			userFound:    "✦ ꜰᴏᴜɴᴅ %1 ᴜꜱᴇʀ(ꜱ) — \"%2\":\n%3",
			uidRequired:  "⌀ ᴘʀᴏᴠɪᴅᴇ ᴜɪᴅ / ᴛᴀɢ / ʀᴇᴘʟʏ",
			reasonRequired: "⌀ ᴘʀᴏᴠɪᴅᴇ ᴀ ʀᴇᴀꜱᴏɴ",
			userHasBanned: "⌀ %2 [%1] ᴀʟʀᴇᴀᴅʏ ʙᴀɴɴᴇᴅ\n◈ ʀᴇᴀꜱᴏɴ: %3\n◈ ᴅᴀᴛᴇ  : %4",
			userBanned:   "✦ ʙᴀɴɴᴇᴅ: %2 [%1]\n◈ ʀᴇᴀꜱᴏɴ: %3\n◈ ᴅᴀᴛᴇ  : %4",
			userNotBanned: "⌀ %2 [%1] ɪꜱ ɴᴏᴛ ʙᴀɴɴᴇᴅ",
			userUnbanned: "✦ ᴜɴʙᴀɴɴᴇᴅ: %2 [%1]",
			userInfo:     "✦ ᴜꜱᴇʀ ɪɴꜰᴏ\n◈ ɴᴀᴍᴇ  : %1\n◈ ɪᴅ    : %2\n◈ ᴇxᴘ   : %3\n◈ ᴍᴏɴᴇʏ : $%4\n◈ ʙᴀɴɴᴇᴅ: %5"
		}
	},

	onStart: async function ({ args, usersData, message, event, getLang }) {
		const type = (args[0] || "").toLowerCase();
		switch (type) {
			case "find": case "-f": case "search": case "-s": {
				const allUser = await usersData.getAll();
				const keyWord = args.slice(1).join(" ");
				if (!keyWord) return message.SyntaxError();
				const result = allUser.filter(item => (item.name || "").toLowerCase().includes(keyWord.toLowerCase()));
				const msg = result.map(u => `◦ ${u.name}\n  ɪᴅ: ${u.userID}`).join("\n");
				return message.reply(result.length === 0 ? getLang("noUserFound", keyWord) : getLang("userFound", result.length, keyWord, msg));
			}

			case "ban": case "-b": {
				const uid = resolveUID(args[1], event);
				if (!uid) return message.reply(getLang("uidRequired"));
				let reason = event.type === "message_reply"
					? args.slice(1).join(" ")
					: Object.keys(event.mentions || {}).length > 0
						? args.slice(1).join(" ").replace(event.mentions[uid] || "", "")
						: args.slice(2).join(" ");
				reason = reason.trim();
				if (!reason) return message.reply(getLang("reasonRequired"));
				const userData = await usersData.get(uid);
				if (userData.banned?.status)
					return message.reply(getLang("userHasBanned", uid, userData.name, userData.banned.reason, userData.banned.date));
				const time = getTime("DD/MM/YYYY HH:mm:ss");
				await usersData.set(uid, { banned: { status: true, reason, date: time } });
				return message.reply(getLang("userBanned", uid, userData.name, reason, time));
			}

			case "unban": case "-u": {
				const uid = resolveUID(args[1], event);
				if (!uid) return message.reply(getLang("uidRequired"));
				const userData = await usersData.get(uid);
				if (!userData.banned?.status) return message.reply(getLang("userNotBanned", uid, userData.name));
				await usersData.set(uid, { banned: {} });
				return message.reply(getLang("userUnbanned", uid, userData.name));
			}

			case "info": case "-i": {
				const uid = resolveUID(args[1], event) || event.senderID;
				const userData = await usersData.get(uid);
				const banStatus = userData.banned?.status ? `⛔ ʏᴇꜱ (${userData.banned.reason})` : "✅ ɴᴏ";
				return message.reply(getLang("userInfo", userData.name || "─", uid, userData.exp || 0, userData.money || 0, banStatus));
			}

			default:
				return message.SyntaxError();
		}
	}
};
