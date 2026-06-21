const fs   = require("fs-extra");
const path = require("path");

const CONFIG_FILE = path.join(process.cwd(), "config.json");

function readCfg()            { return fs.readJsonSync(CONFIG_FILE); }
function writeCfg(cfg)        { fs.writeJsonSync(CONFIG_FILE, cfg, { spaces: 2 }); }

function getAdminOnly() {
	const ao = global.GoatBot?.config?.adminOnly;
	if (!ao || typeof ao !== "object") return { enable: false, ignoreCommand: [], whitelistUsers: [] };
	return {
		enable:         !!ao.enable,
		ignoreCommand:  Array.isArray(ao.ignoreCommand)  ? ao.ignoreCommand  : [],
		whitelistUsers: Array.isArray(ao.whitelistUsers) ? ao.whitelistUsers : []
	};
}

function saveAdminOnly(data) {
	if (global.GoatBot?.config) global.GoatBot.config.adminOnly = data;
	const cfg = readCfg();
	cfg.adminOnly = data;
	writeCfg(cfg);
}

function uptime() {
	const t = process.uptime();
	const d = Math.floor(t / 86400),
	      h = Math.floor((t % 86400) / 3600),
	      m = Math.floor((t % 3600) / 60),
	      s = Math.floor(t % 60);
	return `${d > 0 ? `${d}ᴅ ` : ""}${h}ʜ ${m}ᴍ ${s}ꜱ`;
}

function resolveUIDs(args, event, offset = 2) {
	const mentions = Object.keys(event.mentions || {});
	if (mentions.length) return mentions;
	if (event.messageReply) return [event.messageReply.senderID];
	return args.slice(offset).filter(a => /^\d+$/.test(a));
}

function getAllCmdNames() {
	return [...(global.GoatBot?.commands?.keys() || [])].sort();
}

