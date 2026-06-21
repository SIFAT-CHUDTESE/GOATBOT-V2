const fs = require("fs-extra");

module.exports = {
	config: {
		name: "restart",
		version: "2.0.0",
		author: "SIFAT",
		countDown: 5,
		role: 4,
		description: { en: "ʀᴇꜱᴛᴀʀᴛ ᴛʜᴇ ʙᴏᴛ" },
		category: "owner",
		guide: { en: "{pn} [ʀᴇᴀꜱᴏɴ] — ʀᴇꜱᴛᴀʀᴛ ᴛʜᴇ ʙᴏᴛ" }
	},

	langs: {
		en: {
			restarting: "◈ ʀᴇꜱᴛᴀʀᴛɪɴɢ...\n%1",
			restarted:  "✦ ʀᴇꜱᴛᴀʀᴛ ᴄᴏᴍᴘʟᴇᴛᴇ\n◈ ᴛɪᴍᴇ: %1ꜱ"
		}
	},

	onLoad: function ({ api }) {
		if (!api) return;
		const pathFile = `${__dirname}/tmp/restart.txt`;
		if (fs.existsSync(pathFile)) {
			try {
				const [tid, time] = fs.readFileSync(pathFile, "utf-8").split(" ");
				const restartTime = ((Date.now() - parseInt(time)) / 1000).toFixed(2);
				setTimeout(() => {
					try { api.sendMessage(`✦ ʀᴇꜱᴛᴀʀᴛ ᴄᴏᴍᴘʟᴇᴛᴇ\n◈ ᴛɪᴍᴇ: ${restartTime}ꜱ`, parseInt(tid)); } catch {}
				}, 2000);
				fs.unlinkSync(pathFile);
			} catch { try { fs.unlinkSync(pathFile); } catch {} }
		}
	},

	onStart: async function ({ message, event, args, getLang }) {
		const reason = args.join(" ").trim();
		const pathFile = `${__dirname}/tmp/restart.txt`;
		const tmpDir = `${__dirname}/tmp`;
		if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
		fs.writeFileSync(pathFile, `${event.threadID} ${Date.now()}`);
		await message.reply(getLang("restarting", reason ? `◈ ʀᴇᴀꜱᴏɴ: ${reason}\n` : ""));
		process.exit(2);
	}
};
