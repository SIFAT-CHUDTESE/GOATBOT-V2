const fs = require("fs-extra");

module.exports = {
	config: {
		name: "loadconfig",
		aliases: ["loadcf", "reloadcfg"],
		version: "2.0.0",
		author: "SIFAT",
		countDown: 5,
		role: 4,
		description: { en: "ʀᴇʟᴏᴀᴅ ʙᴏᴛ ᴄᴏɴꜰɪɢ ꜰʀᴏᴍ ᴅɪꜱᴋ" },
		category: "owner",
		guide: { en: "{pn} — ʀᴇʟᴏᴀᴅ ᴄᴏɴꜰɪɢ\n{pn} show — ʟɪꜱᴛ ᴄᴜʀʀᴇɴᴛ ᴋᴇʏꜱ" }
	},

	langs: {
		en: {
			success: "✦ ᴄᴏɴꜰɪɢ ʀᴇʟᴏᴀᴅᴇᴅ\n◈ ᴀᴅᴍɪɴꜱ  : %1\n◈ ᴘʀᴇꜰɪx  : %2\n◈ ᴘʀᴇᴍɪᴜᴍ : %3",
			show:    "✦ ᴄᴜʀʀᴇɴᴛ ᴄᴏɴꜰɪɢ ᴋᴇʏꜱ:\n%1"
		}
	},

	onStart: async function ({ message, args, getLang }) {
		if ((args[0] || "").toLowerCase() === "show") {
			const cfg = global.GoatBot.config;
			const keys = Object.keys(cfg).map(k => {
				const v = cfg[k];
				const display = Array.isArray(v) ? `[${v.length} items]` : typeof v === "object" ? "{...}" : String(v).slice(0, 30);
				return `◦ ${k}: ${display}`;
			});
			return message.reply(getLang("show", keys.join("\n")));
		}

		global.GoatBot.config = fs.readJsonSync(global.client.dirConfig);
		global.GoatBot.configCommands = fs.readJsonSync(global.client.dirConfigCommands);
		const cfg = global.GoatBot.config;
		return message.reply(getLang("success",
			(cfg.adminBot || []).length,
			cfg.prefix || "─",
			(cfg.premiumUsers || []).length
		));
	}
};
