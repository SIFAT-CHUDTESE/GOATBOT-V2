const { findUid } = global.utils;
const regExCheckURL = /^(http|https):\/\/[^ "]+$/;

module.exports = {
	config: {
		name: "uid",
		aliases: ["id", "getid"],
		version: "2.0.0",
		author: "SIFAT",
		countDown: 5,
		role: 0,
		description: { en: "ɢᴇᴛ ꜰᴀᴄᴇʙᴏᴏᴋ ᴜꜱᴇʀ ɪᴅ" },
		category: "utility",
		guide: {
			en: "   {pn} — ʏᴏᴜʀ ɪᴅ\n   {pn} @ᴛᴀɢ — ᴛᴀɢɢᴇᴅ ᴜꜱᴇʀ\n   {pn} <ᴜʀʟ> — ꜰʀᴏᴍ ᴘʀᴏꜰɪʟᴇ ʟɪɴᴋ\n   ʀᴇᴘʟʏ — ꜱᴇɴᴅᴇʀ ɪᴅ"
		}
	},

	langs: {
		en: {
			syntaxError: "⌀ ᴛᴀɢ ᴀ ᴜꜱᴇʀ ᴏʀ ꜱᴇɴᴅ ᴇᴍᴘᴛʏ"
		}
	},

	onStart: async function ({ message, event, args, api, getLang }) {
		if (event.messageReply)
			return message.reply(`◈ ᴜꜱᴇʀ ɪᴅ:\n${event.messageReply.senderID}`);

		if (!args[0])
			return message.reply(`◈ ʏᴏᴜʀ ɪᴅ:\n${event.senderID}`);

		if (args[0].match(regExCheckURL)) {
			let msg = "";
			for (const link of args) {
				try { msg += `◈ ${link}\n  → ${await findUid(link)}\n`; }
				catch (e) { msg += `◈ ${link}\n  ⌀ ${e.message}\n`; }
			}
			return message.reply(msg.trim());
		}

		const { mentions } = event;
		if (!Object.keys(mentions).length) return message.reply(getLang("syntaxError"));
		let msg = "";
		for (const id in mentions) msg += `◈ ${mentions[id].replace("@", "")}: ${id}\n`;
		return message.reply(msg.trim());
	}
};
