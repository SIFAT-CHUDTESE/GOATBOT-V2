
module.exports = {
  config: {
    name: "slot",
    version: "1.0",
    author: "SIFAT",
    countDown: 5,
    role: 0,
    category: "game",
    description: "🎰 𝖧𝗒𝗉𝖾𝗋-𝖲𝗅𝗈𝗍 𝖬𝖺𝖼𝗁𝗂𝗇𝖾 𝗐𝗂𝗍𝗁 𝖲𝗆𝖺𝗋𝗍 𝖡𝖺𝗅𝖺𝗇𝖼𝖾",
    usage: "slot <amount>\nSupports: 50k, 1.5m, 2b, all"
  },

  onStart: async function ({ event, api, usersData, args }) {
    const { threadID, messageID, senderID } = event;
    const userData = await usersData.get(senderID);
    let money = userData.money;


    const fonts = {
      "a":"A","b":"ʙ","c":"ᴄ","d":"ᴅ","e":"ᴇ","f":"ꜰ","g":"ɢ","h":"ʜ","i":"ɪ","j":"ᴊ","k":"ᴋ","l":"ʟ","m":"ᴍ",
      "n":"ɴ","o":"ᴏ","p":"ᴘ","q":"ǫ","r":"ʀ","s":"ꜱ","t":"ᴛ","u":"ᴜ","v":"ᴠ","w":"ᴡ","x":"x","y":"ʏ","z":"ᴢ",
      "0": "𝟎", "1": "𝟏", "2": "𝟐", "3": "𝟑", "4": "𝟒", "5": "𝟓", "6": "𝟔", "7": "𝟕", "8": "𝟖", "9": "𝟗", ".": ".", "+": "+", "-": "-"
    };
    const stylize = (text) => text.toString().split('').map(char => fonts[char] || char).join('');


    const formatMoney = (num) => {
      if (Math.abs(num) >= 1.0e+12) return (Math.abs(num) / 1.0e+12).toFixed(2) + "T";
      if (Math.abs(num) >= 1.0e+9) return (Math.abs(num) / 1.0e+9).toFixed(2) + "B";
      if (Math.abs(num) >= 1.0e+6) return (Math.abs(num) / 1.0e+6).toFixed(2) + "M";
      if (Math.abs(num) >= 1.0e+3) return (Math.abs(num) / 1.0e+3).toFixed(2) + "K";
      return Math.abs(num).toFixed(0);
    };

    const parseBet = (input) => {
      if (!input) return 0;
      const str = input.toLowerCase();

      if (str === 'all' || str === 'max') return money;

      let val = parseFloat(str);
      if (isNaN(val)) return 0;

      if (str.includes('t')) return val * 1e12;
      if (str.includes('b')) return val * 1e9;
      if (str.includes('m')) return val * 1e6;
      if (str.includes('k')) return val * 1e3;
      return val;
    };

    const bet = parseBet(args[0]);


    if (bet < 50) return api.sendMessage(`⚠️ ${stylize("Minimum bet is 50$")}`, threadID, messageID);
    if (isNaN(bet)) return api.sendMessage(`⚠️ ${stylize("Invalid Amount.")}`, threadID, messageID);
    if (money < bet) return api.sendMessage(`💳 ${stylize("Insufficient Funds.")}\n${stylize("You have: " + formatMoney(money))}`, threadID, messageID);


    await usersData.set(senderID, { money: money - bet });
    const symbols = ["🇧🇩", "🇮🇩", "🏴‍☠️", "🇦🇷", "🇯🇵", "🇵🇰"];
    let s1, s2, s3;
    const chance = Math.random();


    if (chance < 0.15) {
      s1 = s2 = s3 = symbols[Math.floor(Math.random() * symbols.length)];
    } else if (chance < 0.55) {
      s1 = s2 = symbols[Math.floor(Math.random() * symbols.length)];
      s3 = symbols.filter(s => s !== s1)[Math.floor(Math.random() * (symbols.length - 1))];
    } else {
      const shuffled = [...symbols].sort(() => 0.5 - Math.random());
      [s1, s2, s3] = [shuffled[0], shuffled[1], shuffled[2]];
    }

    let winnings = 0;
    let status = "🦖 𝖫𝖮𝖲𝖲";
    let multiplier = 0;

    if (s1 === s2 && s2 === s3) {
      winnings = bet * 15;
      status = "💎 𝖩𝖠𝖢𝖪𝖯𝖮𝖳";
      multiplier = 15;
    } else if (s1 === s2 || s1 === s3 || s2 === s3) {
      winnings = bet * 3;
      status = "✨ 𝖶𝖨𝖭";
      multiplier = 3;
    }

    const finalBalance = (money - bet) + winnings;
    await usersData.set(senderID, { money: finalBalance });

    const msgInstance = await api.sendMessage(`｢ 🎰 ｣ 𝖲𝖸𝖲𝖳𝖤𝖬 𝖲𝖳𝖠𝖱𝖳...`, threadID, messageID);

    const frames = [
      { s: ["🔄", "🔄", "🔄"], txt: "𝗜𝗡𝗜𝗧𝗜𝗔𝗟𝗜𝗭𝗜𝗡𝗚" },
      { s: [symbols[1], symbols[4], "🔄"], txt: "𝗦𝗬𝗡𝗖𝗛𝗥𝗢𝗡𝗜𝗭𝗜𝗡𝗚" },
      { s: ["🔄", symbols[0], symbols[5]], txt: "𝗖𝗔𝗟𝗜𝗕𝗥𝗔𝗧𝗜𝗡𝗚" },
      { s: [s1, s2, s3], txt: "𝗖𝗢𝗠𝗣𝗟𝗘𝗧𝗘𝗗" }
    ];

    for (let i = 0; i < frames.length; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const isLast = i === frames.length - 1;

      const profitDisplay = isLast
        ? (winnings > 0 ? `+${formatMoney(winnings)}` : `-${formatMoney(bet)}`)
        : "---";


      const ui =
        `   ◢ ${stylize("SLOTS MACHINE")} ◣\n` +
        `╭───────────────╮\n` +
        `│    ${frames[i].s[0]}  │  ${frames[i].s[1]}  │  ${frames[i].s[2]}  │\n` +
        `╰───────────────╯\n` +
        `◈ 𝖲𝖳𝖠𝖳𝖴𝖲: ${isLast ? stylize(status) : stylize(frames[i].txt)}\n` +
        `────────────────────\n` +
        `⌬ 𝖡𝖤𝖳 : ${stylize(formatMoney(bet))}\n` +
        `⌬ 𝖶𝖨𝖭 : ${stylize(profitDisplay)}\n` +
        `⌬ 𝖡𝖠𝖫 : ${stylize(formatMoney(finalBalance))}`;

      await api.editMessage(ui, msgInstance.messageID, threadID);
    }
  }
};
