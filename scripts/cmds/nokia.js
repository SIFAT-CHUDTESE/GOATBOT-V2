module.exports = {
  config: {
    name: "nokia",
    aliases: ["nokiya"],
    version: "1.1",
    author: "SIFAT",
    shortDescription: "Make a Nokia meme from a user's avatar",
    longDescription: "Generate a funny Nokia-styled meme using the avatar of a mentioned or replied user",
    category: "fun",
    guide: "{pn} @mention or reply to a message"
  },

  async onStart({ api, event }) {
    try {
      let targetID;

      if (Object.keys(event.mentions).length > 0) {
        targetID = Object.keys(event.mentions)[0];
      }

      else if (event.messageReply) {
        targetID = event.messageReply.senderID;
      }

      else {
        targetID = event.senderID;
      }

      const imageLink = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const apiURL = `https://maybexenos.vercel.app/meme/nokia?image=${encodeURIComponent(imageLink)}`;

      api.sendMessage({
        body: "",
        attachment: await global.utils.getStreamFromURL(apiURL)
      }, event.threadID, event.messageID);

    } catch (err) {
      console.error(err);
      api.sendMessage("⚠️ Something went wrong. Try again later.", event.threadID, event.messageID);
    }
  }
};
