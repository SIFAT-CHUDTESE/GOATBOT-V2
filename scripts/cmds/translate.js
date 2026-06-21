const axios = require("axios");
const defaultEmojiTranslate = "🌐";

async function translate(text, langCode) {
	const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${langCode}&dt=t&q=${encodeURIComponent(text)}`);
	return { text: res.data[0].map(i => i[0]).join(""), lang: res.data[2] };
}

async function translateAndSendMessage(content, langCodeTrans, message, getLang) {
	const { text, lang } = await translate(content.trim(), langCodeTrans.trim());
	return message.reply(`${text}\n\n${getLang("translateTo", lang, langCodeTrans)}`);
}

module.exports = {
	config: {
		name: "translate",
		aliases: ["trans", "tr"],
		version: "2.0.0",
		author: "SIFAT",
		countDown: 5,
		role: 0,
		description: { en: "ᴛʀᴀɴꜱʟᴀᴛᴇ ᴛᴇxᴛ ᴛᴏ ᴀɴʏ ʟᴀɴɢᴜᴀɢᴇ" },
		category: "utility",
		guide: {
			en: "   {pn} <ᴛᴇxᴛ> — ᴛʀᴀɴꜱʟᴀᴛᴇ ᴛᴏ ᴛʜʀᴇᴀᴅ ʟᴀɴɢ\n   {pn} <ᴛᴇxᴛ> -> <ɪꜱᴏ> — ᴛᴏ ꜱᴘᴇᴄɪꜰɪᴄ ʟᴀɴɢ\n   ʀᴇᴘʟʏ + {pn} [ɪꜱᴏ] — ᴛʀᴀɴꜱʟᴀᴛᴇ ʀᴇᴘʟɪᴇᴅ ᴍᴇꜱꜱᴀɢᴇ\n   {pn} -r on|off — ᴀᴜᴛᴏ ᴛʀᴀɴꜱʟᴀᴛᴇ ᴏɴ ʀᴇᴀᴄᴛɪᴏɴ\n   {pn} -r set — ꜱᴇᴛ ᴇᴍᴏᴊɪ"
		}
	},

	langs: {
		en: {
			translateTo:                `🌐 %1 → %2`,
			invalidArgument:            "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n⌀ ᴜꜱᴇ: on ᴏʀ off\n╰━━━━━━━━━━━━━━━╯",
			turnOnTransWhenReaction:    `╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n✦ ᴀᴜᴛᴏ ᴛʀᴀɴꜱʟᴀᴛᴇ: ᴏɴ\n◈ ʀᴇᴀᴄᴛ "${defaultEmojiTranslate}" ᴛᴏ ᴛʀᴀɴꜱʟᴀᴛᴇ\n╰━━━━━━━━━━━━━━━╯`,
			turnOffTransWhenReaction:   "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n✦ ᴀᴜᴛᴏ ᴛʀᴀɴꜱʟᴀᴛᴇ: ᴏꜰꜰ\n╰━━━━━━━━━━━━━━━╯",
			inputEmoji:                 "◈ ʀᴇᴀᴄᴛ ᴛᴏ ᴛʜɪꜱ ᴍᴇꜱꜱᴀɢᴇ ᴛᴏ ꜱᴇᴛ ᴛʀᴀɴꜱʟᴀᴛᴇ ᴇᴍᴏᴊɪ",
			emojiSet:                   "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n✦ ᴛʀᴀɴꜱʟᴀᴛᴇ ᴇᴍᴏᴊɪ: %1\n╰━━━━━━━━━━━━━━━╯"
		}
	},

	onStart: async function ({ message, event, args, threadsData, getLang, commandName }) {
		if (["-r", "-react", "-reaction"].includes(args[0])) {
			if (args[1] == "set")
				return message.reply(getLang("inputEmoji"), (err, info) =>
					global.GoatBot.onReaction.set(info.messageID, { type: "setEmoji", commandName, messageID: info.messageID, authorID: event.senderID })
				);
			const isEnable = args[1] == "on" ? true : args[1] == "off" ? false : null;
			if (isEnable == null) return message.reply(getLang("invalidArgument"));
			await threadsData.set(event.threadID, isEnable, "data.translate.autoTranslateWhenReaction");
			return message.reply(isEnable ? getLang("turnOnTransWhenReaction") : getLang("turnOffTransWhenReaction"));
		}

		const { body = "" } = event;
		let content, langCodeTrans;
		const langOfThread = await threadsData.get(event.threadID, "data.lang") || global.GoatBot.config.language;

		if (event.messageReply) {
			content = event.messageReply.body;
			let sep = body.lastIndexOf("->"); if (sep == -1) sep = body.lastIndexOf("=>");
			if (sep != -1 && (body.length - sep == 4 || body.length - sep == 5)) langCodeTrans = body.slice(sep + 2);
			else if ((args[0] || "").match(/\w{2,3}/)) langCodeTrans = args[0].match(/\w{2,3}/)[0];
			else langCodeTrans = langOfThread;
		} else {
			content = event.body;
			let sep = content.lastIndexOf("->"); if (sep == -1) sep = content.lastIndexOf("=>");
			if (sep != -1 && (content.length - sep == 4 || content.length - sep == 5)) {
				langCodeTrans = content.slice(sep + 2);
				content = content.slice(content.indexOf(args[0]), sep);
			} else {
				langCodeTrans = langOfThread;
			}
		}

		if (!content) return message.SyntaxError();
		await translateAndSendMessage(content, langCodeTrans, message, getLang);
	},

	onChat: async ({ event, threadsData }) => {
		if (!await threadsData.get(event.threadID, "data.translate.autoTranslateWhenReaction")) return;
		global.GoatBot.onReaction.set(event.messageID, { commandName: "translate", messageID: event.messageID, body: event.body, type: "translate" });
	},

	onReaction: async ({ message, Reaction, event, threadsData, getLang }) => {
		switch (Reaction.type) {
			case "setEmoji": {
				if (event.userID != Reaction.authorID) return;
				const emoji = event.reaction;
				if (!emoji) return;
				await threadsData.set(event.threadID, emoji, "data.translate.emojiTranslate");
				return message.reply(getLang("emojiSet", emoji), () => message.unsend(Reaction.messageID));
			}
			case "translate": {
				const emojiTrans = await threadsData.get(event.threadID, "data.translate.emojiTranslate") || "🌐";
				if (event.reaction == emojiTrans) {
					const langCodeTrans = await threadsData.get(event.threadID, "data.lang") || global.GoatBot.config.language;
					Reaction.delete();
					await translateAndSendMessage(Reaction.body, langCodeTrans, message, getLang);
				}
			}
		}
	}
};
