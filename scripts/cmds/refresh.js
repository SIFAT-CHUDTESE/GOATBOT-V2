module.exports = {
	config: {
		name: "refresh",
		version: "1.0",
		author: "SIFAT",
		countDown: 30,
		role: 0,
		description: {
			en: "Refresh cached data for group threads or users"
		},
		category: "box chat",
		guide: {
			en: "   {pn} group — refresh your current group\n"
				+ "   {pn} group <threadID> — refresh group by ID\n"
				+ "   {pn} user — refresh your own user data\n"
				+ "   {pn} user <userID | @tag> — refresh user by ID or mention\n"
				+ "   {pn} all — refresh both thread and user data at once"
		}
	},

	langs: {
		en: {
			refreshMyThreadSuccess: "✅ ʏᴏᴜʀ ɢʀᴏᴜᴘ ᴄʜᴀᴛ ᴅᴀᴛᴀ ʜᴀs ʙᴇᴇɴ ʀᴇꜰʀᴇsʜᴇᴅ sᴜᴄᴄᴇssꜰᴜʟʟʏ.",
			refreshThreadTargetSuccess: "✅ ɢʀᴏᴜᴘ ᴄʜᴀᴛ [ %1 ] ʜᴀs ʙᴇᴇɴ ʀᴇꜰʀᴇsʜᴇᴅ sᴜᴄᴄᴇssꜰᴜʟʟʏ.",
			errorRefreshMyThread: "❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ʀᴇꜰʀᴇsʜ ʏᴏᴜʀ ɢʀᴏᴜᴘ ᴄʜᴀᴛ ᴅᴀᴛᴀ. ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ.",
			errorRefreshThreadTarget: "❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ʀᴇꜰʀᴇsʜ ɢʀᴏᴜᴘ [ %1 ]. ɪᴛ ᴍᴀʏ ʙᴇ ɪɴᴠᴀʟɪᴅ ᴏʀ ɪɴᴀᴄᴄᴇssɪʙʟᴇ.",
			refreshMyUserSuccess: "✅ ʏᴏᴜʀ ᴜsᴇʀ ᴅᴀᴛᴀ ʜᴀs ʙᴇᴇɴ ʀᴇꜰʀᴇsʜᴇᴅ sᴜᴄᴄᴇssꜰᴜʟʟʏ.",
			refreshUserTargetSuccess: "✅ ᴜsᴇʀ [ %1 ] ᴅᴀᴛᴀ ʜᴀs ʙᴇᴇɴ ʀᴇꜰʀᴇsʜᴇᴅ sᴜᴄᴄᴇssꜰᴜʟʟʏ.",
			errorRefreshMyUser: "❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ʀᴇꜰʀᴇsʜ ʏᴏᴜʀ ᴜsᴇʀ ᴅᴀᴛᴀ. ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ.",
			errorRefreshUserTarget: "❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ʀᴇꜰʀᴇsʜ ᴜsᴇʀ [ %1 ]. ᴛʜᴇʏ ᴍᴀʏ ʙᴇ ɪɴᴠᴀʟɪᴅ ᴏʀ ɪɴᴀᴄᴄᴇssɪʙʟᴇ.",
			refreshAllSuccess: "✅ ʙᴏᴛʜ ɢʀᴏᴜᴘ ᴀɴᴅ ᴜsᴇʀ ᴅᴀᴛᴀ ʜᴀᴠᴇ ʙᴇᴇɴ ʀᴇꜰʀᴇsʜᴇᴅ sᴜᴄᴄᴇssꜰᴜʟʟʏ.",
			refreshAllPartial: "⚠️ ᴘᴀʀᴛɪᴀʟ ʀᴇꜰʀᴇsʜ ᴄᴏᴍᴘʟᴇᴛᴇᴅ.\n\n┌ ɢʀᴏᴜᴘ : %1\n└ ᴜsᴇʀ   : %2",
			refreshing: "🔄 ʀᴇꜰʀᴇsʜɪɴɢ ᴅᴀᴛᴀ, ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ...",
			invalidID: "❌ ɪɴᴠᴀʟɪᴅ ɪᴅ ᴘʀᴏᴠɪᴅᴇᴅ. ᴘʟᴇᴀsᴇ ᴜsᴇ ᴀ ᴠᴀʟɪᴅ ɴᴜᴍᴇʀɪᴄ ɪᴅ.",
			timeout: "⏱️ ʀᴇꜰʀᴇsʜ ᴏᴘᴇʀᴀᴛɪᴏɴ ᴛɪᴍᴇᴅ ᴏᴜᴛ. ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.",
			bulkSuccess: "✅ sᴜᴄᴄᴇssꜰᴜʟʟʏ ʀᴇꜰʀᴇsʜᴇᴅ %1 ᴏᴜᴛ ᴏꜰ %2 ᴜsᴇʀs.",
			bulkUsage: "❌ ᴘʟᴇᴀsᴇ ᴍᴇɴᴛɪᴏɴ ᴀᴛ ʟᴇᴀsᴛ ᴏɴᴇ ᴜsᴇʀ ᴏʀ ᴘʀᴏᴠɪᴅᴇ ᴍᴜʟᴛɪᴘʟᴇ ɪᴅs ᴛᴏ ᴜsᴇ ʙᴜʟᴋ ᴍᴏᴅᴇ."
		}
	},

	onStart: async function ({ args, threadsData, usersData, message, event, getLang }) {
		const mode = (args[0] || "").toLowerCase();

		if (!mode) return message.SyntaxError();

		const isValidID = (id) => /^\d{10,20}$/.test(String(id));

		const withTimeout = (promise, ms = 8000) =>
			Promise.race([
				promise,
				new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))
			]);

		const safeRefreshThread = async (id) => {
			await withTimeout(threadsData.refreshInfo(id));
		};

		const safeRefreshUser = async (id) => {
			await withTimeout(usersData.refreshInfo(id));
		};

		if (mode === "all") {
			const waitMsg = await message.reply(getLang("refreshing"));

			let threadStatus = "✅ sᴜᴄᴄᴇss";
			let userStatus = "✅ sᴜᴄᴄᴇss";

			await Promise.allSettled([
				safeRefreshThread(event.threadID).catch(err => {
					threadStatus = err.message === "timeout" ? "⏱️ ᴛɪᴍᴇᴅ ᴏᴜᴛ" : "❌ ꜰᴀɪʟᴇᴅ";
				}),
				safeRefreshUser(event.senderID).catch(err => {
					userStatus = err.message === "timeout" ? "⏱️ ᴛɪᴍᴇᴅ ᴏᴜᴛ" : "❌ ꜰᴀɪʟᴇᴅ";
				})
			]);

			try { await message.unsend(waitMsg.messageID); } catch {}

			if (threadStatus.startsWith("✅") && userStatus.startsWith("✅"))
				return message.reply(getLang("refreshAllSuccess"));

			return message.reply(getLang("refreshAllPartial", threadStatus, userStatus));
		}

		if (mode === "group" || mode === "thread") {
			const targetID = args[1] ? args[1].trim() : event.threadID;

			if (args[1] && !isValidID(targetID))
				return message.reply(getLang("invalidID"));

			const isSelf = targetID === event.threadID;

			try {
				await safeRefreshThread(targetID);
				return message.reply(
					isSelf
						? getLang("refreshMyThreadSuccess")
						: getLang("refreshThreadTargetSuccess", targetID)
				);
			} catch (err) {
				if (err.message === "timeout") return message.reply(getLang("timeout"));
				return message.reply(
					isSelf
						? getLang("errorRefreshMyThread")
						: getLang("errorRefreshThreadTarget", targetID)
				);
			}
		}

		if (mode === "user") {
			const mentioned = Object.keys(event.mentions || {});

			if (mentioned.length > 1 || (args.slice(1).length > 1 && !mentioned.length)) {
				const targets = mentioned.length ? mentioned : args.slice(1).filter(isValidID);

				if (targets.length < 2) return message.reply(getLang("bulkUsage"));

				const waitMsg = await message.reply(getLang("refreshing"));
				const results = await Promise.allSettled(targets.map(id => safeRefreshUser(id)));
				const succeeded = results.filter(r => r.status === "fulfilled").length;

				try { await message.unsend(waitMsg.messageID); } catch {}

				return message.reply(getLang("bulkSuccess", succeeded, targets.length));
			}

			let targetID = event.senderID;
			if (args[1]) targetID = mentioned.length ? mentioned[0] : args[1].trim();

			if (args[1] && !isValidID(targetID))
				return message.reply(getLang("invalidID"));

			const isSelf = targetID === event.senderID;

			try {
				await safeRefreshUser(targetID);
				return message.reply(
					isSelf
						? getLang("refreshMyUserSuccess")
						: getLang("refreshUserTargetSuccess", targetID)
				);
			} catch (err) {
				if (err.message === "timeout") return message.reply(getLang("timeout"));
				return message.reply(
					isSelf
						? getLang("errorRefreshMyUser")
						: getLang("errorRefreshUserTarget", targetID)
				);
			}
		}

		return message.SyntaxError();
	}
};
