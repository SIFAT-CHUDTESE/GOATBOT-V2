"use strict";

const axios = require("axios");

module.exports = {
    config: {
        name:        "setavatar",
        aliases:     ["setavt", "botavatar", "setpfp"],
        version:     "2.0.0",
        author:      "SIFAT",
        category:    "admin",
        role:        1,
        countDown:   10,
        description: { en: "Set bot avatar (-b) or group avatar (-g)" },
        guide:       { en: "{pn} [-g | -b] [url]  |  reply to an image" },
    },

    onStart: async function ({ args, event, message, api }) {
        const type = args[0]?.toLowerCase();
        let imageUrl = args[1] || null;

        if (!["-g", "-b"].includes(type)) {
            return message.reply(
                "🖼️ ꜱᴇᴛ ᴀᴠᴀᴛᴀʀ — ᴜꜱᴀɢᴇ\n" +
                "━━━━━━━━━━━━━━━━━━━━\n" +
                `${global.GoatBot.config.prefix}setavatar -g <url>  → ɢʀᴏᴜᴘ ᴀᴠᴀᴛᴀʀ\n` +
                `${global.GoatBot.config.prefix}setavatar -b         → ʙᴏᴛ ᴀᴠᴀᴛᴀʀ (ʀᴇᴘʟʏ ᴛᴏ ɪᴍᴀɢᴇ)`
            );
        }

        if (!imageUrl && event.messageReply) {
            const att = event.messageReply.attachments?.[0];
            if (att?.type === "photo" || att?.type === "sticker")
                imageUrl = att.url || att.previewUrl;
        }
        if (!imageUrl) {
            const att = event.attachments?.[0];
            if (att?.type === "photo" || att?.type === "sticker")
                imageUrl = att.url || att.previewUrl;
        }
        if (!imageUrl) {
            return message.reply("⚠️ ᴘʀᴏᴠɪᴅᴇ ᴀ URL ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ.");
        }

        try {
            const target = type === "-g" ? "group" : "bot";
            await message.reply(`⏳ ᴜᴘᴅᴀᴛɪɴɢ ${target} ᴀᴠᴀᴛᴀʀ...`);

            const res = await axios.get(imageUrl, { responseType: "stream", timeout: 15_000 });

            if (type === "-g") {
                await new Promise((resolve, reject) => {
                    api.changeGroupImage(res.data, event.threadID, (err) => err ? reject(err) : resolve());
                });
            } else {
                const changePfp = api.changeAvt || api.changeAvatar || api.setAvatar;
                if (typeof changePfp !== "function") {
                    throw new Error("FCA library does not support changing bot pfp.");
                }
                await new Promise((resolve, reject) => {
                    changePfp(res.data, (err) => err ? reject(err) : resolve());
                });
            }

            return message.reply(`✅ ${target.toUpperCase()} ᴀᴠᴀᴛᴀʀ ᴜᴘᴅᴀᴛᴇᴅ!`);
        } catch (e) {
            return message.reply(`❌ ꜰᴀɪʟᴇᴅ: ${e.message}`);
        }
    },
};
