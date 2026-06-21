const fs = require("fs-extra");
const path = require("path");

const CONFIG_FILE = path.join(process.cwd(), "config.json");

function saveConfig(cfg) {
	fs.writeJsonSync(CONFIG_FILE, cfg, { spaces: 2 });
}

function fmtDate(ts) {
	if (!ts) return "ɴᴇᴠᴇʀ";
	return new Date(ts).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", hour12: false }).replace(",", "");
}

function daysToMs(d) {
	return Math.floor(Number(d)) * 86400000;
}

function resolveUID(arg, event) {
	const mentions = Object.keys(event.mentions || {});
	if (mentions.length) return mentions[0];
	if (event.messageReply) return event.messageReply.senderID;
	if (arg && /^\d{10,}$/.test(arg)) return arg;
	return null;
}

module.exports = {
	config: {
		name: "premium",
		aliases: ["prem"],
		version: "2.0.0",
		author: "SIFAT",
		countDown: 3,
		role: 2,
		description: { en: "ᴍᴀɴᴀɢᴇ ᴘʀᴇᴍɪᴜᴍ ᴜꜱᴇʀꜱ" },
		category: "owner",
		guide: { en: "{pn} add [@|ᴜɪᴅ|ʀᴇᴘʟʏ] [ᴅᴀʏꜱ]\n{pn} remove [@|ᴜɪᴅ|ʀᴇᴘʟʏ]\n{pn} list | clear\n{pn} check [@|ᴜɪᴅ|ʀᴇᴘʟʏ]\n{pn} expire [@|ᴜɪᴅ] <ᴅᴀʏꜱ>" }
	},

	langs: {
		en: {
			noId:        "⌀ ᴛᴀɢ / ʀᴇᴘʟʏ / ᴘʀᴏᴠɪᴅᴇ ᴜɪᴅ",
			noDays:      "⌀ ᴇɴᴛᴇʀ ᴠᴀʟɪᴅ ɴᴜᴍʙᴇʀ ᴏꜰ ᴅᴀʏꜱ",
			added:       "✦ ᴘʀᴇᴍɪᴜᴍ ɢʀᴀɴᴛᴇᴅ\n◈ ᴜꜱᴇʀ  : %1\n◈ ᴇxᴘɪʀʏ: %2",
			alreadyPrem: "⌀ %1 ɪꜱ ᴀʟʀᴇᴀᴅʏ ᴘʀᴇᴍɪᴜᴍ",
			removed:     "✦ ᴘʀᴇᴍɪᴜᴍ ʀᴇᴠᴏᴋᴇᴅ\n◈ ᴜꜱᴇʀ: %1",
			notPrem:     "⌀ %1 ɪꜱ ɴᴏᴛ ᴘʀᴇᴍɪᴜᴍ",
			expireSet:   "✦ ᴇxᴘɪʀʏ ᴜᴘᴅᴀᴛᴇᴅ\n◈ ᴜꜱᴇʀ   : %1\n◈ ᴇxᴘɪʀᴇꜱ: %2",
			listEmpty:   "⌀ ɴᴏ ᴘʀᴇᴍɪᴜᴍ ᴜꜱᴇʀꜱ",
			cleared:     "✦ ᴄʟᴇᴀʀᴇᴅ %1 ᴘʀᴇᴍɪᴜᴍ ᴜꜱᴇʀ(ꜱ)",
			checkPrem:   "✦ ᴘʀᴇᴍɪᴜᴍ ᴄʜᴇᴄᴋ\n◈ ᴜꜱᴇʀ  : %1\n◈ ꜱᴛᴀᴛᴜꜱ: %2\n◈ ᴇxᴘɪʀʏ: %3",
			checkNot:    "⌀ %1 ɪꜱ ɴᴏᴛ ᴘʀᴇᴍɪᴜᴍ"
		}
	},

	onStart: async function ({ args, message, event, getLang, usersData }) {
		const sub = (args[0] || "").toLowerCase();
		const cfg = global.GoatBot.config;

		if (sub === "add") {
			const uid = resolveUID(args[1], event);
			if (!uid) return message.reply(getLang("noId"));
			const days = args[2] ? Number(args[2]) : null;
			if (cfg.premiumUsers.includes(uid)) return message.reply(getLang("alreadyPrem", uid));
			cfg.premiumUsers.push(uid);
			const raw = fs.readJsonSync(CONFIG_FILE);
			raw.premiumUsers = cfg.premiumUsers;
			let expStr = "ɴᴇᴠᴇʀ";
			if (days && !isNaN(days) && days > 0) {
				const expireTime = Date.now() + daysToMs(days);
				const data = await usersData.get(uid, "data", {});
				data.premiumExpireTime = expireTime;
				await usersData.set(uid, data, "data");
				expStr = fmtDate(expireTime);
			}
			saveConfig(raw);
			const name = (await usersData.get(uid).catch(() => null))?.name || uid;
			return message.reply(getLang("added", name, expStr));
		}

		if (sub === "remove") {
			const uid = resolveUID(args[1], event);
			if (!uid) return message.reply(getLang("noId"));
			if (!cfg.premiumUsers.includes(uid)) return message.reply(getLang("notPrem", uid));
			cfg.premiumUsers = cfg.premiumUsers.filter(id => id !== uid);
			const raw = fs.readJsonSync(CONFIG_FILE);
			raw.premiumUsers = cfg.premiumUsers;
			saveConfig(raw);
			try {
				const data = await usersData.get(uid, "data", {});
				delete data.premiumExpireTime;
				await usersData.set(uid, data, "data");
			} catch {}
			const name = (await usersData.get(uid).catch(() => null))?.name || uid;
			return message.reply(getLang("removed", name));
		}

		if (sub === "list") {
			const pList = cfg.premiumUsers || [];
			if (!pList.length) return message.reply(getLang("listEmpty"));
			const now = Date.now();
			const lines = await Promise.all(pList.map(async (uid, i) => {
				const u = global.db.allUserData.find(u => u.userID == uid);
				const exp = u?.data?.premiumExpireTime;
				const expStr = exp ? fmtDate(exp) : "ᴘᴇʀᴍ";
				const badge = exp && exp < now ? "⚠ ᴇxᴘ" : "✅";
				return `◦ ${i + 1}. ${u?.name || uid}\n   ᴇxᴘɪʀʏ: ${expStr} ${badge}`;
			}));
			return message.reply("✦ ᴘʀᴇᴍɪᴜᴍ ᴜꜱᴇʀꜱ [" + pList.length + "]:\n" + lines.join("\n"));
		}

		if (sub === "check") {
			const uid = resolveUID(args[1], event);
			if (!uid) return message.reply(getLang("noId"));
			if (!cfg.premiumUsers.includes(uid)) return message.reply(getLang("checkNot", uid));
			const uRow = global.db.allUserData.find(u => u.userID == uid);
			const exp = uRow?.data?.premiumExpireTime;
			const now = Date.now();
			const status = !exp ? "✅ ᴘᴇʀᴍᴀɴᴇɴᴛ" : exp < now ? "⚠ ᴇxᴘɪʀᴇᴅ" : "✅ ᴀᴄᴛɪᴠᴇ";
			return message.reply(getLang("checkPrem", uRow?.name || uid, status, exp ? fmtDate(exp) : "ɴᴇᴠᴇʀ"));
		}

		if (sub === "expire") {
			const uid = resolveUID(args[1], event);
			const days = Number(args[2]);
			if (!uid) return message.reply(getLang("noId"));
			if (!cfg.premiumUsers.includes(uid)) return message.reply(getLang("notPrem", uid));
			if (isNaN(days) || days <= 0) return message.reply(getLang("noDays"));
			const expireTime = Date.now() + daysToMs(days);
			const data = await usersData.get(uid, "data", {});
			data.premiumExpireTime = expireTime;
			await usersData.set(uid, data, "data");
			const name = (await usersData.get(uid).catch(() => null))?.name || uid;
			return message.reply(getLang("expireSet", name, fmtDate(expireTime)));
		}

		if (sub === "clear") {
			const count = cfg.premiumUsers.length;
			for (const uid of cfg.premiumUsers) {
				try {
					const data = await usersData.get(uid, "data", {});
					delete data.premiumExpireTime;
					await usersData.set(uid, data, "data");
				} catch {}
			}
			cfg.premiumUsers = [];
			const raw = fs.readJsonSync(CONFIG_FILE);
			raw.premiumUsers = [];
			saveConfig(raw);
			return message.reply(getLang("cleared", count));
		}

		return message.SyntaxError();
	}
};
