const { getStreamsFromAttachment } = global.utils;

module.exports = {
	config: {
		name: "notification",
		aliases: ["notify", "noti", "broadcast"],
		version: "2.0.0",
		author: "SIFAT",
		countDown: 5,
		role: 2,
		description: { en: "ʙʀᴏᴀᴅᴄᴀꜱᴛ ᴀᴅᴍɪɴ ɴᴏᴛɪꜰɪᴄᴀᴛɪᴏɴ ᴛᴏ ᴀʟʟ ɢʀᴏᴜᴘꜱ" },
		category: "owner",
		guide: {
			en: "   {pn} <ᴍᴇꜱꜱᴀɢᴇ> — ꜱᴇɴᴅ ᴛᴏ ᴀʟʟ\n   {pn} -t <ᴛɪᴛʟᴇ> | <ᴍᴇꜱꜱᴀɢᴇ> — ᴡɪᴛʜ ᴛɪᴛʟᴇ"
		},
		envConfig: { delayPerGroup: 250 }
	},

	langs: {
		en: {
			missingMessage: "⌀ ᴘʟᴇᴀꜱᴇ ᴇɴᴛᴇʀ ᴀ ᴍᴇꜱꜱᴀɢᴇ",
			header:         "📢 ɴᴏᴛɪꜰɪᴄᴀᴛɪᴏɴ ꜰʀᴏᴍ ᴍᴀʀɪɴ ᴀᴅᴍɪɴ\n━━━━━━━━━━━━━━━",
			sending:        "◈ ꜱᴇɴᴅɪɴɢ ᴛᴏ %1 ɢʀᴏᴜᴘꜱ...",
			sent:           "✦ ꜱᴇɴᴛ ᴛᴏ %1 ɢʀᴏᴜᴘꜱ",
			error:          "⌀ ꜰᴀɪʟᴇᴅ ꜰᴏʀ %1 ɢʀᴏᴜᴘꜱ:\n%2"
		}
	},

	onStart: async function ({ message, api, event, args, commandName, envCommands, threadsData, getLang }) {
		const { delayPerGroup } = envCommands[commandName];

		let title = null;
		let bodyArgs = [...args];

		if (args[0] === "-t") {
			const rest = args.slice(1).join(" ");
			const sep = rest.indexOf("|");
			if (sep !== -1) {
				title = rest.slice(0, sep).trim();
				bodyArgs = rest.slice(sep + 1).trim().split(" ");
			} else {
				bodyArgs = args.slice(1);
			}
		}

		const text = bodyArgs.join(" ").trim();
		if (!text) return message.reply(getLang("missingMessage"));

		const msgBody = title
			? `${getLang("header")}\n📌 ${title}\n\n${text}`
			: `${getLang("header")}\n${text}`;

		const attachments = [...(event.attachments || []), ...(event.messageReply?.attachments || [])].filter(i => ["photo", "png", "animated_image", "video", "audio"].includes(i.type));
		const formSend = {
			body: msgBody,
			attachment: await getStreamsFromAttachment(attachments)
		};

		const allThreads = (await threadsData.getAll()).filter(t => t.isGroup && t.members.find(m => m.userID == api.getCurrentUserID())?.inGroup);
		message.reply(getLang("sending", allThreads.length));

		let success = 0;
		const errors = [];
		const pending = [];

		for (const thread of allThreads) {
			try {
				pending.push({ threadID: thread.threadID, promise: api.sendMessage(formSend, thread.threadID) });
				await new Promise(r => setTimeout(r, delayPerGroup));
			} catch { errors.push(thread.threadID); }
		}

		for (const item of pending) {
			try { await item.promise; success++; }
			catch (e) {
				const desc = e.errorDescription;
				const ex = errors.find(i => i.desc === desc);
				if (ex) ex.ids.push(item.threadID);
				else errors.push({ desc, ids: [item.threadID] });
			}
		}

		let msg = "";
		if (success > 0) msg += getLang("sent", success) + "\n";
		if (errors.length > 0) {
			const total = errors.reduce((a, b) => a + (b.ids?.length || 1), 0);
			const detail = errors.map(e => `◦ ${e.desc || e}: ${(e.ids || []).join(", ")}`).join("\n");
			msg += getLang("error", total, detail);
		}
		message.reply(msg || "⌀ ɴᴏ ɢʀᴏᴜᴘꜱ ꜰᴏᴜɴᴅ");
	}
};
