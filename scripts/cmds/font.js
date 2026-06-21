const axios = require("axios");

module.exports = {
    config: {
        name: "font",
        aliases: ["stylefont"],
        version: "1.6.0",
        author: "SIFAT",
        countDown: 5,
        role: 0,
        category: "utility",
        description: "Convert text to various font styles with list support",
        guide: "{pn}font list [text]\n{pn}font [number] [text]\nExample: {pn}font 43 Hello"
    },

    onStart: async function ({ args, message, event }) {
        const { messageID } = event;

        if (args.length === 0) {
            return message.reply("❌ Usage:\n.font list [text]\n.font [style_number] [text]");
        }

        const action = args[0].toLowerCase();

        try {

            if (action === "list") {
                const text = args.slice(1).join(" ") || "Sifat";

                message.reaction("⏳", messageID);

                const res = await axios.get(`https://maybexenos.vercel.app/font-symbol/stylefont?text=${encodeURIComponent(text)}&all=true`);
                const styles = res.data.styles;

                if (!Array.isArray(styles)) {
                    return message.reply("❌ Could not fetch font styles.");
                }

                let combinedMsg = `📋 Font List for: "${text}"\n\n`;

                styles.forEach((item) => {
                    combinedMsg += `${item.id}. ${item.label}: ${item.result}\n`;
                });

                return message.reply(combinedMsg.trim());
            }

            if (!isNaN(action)) {
                const text = args.slice(1).join(" ");
                if (!text) {
                    return message.reply(`❌ Please provide text!\nExample: .font ${action} Hello World`);
                }

                message.reaction("⏳", messageID);

                const res = await axios.get(`https://maybexenos.vercel.app/font-symbol/stylefont?text=${encodeURIComponent(text)}&style=${action}&all=false`);

                const resultText = res.data.result ||
                                  (res.data.styles && res.data.styles[0] ? res.data.styles[0].result : res.data);

                message.reaction("✨", messageID);
                return message.reply(resultText);
            }

            return message.reply("❌ Invalid usage!\nUse: .font list [text] or .font [number] [text]");

        } catch (error) {
            console.error(error);
            message.reaction("❌", messageID);
            return message.reply("❌ Failed to process your request.");
        }
    }
};
