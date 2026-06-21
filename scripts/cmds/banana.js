const axios = require("axios");
const { Readable } = require("stream");
const { API_BASE_URL } = require(__dirname + "/lib/config.js");

module.exports = {
  config: {
    name: "nanobanana",
    aliases: ["imggen", "kola"],
    version: "1.0",
    author: "SIFAT",
    countDown: 15,
    role: 0,
    shortDescription: {
      en: "Nano Banana AI image generator",
    },
    longDescription: {
      en: "Generate 1-4 AI images from a text prompt using Nano Banana. Takes 20-60 seconds. No rate limit.",
    },
    category: "AI",
    guide: {
      en: "{p}nanobanana <prompt> [--count <1-4>]\nExample: {p}nanobanana a cute cat on a rooftop at night\nExample: {p}nanobanana futuristic city --count 4",
    },
  },

  onStart: async function ({ api, event, args, message }) {
    let numImages = 1;
    const countIdx = args.indexOf("--count");
    if (countIdx !== -1 && args[countIdx + 1]) {
      numImages = Math.min(4, Math.max(1, parseInt(args[countIdx + 1]) || 1));
      args.splice(countIdx, 2);
    }

    const prompt = args.join(" ").trim();
    if (!prompt) {
      return message.reply(
        "Please provide a prompt.\nExample: {p}nanobanana a cute cat on a rooftop at night"
      );
    }

    await message.reply(
      `Generating ${numImages} image(s)...\nPrompt: "${prompt}"\n\nPlease wait 20-60 seconds.`
    );

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/nano-banana`,
        { prompt, numImages },
        { timeout: 180000 }
      );

      const images = res.data?.data?.images;
      if (!images || images.length === 0) throw new Error("No images generated");

      const attachments = images.map((b64) => {
        const clean = b64.replace(/^data:image\/\w+;base64,/, "");
        const buf = Buffer.from(clean, "base64");
        const stream = new Readable();
        stream.push(buf);
        stream.push(null);
        stream.path = "veoai_image.jpg";
        return stream;
      });

      return message.reply({
        body: `${images.length} image(s) generated!\nPrompt: "${prompt}"`,
        attachment: attachments,
      });
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || "Unknown error";
      return message.reply(`Error: ${errMsg}`);
    }
  },
};
