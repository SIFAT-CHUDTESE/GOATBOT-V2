const fs   = require("fs-extra");
const path = require("path");

const CONFIG_FILE = path.join(process.cwd(), "config.json");

function saveCfgField(dotPath, value) {
	const raw   = fs.readJsonSync(CONFIG_FILE);
	const parts = dotPath.split(".");
	let obj = raw;
	for (let i = 0; i < parts.length - 1; i++) {
		if (!obj[parts[i]]) obj[parts[i]] = {};
		obj = obj[parts[i]];
	}
	obj[parts[parts.length - 1]] = value;
	fs.writeJsonSync(CONFIG_FILE, raw, { spaces: 2 });
}

function fmtRemaining(ms) {
	if (ms <= 0) return "ᴇxᴘɪʀᴇᴅ";
	const h = Math.floor(ms / 3600000);
	const m = Math.floor((ms % 3600000) / 60000);
	const s = Math.floor((ms % 60000) / 1000);
	if (h > 0) return `${h}ʜ ${m}ᴍ ʟᴇꜰᴛ`;
	if (m > 0) return `${m}ᴍ ${s}ꜱ ʟᴇꜰᴛ`;
	return `${s}ꜱ ʟᴇꜰᴛ`;
}

function fmtDate(ts) {
	return new Date(ts).toLocaleString("en-GB", {
		day: "2-digit", month: "short", year: "numeric",
		hour: "2-digit", minute: "2-digit", hour12: false
	});
}

function getWhitelist() {
	return global.GoatBot?.config?.spamProtection?.whitelist || [];
}

function saveWhitelist(list) {
	const sp = global.GoatBot.config.spamProtection || {};
	sp.whitelist = list;
	global.GoatBot.config.spamProtection = sp;
	saveCfgField("spamProtection.whitelist", list);
}

function getTracker() { return global._spamTracker || null; }

