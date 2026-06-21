const { getStreamsFromAttachment, getTime } = global.utils;

module.exports = {
	config: {
		name: "sendnoti",
		version: "2.0.0",
		author: "SIFAT",
		countDown: 5,
		role: 0,
		description: { en: "ꜱᴇɴᴅ ɴᴏᴛɪꜰɪᴄᴀᴛɪᴏɴ ᴛᴏ ɢʀᴏᴜᴘꜱ ʏᴏᴜ ᴍᴀɴᴀɢᴇ" },
		category: "utility",
		guide: {
			en: "{pn} create <ɴᴀᴍᴇ>\n"
				+ "{pn} add <ɴᴀᴍᴇ> — ᴀᴅᴅ ᴛʜɪꜱ ᴄʜᴀᴛ\n"
				+ "{pn} delete <ɴᴀᴍᴇ> — ʀᴇᴍᴏᴠᴇ ᴛʜɪꜱ ᴄʜᴀᴛ\n"
				+ "{pn} remove <ɴᴀᴍᴇ> — ᴅᴇʟᴇᴛᴇ ɢʀᴏᴜᴘ\n"
				+ "{pn} list — ᴀʟʟ ɢʀᴏᴜᴘꜱ\n"
				+ "{pn} info <ɴᴀᴍᴇ>\n"
				+ "{pn} send <ɴᴀᴍᴇ> | <ᴍꜱɢ>"
		}
	},

	langs: {
		en: {
			missingGroupName:         "⌀ ᴘʟᴇᴀꜱᴇ ᴇɴᴛᴇʀ ɢʀᴏᴜᴘ ɴᴀᴍᴇ",
			groupNameExists:          "⌀ ɢʀᴏᴜᴘ '%1' ᴀʟʀᴇᴀᴅʏ ᴇxɪꜱᴛꜱ",
			createdGroup:             "✦ ɢʀᴏᴜᴘ ᴄʀᴇᴀᴛᴇᴅ: %1\n◈ ɪᴅ: %2",
			missingGroupNameToAdd:    "⌀ ᴇɴᴛᴇʀ ɢʀᴏᴜᴘ ɴᴀᴍᴇ ᴛᴏ ᴀᴅᴅ",
			groupNameNotExists:       "⌀ ɴᴏ ɢʀᴏᴜᴘ ꜰᴏᴜɴᴅ: %1",
			notAdmin:                 "⌀ ʏᴏᴜ ᴀʀᴇ ɴᴏᴛ ᴀᴅᴍɪɴ ʜᴇʀᴇ",
			added:                    "✦ ᴀᴅᴅᴇᴅ ᴛᴏ: %1",
			missingGroupNameToDelete: "⌀ ᴇɴᴛᴇʀ ɢʀᴏᴜᴘ ɴᴀᴍᴇ ᴛᴏ ʀᴇᴍᴏᴠᴇ ᴄʜᴀᴛ",
			notInGroup:               "⌀ ᴛʜɪꜱ ᴄʜᴀᴛ ɴᴏᴛ ɪɴ ɢʀᴏᴜᴘ: %1",
			noGroup:                  "⌀ ɴᴏ ɢʀᴏᴜᴘꜱ ʏᴇᴛ",
			showList:                 "✦ ʏᴏᴜʀ ɢʀᴏᴜᴘꜱ:\n%1",
			deleted:                  "✦ ᴄʜᴀᴛ ʀᴇᴍᴏᴠᴇᴅ ꜰʀᴏᴍ: %1",
			missingGroupNameToRemove: "⌀ ᴇɴᴛᴇʀ ɢʀᴏᴜᴘ ɴᴀᴍᴇ ᴛᴏ ᴅᴇʟᴇᴛᴇ",
			removed:                  "✦ ɢʀᴏᴜᴘ ᴅᴇʟᴇᴛᴇᴅ: %1",
			missingGroupNameToSend:   "⌀ ᴇɴᴛᴇʀ ɢʀᴏᴜᴘ ɴᴀᴍᴇ",
			groupIsEmpty:             "⌀ ɢʀᴏᴜᴘ '%1' ɪꜱ ᴇᴍᴘᴛʏ",
			sending:                  "◈ ꜱᴇɴᴅɪɴɢ ᴛᴏ %1 ᴄʜᴀᴛꜱ...",
			success:                  "✦ ꜱᴇɴᴛ ᴛᴏ %1 ɢʀᴏᴜᴘꜱ ɪɴ '%2'",
			failed:                   "⌀ ꜰᴀɪʟᴇᴅ ꜰᴏʀ %1 ɢʀᴏᴜᴘꜱ:\n%2",
			notAdminOfGroup:          "ɴᴏᴛ ᴀᴅᴍɪɴ ᴏꜰ ɢʀᴏᴜᴘ",
			missingGroupNameToView:   "⌀ ᴇɴᴛᴇʀ ɢʀᴏᴜᴘ ɴᴀᴍᴇ",
			groupInfo:                "◈ ɴᴀᴍᴇ   : %1\n◈ ɪᴅ     : %2\n◈ ᴄʀᴇᴀᴛᴇᴅ: %3\n%4",
			groupInfoHasGroup:        "◈ ᴄʜᴀᴛꜱ:\n%1"
		}
	},

	onStart: async function ({ message, event, args, usersData, threadsData, api, getLang, role }) {
		const { threadID, senderID } = event;
		const groupsSendNotiData = await usersData.get(senderID, "data.groupsSendNoti", []);

		switch ((args[0] || "").toLowerCase()) {
			case "create": {
				const groupName = args.slice(1).join(" ");
				if (!groupName) return message.reply(getLang("missingGroupName"));
				const all = await usersData.get(senderID, "data.groupsSendNoti", []);
				if (all.some(i => i.groupName === groupName)) return message.reply(getLang("groupNameExists", groupName));
				const groupID = Date.now();
				all.push({ groupName, groupID, threadIDs: [] });
				await usersData.set(senderID, all, "data.groupsSendNoti");
				return message.reply(getLang("createdGroup", groupName, groupID));
			}
			case "add": {
				const groupName = args.slice(1).join(" ");
				if (!groupName) return message.reply(getLang("missingGroupNameToAdd"));
				const getGroup = (groupsSendNotiData || []).find(i => i.groupName == groupName);
				if (!getGroup) return message.reply(getLang("groupNameNotExists", groupName));
				if (role < 1) return message.reply(getLang("notAdmin"));
				getGroup.threadIDs.push(threadID);
				await usersData.set(senderID, groupsSendNotiData, "data.groupsSendNoti");
				return message.reply(getLang("added", groupName));
			}
			case "list": {
				if (!groupsSendNotiData.length) return message.reply(getLang("noGroup"));
				const msg = groupsSendNotiData.map(i => `◦ ${i.groupName} (${i.threadIDs.length} ᴄʜᴀᴛꜱ)`).join("\n");
				return message.reply(getLang("showList", msg));
			}
			case "delete": {
				const groupName = args.slice(1).join(" ");
				if (!groupName) return message.reply(getLang("missingGroupNameToDelete"));
				const getGroup = (groupsSendNotiData || []).find(i => i.groupName == groupName);
				if (!getGroup) return message.reply(getLang("groupNameNotExists", groupName));
				const idx = getGroup.threadIDs.findIndex(i => i == threadID);
				if (idx == -1) return message.reply(getLang("notInGroup", groupName));
				getGroup.threadIDs.splice(idx, 1);
				await usersData.set(senderID, groupsSendNotiData, "data.groupsSendNoti");
				return message.reply(getLang("deleted", groupName));
			}
			case "remove": {
				const groupName = args.slice(1).join(" ");
				if (!groupName) return message.reply(getLang("missingGroupNameToRemove"));
				const idx = (groupsSendNotiData || []).findIndex(i => i.groupName == groupName);
				if (idx == -1) return message.reply(getLang("groupNameNotExists", groupName));
				groupsSendNotiData.splice(idx, 1);
				await usersData.set(senderID, groupsSendNotiData, "data.groupsSendNoti");
				return message.reply(getLang("removed", groupName));
			}
			case "send": {
				const groupName = args.slice(1).join(" ").split("|")[0].trim();
				if (!groupName) return message.reply(getLang("missingGroupNameToSend"));
				const getGroup = (groupsSendNotiData || []).find(i => i.groupName == groupName);
				if (!getGroup) return message.reply(getLang("groupNameNotExists", groupName));
				if (!getGroup.threadIDs.length) return message.reply(getLang("groupIsEmpty", groupName));
				const messageSend = args.slice(2).join(" ").split("|").slice(1).join(" ").trim();
				const formSend = { body: messageSend };
				const allAttachments = [...(event.attachments || []), ...(event.messageReply?.attachments || [])].filter(a =>
					["photo", "png", "animated_image", "video", "audio"].includes(a.type)
				);
				if (allAttachments.length) formSend.attachment = await getStreamsFromAttachment(allAttachments);
				const success = [], failed = [];
				message.reply(getLang("sending", getGroup.threadIDs.length));
				for (const tid of getGroup.threadIDs) {
					await new Promise(r => setTimeout(r, 1000));
					try {
						const { adminIDs } = await threadsData.get(tid);
						if (!adminIDs.includes(senderID)) { failed.push({ threadID: tid, error: "PERMISSION_DENIED" }); continue; }
						await api.sendMessage(formSend, tid);
						success.push(tid);
					} catch (e) { failed.push({ threadID: tid, error: e.message }); }
				}
				let msg = "";
				if (success.length) msg += getLang("success", success.length, groupName) + "\n";
				if (failed.length) msg += getLang("failed", failed.length, failed.map(i => `◦ ${i.threadID}: ${i.error === "PERMISSION_DENIED" ? getLang("notAdminOfGroup") : i.error}`).join("\n"));
				return message.reply(msg.trim());
			}
			case "info": {
				const groupName = args.slice(1).join(" ");
				if (!groupName) return message.reply(getLang("missingGroupNameToView"));
				const getGroup = (groupsSendNotiData || []).find(i => i.groupName == groupName);
				if (!getGroup) return message.reply(getLang("groupNameNotExists", groupName));
				const allThreadData = await threadsData.getAll();
				const chatLines = getGroup.threadIDs.map(tid => {
					const t = allThreadData.find(i => i.threadID == tid) || {};
					return `◦ ${t.threadName || "ᴜɴᴋɴᴏᴡɴ"} (${tid})`;
				}).join("\n");
				return message.reply(getLang("groupInfo", groupName, getGroup.groupID,
					getTime(getGroup.groupID, "DD/MM/YYYY HH:mm:ss"),
					chatLines ? getLang("groupInfoHasGroup", chatLines) : getLang("groupIsEmpty", groupName)
				));
			}
			default:
				return message.SyntaxError();
		}
	}
};
