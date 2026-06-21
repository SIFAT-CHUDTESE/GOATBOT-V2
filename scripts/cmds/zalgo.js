const zalgo = require("to-zalgo");

module.exports = {
  config: {
    name: "zalgo",
    version: "1.0.1",
    author: "SIFAT",
    countDown: 5,
    role: 0,
    shortDescription: "Convert text to Zalgo style",
    longDescription: "Converts your text into creepy Zalgo text.",
    category: "zalgo txt ",
    guide: "{pn} <text>"
  },

  onStart: async function ({ message, args }) {
    if (!args[0]) {
      return message.reply("⚠️ | EXAMPLE :\n`zalgo hello world`");
    }

    try {
      const text = args.join(" ");
      const zalgoText = zalgo(text);
      await message.reply(zalgoText);
    } catch (err) {
      console.error(err);
      message.reply(" | ZALGO TXT ERR !!");
    }
  }
};
