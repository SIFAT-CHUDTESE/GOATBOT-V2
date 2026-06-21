const fs = require("fs-extra");
const path = require("path");

const CONFIG_FILE = path.join(process.cwd(), "config.json");

function saveConfig(cfg) {
	fs.writeJsonSync(CONFIG_FILE, cfg, { spaces: 2 });
}

function fmtMs(ms) {
	if (ms < 1000) return `${ms}ᴍꜱ`;
	return `${(ms / 1000).toFixed(1)}ꜱ`;
}

module.exports = {
	config: {
		name: "typing",
		aliases: ["type"],
		version: "2.0.0",
		author: "SIFAT",
		countDown: 3,
		role: 2,
		description: { en: "ᴍᴀɴᴀɢᴇ ᴛʏᴘɪɴɢ ɪɴᴅɪᴄᴀᴛᴏʀ ꜱʏꜱᴛᴇᴍ" },
		category: "owner",
		guide: { en: "{pn} on | off | set <ᴍꜱ> | simulate on/off | exclude [ᴛɪᴅ] | include [ᴛɪᴅ] | status | test" }
	},

	langs: {
		en: {
			on:          "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n✦ ᴛʏᴘɪɴɢ ɪɴᴅɪᴄᴀᴛᴏʀ: ᴏɴ\n◈ ᴅᴜʀᴀᴛɪᴏɴ: %1\n╰━━━━━━━━━━━━━━━╯",
			off:         "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n✦ ᴛʏᴘɪɴɢ ɪɴᴅɪᴄᴀᴛᴏʀ: ᴏꜰꜰ\n╰━━━━━━━━━━━━━━━╯",
			setDur:      "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n✦ ᴅᴜʀᴀᴛɪᴏɴ → %1\n╰━━━━━━━━━━━━━━━╯",
			simOn:       "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n✦ ꜱɪᴍᴜʟᴀᴛᴇ ᴛʏᴘɪɴɢ: ᴏɴ\n╰━━━━━━━━━━━━━━━╯",
			simOff:      "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n✦ ꜱɪᴍᴜʟᴀᴛᴇ ᴛʏᴘɪɴɢ: ᴏꜰꜰ\n╰━━━━━━━━━━━━━━━╯",
			excluded:    "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n✦ ᴇxᴄʟᴜᴅᴇᴅ: %1\n╰━━━━━━━━━━━━━━━╯",
			included:    "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n✦ ʀᴇ-ɪɴᴄʟᴜᴅᴇᴅ: %1\n╰━━━━━━━━━━━━━━━╯",
			notExcluded: "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n⌀ ᴛʜʀᴇᴀᴅ ɴᴏᴛ ɪɴ ᴇxᴄʟᴜᴅᴇ ʟɪꜱᴛ\n╰━━━━━━━━━━━━━━━╯",
			alreadyEx:   "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n⌀ ᴛʜʀᴇᴀᴅ ᴀʟʀᴇᴀᴅʏ ᴇxᴄʟᴜᴅᴇᴅ\n╰━━━━━━━━━━━━━━━╯",
			noId:        "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n⌀ ᴇɴᴛᴇʀ ᴛʜʀᴇᴀᴅ ɪᴅ ᴏʀ ᴜꜱᴇ ᴄᴜʀʀᴇɴᴛ\n╰━━━━━━━━━━━━━━━╯",
			notNum:      "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n⌀ ᴅᴜʀᴀᴛɪᴏɴ ᴍᴜꜱᴛ ʙᴇ ≥ 100 ᴍꜱ\n╰━━━━━━━━━━━━━━━╯",
			testSent:    "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n✦ ᴛᴇꜱᴛ ᴛʏᴘɪɴɢ ꜱᴇɴᴛ (%1)\n╰━━━━━━━━━━━━━━━╯",
			testFail:    "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n⌀ ꜰᴀɪʟᴇᴅ: %1\n╰━━━━━━━━━━━━━━━╯",
			status:      "╭━━━━  ᴍᴀʀɪɴ ᴀɪ  ━━━━╮\n✦ ᴛʏᴘɪɴɢ ꜱᴛᴀᴛᴜꜱ\n◈ ᴇɴᴀʙʟᴇᴅ   : %1\n◈ ᴅᴜʀᴀᴛɪᴏɴ  : %2\n◈ ꜱɪᴍᴜʟᴀᴛᴇ : %3\n◈ ᴇxᴄʟᴜᴅᴇᴅ : %4 ᴛʜʀᴇᴀᴅ(ꜱ)\n╰━━━━━━━━━━━━━━━╯"
		}
	},

	onStart: async function ({ args, message, event, getLang, api }) {
		const sub = (args[0] || "").toLowerCase();
		const cfg = global.GoatBot.config;
		const ti  = cfg.typingIndicator || {};
		const raw = () => fs.readJsonSync(CONFIG_FILE);

		if (sub === "on") {
			ti.enable = true; cfg.typingIndicator = ti;
			const r = raw(); r.typingIndicator = r.typingIndicator || {}; r.typingIndicator.enable = true; saveConfig(r);
			return message.reply(getLang("on", fmtMs(ti.duration ?? 2000)));
		}

		if (sub === "off") {
			ti.enable = false; cfg.typingIndicator = ti;
			const r = raw(); r.typingIndicator = r.typingIndicator || {}; r.typingIndicator.enable = false; saveConfig(r);
			return message.reply(getLang("off"));
		}

		if (sub === "set") {
			const ms = Number(args[1]);
			if (isNaN(ms) || ms < 100) return message.reply(getLang("notNum"));
			ti.duration = ms; cfg.typingIndicator = ti;
			const r = raw(); r.typingIndicator = r.typingIndicator || {}; r.typingIndicator.duration = ms; saveConfig(r);
			return message.reply(getLang("setDur", fmtMs(ms)));
		}

		if (sub === "simulate") {
			const val = (args[1] || "").toLowerCase() !== "off";
			cfg.optionsFca = cfg.optionsFca || {};
			cfg.optionsFca.simulateTyping = val;
			const r = raw();
			if (!r.optionsFca) r.optionsFca = {};
			r.optionsFca.simulateTyping = val;
			saveConfig(r);
			return message.reply(val ? getLang("simOn") : getLang("simOff"));
		}

		if (sub === "exclude") {
			const tid = args[1] || event.threadID;
			if (!tid) return message.reply(getLang("noId"));
			if (!ti.excludeThreads) ti.excludeThreads = [];
			if (ti.excludeThreads.includes(tid)) return message.reply(getLang("alreadyEx"));
			ti.excludeThreads.push(tid); cfg.typingIndicator = ti;
			const r = raw();
			r.typingIndicator = r.typingIndicator || {};
			if (!r.typingIndicator.excludeThreads) r.typingIndicator.excludeThreads = [];
			r.typingIndicator.excludeThreads.push(tid);
			saveConfig(r);
			return message.reply(getLang("excluded", tid));
		}

		if (sub === "include") {
			const tid = args[1] || event.threadID;
			if (!tid) return message.reply(getLang("noId"));
			if (!ti.excludeThreads?.includes(tid)) return message.reply(getLang("notExcluded"));
			ti.excludeThreads = ti.excludeThreads.filter(t => t !== tid); cfg.typingIndicator = ti;
			const r = raw();
			r.typingIndicator = r.typingIndicator || {};
			r.typingIndicator.excludeThreads = ti.excludeThreads;
			saveConfig(r);
			return message.reply(getLang("included", tid));
		}

		if (sub === "test") {
			const tid = event.threadID;
			const dur = ti.duration ?? 2000;
			try {
				await api.sendTypingIndicator(true, tid);
				setTimeout(() => { try { api.sendTypingIndicator(false, tid); } catch {} }, dur);
				return message.reply(getLang("testSent", fmtMs(dur)));
			} catch (err) {
				return message.reply(getLang("testFail", err.message || "unknown"));
			}
		}

		if (!sub || sub === "status") {
			const exCount = (ti.excludeThreads || []).length;
			return message.reply(getLang("status",
				ti.enable === false ? "⛔ ᴏꜰꜰ" : "✅ ᴏɴ",
				fmtMs(ti.duration ?? 2000),
				cfg.optionsFca?.simulateTyping !== false ? "✅ ᴏɴ" : "⛔ ᴏꜰꜰ",
				exCount
			));
		}

		return message.SyntaxError();
	}
};
