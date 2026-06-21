const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "ph",
    version: "2.1.0",
    author: "S1FU",
    countDown: 5,
    role: 0,
    category: "fun",
    description: { en: "Create a PornHub style text logo (image only)" },
    guide: { en: "{pn} [text1] | [text2]" }
  },

  onStart: async function ({ args, message, event }) {
    const input = args.join(" ").trim();

    if (!input) return message.reply("Please provide text.");

    let text1, text2;

    if (input.includes("|")) {
      [text1, text2] = input.split("|").map(s => s.trim());
    } else {
      const parts = input.split(" ");
      text2 = parts.length > 1 ? parts.pop() : "Hub";
      text1 = parts.join(" ");
    }

    try {
      const apiUrl = `https://maybexenos.vercel.app/meme/pornhub?text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}`;
      const savePath = path.join(__dirname, "cache", `ph_${event.senderID}_${Date.now()}.png`);

      await fs.ensureDir(path.dirname(savePath));

      const response = await axios({ method: "GET", url: apiUrl, responseType: "stream" });

      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(savePath);
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await message.reply({ attachment: fs.createReadStream(savePath) });
      fs.unlinkSync(savePath);

    } catch (err) {
      console.error(err);
      message.reply("API currently unreachable. Please try again later.");
    }
  }
};
