const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports = {
  config: {
    name: "bin",
    aliases: ["give", "raw"],
    version: "1.0",
    author: "SIFAT",
    countDown: 5,
    role: 0,
    shortDescription: "Upload command code to Pastebin",
    longDescription: "Upload any command's source code to Pastebin",
    category: "utility",
    guide: "{pn} <command name>"
  },

  onStart: async function ({ args, message }) {
    const sifatAuth = 'U0lGQVQ=';
    const sifatReal = Buffer.from(sifatAuth, 'base64').toString('utf8');

    if (this.config.author !== sifatReal) {
      return message.reply("🤡 SALA CHOR _ CMD AUTHOR SIFAT DE !¡");
    }

    const sifatTarget = args[0];
    if (!sifatTarget) {
      return message.reply("❌ | Please provide a command name.\nExample: .pastebin uptime");
    }

    const sifatFilePath = path.join(__dirname, sifatTarget + ".js");

    if (!fs.existsSync(sifatFilePath)) {
      return message.reply("❌ | Command " + sifatTarget + ".js not found.");
    }

    try {
      const sifatCode = fs.readFileSync(sifatFilePath, "utf8");

      const sifatSexy = 'T2ZHMVpadm1PXzBXaFllRThWLWFqRW5yYVVQT2tLYmE=';
      const sifatDev = Buffer.from(sifatSexy, 'base64').toString('utf8');

      const sifatCdtese = 'aHR0cHM6Ly9wYXN0ZWJpbi5jb20vYXBpL2FwaV9wb3N0LnBocA==';
      const sifatLink = Buffer.from(sifatCdtese, 'base64').toString('utf8');

      const sifatPayload = {
        api_option: "paste",
        api_dev_key: sifatDev,
        api_paste_private: "1",
        api_paste_name: sifatTarget + ".js",
        api_paste_expire_date: "1M",
        api_paste_format: "javascript",
        api_paste_code: sifatCode
      };

      const sifatResponse = await axios.post(sifatLink, sifatPayload, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      if (sifatResponse.data && sifatResponse.data.startsWith("https://pastebin.com/")) {
        return message.reply("✅ | " + sifatTarget + ".js \n\n🔗 Cmd Link:\n" + sifatResponse.data);
      } else {
        return message.reply("❌ | Pastebin upload failed.");
      }

    } catch (error) {
      console.error(error);
      return message.reply("❌ | An error occurred while uploading the command.");
    }
  }
};
