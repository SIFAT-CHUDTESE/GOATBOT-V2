module.exports = {
  config: {
    name: "bet",
    aliases: ["sicbo"],
    version: "3.0",
    author: "S1F4T",
    countDown: 5,
    role: 0,
    category: "𝗀𝖺𝗆𝖾",
    shortDescription: { en: "𝖽𝗂𝗀𝗂𝗍𝖺𝗅 𝖽𝗂𝖼𝖾 𝖻𝖾𝗍𝗍𝗂𝗇𝗀" },
    guide: { en: "『 {pn} <𝖻𝗂𝗀/𝗌𝗆𝖺𝗅𝗅> <𝖺𝗆𝗈𝗎𝗇𝗍> 』" }
  },

  onStart: async function ({ event, api, usersData, args }) {
    const { threadID, messageID, senderID } = event;

    const stylize = (text) => {
      const fonts = {
        "a": "𝖺", "b": "𝖻", "c": "𝖼", "d": "𝖽", "e": "𝖾", "f": "𝖿", "g": "𝗀", "h": "𝗁", "i": "𝗂", "j": "𝗃", "k": "𝗄", "l": "𝗅", "m": "𝗆",
        "n": "𝗇", "o": "𝗈", "p": "𝗉", "q": "𝗊", "r": "𝗋", "s": "𝗌", "t": "𝗍", "u": "𝗎", "v": "𝗏", "w": "𝗐", "x": "𝗑", "y": "𝗒", "z": "𝗓",
        "0": "𝟎", "1": "𝟏", "2": "𝟐", "3": "𝟑", "4": "𝟒", "5": "𝟓", "6": "𝟔", "7": "𝟕", "8": "𝟖", "9": "𝟗"
      };
      return text.toString().toLowerCase().split('').map(char => fonts[char] || char).join('');
    };

    const parseAmount = (input) => {
      if (!input) return NaN;
      let value = input.toLowerCase();
      let number = parseFloat(value);
      if (value.endsWith('k')) return number * 1000;
      if (value.endsWith('m')) return number * 1000000;
      return number;
    };

    const choice = args[0]?.toLowerCase();
    const betAmount = parseAmount(args[1]);
    const validChoices = ["big", "small", "tai", "xiu", "b", "s"];

    if (!validChoices.includes(choice) || isNaN(betAmount) || betAmount <= 0) {
      return api.sendMessage(
        `╭───────────────────╮\n\n  ᯓ  𝗂𝗇𝗏𝖺𝗅𝗂𝖽 𝖿𝗈𝗋𝗆𝖺𝗍 .ᐟ\n  ⋆ 𝗎𝗌𝖾: {pn} 𝖻𝗂𝗀 𝟧𝟢𝗄\n\n╰──────────────────────╯`,
        threadID, messageID
      );
    }

    let userData = await usersData.get(senderID);
    if (userData.money < betAmount) {
      return api.sendMessage(`ᯓ 𝗂𝗇𝗌𝗎𝖿𝖿𝗂𝖼𝗂𝖾𝗇𝗍 𝖼𝗈𝗂𝗇𝗌 \n 𝖻𝖺𝗅𝖺𝗇𝖼𝖾: ${stylize(userData.money.toLocaleString())}$`, threadID, messageID);
    }

    await usersData.set(senderID, { money: userData.money - betAmount });

    const loadingMsg = await api.sendMessage("ᯓ 𝗌𝗁𝖺𝗄𝗂𝗇𝗀 𝖽𝗂𝖼𝖾...🤒", threadID, messageID);

    const diceFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const d3 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2 + d3;

    const resultType = (total >= 11 && total <= 17) ? "big" : "small";
    const userPick = (["big", "tai", "b"].includes(choice)) ? "big" : "small";
    const isWin = (userPick === resultType);
    const finalMoney = isWin ? userData.money + betAmount : userData.money - betAmount;

    if (isWin) await usersData.set(senderID, { money: finalMoney });

    const frames = ["⚀ ⚄ ⚃", "⚅ ⚁ ⚂", "⚃ ⚂ ⚄"];
    for (let frame of frames) {
      await new Promise(r => setTimeout(r, 700));
      await api.editMessage(`┆━━━━━━━━━━━━━┆\n\n              [ ${frame} ]\n\n┆━━━━━━━━━━━━━┆`, loadingMsg.messageID, threadID);
    }

    await new Promise(r => setTimeout(r, 500));
    const status = isWin ? "𝗐𝗂𝗇𝗇𝖾𝗋" : "𝗅𝗈𝗌𝖾𝗋";
    const profit = isWin ? `+${betAmount.toLocaleString()}` : `-${betAmount.toLocaleString()}`;

    const finalUI =
      `┍━━━[𝗌𝗂𝖼𝖻𝗈 𝗋𝖾𝗌𝗎𝗅𝗍]\n\n` +
      `  𝖽𝗂𝖼𝖾: [ ${diceFaces[d1-1]} ] [ ${diceFaces[d2-1]} ] [ ${diceFaces[d3-1]} ]\n` +
      `  ⋆ 𝗍𝗈𝗍𝖺𝗅: ${stylize(total)} [ ${stylize(resultType)} ]\n\n` +
      `  ⋆ 𝗉𝗅𝖺𝗒𝖾𝗋: ${stylize(userData.name)}\n` +
      `  ⋆ 𝗋𝖾𝗌𝗎𝗅𝗍: ${stylize(profit)}$ [ ${stylize(status)} ]\n` +
      `  ⋆ 𝗐𝖺𝗅𝗅𝖾𝗍: ${stylize(finalMoney.toLocaleString())}$ Ი𐑼\n\n` +
      `┕━━━━━━━━━━━━━━>`;

    await api.editMessage(finalUI, loadingMsg.messageID, threadID);
    api.setMessageReaction(isWin ? "👹✨💥🌟😻🙀🎊🎉💯🔥💢" : "🤡🤡🤡🤡🤡🤡🤡🤡🤡🤡🤡", messageID, () => {}, true);
  }
};
