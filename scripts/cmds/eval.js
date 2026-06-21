const { removeHomeDir, log } = global.utils;

const TIMEOUT_MS = 15000;

module.exports = {
	config: {
		name: "eval",
		aliases: ["ev", "js"],
		version: "2.0.0",
		author: "SIFAT",
		countDown: 3,
		role: 4,
		description: { en: "ᴇxᴇᴄᴜᴛᴇ ᴊᴀᴠᴀꜱᴄʀɪᴘᴛ ᴄᴏᴅᴇ" },
		category: "owner",
		guide: { en: "{pn} <ᴄᴏᴅᴇ>\n   ᴜꜱᴇ output() ᴏʀ out() ᴛᴏ ᴘʀɪɴᴛ\n   ʀᴇᴘʟʏ ᴀ ᴍᴇꜱꜱᴀɢᴇ ᴛᴏ ɢᴇᴛ ɪᴛꜱ ᴄᴏɴᴛᴇɴᴛ" }
	},

	langs: {
		en: {
			noCode:  "⌀ ᴘʀᴏᴠɪᴅᴇ ᴄᴏᴅᴇ ᴛᴏ ᴇᴠᴀʟ",
			error:   "⌀ ᴇʀʀᴏʀ:\n%1",
			timeout: "⌀ ᴛɪᴍᴇᴅ ᴏᴜᴛ ᴀꜰᴛᴇʀ 15ꜱ"
		}
	},

	onStart: async function ({ api, args, message, event, threadsData, usersData, dashBoardData, globalData, threadModel, userModel, dashBoardModel, globalModel, role, commandName, getLang }) {
		let code = args.join(" ");
		if (!code && event.messageReply) code = `output(${JSON.stringify(event.messageReply.body)})`;
		if (!code) return message.reply(getLang("noCode"));

		let _outQueue = Promise.resolve();
		let timedOut = false;

		const timer = setTimeout(() => {
			timedOut = true;
			message.reply(getLang("timeout"));
		}, TIMEOUT_MS);

		function serialize(msg) {
			if (typeof msg === "number" || typeof msg === "boolean" || typeof msg === "function") return msg.toString();
			if (msg instanceof Map) {
				const o = {};
				msg.forEach((v, k) => { o[k] = v; });
				return `Map(${msg.size}) ${JSON.stringify(o, null, 2)}`;
			}
			if (typeof msg === "object") return JSON.stringify(msg, null, 2);
			if (typeof msg === "undefined") return "undefined";
			return String(msg);
		}

		function output(msg) {
			if (timedOut) return;
			const text = serialize(msg);
			_outQueue = _outQueue.then(() => new Promise(resolve => {
				message.reply(text);
				setTimeout(resolve, 600);
			}));
		}

		const out = output;
		const print = output;

		const cmd = `(async () => { try { ${code} } catch(err) { log.err("eval", err); message.send(getLang("error", err.stack ? removeHomeDir(err.stack) : removeHomeDir(JSON.stringify(err, null, 2) || ""))); } })()`;
		try {
			await eval(cmd);
		} finally {
			clearTimeout(timer);
		}
	}
};
