const fs   = require("fs-extra");
const path = require("path");

const CFG_FILE  = path.join(process.cwd(), "config.json");
const FCA_FILE  = path.join(process.cwd(), "fca-config.json");

function readCfg()  { return fs.readJsonSync(CFG_FILE); }
function readFca()  { return fs.readJsonSync(FCA_FILE); }
function saveCfg(o) { fs.writeJsonSync(CFG_FILE, o, { spaces: 2 }); }
function saveFca(o) { fs.writeJsonSync(FCA_FILE, o, { spaces: 2 }); }

function setNested(obj, keyPath, value) {
	const keys = keyPath.split(".");
	let cur = obj;
	for (let i = 0; i < keys.length - 1; i++) {
		if (!cur[keys[i]] || typeof cur[keys[i]] !== "object") cur[keys[i]] = {};
		cur = cur[keys[i]];
	}
	cur[keys[keys.length - 1]] = value;
}

function getNested(obj, keyPath) {
	return keyPath.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function parseBool(v) {
	if (v === "true"  || v === "1" || v === "on"  || v === "yes") return true;
	if (v === "false" || v === "0" || v === "off" || v === "no")  return false;
	return null;
}

function parseValue(v) {
	if (v === "true"  || v === "1" || v === "on")  return true;
	if (v === "false" || v === "0" || v === "off")  return false;
	if (v === "null"  || v === "none")               return null;
	const n = Number(v);
	return isNaN(n) ? v : n;
}

function uptime() {
	const t = process.uptime();
	const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600),
	      m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
	return `${d > 0 ? `${d}ᴅ ` : ""}${h}ʜ ${m}ᴍ ${s}ꜱ`;
}

function syncToGlobal(key, value) {
	if (global.GoatBot?.config) {
		setNested(global.GoatBot.config, key, value);
	}
}

const TOGGLES = {

	"antiinbox":       { file: "cfg", path: "antiInbox",                     type: "bool" },
	"adminonly":       { file: "cfg", path: "adminOnly.enable",               type: "bool" },
	"spamprotection":  { file: "cfg", path: "spamProtection.enable",          type: "bool" },
	"autorestart":     { file: "cfg", path: "autoRestart.time",               type: "num"  },
	"autouptime":      { file: "cfg", path: "autoUptime.enable",              type: "bool" },
	"autoloadscripts": { file: "cfg", path: "autoLoadScripts.enable",         type: "bool" },
	"dashboard":       { file: "cfg", path: "dashBoard.enable",               type: "bool" },
	"whitelistmode":   { file: "cfg", path: "whiteListMode.enable",           type: "bool" },
	"typing":          { file: "cfg", path: "typingIndicator.enable",         type: "bool" },
	"autorefresh":     { file: "cfg", path: "autoRefreshFbstate",             type: "bool" },
	"restartmqtt":     { file: "cfg", path: "restartListenMqtt.enable",       type: "bool" },
	"github":          { file: "cfg", path: "github.enabled",                 type: "bool" },
	"notibot":         { file: "cfg", path: "notiWhenListenMqttError.telegram.enable", type: "bool" },
	"hidenoti":        { file: "cfg", path: "hideNotiMessage.commandNotFound", type: "bool" },
	"log.message":     { file: "cfg", path: "logEvents.message",              type: "bool" },
	"log.reaction":    { file: "cfg", path: "logEvents.message_reaction",     type: "bool" },
	"log.unsend":      { file: "cfg", path: "logEvents.message_unsend",       type: "bool" },
	"log.event":       { file: "cfg", path: "logEvents.event",                type: "bool" },


	"online":          { file: "fca", path: "optionsFca.online",              type: "bool" },
	"stealth":         { file: "fca", path: "optionsFca.stealthMode",         type: "bool" },
	"autoread":        { file: "fca", path: "optionsFca.autoMarkRead",        type: "bool" },
	"autodelivery":    { file: "fca", path: "optionsFca.autoMarkDelivery",    type: "bool" },
	"autoreconnect":   { file: "fca", path: "optionsFca.autoReconnect",       type: "bool" },
	"selflisten":      { file: "fca", path: "optionsFca.selfListen",          type: "bool" },
	"simulate":        { file: "fca", path: "optionsFca.simulateTyping",      type: "bool" },
	"randomua":        { file: "fca", path: "optionsFca.randomUserAgent",     type: "bool" },
	"presence":        { file: "fca", path: "optionsFca.updatePresence",      type: "bool" },
	"antispam":        { file: "fca", path: "antiSpam.enabled",               type: "bool" },
	"shield":          { file: "fca", path: "shield.enabled",                 type: "bool" },
	"antisuspension":  { file: "fca", path: "antiSuspension.enabled",         type: "bool" },
	"healthmonitor":   { file: "fca", path: "healthMonitor.enabled",          type: "bool" },
	"quiethours":      { file: "fca", path: "shield.quietHours",              type: "bool" },
	"loglevel":        { file: "fca", path: "optionsFca.logLevel",            type: "str"  },
	"persona":         { file: "fca", path: "optionsFca.persona",             type: "str"  },
};

