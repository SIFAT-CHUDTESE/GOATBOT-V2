const axios = require("axios");

const API_BASE = "https://sounds-cdi.onrender.com";

module.exports = {
  config: {
    name: "sounds",
    aliases: ["sfx", "sound"],
    version: "1.0",
    author: "SIFAT",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Search & send meme sounds" },
    longDescription: { en: "Search sounds from MyInstants. Use -list to pick from top 10." },
    category: "entertainment",
    guide: {
      en: "{pn} <keyword>\n{pn} <keyword> -list\n{pn} random"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;

    if (!args.length || args[0].toLowerCase() === "random") {
      api.setMessageReaction("🎲", messageID, () => {}, true);
      try {
        const res = await axios.get(`${API_BASE}/api/v1/random`, {
          params: { count: 1 },
          timeout: 15000
        });
        const item = res.data.results?.[0];
        if (!item) {
          api.setMessageReaction("❌", messageID, () => {}, true);
          return;
        }

        const audio = await axios.get(item.mp3_url, {
          responseType: "stream", timeout: 20000,
          headers: { Referer: "https://www.myinstants.com/", "User-Agent": "Mozilla/5.0" }
        });
        api.setMessageReaction("✅", messageID, () => {}, true);
        await message.reply({ body: `🎲 ${item.title}`, attachment: audio.data });
      } catch {
        api.setMessageReaction("❌", messageID, () => {}, true);
      }
      return;
    }

    const listFlag = args.includes("-list");
    const query = args.filter(a => a !== "-list").join(" ").trim();
    if (!query) return;

    if (listFlag) {
      api.setMessageReaction("🔍", messageID, () => {}, true);
      try {
        const res = await axios.get(`${API_BASE}/api/v1/search`, {
          params: { q: query, page: 1 },
          timeout: 15000
        });
        const results = res.data.results?.slice(0, 10);
        if (!results?.length) {
          api.setMessageReaction("❌", messageID, () => {}, true);
          return;
        }

        const list = results
          .map((r, i) => `${i + 1}. ${r.title}`)
          .join("\n");

        api.setMessageReaction("✅", messageID, () => {}, true);
        const sent = await message.reply(`🔊 ${query}\n\n${list}\n\nReply with number(s): 1,4,6`);
        global.GoatBot.onReply.set(sent.messageID, {
          commandName: this.config.name,
          messageID: sent.messageID,
          results,
          threadID
        });
      } catch {
        api.setMessageReaction("❌", messageID, () => {}, true);
      }
      return;
    }

    api.setMessageReaction("🔍", messageID, () => {}, true);
    try {
      const res = await axios.get(`${API_BASE}/api/v1/search`, {
        params: { q: query, page: 1 },
        timeout: 15000
      });
      const top = res.data.results?.[0];
      if (!top?.mp3_url) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return;
      }

      const audio = await axios.get(top.mp3_url, {
        responseType: "stream", timeout: 20000,
        headers: { Referer: "https://www.myinstants.com/", "User-Agent": "Mozilla/5.0" }
      });
      api.setMessageReaction("✅", messageID, () => {}, true);
      await message.reply({ body: `🔊 ${top.title}`, attachment: audio.data });
    } catch {
      api.setMessageReaction("❌", messageID, () => {}, true);
    }
  },

  onReply: async function ({ api, event, message, Reply }) {
    const { threadID, messageID } = event;
    const { results } = Reply;

    const picks = event.body
      .split(/[\s,،]+/)
      .map(n => parseInt(n))
      .filter(n => !isNaN(n) && n >= 1 && n <= results.length);

    if (!picks.length) return;

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const downloads = [];
    for (const n of picks) {
      const item = results[n - 1];
      try {
        const audio = await axios.get(item.mp3_url, {
          responseType: "stream", timeout: 20000,
          headers: { Referer: "https://www.myinstants.com/", "User-Agent": "Mozilla/5.0" }
        });
        downloads.push({ title: item.title, stream: audio.data });
      } catch {}
    }

    if (!downloads.length) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return;
    }

    api.setMessageReaction("✅", messageID, () => {}, true);

    for (const d of downloads) {
      await message.reply({ body: `🔊 ${d.title}`, attachment: d.stream });
    }
  }
};
