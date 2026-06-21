const { getTime } = global.utils;
const fs = require("fs-extra");
const path = require("path");

const CONFIG_FILE = path.join(process.cwd(), "config.json");

function resolveUIDs(args, event, offset = 1) {
	const mentions = Object.keys(event.mentions || {});
	if (mentions.length) return mentions;
	if (event.messageReply) return [event.messageReply.senderID];
	const ids = args.slice(offset).filter(a => /^\d+$/.test(a));
	return ids.length ? ids : [];
}

module.exports = {
	config: {
		name: "admin",
		aliases: ["adm"],
		version: "2.0.0",
		author: "SIFAT",
		countDown: 3,
		role: 2,
		description: { en: "ᴍᴀɴᴀɢᴇ ʙᴏᴛ ᴀᴅᴍɪɴꜱ" },
		category: "owner",
		guide: {
			en: "   {pn} add [@|ᴜɪᴅ|ʀᴇᴘʟʏ] — ᴀᴅᴅ ᴀᴅᴍɪɴ\n   {pn} remove [@|ᴜɪᴅ|ʀᴇᴘʟʏ] — ʀᴇᴍᴏᴠᴇ ᴀᴅᴍɪɴ\n   {pn} list — ʟɪꜱᴛ ᴀʟʟ ᴀᴅᴍɪɴꜱ\n   {pn} check [@|ᴜɪᴅ|ʀᴇᴘʟʏ] — ᴄʜᴇᴄᴋ ꜱᴛᴀᴛᴜꜱ"
		}
	},

	langs: {
		en: {
			noUID:      "⌀ ᴛᴀɢ / ʀᴇᴘʟʏ / ᴘʀᴏᴠɪᴅᴇ ᴜɪᴅ",
			listEmpty:  "⌀ ɴᴏ ᴀᴅᴍɪɴꜱ ᴄᴏɴꜰɪɢᴜʀᴇᴅ",
			isAdmin:    "✦ %1\n◈ ɪᴅ    : %2\n◈ ꜱᴛᴀᴛᴜꜱ: ᴀᴅᴍɪɴ ✔",
			isNotAdmin: "◈ %1\n◈ ɪᴅ    : %2\n◈ ꜱᴛᴀᴛᴜꜱ: ɴᴏᴛ ᴀᴅᴍɪɴ ✘"
		}
	},

	onStart: async function ({ message, args, usersData, event, getLang }) {
		const adminList = global.GoatBot?.config?.adminBot || [];
		const sub = (args[0] || "").toLowerCase();

		if (sub === "list" || sub === "-l") {
			if (!adminList.length) return message.reply(getLang("listEmpty"));
			const lines = await Promise.all(adminList.map(async (id, i) => {
				const u = await usersData.get(id).catch(() => ({ name: "Unknown" }));
				return `◦ ${i + 1}. ${u.name || "Unknown"} [${id}]`;
			}));
			return message.reply(
				`✦ ᴀᴅᴍɪɴ ʟɪꜱᴛ (${adminList.length}):\n`
				+ lines.join("\n")
			);
		}

		if (sub === "add" || sub === "-a") {
			const uids = resolveUIDs(args, event, 1);
			if (!uids.length) return message.reply(getLang("noUID"));
			const added = [], already = [];
			for (const uid of uids) {
				if (adminList.includes(uid)) { already.push(uid); continue; }
				adminList.push(uid);
				added.push(uid);
			}
			global.GoatBot.config.adminBot = adminList;
			const cfg = await fs.readJson(CONFIG_FILE);
			cfg.adminBot = adminList;
			await fs.writeJson(CONFIG_FILE, cfg, { spaces: 2 });
			const names = await Promise.all(added.map(async id => {
				const u = await usersData.get(id).catch(() => ({ name: "Unknown" }));
				return `◦ ${u.name || "Unknown"} [${id}]`;
			}));
			let msg = "";
			if (added.length) msg += `✦ ᴀᴅᴅᴇᴅ (${added.length}):\n${names.join("\n")}\n◈ ᴅᴀᴛᴇ: ${getTime("DD/MM/YYYY HH:mm:ss")}\n`;
			if (already.length) msg += `⌀ ᴀʟʀᴇᴀᴅʏ ᴀᴅᴍɪɴ: ${already.join(", ")}\n`;
			return message.reply(msg.trim());
		}

		if (sub === "remove" || sub === "-r" || sub === "del") {
			const uids = resolveUIDs(args, event, 1);
			if (!uids.length) return message.reply(getLang("noUID"));
			const removed = [], notFound = [];
			for (const uid of uids) {
				const idx = adminList.indexOf(uid);
				if (idx === -1) { notFound.push(uid); continue; }
				adminList.splice(idx, 1);
				removed.push(uid);
			}
			global.GoatBot.config.adminBot = adminList;
			const cfg = await fs.readJson(CONFIG_FILE);
			cfg.adminBot = adminList;
			await fs.writeJson(CONFIG_FILE, cfg, { spaces: 2 });
			const names = await Promise.all(removed.map(async id => {
				const u = await usersData.get(id).catch(() => ({ name: "Unknown" }));
				return `◦ ${u.name || "Unknown"} [${id}]`;
			}));
			let msg = "";
			if (removed.length) msg += `✦ ʀᴇᴍᴏᴠᴇᴅ (${removed.length}):\n${names.join("\n")}\n`;
			if (notFound.length) msg += `⌀ ɴᴏᴛ ᴀᴅᴍɪɴ: ${notFound.join(", ")}\n`;
			return message.reply(msg.trim());
		}

		if (sub === "check" || sub === "-c") {
			const mentions = Object.keys(event.mentions || {});
			const id = mentions[0] || event.messageReply?.senderID || (args[1] && /^\d+$/.test(args[1]) ? args[1] : null) || event.senderID;
			const u = await usersData.get(id).catch(() => ({ name: "Unknown" }));
			const name = u.name || "Unknown";
			if (adminList.includes(id)) return message.reply(getLang("isAdmin", name, id));
			return message.reply(getLang("isNotAdmin", name, id));
		}

		return message.SyntaxError();
	}
};
