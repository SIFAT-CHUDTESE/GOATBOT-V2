const fs   = require("fs-extra");
const path = require("path");
const https = require("https");
const { utils } = global;

module.exports = {
    config: {
        name:        "prefix",
        version:     "1.2",
        author:      "S1F4T",
        countDown:   5,
        role:        0,
        description: "Change the bot's prefix or show current prefix.",
        category:    "config",
        guide: {
            en:
                "   {pn} <new>     → change prefix in this chat\n" +
                "   {pn} <new> -g  → change global prefix (admin only)\n" +
                "   {pn} reset     → reset to default\n" +
                "   prefix         → show current prefix info",
        },
    },

    langs: {
        en: {
            reset:           "✅ ᴘʀᴇꜰɪx ʀᴇꜱᴇᴛ ᴛᴏ ᴅᴇꜰᴀᴜʟᴛ: %1",
            onlyAdmin:       "❌ ᴏɴʟʏ ᴀᴅᴍɪɴ ᴄᴀɴ ᴄʜᴀɴɢᴇ ɢʟᴏʙᴀʟ ᴘʀᴇꜰɪx",
            confirmGlobal:   "⚠️ ʀᴇᴀᴄᴛ ᴛᴏ ᴄᴏɴꜰɪʀᴍ ɢʟᴏʙᴀʟ ᴘʀᴇꜰɪx → %1",
            successGlobal:   "✅ ɢʟᴏʙᴀʟ ᴘʀᴇꜰɪx ᴄʜᴀɴɢᴇᴅ ᴛᴏ: %1",
            successThread:   "✅ ᴘʀᴇꜰɪx ᴄʜᴀɴɢᴇᴅ ᴛᴏ: %1\n\nᴜꜱᴇ ᴛʜɪꜱ ᴘʀᴇꜰɪx ꜰᴏʀ ᴄᴏᴍᴍᴀɴᴅꜱ ɴᴏᴡ.",
            myPrefix:
                "〔 ʜᴇʏ %1 ᴅɪᴅ ʏᴏᴜ ᴀꜱᴋ ᴍʏ ᴘʀᴇꜰɪx ‽ 〕\n\n" +
                "┣ ɢʟᴏʙᴀʟ ᴘʀᴇꜰɪx : %2\n" +
                "┣ ᴛʜɪꜱ ᴄʜᴀᴛ     : %3\n" +
                "┣ ᴄᴍᴅ ᴍᴇɴᴜ      : ʜᴇʟᴘ\n" +
                "┣ ᴅᴇᴠ           : ꜱɪꜰᴜ ☠️\n\n" +
                "〔 ɪ'ᴍ %4 ᴀᴛ ʏᴏᴜʀ ꜱᴇʀᴠɪᴄᴇ 🌊 〕",
        },
    },

    onStart: async function ({ message, role, args, commandName, event, threadsData, getLang, api }) {
        if (!args[0]) return message.SyntaxError();


        if (args[0].toLowerCase() === "reset") {
            await threadsData.set(event.threadID, null, "data.prefix");
            return message.reply(getLang("reset", global.GoatBot.config.prefix));
        }

        const newPrefix = args[0];


        if (args[1] === "-g") {
            if (role < 2) return message.reply(getLang("onlyAdmin"));
            return message.reply(getLang("confirmGlobal", newPrefix), (err, info) => {
                if (err) return;
                global.GoatBot.onReaction.set(info.messageID, {
                    commandName,
                    author:     event.senderID,
                    newPrefix,
                    setGlobal:  true,
                    messageID:  info.messageID,
                });
            });
        }



        await threadsData.set(event.threadID, newPrefix, "data.prefix");
        return message.reply(getLang("successThread", newPrefix));
    },

    onReaction: async function ({ message, threadsData, event, Reaction, getLang }) {
        if (event.userID !== Reaction.author) return;
        if (!Reaction.setGlobal) return;

        const { newPrefix } = Reaction;
        global.GoatBot.config.prefix = newPrefix;
        try {
            fs.writeFileSync(
                global.client.dirConfig,
                JSON.stringify(global.GoatBot.config, null, 2)
            );
        } catch (e) {
            console.error("[prefix] failed to write config:", e.message);
        }
        return message.reply(getLang("successGlobal", newPrefix));
    },

    onChat: async function ({ event, message, getLang, usersData }) {
        if (!event.body || event.body.toLowerCase() !== "prefix") return;

        const userName     = await usersData.getName(event.senderID);
        const botName      = global.GoatBot.config.nickNameBot || "Bot";
        const globalPrefix = global.GoatBot.config.prefix;
        const threadPrefix = utils.getPrefix(event.threadID) || globalPrefix;

        const mediaURLs = [
            "https://i.imgur.com/5a9DjQ6.gif",
            "https://i.imgur.com/LC948jn.gif",
        ];

        const cacheDir  = path.join(__dirname, "cache");
        fs.ensureDirSync(cacheDir);

        const indexFile = path.join(cacheDir, "prefix_media_index.json");
        let index = 0;
        if (fs.existsSync(indexFile)) {
            try { index = ((JSON.parse(fs.readFileSync(indexFile, "utf8")).index || 0) + 1) % mediaURLs.length; } catch {}
        }
        fs.writeFileSync(indexFile, JSON.stringify({ index }));

        const ext       = path.extname(mediaURLs[index]) || ".gif";
        const mediaPath = path.join(cacheDir, `prefix_media_${index}${ext}`);
        if (!fs.existsSync(mediaPath)) {
            try { await downloadFile(mediaURLs[index], mediaPath); } catch {}
        }

        return message.reply({
            body:       getLang("myPrefix", userName, globalPrefix, threadPrefix, botName),
            attachment: fs.existsSync(mediaPath) ? [fs.createReadStream(mediaPath)] : [],
        });
    },
};

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const req  = (u) => {
            https.get(u, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302)
                    return req(res.headers.location);
                if (res.statusCode !== 200) {
                    fs.unlink(dest, () => {});
                    return reject(new Error(`HTTP ${res.statusCode}`));
                }
                res.pipe(file);
                file.on("finish", () => file.close(resolve));
            }).on("error", (e) => { fs.unlink(dest, () => {}); reject(e); });
        };
        req(url);
    });
}
