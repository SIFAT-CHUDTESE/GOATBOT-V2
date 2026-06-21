const axios = require("axios");
const moment = require("moment-timezone");

function toC(F) { return Math.floor((F - 32) / 1.8); }
function fmtHour(h) { return moment(h).tz("Asia/Ho_Chi_Minh").format("HH:mm"); }

function uvIndex(val) {
	if (val <= 2) return `${val} (ʟᴏᴡ)`;
	if (val <= 5) return `${val} (ᴍᴏᴅ)`;
	if (val <= 7) return `${val} (ʜɪɢʜ)`;
	if (val <= 10) return `${val} (ᴠ.ʜɪɢʜ)`;
	return `${val} (ᴇxᴛʀᴇᴍᴇ)`;
}

module.exports = {
	config: {
		name: "weather",
		version: "2.0.0",
		author: "SIFAT",
		countDown: 5,
		role: 0,
		description: { en: "ᴡᴇᴀᴛʜᴇʀ ꜰᴏʀᴇᴄᴀꜱᴛ" },
		category: "utility",
		guide: { en: "{pn} <ʟᴏᴄᴀᴛɪᴏɴ>" },
		envGlobal: { weatherApiKey: "d7e795ae6a0d44aaa8abb1a0a7ac19e4" }
	},

	langs: {
		en: {
			syntaxError: "⌀ ᴘʟᴇᴀꜱᴇ ᴇɴᴛᴇʀ ᴀ ʟᴏᴄᴀᴛɪᴏɴ",
			notFound:    "⌀ ʟᴏᴄᴀᴛɪᴏɴ ɴᴏᴛ ꜰᴏᴜɴᴅ: %1",
			error:       "⌀ ᴇʀʀᴏʀ: %1"
		}
	},

	onStart: async function ({ args, message, envGlobal, getLang }) {
		const apikey = envGlobal.weatherApiKey;
		const area = args.join(" ");
		if (!area) return message.reply(getLang("syntaxError"));
		let areaKey, dataWeather, areaName, countryCode;

		try {
			const response = (await axios.get(`https://api.accuweather.com/locations/v1/cities/search.json?q=${encodeURIComponent(area)}&apikey=${apikey}&language=en-us`)).data;
			if (!response.length) return message.reply(getLang("notFound", area));
			areaKey     = response[0].Key;
			areaName    = response[0].LocalizedName;
			countryCode = response[0].Country?.LocalizedName || "";
		} catch (err) {
			return message.reply(getLang("error", err.response?.data?.Message || err.message));
		}

		try {
			dataWeather = (await axios.get(`http://api.accuweather.com/forecasts/v1/daily/10day/${areaKey}?apikey=${apikey}&details=true&language=en`)).data;
		} catch (err) {
			return message.reply(getLang("error", err.response?.data?.Message || err.message));
		}

		const today = dataWeather.DailyForecasts[0];
		const uv = today.AirAndPollen?.find(a => a.Name === "UVIndex")?.Value;
		const wind = today.Day?.Wind?.Speed?.Value;
		const windDir = today.Day?.Wind?.Direction?.Localized;
		const precip = today.Day?.PrecipitationProbability;

		const next5 = dataWeather.DailyForecasts.slice(1, 6).map(d => {
			const date = moment(d.Date).format("ddd DD");
			const icon = d.Day?.HasPrecipitation ? "🌧" : "☀";
			return `◦ ${icon} ${date}: ${toC(d.Temperature.Minimum.Value)}°-${toC(d.Temperature.Maximum.Value)}°C`;
		}).join("\n");

		return message.reply(
			`◈ ʟᴏᴄᴀᴛɪᴏɴ : ${areaName}, ${countryCode}\n`
			+ `◈ ᴄᴏɴᴅɪᴛɪᴏɴ: ${dataWeather.Headline.Text}\n`
			+ "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n"
			+ `◈ ᴛᴇᴍᴘ ʟᴏᴡ : ${toC(today.Temperature.Minimum.Value)}°C\n`
			+ `◈ ᴛᴇᴍᴘ ʜɪɢʜ: ${toC(today.Temperature.Maximum.Value)}°C\n`
			+ `◈ ꜰᴇᴇʟꜱ    : ${toC(today.RealFeelTemperature.Minimum.Value)}°-${toC(today.RealFeelTemperature.Maximum.Value)}°C\n`
			+ (wind !== undefined ? `◈ ᴡɪɴᴅ     : ${wind} km/h ${windDir || ""}\n` : "")
			+ (precip !== undefined ? `◈ ʀᴀɪɴ %   : ${precip}%\n` : "")
			+ (uv !== undefined ? `◈ ᴜᴠ ɪɴᴅᴇx : ${uvIndex(uv)}\n` : "")
			+ `◈ ꜱᴜɴʀɪꜱᴇ  : ${fmtHour(today.Sun.Rise)}\n`
			+ `◈ ꜱᴜɴꜱᴇᴛ   : ${fmtHour(today.Sun.Set)}\n`
			+ `◈ ᴅᴀʏ      : ${today.Day.LongPhrase}\n`
			+ `◈ ɴɪɢʜᴛ    : ${today.Night.LongPhrase}\n`
			+ "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n"
			+ "✦ ɴᴇxᴛ 5 ᴅᴀʏꜱ:\n"
			+ next5
		);
	}
};