const SOURCE_LABEL = { cfg: "ᴄᴏɴꜰɪɢ.ᴊꜱᴏɴ", fca: "ꜰᴄᴀ-ᴄᴏɴꜰɪɢ.ᴊꜱᴏɴ" };

module.exports = {
	config: {
		name:        "settings",
		aliases:     ["set", "cfg", "config"],
		version:     "2.0.0",
		author:      "SIFAT",
		countDown:   3,
		role:        2,
		description: { en: "ᴀᴅᴠᴀɴᴄᴇᴅ ʙᴏᴛ ꜱᴇᴛᴛɪɴɢꜱ — ᴄᴏɴꜰɪɢ + ꜰᴄᴀ-ᴄᴏɴꜰɪɢ" },
		category:    "owner",
		guide: {
			en: [
				"   {pn} list                      — ꜱʜᴏᴡ ᴀʟʟ ᴛᴏɢɢʟᴇꜱ & ᴄᴜʀʀᴇɴᴛ ᴠᴀʟᴜᴇꜱ",
				"   {pn} status                    — ᴋᴇʏ ʙᴏᴛ ꜱᴛᴀᴛᴜꜱ ꜱɴᴀᴘꜱʜᴏᴛ",
				"   {pn} get <ᴋᴇʏ>                — ɢᴇᴛ ᴄᴜʀʀᴇɴᴛ ᴠᴀʟᴜᴇ",
				"   {pn} on <ᴋᴇʏ>                 — ᴇɴᴀʙʟᴇ ᴀ ꜰᴇᴀᴛᴜʀᴇ",
				"   {pn} off <ᴋᴇʏ>                — ᴅɪꜱᴀʙʟᴇ ᴀ ꜰᴇᴀᴛᴜʀᴇ",
				"   {pn} set <ᴋᴇʏ> <ᴠᴀʟᴜᴇ>       — ꜱᴇᴛ ᴀɴʏ ᴠᴀʟᴜᴇ",
				"   {pn} raw <ᴊꜱᴏɴ.ᴘᴀᴛʜ> <ᴠᴀʟ>   — ᴅɪʀᴇᴄᴛ ᴇᴅɪᴛ ᴄᴏɴꜰɪɢ.ᴊꜱᴏɴ",
				"   {pn} fca <ᴊꜱᴏɴ.ᴘᴀᴛʜ> <ᴠᴀʟ>   — ᴅɪʀᴇᴄᴛ ᴇᴅɪᴛ ꜰᴄᴀ-ᴄᴏɴꜰɪɢ.ᴊꜱᴏɴ",
				"   {pn} prefix <ᴘꜰx>              — ᴄʜᴀɴɢᴇ ʙᴏᴛ ᴘʀᴇꜰɪx",
				"   {pn} name <ɴᴀᴍᴇ>              — ᴄʜᴀɴɢᴇ ʙᴏᴛ ɴɪᴄᴋɴᴀᴍᴇ",
				"   {pn} lang <ᴄᴏᴅᴇ>              — ᴄʜᴀɴɢᴇ ʟᴀɴɢᴜᴀɢᴇ",
			].join("\n")
		}
	},

	langs: {
		en: {
			get:        "✦ %1\n◈ ᴠᴀʟᴜᴇ  : %2\n◈ ꜱᴏᴜʀᴄᴇ : %3",
			updated:    "✦ %1 ᴜᴘᴅᴀᴛᴇᴅ\n◈ ᴏʟᴅ : %2\n◈ ɴᴇᴡ : %3\n◈ ꜰɪʟᴇ: %4",
			unknown:    "⌀ ᴜɴᴋɴᴏᴡɴ ᴋᴇʏ — %1\n◈ ᴜꜱᴇ: settings list",
			rawDone:    "✦ ʀᴀᴡ ᴇᴅɪᴛ ᴀᴘᴘʟɪᴇᴅ\n◈ ᴘᴀᴛʜ : %1\n◈ ᴠᴀʟᴜᴇ: %2",
			rawFail:    "⌀ ꜰᴀɪʟᴇᴅ ᴛᴏ ᴡʀɪᴛᴇ — %1",
			prefixDone: "✦ ᴘʀᴇꜰɪx ᴄʜᴀɴɢᴇᴅ\n◈ ɴᴇᴡ: %1",
			nameDone:   "✦ ɴɪᴄᴋɴᴀᴍᴇ ᴄʜᴀɴɢᴇᴅ\n◈ ɴᴇᴡ: %1",
			langDone:   "✦ ʟᴀɴɢᴜᴀɢᴇ ᴄʜᴀɴɢᴇᴅ\n◈ ɴᴇᴡ: %1",
			noVal:      "⌀ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴠᴀʟᴜᴇ"
		}
	},

	onStart: async function ({ args, message, getLang }) {
		const sub = (args[0] || "").toLowerCase();
		const cfgRaw = readCfg();
		const fcaRaw = readFca();

		function currentVal(def) {
			const src = def.file === "fca" ? fcaRaw : cfgRaw;
			return getNested(src, def.path);
		}

		function applyToggle(def, value) {
			if (def.file === "fca") {
				setNested(fcaRaw, def.path, value);
				saveFca(fcaRaw);
			} else {
				setNested(cfgRaw, def.path, value);
				syncToGlobal(def.path, value);
				saveCfg(cfgRaw);
			}
		}


		if (!sub || sub === "status" || sub === "info") {
			const cfg = global.GoatBot.config;
			const ao  = cfg.adminOnly?.enable;
			const sp  = cfg.spamProtection?.enable;
			const ti  = cfg.typingIndicator?.enable;
			const feeUID = cfg.feeCollectorUID || "─";
			const st  = getNested(fcaRaw, "optionsFca.stealthMode");
			const ol  = getNested(fcaRaw, "optionsFca.online");

			return message.reply(
				"❏ ʙᴏᴛ ꜱᴇᴛᴛɪɴɢꜱ ꜱɴᴀᴘꜱʜᴏᴛ\n"
				+ "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n"
				+ `◈ ᴜᴘᴛɪᴍᴇ        : ${uptime()}\n`
				+ `◈ ᴘʀᴇꜰɪx        : ${cfg.prefix || "─"}\n`
				+ `◈ ɴɪᴄᴋɴᴀᴍᴇ      : ${cfg.nickNameBot || "─"}\n`
				+ `◈ ʟᴀɴɢᴜᴀɢᴇ      : ${cfg.language || "en"}\n`
				+ "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n"
				+ `◈ ᴀᴅᴍɪɴ-ᴏɴʟʏ    : ${ao  ? "✅ ᴏɴ" : "⛔ ᴏꜰꜰ"}\n`
				+ `◈ ꜱᴘᴀᴍ ᴘʀᴏᴛ     : ${sp  ? "✅ ᴏɴ" : "⛔ ᴏꜰꜰ"}\n`
				+ `◈ ᴛʏᴘɪɴɢ ɪɴᴅ    : ${ti  ? "✅ ᴏɴ" : "⛔ ᴏꜰꜰ"}\n`
				+ `◈ ꜱᴛᴇᴀʟᴛʜ ᴍᴏᴅᴇ  : ${st  ? "✅ ᴏɴ" : "⛔ ᴏꜰꜰ"}\n`
				+ `◈ ᴏɴʟɪɴᴇ ꜱᴛᴀᴛᴜꜱ : ${ol  ? "✅ ᴏɴ" : "⛔ ᴏꜰꜰ"}\n`
				+ `◈ ꜰᴇᴇ ᴄᴏʟʟᴇᴄᴛᴏʀ : ${feeUID}\n`
				+ "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n"
				+ `◈ ᴀᴅᴍɪɴꜱ        : ${(cfg.adminBot || []).length}\n`
				+ `◈ ᴘʀᴇᴍɪᴜᴍ       : ${(cfg.premiumUsers || []).length}\n`
				+ `◈ ᴅᴇᴠ ᴜꜱᴇʀꜱ     : ${(cfg.devUsers || []).length}`
			);
		}


		if (sub === "list" || sub === "ls") {
			const cfgLines = [], fcaLines = [];
			for (const [key, def] of Object.entries(TOGGLES)) {
				const val = currentVal(def);
				const line = `  ${key.padEnd(16)} : ${String(val)}`;
				if (def.file === "fca") fcaLines.push(line);
				else cfgLines.push(line);
			}
			return message.reply(
				"✦ ᴀʟʟ ꜱᴇᴛᴛɪɴɢ ᴛᴏɢɢʟᴇꜱ\n"
				+ "\n— ᴄᴏɴꜰɪɢ.ᴊꜱᴏɴ —\n"
				+ cfgLines.join("\n")
				+ "\n\n— ꜰᴄᴀ-ᴄᴏɴꜰɪɢ.ᴊꜱᴏɴ —\n"
				+ fcaLines.join("\n")
				+ "\n\n◈ ᴜꜱᴀɢᴇ: settings on/off <ᴋᴇʏ>"
			);
		}


		if (sub === "get") {
			const key = (args[1] || "").toLowerCase();
			const def = TOGGLES[key];
			if (!def) return message.reply(getLang("unknown", key));
			const val = currentVal(def);
			return message.reply(getLang("get", key, String(val), SOURCE_LABEL[def.file]));
		}


		if (sub === "on" || sub === "enable") {
			const key = (args[1] || "").toLowerCase();
			const def = TOGGLES[key];
			if (!def) return message.reply(getLang("unknown", key));
			const old = currentVal(def);
			applyToggle(def, true);
			return message.reply(getLang("updated", key, String(old), "true", SOURCE_LABEL[def.file]));
		}


		if (sub === "off" || sub === "disable") {
			const key = (args[1] || "").toLowerCase();
			const def = TOGGLES[key];
			if (!def) return message.reply(getLang("unknown", key));
			const old = currentVal(def);
			applyToggle(def, false);
			return message.reply(getLang("updated", key, String(old), "false", SOURCE_LABEL[def.file]));
		}


		if (sub === "set") {
			const key = (args[1] || "").toLowerCase();
			const raw = args.slice(2).join(" ");
			if (!raw) return message.reply(getLang("noVal"));
			const def = TOGGLES[key];
			if (!def) return message.reply(getLang("unknown", key));
			const old   = currentVal(def);
			const value = parseValue(raw);
			applyToggle(def, value);
			return message.reply(getLang("updated", key, String(old), String(value), SOURCE_LABEL[def.file]));
		}


		if (sub === "raw") {
			const dotPath = args[1];
			const rawVal  = args.slice(2).join(" ");
			if (!dotPath || !rawVal) return message.reply(getLang("noVal"));
			try {
				const value = parseValue(rawVal);
				setNested(cfgRaw, dotPath, value);
				saveCfg(cfgRaw);
				syncToGlobal(dotPath, value);
				return message.reply(getLang("rawDone", dotPath, String(value)));
			} catch (e) {
				return message.reply(getLang("rawFail", e.message));
			}
		}


		if (sub === "fca") {
			const dotPath = args[1];
			const rawVal  = args.slice(2).join(" ");
			if (!dotPath || !rawVal) return message.reply(getLang("noVal"));
			try {
				const value = parseValue(rawVal);
				setNested(fcaRaw, dotPath, value);
				saveFca(fcaRaw);
				return message.reply(getLang("rawDone", dotPath, String(value)));
			} catch (e) {
				return message.reply(getLang("rawFail", e.message));
			}
		}


		if (sub === "prefix") {
			const pfx = args[1];
			if (!pfx) return message.reply(getLang("noVal"));
			cfgRaw.prefix = pfx;
			if (global.GoatBot?.config) global.GoatBot.config.prefix = pfx;
			saveCfg(cfgRaw);
			return message.reply(getLang("prefixDone", pfx));
		}


		if (sub === "name") {
			const name = args.slice(1).join(" ");
			if (!name) return message.reply(getLang("noVal"));
			cfgRaw.nickNameBot = name;
			if (global.GoatBot?.config) global.GoatBot.config.nickNameBot = name;
			saveCfg(cfgRaw);
			return message.reply(getLang("nameDone", name));
		}


		if (sub === "lang" || sub === "language") {
			const lang = args[1];
			if (!lang) return message.reply(getLang("noVal"));
			cfgRaw.language = lang;
			if (global.GoatBot?.config) global.GoatBot.config.language = lang;
			saveCfg(cfgRaw);
			return message.reply(getLang("langDone", lang));
		}

		return message.SyntaxError();
	}
};
