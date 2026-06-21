const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "4k",
    aliases: ["upscale"],
    version: "1.2",
    author: "SIFAT",
    countDown: 15,
    role: 0,
    shortDescription: "Image Upscaler",
    longDescription: "oto pora lagbe na 🫦",
    category: "tools",
    guide: "{pn} reply to an image"
  },

  onStart: async function ({ event, message }) {
    const { messageReply, type } = event;

    if (
      type !== "message_reply" ||
      !messageReply ||
      !messageReply.attachments ||
      messageReply.attachments.length === 0 ||
      messageReply.attachments[0].type !== "photo"
    ) {
      return message.reply("╭───────────────⊹\n│  𝟒ᴋ ᴜᴘꜱᴄᴀʟᴇʀ   ✦\n╰───────────────⊹\n\n⚠️ ᴘʟᴇᴀꜱᴇ ʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ\nᴛᴏ ᴜᴘꜱᴄᴀʟᴇ ɪᴛ ᴛᴏ 4ᴋ ✦");
    }

    const imageUrl = messageReply.attachments[0].url;
    const cacheDir = path.join(__dirname, "cache");
    const filePath = path.join(cacheDir, `upscale_${Date.now()}.png`);

    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    await message.reply("╭───────────────⊹\n│ 𝟒ᴋ ᴜᴘꜱᴄᴀʟᴇʀ ✦\n╰───────────────⊹\n\n  🎀 ᴘʀᴏᴄᴇꜱꜱɪɴɢ ʏᴏᴜʀ ɪᴍᴀɢᴇ..\n  ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ ᴀ ᴍᴏᴍᴇɴᴛ 🫦");

    try {
      const RAW_JSON = "https://raw.githubusercontent.com/MYB-SIFU/SIFATChudtese/refs/heads/main/sifatapichudtese.json";
      const configRes = await axios.get(RAW_JSON, { timeout: 10000 });
      const UPSCALE_API = configRes.data["4k"] + "/api/upscale";

      const res = await axios.post(
        UPSCALE_API,
        { imageUrl: imageUrl },
        {
          responseType: "arraybuffer",
          timeout: 300000
        }
      );

      await fs.writeFile(filePath, Buffer.from(res.data));

      await message.reply({
        body: "╭──────────────⊹\n│  ᴜᴘꜱᴄᴀʟᴇ ᴄᴏᴍᴘʟᴇᴛᴇ  ✦\n╰──────────────⊹\n\n  🪐 ʜᴇʀᴇ ɪꜱ ʏᴏᴜʀ 4ᴋ ɪᴍᴀɢᴇ ✨",
        attachment: fs.createReadStream(filePath)
      });

      setTimeout(() => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, 5000);

    } catch (err) {
      console.error("UPSCALE ERROR:", err);

      let errorMsg = "╭───────────────⊹\n│ ᴇʀʀᴏʀ ᴅᴇᴛᴇᴄᴛᴇᴅ ✦\n╰───────────────⊹\n\n❌ ᴜᴘꜱᴄᴀʟᴇ ꜱᴇʀᴠɪᴄᴇ ɪꜱ ᴄᴜʀʀᴇɴᴛʟʏ ᴜɴᴀᴠᴀɪʟᴀʙʟᴇ.";
      if (err.code === "ECONNABORTED") {
        errorMsg = "╭───────────────⊹\n│ ᴛɪᴍᴇᴏᴜᴛ ᴇʀʀᴏʀ ✦\n╰───────────────⊹\n\n⏱️ ꜱᴇʀᴠᴇʀ ᴛɪᴍᴇᴏᴜᴛ\nɪᴍᴀɢᴇ ᴘʀᴏᴄᴇꜱꜱɪɴɢ ᴛᴏᴏᴋ ᴛᴏᴏ ʟᴏɴɢ.";
      } else if (err.response) {
        errorMsg = `╭───────────────⊹\n│ ᴀᴘɪ ᴇʀʀᴏʀ ✦\n╰───────────────⊹\n\n❌ ᴇʀʀᴏʀ ${err.response.status}\n${err.response.statusText}`;
      }

      message.reply(errorMsg);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }
};
