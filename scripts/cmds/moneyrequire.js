const fs   = require("fs-extra");
const path = require("path");

const CONFIG_FILE = path.join(process.cwd(), "config.json");

function readCfg()       { return fs.readJsonSync(CONFIG_FILE); }
function writeCfg(cfg)   { fs.writeJsonSync(CONFIG_FILE, cfg, { spaces: 2 }); }

function resolveCmd(name) {
	const G = global.GoatBot;
	return G.commands.get(name.toLowerCase())
		|| G.commands.get(G.aliases?.get(name.toLowerCase()));
}

function getAllCommands() {
	return [...global.GoatBot.commands.values()];
}

function randInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundToNearest(n, step = 50) {
	return Math.round(n / step) * step;
}

function fmtMoney(n) {
	return Number(n).toLocaleString("en-US");
}

module.exports = {
	config: {
		name:        "moneyrequire",
		aliases:     ["mreq", "moneyreq", "mr"],
		version:     "3.0.0",
		author:      "SIFAT",
		countDown:   3,
		role:        2,
		description: { en: "ᴀᴅᴠᴀɴᴄᴇᴅ ᴄᴏᴍᴍᴀɴᴅ ꜰᴇᴇ ᴍᴀɴᴀɢᴇʀ ᴡɪᴛʜ ꜰᴇᴇ ᴄᴏʟʟᴇᴄᴛᴏʀ" },
		category:    "owner",
		guide: {
			en: [
				"   {pn} set <ᴄᴍᴅ> <ᴀᴍᴛ>          — ꜱᴇᴛ ꜰᴇᴇ ꜰᴏʀ ᴀ ᴄᴏᴍᴍᴀɴᴅ",
				"   {pn} remove <ᴄᴍᴅ>               — ʀᴇᴍᴏᴠᴇ ꜰᴇᴇ",
				"   {pn} check <ᴄᴍᴅ>                — ᴄʜᴇᴄᴋ ꜰᴇᴇ ꜰᴏʀ ᴀ ᴄᴏᴍᴍᴀɴᴅ",
				"   {pn} list                        — ʟɪꜱᴛ ᴀʟʟ ꜰᴇᴇꜱ",
				"   {pn} clear                       — ᴄʟᴇᴀʀ ᴀʟʟ ꜰᴇᴇꜱ",
				"",
				"   {pn} all on [min] [max]          — ʀᴀɴᴅᴏᴍʟʏ ꜱᴇᴛ ꜰᴇᴇ ᴏɴ ᴀʟʟ ᴄᴍᴅꜱ",
				"   {pn} all off                     — ʀᴇᴍᴏᴠᴇ ꜰᴇᴇ ꜰʀᴏᴍ ᴀʟʟ ᴄᴍᴅꜱ",
				"   {pn} all set <ᴀᴍᴛ>              — ꜱᴀᴍᴇ ꜰᴇᴇ ꜰᴏʀ ᴀʟʟ ᴄᴍᴅꜱ",
				"",
				"   {pn} collector                   — ꜱʜᴏᴡ ꜰᴇᴇ ᴄᴏʟʟᴇᴄᴛᴏʀ ɪɴꜰᴏ",
				"   {pn} collector set <ᴜɪᴅ>        — ꜱᴇᴛ ꜰᴇᴇ ᴄᴏʟʟᴇᴄᴛᴏʀ ᴜɪᴅ",
				"   {pn} collector off               — ᴅɪꜱᴀʙʟᴇ ꜰᴇᴇ ᴄᴏʟʟᴇᴄᴛᴏʀ",
				"",
				"   {pn} stats                       — ᴛᴏᴛᴀʟ ᴇᴀʀɴᴇᴅ ʙʏ ᴄᴏʟʟᴇᴄᴛᴏʀ"
			].join("\n")
		}
	},

	langs: {
		en: {
			set:            "✦ ꜰᴇᴇ ꜱᴇᴛ\n◈ ᴄᴏᴍᴍᴀɴᴅ : %1\n◈ ꜰᴇᴇ     : $%2",
			removed:        "✦ ꜰᴇᴇ ʀᴇᴍᴏᴠᴇᴅ — %1",
			notFound:       "⌀ ᴄᴏᴍᴍᴀɴᴅ ɴᴏᴛ ꜰᴏᴜɴᴅ — %1",
			noReq:          "⌀ ɴᴏ ꜰᴇᴇ ꜱᴇᴛ ꜰᴏʀ %1",
			notNum:         "⌀ ᴀᴍᴏᴜɴᴛ ᴍᴜꜱᴛ ʙᴇ ≥ 0",
			listEmpty:      "⌀ ɴᴏ ꜰᴇᴇꜱ ꜱᴇᴛ",
			cleared:        "✦ ᴄʟᴇᴀʀᴇᴅ %1 ꜰᴇᴇ(ꜱ)",
			check:          "✦ %1\n◈ ꜰᴇᴇ    : $%2\n◈ ꜱᴏᴜʀᴄᴇ : %3",
			allOn:          "✦ ʀᴀɴᴅᴏᴍ ꜰᴇᴇꜱ ᴀᴘᴘʟɪᴇᴅ ᴛᴏ %1 ᴄᴍᴅꜱ\n◈ ʀᴀɴɢᴇ  : $%2 – $%3\n◈ ᴀᴠɢ    : ~$%4\n◈ ꜱᴋɪᴘᴘᴇᴅ: %5 (ꜱʏꜱᴛᴇᴍ/ᴏᴡɴᴇʀ)",
			allOff:         "✦ ꜰᴇᴇꜱ ʀᴇᴍᴏᴠᴇᴅ ꜰʀᴏᴍ %1 ᴄᴍᴅꜱ",
			allSet:         "✦ $%1 ꜰᴇᴇ ᴀᴘᴘʟɪᴇᴅ ᴛᴏ %2 ᴄᴍᴅꜱ\n◈ ꜱᴋɪᴘᴘᴇᴅ: %3 (ꜱʏꜱᴛᴇᴍ/ᴏᴡɴᴇʀ)",
			collectorInfo:  "✦ ꜰᴇᴇ ᴄᴏʟʟᴇᴄᴛᴏʀ\n◈ ᴜɪᴅ    : %1\n◈ ɴᴀᴍᴇ   : %2\n◈ ꜱᴛᴀᴛᴜꜱ : %3",
			collectorSet:   "✦ ꜰᴇᴇ ᴄᴏʟʟᴇᴄᴛᴏʀ ᴜᴘᴅᴀᴛᴇᴅ\n◈ ᴜɪᴅ : %1",
			collectorOff:   "✦ ꜰᴇᴇ ᴄᴏʟʟᴇᴄᴛᴏʀ ᴅɪꜱᴀʙʟᴇᴅ\n◈ ꜰᴇᴇꜱ ᴡɪʟʟ ɴᴏ ʟᴏɴɢᴇʀ ʙᴇ ᴄᴏʟʟᴇᴄᴛᴇᴅ",
			collectorNone:  "⌀ ɴᴏ ꜰᴇᴇ ᴄᴏʟʟᴇᴄᴛᴏʀ ꜱᴇᴛ",
			stats:          "✦ ꜰᴇᴇ ꜱᴛᴀᴛꜱ\n◈ ᴄᴏʟʟᴇᴄᴛᴏʀ : %1\n◈ ᴡᴀʟʟᴇᴛ    : $%2\n◈ ᴛᴏᴛᴀʟ ꜰᴇᴇᴅ: %3 ᴄᴍᴅꜱ",
			badUID:         "⌀ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴠᴀʟɪᴅ ɴᴜᴍᴇʀɪᴄ ᴜɪᴅ"
		}
	},

	onStart: async function ({ args, message, usersData, getLang }) {
		const sub    = (args[0] || "").toLowerCase();
		const cfg    = global.GoatBot.config;
		if (!cfg.commandMoney) cfg.commandMoney = {};


		const SKIP_ROLES     = [2, 4];
		const SKIP_CATS      = ["owner", "admin"];
		const SKIP_NAMES     = ["moneyrequire", "balance", "daily", "help", "prefix", "adminonly", "settings"];

		function shouldSkip(cmd) {
			if (SKIP_NAMES.includes(cmd.config.name)) return true;
			if (SKIP_CATS.includes((cmd.config.category || "").toLowerCase())) return true;
			if (cmd.config.role >= 2) return true;
			return false;
		}


		if (sub === "set") {
			const cmdName = args[1], amount = Number(args[2]);
			if (!cmdName) return message.SyntaxError();
			if (isNaN(amount) || amount < 0) return message.reply(getLang("notNum"));
			const cmd = resolveCmd(cmdName);
			if (!cmd) return message.reply(getLang("notFound", cmdName));
			cmd.config.requiredMoney = amount;
			cfg.commandMoney[cmd.config.name] = amount;
			const raw = readCfg();
			if (!raw.commandMoney) raw.commandMoney = {};
			raw.commandMoney[cmd.config.name] = amount;
			writeCfg(raw);
			return message.reply(getLang("set", cmd.config.name, fmtMoney(amount)));
		}


		if (sub === "remove" || sub === "del") {
			const cmdName = args[1];
			if (!cmdName) return message.SyntaxError();
			const cmd = resolveCmd(cmdName);
			if (!cmd) return message.reply(getLang("notFound", cmdName));
			const name = cmd.config.name;
			if (cfg.commandMoney[name] === undefined && !cmd.config.requiredMoney)
				return message.reply(getLang("noReq", name));
			delete cfg.commandMoney[name];
			cmd.config.requiredMoney = 0;
			const raw = readCfg();
			if (raw.commandMoney) delete raw.commandMoney[name];
			writeCfg(raw);
			return message.reply(getLang("removed", name));
		}


		if (sub === "check") {
			const cmdName = args[1];
			if (!cmdName) return message.SyntaxError();
			const cmd = resolveCmd(cmdName);
			if (!cmd) return message.reply(getLang("notFound", cmdName));
			const name      = cmd.config.name;
			const override  = cfg.commandMoney?.[name];
			const scriptReq = cmd.config.requiredMoney;
			const amount    = override ?? scriptReq ?? 0;
			const src       = override !== undefined ? "ᴏᴠᴇʀʀɪᴅᴇ" : scriptReq > 0 ? "ꜱᴄʀɪᴘᴛ" : "ɴᴏɴᴇ";
			return message.reply(getLang("check", name, fmtMoney(amount), src));
		}


		if (sub === "list") {
			const overrides = cfg.commandMoney || {};
			const entries   = new Map();
			for (const cmd of getAllCommands()) {
				if (cmd.config.requiredMoney > 0)
					entries.set(cmd.config.name, { amount: cmd.config.requiredMoney, src: "ꜱᴄʀɪᴘᴛ" });
			}
			for (const [name, amount] of Object.entries(overrides))
				entries.set(name, { amount, src: "ᴏᴠᴇʀʀɪᴅᴇ" });
			if (!entries.size) return message.reply(getLang("listEmpty"));
			let total = 0;
			let i = 1;
			const lines = [`✦ ᴍᴏɴᴇʏ ꜰᴇᴇꜱ [${entries.size}]:`];
			for (const [name, { amount, src }] of entries) {
				lines.push(`◦ ${String(i++).padStart(2, "0")}. ${name} → $${fmtMoney(amount)}  [${src}]`);
				total += amount;
			}
			lines.push(`◈ ᴀᴠɢ ꜰᴇᴇ : $${fmtMoney(Math.round(total / entries.size))}`);
			return message.reply(lines.join("\n"));
		}


		if (sub === "clear") {
			const count = Object.keys(cfg.commandMoney || {}).length;
			for (const name of Object.keys(cfg.commandMoney || {})) {
				const cmd = resolveCmd(name);
				if (cmd) cmd.config.requiredMoney = 0;
			}
			cfg.commandMoney = {};
			const raw = readCfg();
			raw.commandMoney = {};
			writeCfg(raw);
			return message.reply(getLang("cleared", count));
		}


		if (sub === "all") {
			const action = (args[1] || "").toLowerCase();
			const allCmds = getAllCommands();


			if (action === "on") {
				const min  = Math.max(0, Number(args[2]) || 500);
				const max  = Math.max(min, Number(args[3]) || 1500);
				const raw  = readCfg();
				if (!raw.commandMoney) raw.commandMoney = {};
				let applied = 0, skipped = 0;
				let totalFee = 0;
				for (const cmd of allCmds) {
					if (shouldSkip(cmd)) { skipped++; continue; }
					const fee = roundToNearest(randInt(min, max), 50);
					cmd.config.requiredMoney = fee;
					cfg.commandMoney[cmd.config.name] = fee;
					raw.commandMoney[cmd.config.name]  = fee;
					totalFee += fee;
					applied++;
				}
				writeCfg(raw);
				const avg = applied ? Math.round(totalFee / applied) : 0;
				return message.reply(getLang("allOn", applied, fmtMoney(min), fmtMoney(max), fmtMoney(avg), skipped));
			}


			if (action === "off") {
				const raw = readCfg();
				raw.commandMoney = {};
				let count = 0;
				for (const cmd of allCmds) {
					if (cmd.config.requiredMoney > 0 || cfg.commandMoney?.[cmd.config.name]) {
						cmd.config.requiredMoney = 0;
						count++;
					}
				}
				cfg.commandMoney = {};
				writeCfg(raw);
				return message.reply(getLang("allOff", count));
			}


			if (action === "set") {
				const amount = Number(args[2]);
				if (isNaN(amount) || amount < 0) return message.reply(getLang("notNum"));
				const raw = readCfg();
				if (!raw.commandMoney) raw.commandMoney = {};
				let applied = 0, skipped = 0;
				for (const cmd of allCmds) {
					if (shouldSkip(cmd)) { skipped++; continue; }
					cmd.config.requiredMoney = amount;
					cfg.commandMoney[cmd.config.name] = amount;
					raw.commandMoney[cmd.config.name]  = amount;
					applied++;
				}
				writeCfg(raw);
				return message.reply(getLang("allSet", fmtMoney(amount), applied, skipped));
			}

			return message.SyntaxError();
		}


		if (sub === "collector" || sub === "col") {
			const action = (args[1] || "").toLowerCase();

			if (!action || action === "info" || action === "status") {
				const uid = cfg.feeCollectorUID;
				if (!uid) return message.reply(getLang("collectorNone"));
				const uData = await usersData.get(uid).catch(() => null);
				const name  = uData?.name || "Unknown";
				const bal   = fmtMoney(uData?.money || 0);
				const status = uid ? "✅ ᴀᴄᴛɪᴠᴇ" : "⛔ ᴅɪꜱᴀʙʟᴇᴅ";
				return message.reply(getLang("collectorInfo", uid, `${name}  [$${bal}]`, status));
			}

			if (action === "set") {
				const uid = args[2];
				if (!uid || !/^\d+$/.test(uid)) return message.reply(getLang("badUID"));
				cfg.feeCollectorUID = uid;
				const raw = readCfg();
				raw.feeCollectorUID = uid;
				writeCfg(raw);
				return message.reply(getLang("collectorSet", uid));
			}

			if (action === "off" || action === "disable") {
				cfg.feeCollectorUID = "";
				const raw = readCfg();
				raw.feeCollectorUID = "";
				writeCfg(raw);
				return message.reply(getLang("collectorOff"));
			}

			return message.SyntaxError();
		}


		if (sub === "stats") {
			const uid      = cfg.feeCollectorUID;
			const feedCmds = Object.keys(cfg.commandMoney || {}).length;
			if (!uid) return message.reply(
				`✦ ꜰᴇᴇ ꜱᴛᴀᴛꜱ\n◈ ᴄᴏʟʟᴇᴄᴛᴏʀ : ⛔ ɴᴏɴᴇ\n◈ ᴛᴏᴛᴀʟ ꜰᴇᴇᴅ : ${feedCmds} ᴄᴍᴅꜱ`
			);
			const uData = await usersData.get(uid).catch(() => null);
			const name  = uData?.name || "Unknown";
			const bal   = fmtMoney(uData?.money || 0);
			return message.reply(getLang("stats", `${name} [${uid}]`, bal, feedCmds));
		}

		return message.SyntaxError();
	}
};
