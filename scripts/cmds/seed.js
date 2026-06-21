const axios = require("axios");
const { API_BASE_URL } = require(__dirname + "/lib/config.js");

module.exports = {
  config: {
    name: "seedance",
    aliases: ["seed"],
    version: "1.0",
    author: "SIFAT",
    countDown: 30,
    role: 0,
    shortDescription: {
      en: "Seedance 2.0 text-to-video",
    },
    longDescription: {
      en: "Generate a short AI video from a text prompt using Seedance 2.0. Takes 60-180 seconds.",
    },
    category: "AI",
    guide: {
      en: "{p}seedance <prompt>\nExample: {p}seedance a butterfly flying over flowers in slow motion",
    },
  },

  onStart: async function ({ api, event, args, message }) {
    const prompt = args.join(" ").trim();
    if (!prompt) {
      return message.reply(
        "Please provide a prompt.\nExample: {p}seedance a butterfly flying over flowers"
      );
    }

    await message.reply(
      `Generating Seedance video...\nPrompt: "${prompt}"\n\nThis takes 60-180 seconds, please wait.`
    );

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/seedance`,
        { prompt },
        { timeout: 300000 }
      );

      const videos = res.data?.data?.videos;
      if (!videos || videos.length === 0) throw new Error("No video generated");

      const videoList = videos.map((url, i) => `Video ${i + 1}: ${url}`).join("\n");
      return message.reply(`Video ready!\n\n${videoList}`);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || "Unknown error";

      if (errMsg.includes("Limit Reached") || errMsg.includes("maximum allowance")) {
        return message.reply(
          "Rate limit reached. This IP has used its 2 free video quota. Please try again later or deploy to a new server."
        );
      }

      return message.reply(`Error: ${errMsg}`);
    }
  },
};
