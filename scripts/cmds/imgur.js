const axios = require('axios');

module.exports = {
  config: {
    name: "imgur",
    version: "1.5.0",
    author: "S1FU",
    countDown: 5,
    role: 0,
    category: "ᴜᴛɪʟɪᴛʏ",
    shortDescription: { en: "ᴜᴘʟᴏᴀᴅ ᴍᴇᴅɪᴀ ᴛᴏ ɪᴍɢᴜʀ ᴠɪᴀ ᴀᴅᴠᴀɴᴄᴇᴅ ᴀᴘɪ" },
    guide: { en: "『 ʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ ᴏʀ ᴠɪᴅᴇᴏ 』" }
  },

  onStart: async function ({ api, event, message }) {
    const reply = event.messageReply;

    if (!reply || !reply.attachments || reply.attachments.length === 0) {
      return message.reply("✧ 𐃷 ᴘʟᴇᴀsᴇ ʀᴇᴘʟʏ ᴛᴏ ᴍᴇᴅɪᴀ Ი𐑼 𖹭");
    }

    message.reaction("🐋💨🦖🐦🐍🤡", event.messageID);

    try {

      const apiEndpoint = "https://maybexenos.vercel.app/uploader/imgur";

      let resultMsg = "!__──ɪᴍɢᴜʀ ᴜᴘʟᴏᴀᴅ──__!\n\n";

      const uploadPromises = reply.attachments.map(async (attachment, index) => {
        try {
          const res = await axios.get(`${apiEndpoint}?link=${encodeURIComponent(attachment.url)}`);

          const link = res.data.uploaded.image;

          if (link) {
            return `  ᯓ ʟɪɴᴋ ${index + 1}: ${link}`;
          } else {
            return `  ᯓ ʟɪɴᴋ ${index + 1}: ᴜᴘʟᴏᴀᴅ ғᴀɪʟᴇᴅ`;
          }
        } catch (e) {
          return `  ᯓ ʟɪɴᴋ ${index + 1}: ᴄᴏɴɴᴇᴄᴛɪᴏɴ ᴇʀʀᴏʀ`;
        }
      });

      const results = await Promise.all(uploadPromises);
      resultMsg += results.join("\n");
      resultMsg += "\n";

      message.reaction("🎀🐦🦖🦆💨✨🪶", event.messageID);
      return message.reply(resultMsg);

    } catch (err) {
      message.reaction("🥲😢😅😓🫤😢🤧", event.messageID);
      return message.reply("✧ sᴇʀᴠᴇʀ ᴅᴏᴡɴ ᴏʀ ɪɴᴠᴀʟɪᴅ ᴀᴘɪ Ი𐑼 𖹭");
    }
  }
};
