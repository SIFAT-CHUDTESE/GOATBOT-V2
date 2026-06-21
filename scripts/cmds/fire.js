const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "fire",
    aliases: ["burn", "spongeburn", "burnmeme"],
    version: "1.3.0",
    author: "SIFAT",
    countDown: 5,
    role: 0,
    shortDescription: "Burn meme with avatar",
    longDescription: "Generates a SpongeBob burn meme using the user's profile picture (reply, mention, or self)",
    category: "fun",
    guide: {
      en: "{pn} → uses your own avatar\n" +
          "Reply to someone + {pn} → uses their avatar\n" +
          "Mention someone + {pn} → uses mentioned user's avatar"
    }
  },

  onStart: async function ({ api, event }) {
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    let uid;
    if (event.type === "message_reply") {
      uid = event.messageReply.senderID;
    } else if (Object.keys(event.mentions).length > 0) {
      uid = Object.keys(event.mentions)[0];
    } else {
      uid = event.senderID;
    }

    const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

    const apiUrl = `https://maybexenos.vercel.app/meme/burn?avatar=${encodeURIComponent(avatarUrl)}`;

    try {
      const response = await axios.get(apiUrl, {
        responseType: "arraybuffer",
        timeout: 20000
      });

      const imgPath = path.join(cacheDir, `burn_${Date.now()}_${uid}.png`);
      fs.writeFileSync(imgPath, Buffer.from(response.data));

      api.sendMessage({
        body: "  🔥          💥          💨",
        attachment: fs.createReadStream(imgPath)
      }, event.threadID, () => {
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }, event.messageID);

    } catch (err) {
      console.error("Burn meme error:", err.message || err);

      let errorMsg = "Sorry, failed to generate the burn meme.";
      if (err.code === "ECONNABORTED") {
        errorMsg += "\nRequest timed out.";
      } else if (err.response) {
        errorMsg += `\nAPI responded with status ${err.response.status}.`;
      }

      api.sendMessage(errorMsg + "\nPlease try again later.", event.threadID, event.messageID);
    }
  }
};
