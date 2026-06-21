"use strict";

const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");

const TMP_DIR = path.join(process.cwd(), "tmp");
fs.ensureDirSync(TMP_DIR);

module.exports = {
  config: {
    name:             "horny",
    aliases:          ["license", "hornycard"],
    version:          "1.0.0",
    author:           "SIFAT",
    category:         "fun",
    shortDescription: { en: "Generate a horny license card" },
    longDescription:  { en: "Generate a horny license card for yourself or a tagged/replied user" },
    guide:            { en: "{pn} [@mention | reply]" },
    countDown:        5,
    role:             0,
  },

  onStart: async function ({ api, event, message }) {
    const { senderID, messageReply, mentions, threadID, messageID } = event;

    let targetID;
    if (messageReply?.senderID) {
      targetID = messageReply.senderID;
    } else if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else {
      targetID = senderID;
    }

    const avatarUrl = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const apiUrl    = `https://maybexenos.vercel.app/meme/horny?avatar=${encodeURIComponent(avatarUrl)}`;
    const filePath  = path.join(TMP_DIR, `horny_${Date.now()}.png`);

    try {
      const response = await axios.get(apiUrl, {
        responseType: "arraybuffer",
        timeout:      30_000,
      });

      await fs.writeFile(filePath, Buffer.from(response.data));


      await api.sendMessage(
        {
          body:       "💳 Horny License Issued!",
          attachment: fs.createReadStream(filePath),
        },
        threadID,
        () => fs.remove(filePath).catch(() => {}),
        messageID
      );

    } catch (err) {
      console.error("[horny]", err.message);

      fs.remove(filePath).catch(() => {});
      return message.reply("❌ Failed to generate horny license. Please try again.");
    }
  },
};
