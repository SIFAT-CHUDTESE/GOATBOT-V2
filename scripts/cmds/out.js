const axios = require("axios");
const fs = require("fs-extra");
const request = require("request");
module.exports = {
	config: {
		name: "out",
		aliases: ["vag","urjaa"],
		version: "1.0",
		author: "SiFu",
		countDown: 5,
		role: 2,
		shortDescription: "bot will leave gc",
		longDescription: "",
		category: "admin",
		guide: {
			vi: "{pn} [tid,blank]",
			en: "{pn} [tid,blank]"
		}
	},

	onStart: async function ({ api,event,args, message }) {
 var id;
 if (!args.join(" ")) {
 id = event.threadID;
 } else {
 id = parseInt(args.join(" "));
 }
 return api.sendMessage('✦━━━━━━━━━━━━━━━✦\n📛 𝗵𝗼 𝗷𝗮𝗰𝗰𝗶 𝘁𝘂𝗶 𝘁𝗵𝗮𝗸 𝗵𝗮𝗹𝗮 🐤\n✦━━━━━━━━━━━━━━━✦', id, () => api.removeUserFromGroup(api.getCurrentUserID(), id))
		}
	};
