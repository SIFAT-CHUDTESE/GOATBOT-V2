const { exec, spawn } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

module.exports = {
	config: {
		name: "shell",
		aliases: ["sh", "exec"],
		version: "2.0.0",
		author: "SIFAT",
		countDown: 5,
		role: 4,
		description: { en: "ᴇxᴇᴄᴜᴛᴇ ꜱʜᴇʟʟ ᴄᴏᴍᴍᴀɴᴅꜱ" },
		category: "owner",
		guide: { en: "{pn} <ᴄᴏᴍᴍᴀɴᴅ>\n{pn} -t <ꜱᴇᴄ> <ᴄᴏᴍᴍᴀɴᴅ> — ᴄᴜꜱᴛᴏᴍ ᴛɪᴍᴇᴏᴜᴛ\n{pn} -bg <ᴄᴏᴍᴍᴀɴᴅ> — ʀᴜɴ ɪɴ ʙᴀᴄᴋɢʀᴏᴜɴᴅ" }
	},

	langs: {
		en: {
			missingCommand: "⌀ ᴘʟᴇᴀꜱᴇ ᴇɴᴛᴇʀ ᴀ ᴄᴏᴍᴍᴀɴᴅ",
			executing:      "◈ ᴇxᴇᴄᴜᴛɪɴɢ...",
			bgStarted:      "◈ ʙᴀᴄᴋɢʀᴏᴜɴᴅ ᴘʀᴏᴄᴇꜱꜱ ꜱᴛᴀʀᴛᴇᴅ\n◈ ᴘɪᴅ: %1",
			output:         "✦ ᴏᴜᴛᴘᴜᴛ:\n%1",
			error:          "⌀ ᴇʀʀᴏʀ:\n%1",
			timeout:        "⌀ ᴛɪᴍᴇᴏᴜᴛ (%1ꜱ)"
		}
	},

	onStart: async function ({ message, args, getLang }) {
		if (!args.length) return message.reply(getLang("missingCommand"));

		let timeout = 30000;
		let background = false;
		let cmdArgs = [...args];

		if (cmdArgs[0] === "-t") {
			const secs = parseInt(cmdArgs[1]);
			if (!isNaN(secs) && secs > 0) { timeout = secs * 1000; cmdArgs = cmdArgs.slice(2); }
			else { cmdArgs = cmdArgs.slice(1); }
		}

		if (cmdArgs[0] === "-bg") {
			background = true;
			cmdArgs = cmdArgs.slice(1);
		}

		const command = cmdArgs.join(" ");
		if (!command) return message.reply(getLang("missingCommand"));

		if (background) {
			const child = spawn("sh", ["-c", command], { detached: true, stdio: "ignore" });
			child.unref();
			return message.reply(getLang("bgStarted", child.pid || "?"));
		}

		await message.reply(getLang("executing"));
		try {
			const { stdout, stderr } = await execPromise(command, { timeout, maxBuffer: 1024 * 1024 * 10 });
			let output = (stdout || "") + (stderr || "") || "ᴄᴏᴍᴍᴀɴᴅ ꜱᴜᴄᴄᴇꜱꜱꜰᴜʟ (ɴᴏ ᴏᴜᴛᴘᴜᴛ)";
			if (output.length > 3500) output = output.substring(0, 3497) + "...";
			return message.reply(getLang("output", output));
		} catch (error) {
			let errorMsg = error.message;
			if (errorMsg.includes("ETIMEDOUT") || errorMsg.includes("timeout"))
				return message.reply(getLang("timeout", timeout / 1000));
			if (errorMsg.length > 3500) errorMsg = errorMsg.substring(0, 3497) + "...";
			return message.reply(getLang("error", errorMsg));
		}
	}
};
