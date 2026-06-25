const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const { BASE_URL } = require("api/gemini");

const PERSONAS = {
  default: "",
  pirate: "You are a pirate. Respond in pirate style.",
  teacher: "You are a patient and clear teacher. Explain simply.",
  roast: "You are a savage roaster. Roast the user's message humorously.",
  poet: "You are a poet. Respond only in poetic verse.",
  sherlock: "You are Sherlock Holmes. Reason like a detective.",
  gpt: "You are GPT-4. Pretend you are OpenAI's GPT-4.",
  rizz: "You are a smooth, charismatic person. Everything you say has maximum rizz.",
};

module.exports = {
  config: {
    name: "ai",
    aliases: "gaymini",
    version: "3.0",
    author: "SIFAT",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Chat with Gaymini AI" },
    longDescription: { en: "Advanced multi-turn Gemini chat with persona, image support, and session memory." },
    category: "AI",
    guide: {
      en:
        "  {pn} [message]\n" +
        "  {pn} -p [persona] [message]\n" +
        "  {pn} new — reset session\n" +
        "  {pn} persona — list personas\n\n" +
        "  Personas: pirate, teacher, roast, poet, sherlock, gpt, rizz\n\n" +
        "  Attach/reply image + {pn} [question]",
    },
  },

  sessions: new Map(),

  onStart: async function ({ api, event, args, message }) {
    const { threadID, senderID, attachments, messageReply } = event;
    const remaining = [...args];

    if (!remaining.length && !attachments?.find(a => a.type === "photo") && !messageReply?.attachments?.find(a => a.type === "photo")) {
      return message.reply(
        "☠️ ɢᴇᴍɪɴɪ ᴀɪ \n\n" +
        "ᴜꜱᴀɢᴇ: .ai [message]\n" +
        "ꜰʟᴀɢꜱ: -p [persona]\n\n" +
        "ᴘᴇʀꜱᴏɴᴀꜱ: " + Object.keys(PERSONAS).filter(p => p !== "default").join(", ") + "\n\n" +
        "ᴛɪᴘ: attach or reply to an image to chat about it"
      );
    }

    if (remaining[0]?.toLowerCase() === "new") {
      this.sessions.delete(threadID);
      return message.reply("ᴄᴏɴᴠᴇʀꜱᴀᴛɪᴏɴ ʀᴇꜱᴇᴛ");
    }

    if (remaining[0]?.toLowerCase() === "persona") {
      const list = Object.entries(PERSONAS)
        .filter(([k]) => k !== "default")
        .map(([k, v]) => `• ${k}: ${v.split(".")[0]}`)
        .join("\n");
      return message.reply("ᴀᴠᴀɪʟᴀʙʟᴇ ᴘᴇʀꜱᴏɴᴀꜱ\n▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\n" + list);
    }

    let persona = "default";
    if (remaining[0] === "-p" && remaining[1]) {
      persona = remaining[1].toLowerCase();
      remaining.splice(0, 2);
      if (!PERSONAS[persona]) {
        return message.reply(`❌ ᴜɴᴋɴᴏᴡɴ ᴘᴇʀꜱᴏɴᴀ: "${persona}"\nᴀᴠᴀɪʟᴀʙʟᴇ: ${Object.keys(PERSONAS).filter(p => p !== "default").join(", ")}`);
      }
    }

    const imgAttachment =
      attachments?.find(a => a.type === "photo") ||
      messageReply?.attachments?.find(a => a.type === "photo");

    const text = remaining.join(" ").trim();
    if (!text && !imgAttachment) return message.reply("❌ ᴘʟᴇᴀꜱᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴍᴇꜱꜱᴀɢᴇ ᴏʀ ɪᴍᴀɢᴇ");

    const chatID = this.sessions.get(threadID) || null;
    const startTime = Date.now();
    const wait = await message.reply("ᴛʜɪɴᴋɪɴɢ...");

    try {
      let res;
      if (imgAttachment) {
        const imgRes = await axios.get(imgAttachment.url, { responseType: "arraybuffer", timeout: 30000 });
        const tmpDir = path.join(__dirname, "..", "tmp");
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const tmpPath = path.join(tmpDir, `ai_img_${Date.now()}.jpg`);
        fs.writeFileSync(tmpPath, Buffer.from(imgRes.data));
        const form = new FormData();
        form.append("image", fs.createReadStream(tmpPath), "image.jpg");
        form.append("message", text || "Describe this image and respond to it.");
        form.append("mode", "vision");
        if (chatID) form.append("chat_id", chatID);
        if (PERSONAS[persona]) form.append("context", PERSONAS[persona]);
        res = await axios.post(`${BASE_URL}/api/gemini`, form, { headers: form.getHeaders(), timeout: 60000 });
        try { fs.unlinkSync(tmpPath); } catch {}
      } else {
        const body = { message: text, mode: "chat", chat_id: chatID };
        if (PERSONAS[persona]) body.context = PERSONAS[persona];
        res = await axios.post(`${BASE_URL}/api/gemini`, body, { timeout: 60000 });
      }

      const data = res.data;
      api.unsendMessage(wait.messageID);
      if (data.error) return message.reply(`❌ ᴇʀʀᴏʀ: ${data.error}`);
      if (data.chat_id) this.sessions.set(threadID, data.chat_id);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const reply = data.text || "ɴᴏ ʀᴇꜱᴘᴏɴꜱᴇ";
      const words = reply.split(/\s+/).length;
      const personaLabel = persona !== "default" ? ` [${persona}]` : "";

      const info = await message.reply(`ɢᴇᴍɪɴɪ${personaLabel} · ${elapsed}s · ${words} ᴡᴏʀᴅꜱ\n${"▔".repeat(28)}\n${reply}`);
      global.GoatBot.onReply.set(info.messageID, {
        commandName: "ai", messageID: info.messageID,
        author: senderID, threadID, chatID: data.chat_id || chatID,
        persona, sessions: this.sessions,
      });
    } catch (err) {
      api.unsendMessage(wait.messageID);
      message.reply(`❌ ʀᴇQᴜᴇꜱᴛ ꜰᴀɪʟᴇᴅ: ${err.message}`);
    }
  },

  onReply: async function ({ api, event, Reply, message }) {
    const { threadID, senderID, body, attachments, messageReply } = event;
    const text = body?.trim();
    if (text?.toLowerCase() === "new") {
      Reply.sessions.delete(threadID);
      return message.reply("ᴄᴏɴᴠᴇʀꜱᴀᴛɪᴏɴ ʀᴇꜱᴇᴛ");
    }
    if (!text && !attachments?.length) return;

    const imgAttachment =
      attachments?.find(a => a.type === "photo") ||
      messageReply?.attachments?.find(a => a.type === "photo");

    const startTime = Date.now();
    const wait = await message.reply(" ᴛʜɪɴᴋɪɴɢ...");

    try {
      let res;
      if (imgAttachment) {
        const imgRes = await axios.get(imgAttachment.url, { responseType: "arraybuffer", timeout: 30000 });
        const tmpDir = path.join(__dirname, "..", "tmp");
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const tmpPath = path.join(tmpDir, `ai_reply_${Date.now()}.jpg`);
        fs.writeFileSync(tmpPath, Buffer.from(imgRes.data));
        const form = new FormData();
        form.append("image", fs.createReadStream(tmpPath), "image.jpg");
        form.append("message", text || "What about this image?");
        form.append("mode", "vision");
        if (Reply.chatID) form.append("chat_id", Reply.chatID);
        if (Reply.persona && PERSONAS[Reply.persona]) form.append("context", PERSONAS[Reply.persona]);
        res = await axios.post(`${BASE_URL}/api/gemini`, form, { headers: form.getHeaders(), timeout: 60000 });
        try { fs.unlinkSync(tmpPath); } catch {}
      } else {
        const b = { message: text, mode: "chat", chat_id: Reply.chatID || null };
        if (Reply.persona && PERSONAS[Reply.persona]) b.context = PERSONAS[Reply.persona];
        res = await axios.post(`${BASE_URL}/api/gemini`, b, { timeout: 60000 });
      }

      const data = res.data;
      api.unsendMessage(wait.messageID);
      if (data.error) return message.reply(`❌ ᴇʀʀᴏʀ: ${data.error}`);
      if (data.chat_id) Reply.sessions.set(threadID, data.chat_id);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const reply = data.text || "ɴᴏ ʀᴇꜱᴘᴏɴꜱᴇ";
      const words = reply.split(/\s+/).length;
      const personaLabel = Reply.persona && Reply.persona !== "default" ? ` [${Reply.persona}]` : "";

      const info = await message.reply(`👾 ɢᴇᴍɪɴɪ${personaLabel} · ${elapsed}s · ${words} ᴡᴏʀᴅꜱ\n${"▔".repeat(28)}\n${reply}`);
      global.GoatBot.onReply.set(info.messageID, {
        commandName: "ai", messageID: info.messageID,
        author: senderID, threadID, chatID: data.chat_id || Reply.chatID,
        persona: Reply.persona, sessions: Reply.sessions,
      });
      global.GoatBot.onReply.delete(Reply.messageID);
    } catch (err) {
      api.unsendMessage(wait.messageID);
      message.reply(`❌ ʀᴇQᴜᴇꜱᴛ ꜰᴀɪʟᴇᴅ: ${err.message}`);
    }
  },
};
