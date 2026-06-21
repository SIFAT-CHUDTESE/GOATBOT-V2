module.exports = {
  config: {
    name: "inbox",
    aliases: ["in"],
    version: "2.0",
    author: "S1F4T",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: "Bot will send a private message to your inbox"
    },
    longDescription: {
      en: "Sends a professional confirmation message to the user's private inbox/message request."
    },
    category: "fun",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function({ api, event, message }) {
    const { threadID, senderID, messageID } = event;

    try {

      const userInfo = await api.getUserInfo(senderID);
      const name = userInfo[senderID].name;


      const quotes = [
        "Believe in yourself &\n│ all that you are",
        "Your potential \n│ is endless",
        "Make today amazing!",
        "Keep pushing forward\n│ you're doing great"
      ];
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];


      const inboxMsg = `
 ╭──═━┈┈⟡⟡┈┈━═──╮
│🍄𝐇𝐞𝐥𝐥𝐨, ${name}!
│
│🍄𝐘𝐨𝐮𝐫 𝐈𝐃 𝐢𝐬 𝐧𝐨𝐰 𝐀𝐥𝐥𝐨𝐰𝐞𝐝
│
│🍄𝐈'𝐦 𝐒𝐢𝐳𝐮 𝐚𝐭 𝐲𝐨𝐮𝐫 𝐬𝐞𝐫𝐯𝐢𝐜𝐞
│
├──═━┈𝐐𝐮𝐨𝐭𝐞┈━═─⟡
│
│☁️"${randomQuote}"☁️
│
╰──═━┈┈⟡⟡┈┈━═──╯`;



      await api.sendMessage(inboxMsg, senderID);


      return message.reply({
        body: `
 ╭─═━━┈┈┈━━═─╮
⟡
⟡ ×𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥𝐥𝐲 𝐒𝐞𝐧𝐭!×
⟡
⟡ 🍄 𝐔𝐬𝐞𝐫: ${name}
⟡ 🍄𝐏𝐥𝐞𝐚𝐬𝐞 𝐜𝐡𝐞𝐜𝐤 𝐲𝐨𝐮𝐫 𝐈𝐧𝐛𝐨𝐱
⟡ 🍄𝐨𝐫 𝐌𝐞𝐬𝐬𝐚𝐠𝐞 𝐑𝐞𝐪𝐮𝐞𝐬𝐭𝐬.
╰──═━┈┈⟡┈┈━═──╯`,
      }, threadID, messageID);

    } catch (error) {
      console.error("Inbox Command Error: ", error);
      return message.reply("✦━━━━━━━━━━━━━━━━━✦\n🎀 ᴜɴᴀʙʟᴇ ᴛᴏ sᴇɴᴅ ᴍᴇssᴀɢᴇ. ᴘʟᴇᴀsᴇ ᴍᴀᴋᴇ sᴜʀᴇ ʏᴏᴜʀ ɪɴʙᴏx ɪs ᴏᴘᴇɴ ᴛᴏ ᴇᴠᴇʀʏᴏɴᴇ ᴏʀ ᴄʜᴇᴄᴋ ᴇɴᴅ-ᴛᴏ-ᴇɴᴅ ᴇɴᴄʀʏᴘᴛɪᴏɴ sᴇᴛᴛɪɴɢs.\n✦━━━━━━━━━━━━━━━━━✦");
    }
  }
};
