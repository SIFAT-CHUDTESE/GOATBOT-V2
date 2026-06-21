const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "xnxx",
    aliases: ["xn"],
    version: "1.0.0",
    author: "SIFAT",
    countDown: 5,
    role: 0,
    shortDescription: "XNXX meme image ",
    longDescription: "Generate an XNXX style meme with user avatar",
    category: "fun",
    guide: "{pn} tag or replay msg"
  },

  onStart: async function ({ api, event, args }) {
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    try {
      let uid, name;


      if (event.type === "message_reply") {
        uid = event.messageReply.senderID;
        const userInfo = await api.getUserInfo(uid);
        name = userInfo[uid].name;
      } else if (Object.keys(event.mentions).length > 0) {
        uid = Object.keys(event.mentions)[0];
        name = event.mentions[uid].replace(/@/g, "");
      } else {
        uid = event.senderID;
        const userInfo = await api.getUserInfo(uid);
        name = userInfo[uid].name;
      }


      const title = args.join(" ") || name;


      const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;


      const res = await axios.get(
        `https://maybexenos.vercel.app/meme/xnxx?image=${encodeURIComponent(avatarUrl)}&title=${encodeURIComponent(title)}`,
        { responseType: "arraybuffer" }
      );

      const imgPath = path.join(cacheDir, `xnxx_${uid}.png`);
      fs.writeFileSync(imgPath, Buffer.from(res.data, "utf-8"));

      return api.sendMessage(
        {
          attachment: fs.createReadStream(imgPath)
        },
        event.threadID,
        () => {
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        },
        event.messageID
      );

    } catch (err) {
      console.error(err);
      return api.sendMessage("error 😿", event.threadID);
    }
  }
};
