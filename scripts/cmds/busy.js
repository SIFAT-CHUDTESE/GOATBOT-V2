if (!global.client.busyList) global.client.busyList = {};

module.exports = {
	config: {
		name: "busy",
		version: "2.0.0",
		author: "SIFAT",
		countDown: 3,
		role: 0,
		description: { en: "ꜱᴇᴛ ᴅᴏ-ɴᴏᴛ-ᴅɪꜱᴛᴜʀʙ ᴍᴏᴅᴇ" },
		category: "utility",
		guide: {
			en: "   {pn} [ʀᴇᴀꜱᴏɴ] — ᴇɴᴀʙʟᴇ ᴅɴᴅ\n   {pn} off — ᴅɪꜱᴀʙʟᴇ ᴅɴᴅ\n   {pn} status — ᴄʜᴇᴄᴋ ʏᴏᴜʀ ᴅɴᴅ\n   {pn} check [@|ʀᴇᴘʟʏ] — ᴄʜᴇᴄᴋ ᴏᴛʜᴇʀꜱ"
		}
	},

	langs: {
		en: {
			off:              "✦ ᴅɴᴅ ᴅɪꜱᴀʙʟᴇᴅ — ᴡᴇʟᴄᴏᴍᴇ ʙᴀᴄᴋ!",
			on:               "✦ ᴅɴᴅ ᴇɴᴀʙʟᴇᴅ\n◈ ᴍᴇɴᴛɪᴏɴꜱ ᴡɪʟʟ ɴᴏᴛɪꜰʏ ꜱᴇɴᴅᴇʀ",
			onReason:         "✦ ᴅɴᴅ ᴇɴᴀʙʟᴇᴅ\n◈ ʀᴇᴀꜱᴏɴ: %1",
			notifyBusy:       "◈ %1 ɪꜱ ʙᴜꜱʏ ʀɪɢʜᴛ ɴᴏᴡ",
			notifyBusyReason: "◈ %1 ɪꜱ ʙᴜꜱʏ: %2",
			statusActive:     "◈ ᴅɴᴅ : ✅ ᴀᴄᴛɪᴠᴇ\n◈ ʀᴇᴀꜱᴏɴ: %1",
			statusOff:        "◈ ᴅɴᴅ : ⛔ ᴏꜰꜰ",
			checkBusy:        "◈ %1 ɪꜱ ʙᴜꜱʏ\n◈ ʀᴇᴀꜱᴏɴ: %2",
			checkNotBusy:     "◈ %1 ɪꜱ ᴀᴠᴀɪʟᴀʙʟᴇ"
		}
	},

	onStart: async function ({ args, message, event, getLang, usersData }) {
		const { senderID } = event;
		const sub = (args[0] || "").toLowerCase();

		if (sub === "off") {
			const userData = await usersData.get(senderID);
			const data = userData.data || {};
			delete data.busy;
			await usersData.set(senderID, data, "data");
			return message.reply(getLang("off"));
		}

		if (sub === "status") {
			const userData = await usersData.get(senderID);
			const reason = userData.data?.busy;
			if (reason !== undefined && reason !== false)
				return message.reply(getLang("statusActive", reason || "ɴᴏ ʀᴇᴀꜱᴏɴ"));
			return message.reply(getLang("statusOff"));
		}

		if (sub === "check") {
			const mentions = Object.keys(event.mentions || {});
			const targetID = mentions[0] || event.messageReply?.senderID;
			if (!targetID) return message.reply("⌀ ᴛᴀɢ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴀ ᴜꜱᴇʀ");
			const targetData = await usersData.get(targetID);
			const name = targetData.name || targetID;
			const reason = targetData.data?.busy;
			if (reason !== undefined && reason !== false)
				return message.reply(getLang("checkBusy", name, reason || "ɴᴏ ʀᴇᴀꜱᴏɴ"));
			return message.reply(getLang("checkNotBusy", name));
		}

		const reason = args.join(" ").trim();
		await usersData.set(senderID, reason || true, "data.busy");
		return message.reply(reason ? getLang("onReason", reason) : getLang("on"));
	},

	onChat: async ({ event, message, getLang, usersData }) => {
		const { mentions } = event;
		if (!mentions || !Object.keys(mentions).length) return;
		for (const userID of Object.keys(mentions)) {
			const ud = global.db.allUserData.find(item => item.userID == userID);
			const reasonBusy = ud?.data?.busy;
			if (reasonBusy !== undefined && reasonBusy !== false) {
				const name = (mentions[userID] || "").replace("@", "") || ud?.name || userID;
				return message.reply(
					reasonBusy
						? getLang("notifyBusyReason", name, reasonBusy)
						: getLang("notifyBusy", name)
				);
			}
		}
	}
};
