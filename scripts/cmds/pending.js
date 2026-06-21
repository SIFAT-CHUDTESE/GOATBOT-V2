module.exports = {
	config: {
		name: "approve",
		aliases: ["pending", "pend", "pe"],
		version: "2.0.0",
		author: "SIFAT",
		countDown: 5,
		role: 2,
		description: { en: "ᴀᴘᴘʀᴏᴠᴇ ᴏʀ ʀᴇᴊᴇᴄᴛ ᴘᴇɴᴅɪɴɢ ʀᴇǫᴜᴇꜱᴛꜱ" },
		category: "owner",
		guide: { en: "{pn} user | thread | all — ʟɪꜱᴛ ᴘᴇɴᴅɪɴɢ\n{pn} reject <ɴᴜᴍ> — ʀᴇᴊᴇᴄᴛ ꜱᴘᴇᴄɪꜰɪᴄ" }
	},

	onReply: async function ({ message, api, event, Reply }) {
		const { author, pending, messageID } = Reply;
		if (String(event.senderID) !== String(author)) return;
		const body = event.body.trim().toLowerCase();
		if (body === "c") {
			api.unsendMessage(messageID);
			return message.reply("⌀ ᴏᴘᴇʀᴀᴛɪᴏɴ ᴄᴀɴᴄᴇʟʟᴇᴅ");
		}

		const isReject = body.startsWith("r ");
		const numPart = isReject ? body.slice(2) : body;
		const indexes = numPart.split(/\s+/).map(Number).filter(n => !isNaN(n));
		if (!indexes.length) return message.reply("⌀ ɪɴᴠᴀʟɪᴅ ɪɴᴘᴜᴛ");

		const prefix = global.GoatBot.config.prefix || ".";
		let count = 0;
		for (const idx of indexes) {
			if (idx <= 0 || idx > pending.length) continue;
			const target = pending[idx - 1];
			try {
				if (isReject) {
					await api.sendMessage("⌀ ʏᴏᴜʀ ʀᴇǫᴜᴇꜱᴛ ᴡᴀꜱ ʀᴇᴊᴇᴄᴛᴇᴅ", target.threadID);
				} else {
					await api.sendMessage(
						`✦ ʏᴏᴜʀ ʀᴇǫᴜᴇꜱᴛ ʜᴀꜱ ʙᴇᴇɴ ᴀᴘᴘʀᴏᴠᴇᴅ\n◈ ᴛʏᴘᴇ ${prefix}help ꜰᴏʀ ᴄᴏᴍᴍᴀɴᴅꜱ`,
						target.threadID
					);
					await api.changeNickname(`${global.GoatBot.config.nickNameBot || "MARIN 👺"}`, target.threadID, api.getCurrentUserID());
				}
				count++;
			} catch { count++; }
		}

		const action = isReject ? "ʀᴇᴊᴇᴄᴛᴇᴅ" : "ᴀᴘᴘʀᴏᴠᴇᴅ";
		return message.reply(`✦ ${action} ${count} ᴇɴᴛʀ${count > 1 ? "ɪᴇꜱ" : "ʏ"}`);
	},

	onStart: async function ({ message, api, event, args, usersData }) {
		const { threadID, messageID } = event;
		const type = (args[0] || "").toLowerCase();

		if (!type || !["user", "thread", "all", "u", "t", "a"].includes(type))
			return message.reply("◈ ᴜꜱᴀɢᴇ:\n◦ approve user\n◦ approve thread\n◦ approve all\n◈ ʀᴇᴘʟʏ ɴᴜᴍꜱ ᴛᴏ ᴀᴘᴘʀᴏᴠᴇ\n◈ ʀᴇᴘʟʏ r <ɴᴜᴍ> ᴛᴏ ʀᴇᴊᴇᴄᴛ");

		try {
			const spam = (await api.getThreadList(100, null, ["OTHER"])) || [];
			const pend = (await api.getThreadList(100, null, ["PENDING"])) || [];
			const list = [...spam, ...pend];
			let filteredList = type.startsWith("u") ? list.filter(t => !t.isGroup) : type.startsWith("t") ? list.filter(t => t.isGroup) : list;
			if (!filteredList.length) return message.reply("⌀ ɴᴏ ᴘᴇɴᴅɪɴɢ ʀᴇǫᴜᴇꜱᴛꜱ");

			let msg = "✦ ᴘᴇɴᴅɪɴɢ ʀᴇǫᴜᴇꜱᴛꜱ:\n";
			for (let i = 0; i < filteredList.length; i++) {
				const name = filteredList[i].name || (await usersData.getName(filteredList[i].threadID).catch(() => "ᴜɴᴋɴᴏᴡɴ")) || "ᴜɴᴋɴᴏᴡɴ";
				const tag = filteredList[i].isGroup ? "👥" : "👤";
				msg += `◦ ${i + 1}. ${tag} ${name}\n`;
			}
			msg += "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n◈ ʀᴇᴘʟʏ ɴᴜᴍꜱ ᴛᴏ ᴀᴘᴘʀᴏᴠᴇ\n◈ ʀᴇᴘʟʏ r <ɴᴜᴍ> ᴛᴏ ʀᴇᴊᴇᴄᴛ\n◈ ʀᴇᴘʟʏ c ᴛᴏ ᴄᴀɴᴄᴇʟ";

			return api.sendMessage(msg, threadID, (error, info) => {
				global.GoatBot.onReply.set(info.messageID, { commandName: this.config.name, messageID: info.messageID, author: event.senderID, pending: filteredList });
			}, messageID);
		} catch {
			return message.reply("⌀ ꜰᴀɪʟᴇᴅ ᴛᴏ ꜰᴇᴛᴄʜ ʟɪꜱᴛ");
		}
	}
};
