const os = require("os");

let cooldownManager, analyticsBatcher;
try { cooldownManager = require("../../core/func/cooldownManager.js"); } catch {}
try { analyticsBatcher = require("../../core/func/analyticsBatcher.js"); } catch {}

function fmtBytes(b) {
	if (b === 0) return "0 ʙ";
	const k = 1024, s = ["ʙ", "ᴋʙ", "ᴍʙ", "ɢʙ"];
	const i = Math.floor(Math.log(b) / Math.log(k));
	return parseFloat((b / k ** i).toFixed(2)) + " " + s[i];
}

function fmtUptime(s) {
	const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
	return `${d}ᴅ ${h}ʜ ${m}ᴍ ${sec}ꜱ`;
}

function cpuUsagePct() {
	const cpus = os.cpus();
	let idle = 0, total = 0;
	for (const c of cpus) { for (const v of Object.values(c.times)) total += v; idle += c.times.idle; }
	return Math.max(0, Math.min(100, 100 - (idle / total) * 100)).toFixed(1);
}

module.exports = {
	config: {
		name: "stats",
		version: "2.0.0",
		author: "SIFAT",
		countDown: 5,
		role: 0,
		description: { en: "ᴠɪᴇᴡ ʙᴏᴛ ꜱʏꜱᴛᴇᴍ ꜱᴛᴀᴛꜱ" },
		category: "utility",
		guide: { en: "{pn}\n{pn} clear — ɢᴀʀʙᴀɢᴇ ᴄᴏʟʟᴇᴄᴛ" }
	},

	onStart: async function ({ message, args }) {
		if (args[0] === "clear") {
			if (global.gc) { global.gc(); return message.reply("✦ ɢᴀʀʙᴀɢᴇ ᴄᴏʟʟᴇᴄᴛᴏʀ ᴛʀɪɢɢᴇʀᴇᴅ"); }
			return message.reply("⌀ ɢᴄ ɴᴏᴛ ᴇxᴘᴏꜱᴇᴅ");
		}

		try {
			const mem      = process.memoryUsage();
			const total    = os.totalmem(), free = os.freemem();
			const cmds     = global.GoatBot?.commands?.size || 0;
			const events   = global.GoatBot?.eventCommands?.size || 0;
			const aliases  = global.GoatBot?.aliases?.size || 0;
			const threads  = global.db?.allThreadData?.length || 0;
			const users    = global.db?.allUserData?.length || 0;
			const premiums = (global.GoatBot?.config?.premiumUsers || []).length;
			const admins   = (global.GoatBot?.config?.adminBot || []).length;
			const cdStats  = cooldownManager?.getStats?.() || {};
			const anStats  = analyticsBatcher?.getStats?.() || {};

			return message.reply(
				`◈ ᴜᴘᴛɪᴍᴇ    : ${fmtUptime(process.uptime())}\n`
				+ `◈ ᴄᴏᴍᴍᴀɴᴅꜱ  : ${cmds}\n`
				+ `◈ ᴇᴠᴇɴᴛꜱ    : ${events}\n`
				+ `◈ ᴀʟɪᴀꜱᴇꜱ   : ${aliases}\n`
				+ `◈ ᴛʜʀᴇᴀᴅꜱ   : ${threads}\n`
				+ `◈ ᴜꜱᴇʀꜱ     : ${users}\n`
				+ `◈ ᴘʀᴇᴍɪᴜᴍ   : ${premiums}\n`
				+ `◈ ᴀᴅᴍɪɴꜱ    : ${admins}\n`
				+ "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n"
				+ `◈ ʜᴇᴀᴘ ᴜꜱᴇᴅ : ${fmtBytes(mem.heapUsed)}\n`
				+ `◈ ʜᴇᴀᴘ ᴛᴏᴛᴀʟ: ${fmtBytes(mem.heapTotal)}\n`
				+ `◈ ʀꜱꜱ       : ${fmtBytes(mem.rss)}\n`
				+ "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n"
				+ `◈ ꜱʏꜱ ᴛᴏᴛᴀʟ : ${fmtBytes(total)}\n`
				+ `◈ ꜱʏꜱ ꜰʀᴇᴇ  : ${fmtBytes(free)}\n`
				+ `◈ ꜱʏꜱ ᴜꜱᴇᴅ  : ${fmtBytes(total - free)}\n`
				+ `◈ ᴄᴘᴜ ᴜꜱᴀɢᴇ : ${cpuUsagePct()}%\n`
				+ "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n"
				+ `◈ ᴄᴏᴏʟᴅᴏᴡɴ  : ${cdStats.totalEntries || 0} ᴇɴᴛʀɪᴇꜱ\n`
				+ `◈ ᴀɴᴀʟʏᴛɪᴄꜱ : ${anStats.bufferSize || 0} ᴘᴇɴᴅɪɴɢ\n`
				+ `◈ ɴᴏᴅᴇ      : ${process.version}\n`
				+ `◈ ᴘʟᴀᴛꜰᴏʀᴍ  : ${os.platform()} ${os.arch()}`
			);
		} catch (err) {
			return message.reply("⌀ ꜱᴛᴀᴛꜱ ᴇʀʀᴏʀ: " + err.message);
		}
	}
};
