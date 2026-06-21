const axios = require("axios");
const moment = require("moment-timezone");

module.exports = {
    config: {
        name: "daily",
        version: "1.0.0",
        author: "S1F4T",
        countDown: 5,
        role: 0,
        description: {
            vi: "Nhận quà hàng ngày với giao diện ảnh",
            en: "Receive daily rewards with only image interface"
        },
        category: "game",
        guide: {
            en: "   {pn}: Claim your daily reward"
        },
        envConfig: {
            rewardFirstDay: { coin: 500, exp: 50 }
        }
    },

    onStart: async function ({ event, envCommands, usersData, api, message }) {
        const { senderID } = event;
        const reward = envCommands[this.config.name].rewardFirstDay;
        const timeZone = "Asia/Dhaka";
        const dateTime = moment.tz(timeZone).format("DD/MM/YYYY");
        const currentDay = new Date().getDay();
        const dayIndex = currentDay === 0 ? 7 : currentDay;

        const bgList = [
            "https://i.imgur.com/mCYvXgK.gif",
            "https://i.imgur.com/tu9CTDM.gif",
            "https://i.imgur.com/hR7SkFv.gif",
            "https://i.imgur.com/TQa0A8u.gif",
            "https://i.imgur.com/kIbC2kN.gif"
        ];

        const userData = await usersData.get(senderID);

        if (!userData.data.dailyClaim || userData.data.dailyClaim.date !== dateTime) {
            userData.data.dailyClaim = { date: dateTime, count: 0 };
        }

        if (userData.data.dailyClaim.count >= 5) {
            return message.reply("🚫 𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗: 𝟱/𝟱 𝗟𝗶𝗺𝗶𝘁 𝗥𝗲𝗮𝗰𝗵𝗲𝗱!");
        }

        const getCoin = Math.floor(reward.coin * (1.2) ** (dayIndex - 1));
        const getExp = Math.floor(reward.exp * (1.2) ** (dayIndex - 1));

        userData.data.dailyClaim.count += 1;
        const currentCount = userData.data.dailyClaim.count;

        await usersData.set(senderID, {
            money: userData.money + getCoin,
            exp: userData.exp + getExp,
            data: userData.data
        });

        try {
            const userName = (userData.name).toUpperCase();
            const avatarURL = `https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
            const randomBG = bgList[Math.floor(Math.random() * bgList.length)];

            const cardUrl = `https://maybexenos.vercel.app/daily-reward/daily?background=${encodeURIComponent(randomBG)}&avatar=${encodeURIComponent(avatarURL)}&text1=${encodeURIComponent(userName)}&text2=CLAIM+${currentCount}/5&text3=%2B${getCoin}+COIN`;

            const imageStream = (await axios.get(cardUrl, { responseType: 'stream' })).data;

            return message.reply({
                attachment: imageStream
            });
        } catch (err) {
            return message.reply(`✅ +${getCoin} Coins Successfully Claimed!`);
        }
    }
};