module.exports = {
	config: {
		name:        "adminonly",
		aliases:     ["ao", "aonly"],
		version:     "3.0.0",
		author:      "SIFAT",
		countDown:   3,
		role:        2,
		description: { en: "ᴀᴅᴠᴀɴᴄᴇᴅ ᴀᴅᴍɪɴ-ᴏɴʟʏ ᴍᴏᴅᴇ ᴍᴀɴᴀɢᴇʀ" },
		category:    "owner",
		guide: {
			en: [
				"   {pn} on              — ᴇɴᴀʙʟᴇ ᴀᴅᴍɪɴ-ᴏɴʟʏ ᴍᴏᴅᴇ",
				"   {pn} off             — ᴅɪꜱᴀʙʟᴇ ᴀᴅᴍɪɴ-ᴏɴʟʏ ᴍᴏᴅᴇ",
				"   {pn} status          — ꜱʜᴏᴡ ꜰᴜʟʟ ꜱᴛᴀᴛᴜꜱ",
				"",
				"   {pn} ignore add <cmd [cmd2 ...]>  — ᴇxᴇᴍᴘᴛ ᴄᴍᴅꜱ",
				"   {pn} ignore remove <cmd>           — ʀᴇᴍᴏᴠᴇ ᴇxᴇᴍᴘᴛɪᴏɴ",
				"   {pn} ignore list                   — ʟɪꜱᴛ ᴇxᴇᴍᴘᴛᴇᴅ ᴄᴍᴅꜱ",
				"   {pn} ignore clear                  — ᴄʟᴇᴀʀ ᴀʟʟ ᴇxᴇᴍᴘᴛɪᴏɴꜱ",
				"",
				"   {pn} whitelist add [@|uid|reply]  — ᴀʟʟᴏᴡ ᴜꜱᴇʀ ᴛᴏ ʙʏᴘᴀꜱꜱ",
				"   {pn} whitelist remove [@|uid]      — ʀᴇᴍᴏᴠᴇ ᴜꜱᴇʀ ʙʏᴘᴀꜱꜱ",
				"   {pn} whitelist list                — ʟɪꜱᴛ ᴡʜɪᴛᴇʟɪꜱᴛᴇᴅ ᴜꜱᴇʀꜱ",
				"   {pn} whitelist clear               — ᴄʟᴇᴀʀ ᴀʟʟ ᴡʜɪᴛᴇʟɪꜱᴛ",
				"",
				"   {pn} cmds           — ʟɪꜱᴛ ᴀʟʟ ᴀᴠᴀɪʟᴀʙʟᴇ ᴄᴏᴍᴍᴀɴᴅꜱ"
			].join("\n")
		}
	},

	langs: {
		en: {

			statusHeader:   "❏ ᴀᴅᴍɪɴ-ᴏɴʟʏ ꜱᴛᴀᴛᴜꜱ\n",
			statusMode:     "◈ ᴍᴏᴅᴇ       : %1\n",
			statusUptime:   "◈ ᴜᴘᴛɪᴍᴇ     : %1\n",
			statusIgnore:   "◈ ɪɢɴᴏʀᴇᴅ    : %1 ᴄᴍᴅ(ꜱ)\n",
			statusWhite:    "◈ ᴡʜɪᴛᴇʟɪꜱᴛ  : %1 ᴜꜱᴇʀ(ꜱ)\n",
			statusAdmins:   "◈ ᴀᴅᴍɪɴꜱ     : %1",

			enabled:        "✦ ᴀᴅᴍɪɴ-ᴏɴʟʏ ᴇɴᴀʙʟᴇᴅ ✔\n◈ ᴏɴʟʏ ʙᴏᴛ ᴀᴅᴍɪɴꜱ ᴄᴀɴ ᴜꜱᴇ ᴛʜᴇ ʙᴏᴛ",
			disabled:       "✦ ᴀᴅᴍɪɴ-ᴏɴʟʏ ᴅɪꜱᴀʙʟᴇᴅ ✘\n◈ ᴇᴠᴇʀʏᴏɴᴇ ᴄᴀɴ ɴᴏᴡ ᴜꜱᴇ ᴛʜᴇ ʙᴏᴛ",
			alreadyOn:      "⌀ ᴀᴅᴍɪɴ-ᴏɴʟʏ ɪꜱ ᴀʟʀᴇᴀᴅʏ ᴇɴᴀʙʟᴇᴅ",
			alreadyOff:     "⌀ ᴀᴅᴍɪɴ-ᴏɴʟʏ ɪꜱ ᴀʟʀᴇᴀᴅʏ ᴅɪꜱᴀʙʟᴇᴅ",

			ignoreAdded:    "✦ ɪɢɴᴏʀᴇ ʟɪꜱᴛ ᴜᴘᴅᴀᴛᴇᴅ\n◈ ᴀᴅᴅᴇᴅ    : %1\n◈ ᴅᴜᴘʟɪᴄᴀᴛᴇ : %2\n◈ ɴᴏᴛ ꜰᴏᴜɴᴅ : %3",
			ignoreRemoved:  "✦ ʀᴇᴍᴏᴠᴇᴅ ꜰʀᴏᴍ ɪɢɴᴏʀᴇ ʟɪꜱᴛ\n◈ ʀᴇᴍᴏᴠᴇᴅ  : %1\n◈ ɴᴏᴛ ꜰᴏᴜɴᴅ : %2",
			ignoreList:     "✦ ᴇxᴇᴍᴘᴛᴇᴅ ᴄᴏᴍᴍᴀɴᴅꜱ (%1):\n%2",
			ignoreEmpty:    "⌀ ɴᴏ ᴄᴏᴍᴍᴀɴᴅꜱ ᴀʀᴇ ᴇxᴇᴍᴘᴛᴇᴅ",
			ignoreCleared:  "✦ ɪɢɴᴏʀᴇ ʟɪꜱᴛ ᴄʟᴇᴀʀᴇᴅ ✔",
			ignoreBadArgs:  "⌀ ᴘʀᴏᴠɪᴅᴇ ᴀᴛ ʟᴇᴀꜱᴛ ᴏɴᴇ ᴄᴏᴍᴍᴀɴᴅ ɴᴀᴍᴇ",

			wlAdded:        "✦ ᴡʜɪᴛᴇʟɪꜱᴛ ᴜᴘᴅᴀᴛᴇᴅ\n◈ ᴀᴅᴅᴇᴅ    : %1\n◈ ᴅᴜᴘʟɪᴄᴀᴛᴇ : %2",
			wlRemoved:      "✦ ʀᴇᴍᴏᴠᴇᴅ ꜰʀᴏᴍ ᴡʜɪᴛᴇʟɪꜱᴛ\n◈ ʀᴇᴍᴏᴠᴇᴅ  : %1\n◈ ɴᴏᴛ ꜰᴏᴜɴᴅ : %2",
			wlList:         "✦ ᴡʜɪᴛᴇʟɪꜱᴛᴇᴅ ᴜꜱᴇʀꜱ (%1):\n%2",
			wlEmpty:        "⌀ ɴᴏ ᴜꜱᴇʀꜱ ɪɴ ᴡʜɪᴛᴇʟɪꜱᴛ",
			wlCleared:      "✦ ᴡʜɪᴛᴇʟɪꜱᴛ ᴄʟᴇᴀʀᴇᴅ ✔",
			wlNoUID:        "⌀ ᴛᴀɢ / ʀᴇᴘʟʏ / ᴘʀᴏᴠɪᴅᴇ ᴜɪᴅ",

			cmdList:        "✦ ᴀʟʟ ᴄᴏᴍᴍᴀɴᴅꜱ (%1):\n%2"
		}
	},

	onStart: async function ({ args, event, message, usersData, getLang }) {
		const sub    = (args[0] || "").toLowerCase();
		const action = (args[1] || "").toLowerCase();
		const ao     = getAdminOnly();
		const modeLabel = ao.enable ? "✅ ᴏɴ" : "⛔ ᴏꜰꜰ";


		if (!sub || sub === "status" || sub === "info" || sub === "-s") {
			const adminCount = (global.GoatBot?.config?.adminBot || []).length;
			return message.reply(
				getLang("statusHeader") +
				getLang("statusMode",   modeLabel) +
				getLang("statusUptime", uptime()) +
				getLang("statusIgnore", ao.ignoreCommand.length) +
				getLang("statusWhite",  ao.whitelistUsers.length) +
				getLang("statusAdmins", adminCount)
			);
		}


		if (sub === "on" || sub === "enable") {
			if (ao.enable) return message.reply(getLang("alreadyOn"));
			ao.enable = true;
			saveAdminOnly(ao);
			return message.reply(getLang("enabled"));
		}


		if (sub === "off" || sub === "disable") {
			if (!ao.enable) return message.reply(getLang("alreadyOff"));
			ao.enable = false;
			saveAdminOnly(ao);
			return message.reply(getLang("disabled"));
		}


		if (sub === "ignore" || sub === "ig") {
			const allCmds = getAllCmdNames();

			if (action === "list" || action === "-l") {
				if (!ao.ignoreCommand.length) return message.reply(getLang("ignoreEmpty"));
				const lines = ao.ignoreCommand.map((c, i) => `◦ ${i + 1}. ${c}`).join("\n");
				return message.reply(getLang("ignoreList", ao.ignoreCommand.length, lines));
			}

			if (action === "clear") {
				ao.ignoreCommand = [];
				saveAdminOnly(ao);
				return message.reply(getLang("ignoreCleared"));
			}

			if (action === "add" || action === "-a") {
				const targets = args.slice(2).map(c => c.toLowerCase()).filter(Boolean);
				if (!targets.length) return message.reply(getLang("ignoreBadArgs"));
				const added = [], dup = [], notFound = [];
				for (const c of targets) {
					if (!allCmds.includes(c)) { notFound.push(c); continue; }
					if (ao.ignoreCommand.includes(c)) { dup.push(c); continue; }
					ao.ignoreCommand.push(c);
					added.push(c);
				}
				saveAdminOnly(ao);
				return message.reply(getLang(
					"ignoreAdded",
					added.length    ? added.join(", ")    : "─",
					dup.length      ? dup.join(", ")      : "─",
					notFound.length ? notFound.join(", ") : "─"
				));
			}

			if (action === "remove" || action === "del" || action === "-r") {
				const targets = args.slice(2).map(c => c.toLowerCase()).filter(Boolean);
				if (!targets.length) return message.reply(getLang("ignoreBadArgs"));
				const removed = [], notFound = [];
				for (const c of targets) {
					const idx = ao.ignoreCommand.indexOf(c);
					if (idx === -1) { notFound.push(c); continue; }
					ao.ignoreCommand.splice(idx, 1);
					removed.push(c);
				}
				saveAdminOnly(ao);
				return message.reply(getLang(
					"ignoreRemoved",
					removed.length  ? removed.join(", ")  : "─",
					notFound.length ? notFound.join(", ") : "─"
				));
			}

			return message.SyntaxError();
		}


		if (sub === "whitelist" || sub === "wl") {

			if (action === "list" || action === "-l") {
				if (!ao.whitelistUsers.length) return message.reply(getLang("wlEmpty"));
				const lines = await Promise.all(
					ao.whitelistUsers.map(async (id, i) => {
						const u = await usersData.get(id).catch(() => null);
						return `◦ ${i + 1}. ${u?.name || "Unknown"} [${id}]`;
					})
				);
				return message.reply(getLang("wlList", ao.whitelistUsers.length, lines.join("\n")));
			}

			if (action === "clear") {
				ao.whitelistUsers = [];
				saveAdminOnly(ao);
				return message.reply(getLang("wlCleared"));
			}

			if (action === "add" || action === "-a") {
				const uids = resolveUIDs(args, event, 2);
				if (!uids.length) return message.reply(getLang("wlNoUID"));
				const added = [], dup = [];
				for (const uid of uids) {
					if (ao.whitelistUsers.includes(uid)) { dup.push(uid); continue; }
					ao.whitelistUsers.push(uid);
					added.push(uid);
				}
				saveAdminOnly(ao);
				const addedNames = await Promise.all(
					added.map(async id => {
						const u = await usersData.get(id).catch(() => null);
						return `◦ ${u?.name || "Unknown"} [${id}]`;
					})
				);
				return message.reply(getLang(
					"wlAdded",
					added.length ? addedNames.join("\n") : "─",
					dup.length   ? dup.join(", ")        : "─"
				));
			}

			if (action === "remove" || action === "del" || action === "-r") {
				const uids = resolveUIDs(args, event, 2);
				if (!uids.length) return message.reply(getLang("wlNoUID"));
				const removed = [], notFound = [];
				for (const uid of uids) {
					const idx = ao.whitelistUsers.indexOf(uid);
					if (idx === -1) { notFound.push(uid); continue; }
					ao.whitelistUsers.splice(idx, 1);
					removed.push(uid);
				}
				saveAdminOnly(ao);
				const removedNames = await Promise.all(
					removed.map(async id => {
						const u = await usersData.get(id).catch(() => null);
						return `◦ ${u?.name || "Unknown"} [${id}]`;
					})
				);
				return message.reply(getLang(
					"wlRemoved",
					removed.length  ? removedNames.join("\n") : "─",
					notFound.length ? notFound.join(", ")     : "─"
				));
			}

			return message.SyntaxError();
		}


		if (sub === "cmds" || sub === "commands" || sub === "list") {
			const all = getAllCmdNames();
			if (!all.length) return message.reply("⌀ ɴᴏ ᴄᴏᴍᴍᴀɴᴅꜱ ʟᴏᴀᴅᴇᴅ");
			const lines = all.map((c, i) => `◦ ${String(i + 1).padStart(2, "0")}. ${c}`).join("\n");
			return message.reply(getLang("cmdList", all.length, lines));
		}

		return message.SyntaxError();
	}
};
