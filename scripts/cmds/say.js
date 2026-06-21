const axios = require("axios");
const fs = require("fs-extra");

const LANG_ALIASES = {
	en: "en", english: "en",
	bn: "bn", bengali: "bn", bangla: "bn",
	hi: "hi", hindi: "hi",
	ar: "ar", arabic: "ar",
	fr: "fr", french: "fr",
	de: "de", german: "de",
	es: "es", spanish: "es",
	ja: "ja", japanese: "ja",
	ko: "ko", korean: "ko",
	zh: "zh", chinese: "zh",
	ru: "ru", russian: "ru",
	pt: "pt", portuguese: "pt",
	tr: "tr", turkish: "tr",
	vi: "vi", vietnamese: "vi",
	id: "id", indonesian: "id",
};

module.exports = {
	config: {
		name: "say",
		aliases: ["tts", "speak"],
		version: "2.0.0",
		author: "SIFAT",
		countDown: 5,
		role: 0,
		description: { en: "ᴛᴇxᴛ-ᴛᴏ-ꜱᴘᴇᴇᴄʜ ᴀᴜᴅɪᴏ" },
		category: "utility",
		guide: { en: "{pn} <ᴛᴇxᴛ> — ᴛᴛꜱ ɪɴ ᴇɴɢʟɪꜱʜ\n{pn} <ᴛᴇxᴛ> | <ʟᴀɴɢ> — ꜱᴘᴇᴄɪꜰʏ ʟᴀɴɢᴜᴀɢᴇ\n◈ ʀᴇᴘʟʏ ᴀ ᴍᴇꜱꜱᴀɢᴇ ᴛᴏ ʀᴇᴀᴅ ɪᴛ\n◈ ʟᴀɴɢꜱ: en, bn, hi, ar, fr, ko, ja, zh..." }
	},

	onStart: async function ({ args, message, event }) {
		let text, lang = "en";

		if (event.type === "message_reply") {
			text = event.messageReply.body;
			if (args[0]) {
				const lcode = (args[0] || "").toLowerCase();
				lang = LANG_ALIASES[lcode] || lcode;
			}
		} else {
			if (!args.length) return message.reply("⌀ ᴘʀᴏᴠɪᴅᴇ ᴛᴇxᴛ ᴏʀ ʀᴇᴘʟʏ ᴀ ᴍᴇꜱꜱᴀɢᴇ");
			if (args.includes("|")) {
				const parts = args.join(" ").split("|").map(a => a.trim());
				text = parts[0];
				const lcode = (parts[1] || "en").toLowerCase();
				lang = LANG_ALIASES[lcode] || lcode;
			} else {
				text = args.join(" ");
			}
		}

		if (!text || !text.trim()) return message.reply("⌀ ɴᴏ ᴛᴇxᴛ ꜰᴏᴜɴᴅ");
		if (text.length > 500) text = text.slice(0, 500);

		const tmpPath = `${__dirname}/tmp/tts_${Date.now()}.mp3`;
		await fs.ensureDir(`${__dirname}/tmp`);

		try {
			const chunks = text.match(/.{1,150}/g) || [text];
			for (let i = 0; i < chunks.length; i++) {
				const res = await axios({
					method: "get",
					url: `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(chunks[i])}`,
					responseType: "stream"
				});
				const writer = fs.createWriteStream(tmpPath, { flags: i === 0 ? "w" : "a" });
				res.data.pipe(writer);
				await new Promise(resolve => writer.on("finish", resolve));
			}
			await message.reply({ body: `🔊 ʟᴀɴɢ: ${lang}`, attachment: fs.createReadStream(tmpPath) });
			setTimeout(() => fs.remove(tmpPath).catch(() => {}), 60000);
		} catch {
			fs.remove(tmpPath).catch(() => {});
			return message.reply("⌀ ꜰᴀɪʟᴇᴅ ᴛᴏ ɢᴇɴᴇʀᴀᴛᴇ ᴀᴜᴅɪᴏ");
		}
	}
};
