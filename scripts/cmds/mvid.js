const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_URL = "https://metacdiapi.up.railway.app";

const TMP = path.join(__dirname, "tmp");
fs.ensureDirSync(TMP);

async function dlFile(url, dest) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 120000 });
  await fs.outputFile(dest, Buffer.from(res.data));
  return dest;
}

async function pollJob(jobId, maxAttempts = 50, interval = 6000) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, interval));
    const { data } = await axios.get(`${API_URL}/video/jobs/${jobId}`, { timeout: 15000 });
    if (data.status === "succeeded") return data.result;
    if (data.status === "failed") throw new Error(data.error || "ᴊᴏʙ ꜰᴀɪʟᴇᴅ");
  }
  throw new Error("ᴛɪᴍᴇᴅ ᴏᴜᴛ (>5 ᴍɪɴ)");
}

module.exports = {
  config: {
    name: "metavideo",
    aliases: ["mvid", "aivideo"],
    version: "1.0",
    author: "SIFAT",
    countDown: 15,
    role: 0,
    shortDescription: { en: "ɢᴇɴᴇʀᴀᴛᴇ ᴀɪ ᴠɪᴅᴇᴏꜱ ꜰʀᴏᴍ ᴛᴇxᴛ" },
    longDescription: {
      en: "ɢᴇɴᴇʀᴀᴛᴇ ᴀɪ ᴠɪᴅᴇᴏꜱ ᴠɪᴀ ᴍᴇᴛᴀ ᴀɪ. ꜱᴜᴘᴘᴏʀᴛꜱ ᴇxᴛᴇɴᴅɪɴɢ ᴇxɪꜱᴛɪɴɢ ᴠɪᴅᴇᴏꜱ.\nᴠɪᴅᴇᴏꜱ ᴛᴀᴋᴇ ~30–90ꜱ ᴛᴏ ɢᴇɴᴇʀᴀᴛᴇ.",
    },
    category: "ai",
    guide: {
      en:
        "{pn} <ᴘʀᴏᴍᴘᴛ>\n" +
        "{pn} extend <ᴍᴇᴅɪᴀ_ɪᴅ>",
    },
  },

  onStart: async function ({ api, event, args, message }) {
    const sub = (args[0] || "").toLowerCase();

    if (sub === "extend") {
      const mediaId = args[1];
      if (!mediaId) return message.reply(`❌ ᴜꜱᴀɢᴇ: metavideo extend <ᴍᴇᴅɪᴀ_ɪᴅ>`);

      const w = await message.reply(`🎬 ᴇxᴛᴇɴᴅɪɴɢ ᴠɪᴅᴇᴏ — ~30–90ꜱ...`);
      try {
        const { data } = await axios.post(
          `${API_URL}/video/extend`,
          { media_id: mediaId, auto_poll: true, max_poll_attempts: 40, poll_wait_seconds: 3 },
          { timeout: 200000 }
        );
        const videoUrls = data?.video_urls || [];
        if (!videoUrls.length) throw new Error("ɴᴏ ᴠɪᴅᴇᴏ ᴜʀʟꜱ ʀᴇᴛᴜʀɴᴇᴅ");
        const fp = path.join(TMP, `ext_${Date.now()}.mp4`);
        await dlFile(videoUrls[0], fp);
        try { await api.unsendMessage(w.messageID); } catch (_) {}
        return api.sendMessage(
          { body: `🎬 ᴇxᴛᴇɴᴅᴇᴅ ᴠɪᴅᴇᴏ ʀᴇᴀᴅʏ .ᐟ`, attachment: fs.createReadStream(fp) },
          event.threadID,
          () => { try { fs.unlinkSync(fp); } catch (_) {} }
        );
      } catch (err) {
        try { await api.unsendMessage(w.messageID); } catch (_) {}
        const errMsg = err.response?.data?.detail || err.response?.data?.error || err.message;
        return message.reply(`❌ ᴇxᴛᴇɴᴅ ꜰᴀɪʟᴇᴅ: ${errMsg}`);
      }
    }

    const prompt = args.join(" ").trim();
    if (!prompt) return message.reply(
      `🎬 ᴍᴇᴛᴀ ᴀɪ ᴠɪᴅᴇᴏ\n\n` +
      `ᴜꜱᴀɢᴇ:\n` +
      `  metavideo <ᴘʀᴏᴍᴘᴛ>\n` +
      `  metavideo extend <ᴍᴇᴅɪᴀ_ɪᴅ>\n\n` +
      `ᴇxᴀᴍᴘʟᴇꜱ:\n` +
      `  metavideo a cat playing piano\n` +
      `  metavideo a phoenix rising from flames\n\n` +
      `⏳ ᴠɪᴅᴇᴏꜱ ᴛᴀᴋᴇ ~30–90ꜱ`
    );

    const w = await message.reply(`🎬 ɢᴇɴᴇʀᴀᴛɪɴɢ: "${prompt}"\n⏳ ~30–90ꜱ...`);
    try {
      const { data: job } = await axios.post(
        `${API_URL}/video/async`,
        { prompt, auto_poll: true, max_poll_attempts: 40, poll_wait_seconds: 3 },
        { timeout: 30000 }
      );
      const jobId = job?.job_id;
      if (!jobId) throw new Error("ɴᴏ ᴊᴏʙ_ɪᴅ ʀᴇᴛᴜʀɴᴇᴅ");

      const result = await pollJob(jobId);
      const videoUrls = result?.video_urls || [];
      if (!videoUrls.length) throw new Error("ɴᴏ ᴠɪᴅᴇᴏ ᴜʀʟꜱ");
      const mediaIds = result?.media_ids || [];
      const fp = path.join(TMP, `vid_${Date.now()}.mp4`);
      await dlFile(videoUrls[0], fp);
      try { await api.unsendMessage(w.messageID); } catch (_) {}
      const tail = mediaIds[0] ? `\n📎 ɪᴅ: ${mediaIds[0]}` : "";
      return api.sendMessage(
        { body: `🎬 ᴠɪᴅᴇᴏ ʀᴇᴀᴅʏ: "${prompt}"${tail} .ᐟ`, attachment: fs.createReadStream(fp) },
        event.threadID,
        () => { try { fs.unlinkSync(fp); } catch (_) {} }
      );
    } catch (err) {
      try { await api.unsendMessage(w.messageID); } catch (_) {}
      const errMsg = err.response?.data?.detail || err.response?.data?.error || err.message;
      return message.reply(`❌ ᴠɪᴅᴇᴏ ꜰᴀɪʟᴇᴅ: ${errMsg}`);
    }
  },
};