module.exports = {
	config: {
		name:        "spamban",
		aliases:     ["spam", "sb"],
		version:     "3.0.0",
		author:      "SIFAT",
		countDown:   3,
		role:        2,
		description: { en: "ᴀᴅᴠᴀɴᴄᴇᴅ ꜱᴘᴀᴍ ᴘʀᴏᴛᴇᴄᴛɪᴏɴ ᴍᴀɴᴀɢᴇʀ" },
		category:    "owner",
		guide: {
			en: [
				"   {pn} on | off                        — ᴛᴏɢɢʟᴇ ꜱᴘᴀᴍ ᴘʀᴏᴛᴇᴄᴛɪᴏɴ",
				"   {pn} config                          — ꜱʜᴏᴡ ᴄᴜʀʀᴇɴᴛ ᴄᴏɴꜰɪɢ",
				"   {pn} set threshold <ɴ>               — ᴄᴍᴅꜱ ʙᴇꜰᴏʀᴇ ʙᴀɴ",
				"   {pn} set window <ꜱᴇᴄ>               — ᴛɪᴍᴇ ᴡɪɴᴅᴏᴡ (ꜱᴇᴄᴏɴᴅꜱ)",
				"   {pn} set duration <ʜ>                — ʙᴀɴ ᴅᴜʀᴀᴛɪᴏɴ (ʜᴏᴜʀꜱ)",
				"",
				"   {pn} list                            — ʟɪꜱᴛ ᴀʟʟ ᴀᴄᴛɪᴠᴇ ʙᴀɴꜱ",
				"   {pn} list all                        — ɪɴᴄʟᴜᴅᴇ ᴇxᴘɪʀᴇᴅ ʙᴀɴꜱ",
				"   {pn} check <ᴛɪᴅ>                    — ᴄʜᴇᴄᴋ ᴀ ᴛʜʀᴇᴀᴅ'ꜱ ʙᴀɴ ꜱᴛᴀᴛᴜꜱ",
				"   {pn} ban <ᴛɪᴅ> [ʜ] [ʀᴇᴀꜱᴏɴ]        — ᴍᴀɴᴜᴀʟ ʙᴀɴ",
				"   {pn} extend <ᴛɪᴅ> <ʜ>               — ᴇxᴛᴇɴᴅ ᴀɴ ᴀᴄᴛɪᴠᴇ ʙᴀɴ",
				"   {pn} unban <ᴛɪᴅ>                    — ᴜɴʙᴀɴ ᴀ ᴛʜʀᴇᴀᴅ",
				"   {pn} clear                           — ᴄʟᴇᴀʀ ᴀʟʟ ᴀᴄᴛɪᴠᴇ ʙᴀɴꜱ",
				"   {pn} clean                           — ᴘᴜʀɢᴇ ᴇxᴘɪʀᴇᴅ ʙᴀɴ ʀᴇᴄᴏʀᴅꜱ",
				"",
				"   {pn} whitelist add <ᴛɪᴅ>            — ᴇxᴇᴍᴘᴛ ᴛʜʀᴇᴀᴅ ꜰʀᴏᴍ ꜱᴘᴀᴍ ᴅᴇᴛᴇᴄᴛɪᴏɴ",
				"   {pn} whitelist remove <ᴛɪᴅ>         — ʀᴇᴍᴏᴠᴇ ᴇxᴇᴍᴘᴛɪᴏɴ",
				"   {pn} whitelist list                  — ꜱʜᴏᴡ ᴀʟʟ ᴇxᴇᴍᴘᴛ ᴛʜʀᴇᴀᴅꜱ",
				"",
				"   {pn} stats                           — ᴅᴇᴛᴀɪʟᴇᴅ ꜱᴘᴀᴍ ꜱᴛᴀᴛɪꜱᴛɪᴄꜱ",
				"   {pn} stats reset                     — ʀᴇꜱᴇᴛ ᴀʟʟ ꜱᴛᴀᴛꜱ"
			].join("\n")
		}
	},

	langs: {
		en: {
			on:           "✦ ꜱᴘᴀᴍ ᴘʀᴏᴛᴇᴄᴛɪᴏɴ ᴇɴᴀʙʟᴇᴅ ✔\n◈ ᴛʜʀᴇᴀᴅꜱ ᴡɪʟʟ ʙᴇ ʙᴀɴɴᴇᴅ ᴏɴ ᴄᴏᴍᴍᴀɴᴅ ꜱᴘᴀᴍ",
			off:          "✦ ꜱᴘᴀᴍ ᴘʀᴏᴛᴇᴄᴛɪᴏɴ ᴅɪꜱᴀʙʟᴇᴅ ✘",
			alreadyOn:    "⌀ ꜱᴘᴀᴍ ᴘʀᴏᴛᴇᴄᴛɪᴏɴ ɪꜱ ᴀʟʀᴇᴀᴅʏ ᴏɴ",
			alreadyOff:   "⌀ ꜱᴘᴀᴍ ᴘʀᴏᴛᴇᴄᴛɪᴏɴ ɪꜱ ᴀʟʀᴇᴀᴅʏ ᴏꜰꜰ",
			cfg:          "❏ ꜱᴘᴀᴍ ᴄᴏɴꜰɪɢ\n◈ ꜱᴛᴀᴛᴜꜱ     : %1\n◈ ᴛʜʀᴇꜱʜᴏʟᴅ  : %2 ᴄᴍᴅꜱ\n◈ ᴡɪɴᴅᴏᴡ     : %3ꜱ\n◈ ʙᴀɴ ᴅᴜʀ.   : %4ʜ\n◈ ᴡʜɪᴛᴇʟɪꜱᴛ  : %5 ᴛʜʀᴇᴀᴅ(ꜱ)\n◈ ᴀᴄᴛɪᴠᴇ ʙᴀɴꜱ: %6",
			setOk:        "✦ ᴜᴘᴅᴀᴛᴇᴅ\n◈ %1 → %2",
			setBadKey:    "⌀ ᴋᴇʏ ᴍᴜꜱᴛ ʙᴇ: threshold | window | duration",
			notNum:       "⌀ ᴠᴀʟᴜᴇ ᴍᴜꜱᴛ ʙᴇ ᴀ ᴘᴏꜱɪᴛɪᴠᴇ ɴᴜᴍʙᴇʀ",
			listEmpty:    "⌀ ɴᴏ ᴀᴄᴛɪᴠᴇ ʙᴀɴꜱ",
			noId:         "⌀ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴛʜʀᴇᴀᴅ ɪᴅ",
			banned:       "✦ ᴛʜʀᴇᴀᴅ ʙᴀɴɴᴇᴅ\n◈ ᴛɪᴅ    : %1\n◈ ᴅᴜʀ    : %2ʜ\n◈ ᴇxᴘɪʀᴇ: %3\n◈ ʀᴇᴀꜱᴏɴ: %4",
			extended:     "✦ ʙᴀɴ ᴇxᴛᴇɴᴅᴇᴅ\n◈ ᴛɪᴅ    : %1\n◈ ᴀᴅᴅᴇᴅ  : +%2ʜ\n◈ ᴇxᴘɪʀᴇ: %3",
			extendFail:   "⌀ ᴛʜʀᴇᴀᴅ ɪꜱ ɴᴏᴛ ʙᴀɴɴᴇᴅ ᴏʀ ʙᴀɴ ᴇxᴘɪʀᴇᴅ",
			unbanned:     "✦ ᴜɴʙᴀɴɴᴇᴅ ✔\n◈ ᴛɪᴅ : %1",
			unbanFail:    "⌀ ᴛʜʀᴇᴀᴅ ɴᴏᴛ ɪɴ ʙᴀɴ ʟɪꜱᴛ",
			cleared:      "✦ ᴄʟᴇᴀʀᴇᴅ %1 ʙᴀɴ(ꜱ)",
			cleaned:      "✦ ᴘᴜʀɢᴇᴅ %1 ᴇxᴘɪʀᴇᴅ ʀᴇᴄᴏʀᴅ(ꜱ)",
			checkBanned:  "✦ ʙᴀɴ ꜱᴛᴀᴛᴜꜱ: ᴀᴄᴛɪᴠᴇ 🔴\n◈ ᴛɪᴅ    : %1\n◈ ɴᴀᴍᴇ   : %2\n◈ ʀᴇᴀꜱᴏɴ : %3\n◈ ʙᴀɴɴᴇᴅ : %4\n◈ ᴇxᴘɪʀᴇꜱ: %5 (%6)",
			checkClean:   "✦ ʙᴀɴ ꜱᴛᴀᴛᴜꜱ: ᴄʟᴇᴀɴ 🟢\n◈ ᴛɪᴅ : %1",
			wlAdded:      "✦ ᴡʜɪᴛᴇʟɪꜱᴛᴇᴅ ─ %1",
			wlRemoved:    "✦ ʀᴇᴍᴏᴠᴇᴅ ꜰʀᴏᴍ ᴡʜɪᴛᴇʟɪꜱᴛ ─ %1",
			wlAlready:    "⌀ ᴀʟʀᴇᴀᴅʏ ᴡʜɪᴛᴇʟɪꜱᴛᴇᴅ ─ %1",
			wlNotFound:   "⌀ ɴᴏᴛ ɪɴ ᴡʜɪᴛᴇʟɪꜱᴛ ─ %1",
			wlList:       "✦ ᴡʜɪᴛᴇʟɪꜱᴛᴇᴅ ᴛʜʀᴇᴀᴅꜱ (%1):\n%2",
			wlEmpty:      "⌀ ɴᴏ ᴛʜʀᴇᴀᴅꜱ ᴡʜɪᴛᴇʟɪꜱᴛᴇᴅ",
			statsReset:   "✦ ꜱᴘᴀᴍ ꜱᴛᴀᴛꜱ ʀᴇꜱᴇᴛ ✔"
		}
	},

	onStart: async function ({ args, message, getLang, globalData, threadsData }) {
		const sub    = (args[0] || "").toLowerCase();
		const cfg    = global.GoatBot.config;
		const sp     = cfg.spamProtection || {};
		const tracker = getTracker();


		if (sub === "on") {
			if (sp.enable === true) return message.reply(getLang("alreadyOn"));
			sp.enable = true;
			cfg.spamProtection = sp;
			saveCfgField("spamProtection.enable", true);
			return message.reply(getLang("on"));
		}


		if (sub === "off") {
			if (sp.enable === false) return message.reply(getLang("alreadyOff"));
			sp.enable = false;
			cfg.spamProtection = sp;
			saveCfgField("spamProtection.enable", false);
			return message.reply(getLang("off"));
		}


		if (sub === "config" || sub === "info" || sub === "cfg") {
			const bans    = await globalData.get("spamBannedThreads", "data", {});
			const now     = Date.now();
			const active  = Object.values(bans).filter(v => v.expireTime > now).length;
			const wl      = getWhitelist();
			return message.reply(getLang("cfg",
				sp.enable === false ? "⛔ ᴏꜰꜰ" : "✅ ᴏɴ",
				sp.commandThreshold ?? 8,
				sp.timeWindow       ?? 10,
				sp.banDuration      ?? 24,
				wl.length,
				active
			));
		}


		if (sub === "set") {
			const key    = (args[1] || "").toLowerCase();
			const val    = Number(args[2]);
			const keyMap = {
				threshold: "commandThreshold",
				window:    "timeWindow",
				duration:  "banDuration",
				dur:       "banDuration",
				time:      "timeWindow"
			};
			if (!keyMap[key]) return message.reply(getLang("setBadKey"));
			if (isNaN(val) || val <= 0) return message.reply(getLang("notNum"));
			sp[keyMap[key]] = val;
			cfg.spamProtection = sp;
			saveCfgField(`spamProtection.${keyMap[key]}`, val);
			return message.reply(getLang("setOk", key, val));
		}


		if (sub === "list") {
			const showAll = (args[1] || "").toLowerCase() === "all";
			const bans    = await globalData.get("spamBannedThreads", "data", {});
			const now     = Date.now();
			const entries = Object.entries(bans).filter(([, v]) => showAll || v.expireTime > now);
			if (!entries.length) return message.reply(getLang("listEmpty"));

			entries.sort((a, b) => b[1].expireTime - a[1].expireTime);

			const lines = [`✦ ${showAll ? "ᴀʟʟ" : "ᴀᴄᴛɪᴠᴇ"} ʙᴀɴꜱ [${entries.length}]:`];
			entries.forEach(([tid, v], i) => {
				const alive   = v.expireTime > now;
				const status  = alive ? "🔴" : "⚫";
				const timeStr = alive ? fmtRemaining(v.expireTime - now) : "ᴇxᴘɪʀᴇᴅ";
				lines.push(
					`◦ ${String(i + 1).padStart(2, "0")}. ${status} ${v.threadName || tid}\n`
					+ `     ɪᴅ: ${tid} | ${timeStr}\n`
					+ `     ʀᴇᴀꜱᴏɴ: ${v.reason || "ꜱᴘᴀᴍ"}`
				);
			});
			return message.reply(lines.join("\n"));
		}


		if (sub === "check") {
			const tid  = args[1];
			if (!tid) return message.reply(getLang("noId"));
			const bans = await globalData.get("spamBannedThreads", "data", {});
			const now  = Date.now();
			const ban  = bans[tid];
			if (!ban || ban.expireTime <= now) return message.reply(getLang("checkClean", tid));

			let tName = ban.threadName || tid;
			try {
				const tData = await threadsData.get(tid);
				if (tData?.threadName) tName = tData.threadName;
			} catch {}

			return message.reply(getLang(
				"checkBanned", tid, tName,
				ban.reason || "ꜱᴘᴀᴍ",
				fmtDate(ban.bannedAt || 0),
				fmtDate(ban.expireTime),
				fmtRemaining(ban.expireTime - now)
			));
		}


		if (sub === "ban") {
			const tid    = args[1];
			if (!tid) return message.reply(getLang("noId"));
			const hours  = Number(args[2]) || (sp.banDuration ?? 24);
			const reason = args.slice(3).join(" ") || "manual";
			if (isNaN(hours) || hours <= 0) return message.reply(getLang("notNum"));

			const bans  = await globalData.get("spamBannedThreads", "data", {});
			const now   = Date.now();

			let tName = tid;
			try {
				const tData = await threadsData.get(tid);
				if (tData?.threadName) tName = tData.threadName;
			} catch {}

			bans[tid] = {
				bannedAt:   now,
				expireTime: now + hours * 3600000,
				threadName: tName,
				reason
			};
			await globalData.set("spamBannedThreads", bans, "data");
			if (tracker) tracker.banThread(tid, reason, hours * 3600000);

			return message.reply(getLang("banned", tid, hours, fmtDate(now + hours * 3600000), reason));
		}


		if (sub === "extend" || sub === "ext") {
			const tid   = args[1];
			if (!tid) return message.reply(getLang("noId"));
			const hours = Number(args[2]);
			if (isNaN(hours) || hours <= 0) return message.reply(getLang("notNum"));

			const bans = await globalData.get("spamBannedThreads", "data", {});
			const now  = Date.now();
			const ban  = bans[tid];
			if (!ban || ban.expireTime <= now) return message.reply(getLang("extendFail"));

			ban.expireTime += hours * 3600000;
			await globalData.set("spamBannedThreads", bans, "data");
			if (tracker) tracker.banThread(tid, ban.reason || "manual", ban.expireTime - now);

			return message.reply(getLang("extended", tid, hours, fmtDate(ban.expireTime)));
		}


		if (sub === "unban") {
			const tid  = args[1];
			if (!tid) return message.reply(getLang("noId"));
			const bans = await globalData.get("spamBannedThreads", "data", {});
			if (!bans[tid]) return message.reply(getLang("unbanFail"));
			delete bans[tid];
			await globalData.set("spamBannedThreads", bans, "data");
			if (tracker?.bannedThreads) tracker.bannedThreads.delete(tid);
			return message.reply(getLang("unbanned", tid));
		}


		if (sub === "clear") {
			const bans  = await globalData.get("spamBannedThreads", "data", {});
			const count = Object.keys(bans).length;
			await globalData.set("spamBannedThreads", {}, "data");
			if (tracker?.bannedThreads) tracker.bannedThreads.clear();
			return message.reply(getLang("cleared", count));
		}


		if (sub === "clean") {
			const bans   = await globalData.get("spamBannedThreads", "data", {});
			const now    = Date.now();
			let purged   = 0;
			for (const [tid, v] of Object.entries(bans)) {
				if (v.expireTime <= now) { delete bans[tid]; purged++; }
			}
			await globalData.set("spamBannedThreads", bans, "data");
			return message.reply(getLang("cleaned", purged));
		}


		if (sub === "whitelist" || sub === "wl") {
			const action = (args[1] || "").toLowerCase();
			const wl     = getWhitelist();

			if (!action || action === "list") {
				if (!wl.length) return message.reply(getLang("wlEmpty"));
				const lines = wl.map((tid, i) => `◦ ${String(i + 1).padStart(2, "0")}. ${tid}`);
				return message.reply(getLang("wlList", wl.length, lines.join("\n")));
			}

			if (action === "add") {
				const tid = args[2];
				if (!tid) return message.reply(getLang("noId"));
				if (wl.includes(tid)) return message.reply(getLang("wlAlready", tid));
				wl.push(tid);
				saveWhitelist(wl);
				if (tracker?.bannedThreads) tracker.bannedThreads.delete(tid);
				return message.reply(getLang("wlAdded", tid));
			}

			if (action === "remove" || action === "del") {
				const tid = args[2];
				if (!tid) return message.reply(getLang("noId"));
				const idx = wl.indexOf(tid);
				if (idx === -1) return message.reply(getLang("wlNotFound", tid));
				wl.splice(idx, 1);
				saveWhitelist(wl);
				return message.reply(getLang("wlRemoved", tid));
			}

			return message.SyntaxError();
		}


		if (sub === "stats") {
			const action = (args[1] || "").toLowerCase();

			if (action === "reset") {
				if (tracker?.stats) {
					tracker.stats.violations = 0;
					tracker.stats.bans       = 0;
					tracker.stats.unbans     = 0;
				}
				return message.reply(getLang("statsReset"));
			}

			const st      = tracker?.stats || {};
			const bans    = await globalData.get("spamBannedThreads", "data", {});
			const now     = Date.now();
			const active  = Object.values(bans).filter(v => v.expireTime > now).length;
			const expired = Object.values(bans).filter(v => v.expireTime <= now).length;
			const tracked = tracker?.threadActivity?.size ?? 0;
			const wlCount = getWhitelist().length;

			return message.reply(
				"❏ ꜱᴘᴀᴍ ꜱᴛᴀᴛɪꜱᴛɪᴄꜱ\n"
				+ "┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n"
				+ `◈ ᴠɪᴏʟᴀᴛɪᴏɴꜱ  : ${st.violations ?? 0}\n`
				+ `◈ ᴛᴏᴛᴀʟ ʙᴀɴꜱ  : ${st.bans ?? 0}\n`
				+ `◈ ᴜɴʙᴀɴꜱ      : ${st.unbans ?? 0}\n`
				+ "┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n"
				+ `◈ ᴀᴄᴛɪᴠᴇ ʙᴀɴꜱ : ${active}\n`
				+ `◈ ᴇxᴘɪʀᴇᴅ ʙᴀɴꜱ: ${expired}\n`
				+ `◈ ᴛʀᴀᴄᴋɪɴɢ    : ${tracked} ᴛʜʀᴇᴀᴅ(ꜱ)\n`
				+ `◈ ᴡʜɪᴛᴇʟɪꜱᴛ   : ${wlCount} ᴛʜʀᴇᴀᴅ(ꜱ)`
			);
		}

		return message.SyntaxError();
	}
};
