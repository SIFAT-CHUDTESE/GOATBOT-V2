module.exports = {
	config: {
		name: "balance",
		aliases: ["bal"],
		version: "1.3",
		author: "SIFAT",
		countDown: 5,
		role: 0,
		description: { en: "View your wealth card." },
		category: "economy",
		guide: { en: "{pn} | {pn} @tag | {pn} [reply]" },
		envConfig: { "ACCESS_TOKEN": "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662" }
	},

	onStart: async function ({ usersData, message, event, envCommands }) {
		const { Canvas, loadImage } = require("canvas");
		const { resolve } = require("path");
		const { createWriteStream } = require("fs-extra");
		const axios = require("axios");
		const { senderID, mentions, type, messageReply } = event;

		const ACCESS_TOKEN = envCommands.balance.ACCESS_TOKEN;
		const BACKGROUND_URL = "https://i.imgur.com/4d1N3jV.jpeg";


		const formatMoney = (n) => {
			const units = [
				{ value: 1e303, symbol: "Ct" },
				{ value: 1e100, symbol: "Googol" },
				{ value: 1e93, symbol: "Tg" },
				{ value: 1e90, symbol: "NVg" },
				{ value: 1e87, symbol: "OVg" },
				{ value: 1e84, symbol: "SVg" },
				{ value: 1e81, symbol: "SxVg" },
				{ value: 1e78, symbol: "QVg" },
				{ value: 1e75, symbol: "QaVg" },
				{ value: 1e72, symbol: "TVg" },
				{ value: 1e69, symbol: "DVg" },
				{ value: 1e66, symbol: "UVg" },
				{ value: 1e63, symbol: "V" },
				{ value: 1e60, symbol: "ND" },
				{ value: 1e57, symbol: "OD" },
				{ value: 1e54, symbol: "SD" },
				{ value: 1e51, symbol: "SxD" },
				{ value: 1e48, symbol: "QD" },
				{ value: 1e45, symbol: "QaD" },
				{ value: 1e42, symbol: "TD" },
				{ value: 1e39, symbol: "DD" },
				{ value: 1e36, symbol: "UD" },
				{ value: 1e33, symbol: "Dc" },
				{ value: 1e30, symbol: "No" },
				{ value: 1e27, symbol: "Oc" },
				{ value: 1e24, symbol: "Sp" },
				{ value: 1e21, symbol: "Sx" },
				{ value: 1e18, symbol: "Qa" },
				{ value: 1e15, symbol: "Q" },
				{ value: 1e12, symbol: "T" },
				{ value: 1e9, symbol: "B" },
				{ value: 1e6, symbol: "M" },
				{ value: 1e3, symbol: "K" }
			];

			for (let u of units) {
				if (n >= u.value) {
					return (n / u.value).toFixed(2) + u.symbol;
				}
			}
			return n.toLocaleString();
		};

		const allUsers = await usersData.getAll();
		let combinedData = allUsers.map(user => ({
			uid: user.userID,
			name: user.name || "Facebook User",
			money: user.money || 0
		})).sort((a, b) => b.money - a.money);

		combinedData.forEach((user, index) => user.rank = index + 1);


		let targetUsers = [];
		if (type === "message_reply") {
			targetUsers = [messageReply.senderID];
		} else if (Object.keys(mentions).length > 0) {
			targetUsers = Object.keys(mentions);
		} else {
			targetUsers = [senderID];
		}

		for (const uid of targetUsers) {
			const user = combinedData.find(u => u.uid == uid) || { uid, name: "Unknown", money: 0, rank: "N/A" };
			const canvas = new Canvas(800, 600);
			const ctx = canvas.getContext('2d');

			try {
				const bg = await loadImage(BACKGROUND_URL);
				ctx.drawImage(bg, 0, 0, 800, 600);
			} catch(e) {
				ctx.fillStyle = "#1a1a1a"; ctx.fillRect(0,0,800,600);
			}

			ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
			ctx.fillRect(0, 0, 800, 600);

			ctx.font = 'bold 40px Arial'; ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center';
			ctx.fillText("WEALTH CARD", 400, 60);


			try {
				const avatarRes = await axios.get(`https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=${ACCESS_TOKEN}`, { responseType: 'arraybuffer' });
				const avatar = await loadImage(avatarRes.data);
				ctx.save(); ctx.beginPath(); ctx.arc(150, 200, 90, 0, Math.PI * 2); ctx.clip();
				ctx.drawImage(avatar, 60, 110, 180, 180); ctx.restore();
			} catch(e) {}

			ctx.textAlign = 'left'; ctx.fillStyle = '#FFF'; ctx.font = 'bold 45px Arial';
			ctx.fillText(user.name.slice(0, 15), 270, 180);
			ctx.font = '25px Arial'; ctx.fillStyle = '#C0C0C0';
			ctx.fillText(`Ranked #${user.rank} Globally`, 270, 220);

			ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(50, 320, 700, 2);

			ctx.textAlign = 'center';
			ctx.fillStyle = '#C0C0C0'; ctx.font = 'bold 24px Arial'; ctx.fillText("STATUS", 200, 400);
			ctx.fillStyle = '#FFD700'; ctx.font = 'bold 50px Arial'; ctx.fillText(user.rank <= 10 ? "TYCOON" : "CITIZEN", 200, 470);

			ctx.fillStyle = '#C0C0C0'; ctx.font = 'bold 24px Arial'; ctx.fillText("BALANCE", 600, 400);


			const moneyText = formatMoney(user.money) + "$";
			ctx.font = moneyText.length > 10 ? 'bold 40px Arial' : 'bold 55px Arial';
			ctx.fillStyle = '#00FF00';
			ctx.fillText(moneyText, 600, 470);

			const path = resolve(__dirname, 'cache', `wealth_${uid}.png`);
			const out = createWriteStream(path);
			canvas.createPNGStream().pipe(out);
			out.on('finish', () => message.reply({ attachment: fs.createReadStream(path) }));
		}
	}
};
