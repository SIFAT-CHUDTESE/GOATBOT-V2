module.exports = {
	config: {
		name: "tid",
		aliases: ["threadid", "threadinfo"],
		version: "2.0.0",
		author: "SIFAT",
		countDown: 5,
		role: 0,
		description: { en: "ᴠɪᴇᴡ ᴛʜʀᴇᴀᴅ ɪᴅ & ɪɴꜰᴏ" },
		category: "utility",
		guide: { en: "{pn} — ᴛʜʀᴇᴀᴅ ɪᴅ\n{pn} info — ᴛʜʀᴇᴀᴅ ᴅᴇᴛᴀɪʟꜱ" }
	},

	onStart: async function ({ message, event, args, threadsData }) {
		const sub = (args[0] || "").toLowerCase();

		if (sub === "info") {
			const td = await threadsData.get(event.threadID).catch(() => null);
			const name = td?.threadName || "ᴜɴᴋɴᴏᴡɴ";
			const members = td?.members?.length || "─";
			const admins = (td?.adminIDs || []).length;
			const isGroup = td?.isGroup ? "✅ ʏᴇꜱ" : "⛔ ɴᴏ";
			const prefix = td?.data?.prefix || global.GoatBot.config.prefix || ".";
			return message.reply(
				`◈ ɴᴀᴍᴇ    : ${name}\n`
				+ `◈ ɪᴅ      : ${event.threadID}\n`
				+ `◈ ɪꜱ ɢʀᴏᴜᴘ: ${isGroup}\n`
				+ `◈ ᴍᴇᴍʙᴇʀꜱ : ${members}\n`
				+ `◈ ᴀᴅᴍɪɴꜱ  : ${admins}\n`
				+ `◈ ᴘʀᴇꜰɪx  : ${prefix}`
			);
		}

		return message.reply(`◈ ᴛʜʀᴇᴀᴅ ɪᴅ:\n${event.threadID}`);
	}
};
