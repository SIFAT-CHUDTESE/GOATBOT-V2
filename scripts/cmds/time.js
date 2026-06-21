"use strict";

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { Canvas, registerFont } = require("canvas");
const GIFEncoder = require("gifencoder");
const moment = require("moment-timezone");

const CACHE_DIR = path.resolve(__dirname, "cache");
const FONT_DIR  = path.resolve(__dirname, "cache", "fonts");

fs.ensureDirSync(CACHE_DIR);
fs.ensureDirSync(FONT_DIR);

const COUNTRY_TZ = {
    bangladesh: "Asia/Dhaka",       bd: "Asia/Dhaka",
    india: "Asia/Kolkata",          in: "Asia/Kolkata",
    pakistan: "Asia/Karachi",       pk: "Asia/Karachi",
    nepal: "Asia/Kathmandu",        np: "Asia/Kathmandu",
    srilanka: "Asia/Colombo",       lk: "Asia/Colombo",
    myanmar: "Asia/Rangoon",        mm: "Asia/Rangoon",
    thailand: "Asia/Bangkok",       th: "Asia/Bangkok",
    vietnam: "Asia/Ho_Chi_Minh",    vn: "Asia/Ho_Chi_Minh",
    malaysia: "Asia/Kuala_Lumpur",  my: "Asia/Kuala_Lumpur",
    singapore: "Asia/Singapore",    sg: "Asia/Singapore",
    indonesia: "Asia/Jakarta",      id: "Asia/Jakarta",
    philippines: "Asia/Manila",     ph: "Asia/Manila",
    japan: "Asia/Tokyo",            jp: "Asia/Tokyo",
    korea: "Asia/Seoul",            kr: "Asia/Seoul",
    china: "Asia/Shanghai",         cn: "Asia/Shanghai",
    hongkong: "Asia/Hong_Kong",     hk: "Asia/Hong_Kong",
    taiwan: "Asia/Taipei",          tw: "Asia/Taipei",
    uae: "Asia/Dubai",              dubai: "Asia/Dubai",
    saudi: "Asia/Riyadh",           ksa: "Asia/Riyadh",
    qatar: "Asia/Qatar",            qtr: "Asia/Qatar",
    kuwait: "Asia/Kuwait",
    oman: "Asia/Muscat",
    iraq: "Asia/Baghdad",
    iran: "Asia/Tehran",
    israel: "Asia/Jerusalem",
    turkey: "Europe/Istanbul",
    russia: "Europe/Moscow",
    ukraine: "Europe/Kiev",
    germany: "Europe/Berlin",
    france: "Europe/Paris",
    spain: "Europe/Madrid",
    italy: "Europe/Rome",
    uk: "Europe/London",            england: "Europe/London",
    netherlands: "Europe/Amsterdam",
    sweden: "Europe/Stockholm",
    norway: "Europe/Oslo",
    denmark: "Europe/Copenhagen",
    finland: "Europe/Helsinki",
    poland: "Europe/Warsaw",
    greece: "Europe/Athens",
    portugal: "Europe/Lisbon",
    switzerland: "Europe/Zurich",
    austria: "Europe/Vienna",
    usa: "America/New_York",        us: "America/New_York",
    canada: "America/Toronto",
    mexico: "America/Mexico_City",
    brazil: "America/Sao_Paulo",
    argentina: "America/Argentina/Buenos_Aires",
    chile: "America/Santiago",
    colombia: "America/Bogota",
    peru: "America/Lima",
    venezuela: "America/Caracas",
    egypt: "Africa/Cairo",
    nigeria: "Africa/Lagos",
    kenya: "Africa/Nairobi",
    ghana: "Africa/Accra",
    southafrica: "Africa/Johannesburg",
    ethiopia: "Africa/Addis_Ababa",
    australia: "Australia/Sydney",  au: "Australia/Sydney",
    newzealand: "Pacific/Auckland",
    "los angeles": "America/Los_Angeles",
    "new york": "America/New_York",
    chicago: "America/Chicago",
    london: "Europe/London",
    paris: "Europe/Paris",
    berlin: "Europe/Berlin",
    tokyo: "Asia/Tokyo",
    beijing: "Asia/Shanghai",
    moscow: "Europe/Moscow",
    sydney: "Australia/Sydney",
    jakarta: "Asia/Jakarta",
    bangkok: "Asia/Bangkok",
    seoul: "Asia/Seoul",
    istanbul: "Europe/Istanbul",
    mumbai: "Asia/Kolkata",
    dhaka: "Asia/Dhaka",
    karachi: "Asia/Karachi",
    lahore: "Asia/Karachi",
    cairo: "Africa/Cairo",
};

const WEATHER_ICONS = {
    Sunny:          { icon: "☀️", color: "#FFD700" },
    Clear:          { icon: "🌙", color: "#B0C4DE" },
    "Partly cloudy": { icon: "⛅", color: "#87CEEB" },
    Cloudy:         { icon: "☁️", color: "#778899" },
    Overcast:       { icon: "🌥️", color: "#696969" },
    Mist:           { icon: "🌫️", color: "#B0C4DE" },
    Rain:           { icon: "🌧️", color: "#4169E1" },
    Drizzle:        { icon: "🌦️", color: "#6495ED" },
    Thunderstorm:   { icon: "⛈️", color: "#8B0000" },
    Snow:           { icon: "❄️", color: "#ADD8E6" },
    Fog:            { icon: "🌁", color: "#A9A9A9" },
    Blizzard:       { icon: "🌨️", color: "#E0E8FF" },
    default:        { icon: "🌡️", color: "#FF7F50" },
};

function getWeatherIcon(desc) {
    for (const [k, v] of Object.entries(WEATHER_ICONS)) {
        if (desc?.toLowerCase().includes(k.toLowerCase())) return v;
    }
    return WEATHER_ICONS.default;
}

async function fetchWeather(tz) {
    try {
        const cityMap = {
            "Asia/Dhaka": "Dhaka", "Asia/Kolkata": "Mumbai", "Asia/Karachi": "Karachi",
            "Asia/Tokyo": "Tokyo", "Asia/Shanghai": "Beijing", "America/New_York": "New York",
            "Europe/London": "London", "Europe/Paris": "Paris", "Europe/Berlin": "Berlin",
            "Australia/Sydney": "Sydney", "Asia/Dubai": "Dubai", "Asia/Bangkok": "Bangkok",
            "Asia/Seoul": "Seoul", "Asia/Singapore": "Singapore", "Asia/Riyadh": "Riyadh",
            "Asia/Kathmandu": "Kathmandu", "Asia/Colombo": "Colombo", "Asia/Rangoon": "Yangon",
        };
        const city = cityMap[tz] || tz.split("/").pop().replace("_", "+");
        const res = await axios.get(`https://wttr.in/${city}?format=j1`, { timeout: 6000 });
        const cur = res.data.current_condition[0];
        return {
            tempC: cur.temp_C,
            tempF: cur.temp_F,
            humidity: cur.humidity,
            desc: cur.weatherDesc[0].value,
            feelsLike: cur.FeelsLikeC,
            wind: cur.windspeedKmph,
        };
    } catch {
        return null;
    }
}

function spawnStars(count, W, H) {
    return Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.4 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        speed: 0.05 + Math.random() * 0.09,
    }));
}
function spawnComets(W) {
    return Array.from({ length: 3 }, (_, i) => ({
        x: Math.random() * W,
        y: 20 + Math.random() * 100,
        len: 50 + Math.random() * 70,
        speed: 2.5 + Math.random() * 3.5,
        offset: i * 16,
    }));
}

function drawHex(ctx, W, H, rgb, alpha) {
    const sz = 22;
    ctx.strokeStyle = `rgba(${rgb},${alpha})`;
    ctx.lineWidth = 0.5;
    for (let row = -1; row < H / (sz * 1.5) + 2; row++) {
        for (let col = -1; col < W / (sz * 1.73) + 2; col++) {
            const ox = row % 2 === 0 ? 0 : sz * 0.866;
            const hx = col * sz * 1.73 + ox;
            const hy = row * sz * 1.5;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i + Math.PI / 6;
                i === 0
                    ? ctx.moveTo(hx + sz * Math.cos(a), hy + sz * Math.sin(a))
                    : ctx.lineTo(hx + sz * Math.cos(a), hy + sz * Math.sin(a));
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
}

function drawCorners(ctx, W, H, color, sz = 28) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    [
        [12, 12, 1, 1], [W - 12 - sz, 12, -1, 1],
        [12, H - 12 - sz, 1, -1], [W - 12 - sz, H - 12 - sz, -1, -1],
    ].forEach(([bx, by, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(bx, by + sz * dy);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + sz * dx, by);
        ctx.stroke();
    });
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawAnalogClock(ctx, cx, cy, radius, m, accentColor, rgb, f) {
    const h   = m.hours() % 12;
    const min = m.minutes();
    const sec = m.seconds();

    const secAngle  = (sec / 60) * Math.PI * 2 - Math.PI / 2;
    const minAngle  = (min / 60 + sec / 3600) * Math.PI * 2 - Math.PI / 2;
    const hourAngle = (h / 12 + min / 720) * Math.PI * 2 - Math.PI / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rgb},${0.5 + 0.45 * Math.sin(f * 0.35)})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 18 + 10 * Math.sin(f * 0.35);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fill();
    ctx.strokeStyle = `rgba(${rgb},0.4)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let i = 0; i < 60; i++) {
        const angle   = (i / 60) * Math.PI * 2;
        const isMajor = i % 5 === 0;
        const len     = isMajor ? 12 : 5;
        const inner   = radius - len;
        ctx.beginPath();
        ctx.moveTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle));
        ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        ctx.strokeStyle = isMajor ? accentColor : `rgba(${rgb},0.3)`;
        ctx.lineWidth   = isMajor ? 2 : 0.8;
        ctx.stroke();
        if (isMajor) {
            const num = i / 5 === 0 ? 12 : i / 5;
            ctx.fillStyle       = "rgba(255,255,255,0.6)";
            ctx.font            = "bold 13px NotoSans, sans-serif";
            ctx.textAlign       = "center";
            ctx.textBaseline    = "middle";
            ctx.fillText(String(num), cx + (radius - 26) * Math.cos(angle), cy + (radius - 26) * Math.sin(angle));
        }
    }

    const drawHand = (angle, len, width, color) => {
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(angle) * len * 0.2, cy - Math.sin(angle) * len * 0.2);
        ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
        ctx.strokeStyle = color;
        ctx.lineWidth   = width;
        ctx.lineCap     = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur  = 8;
        ctx.stroke();
        ctx.shadowBlur  = 0;
    };

    drawHand(hourAngle,  radius * 0.55, 6, "#ffffff");
    drawHand(minAngle,   radius * 0.75, 4, "#e0e0e0");
    drawHand(secAngle,   radius * 0.88, 2, accentColor);

    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fillStyle   = accentColor;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur  = 12;
    ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.restore();
}

async function buildTimeGIF(timeInfo, outPath) {
    const W = 860, H = 520;
    const { m, tz, country, weather, accentColor, rgb } = timeInfo;

    const encoder = new GIFEncoder(W, H);
    const gifOut  = fs.createWriteStream(outPath);
    encoder.createReadStream().pipe(gifOut);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(80);
    encoder.setQuality(8);

    const canvas  = new Canvas(W, H);
    const ctx     = canvas.getContext("2d");
    const FRAMES  = 52;
    const stars   = spawnStars(65, W, H);
    const comets  = spawnComets(W);

    for (let f = 0; f < FRAMES; f++) {
        const pulse = Math.sin(f * 0.28);
        const slow  = Math.sin(f * 0.14);

        ctx.clearRect(0, 0, W, H);

        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, "#030710");
        bg.addColorStop(0.5, "#07101c");
        bg.addColorStop(1, "#030710");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        const rg = ctx.createRadialGradient(W * 0.72, H / 2, 0, W * 0.72, H / 2, W * 0.6);
        rg.addColorStop(0, `rgba(${rgb},0.09)`);
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);

        drawHex(ctx, W, H, rgb, 0.05);

        for (let y = 0; y < H; y += 8) {
            ctx.fillStyle = `rgba(0,0,0,0.03)`;
            ctx.fillRect(0, y, W, 3.5);
        }

        for (const s of stars) {
            const a = 0.08 + 0.22 * Math.abs(Math.sin(s.phase + f * s.speed));
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${rgb},${a})`;
            ctx.fill();
        }

        for (const c of comets) {
            const cx = ((c.x + (f + c.offset) * c.speed) % (W + c.len)) - c.len;
            const cGrad = ctx.createLinearGradient(cx, c.y, cx + c.len, c.y);
            cGrad.addColorStop(0, "rgba(255,255,255,0)");
            cGrad.addColorStop(1, `rgba(${rgb},0.5)`);
            ctx.fillStyle = cGrad;
            ctx.fillRect(cx, c.y - 1, c.len, 2);
        }

        const scanY = ((f / FRAMES) * 1400) % H;
        const sg = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
        sg.addColorStop(0, "rgba(255,255,255,0)");
        sg.addColorStop(0.5, `rgba(${rgb},0.06)`);
        sg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = sg;
        ctx.fillRect(0, scanY - 30, W, 60);

        const mCur = m.clone().add(f * 2, "seconds");
        drawAnalogClock(ctx, 200, H / 2 + 10, 145, mCur, accentColor, rgb, f);

        const divX = 380;
        const divA = 0.22 + 0.16 * Math.abs(pulse);
        ctx.strokeStyle = `rgba(${rgb},${divA})`;
        ctx.lineWidth   = 1;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur  = 8 * Math.abs(pulse);
        ctx.beginPath();
        ctx.moveTo(divX, 40);
        ctx.lineTo(divX, H - 40);
        ctx.stroke();
        ctx.shadowBlur = 0;

        const tx = 450;
        ctx.textAlign = "left";

        ctx.font      = "bold 20px NotoSans, sans-serif";
        ctx.fillStyle = `rgba(${rgb},${0.65 + 0.3 * Math.abs(slow)})`;
        ctx.fillText("⏰  ᴄ ᴜ ʀ ʀ ᴇ ɴ ᴛ   ᴛ ɪ ᴍ ᴇ", tx, 55);

        ctx.font        = "bold 60px NotoSans, sans-serif";
        ctx.fillStyle   = accentColor;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur  = 24 + 14 * Math.abs(pulse);
        ctx.fillText(mCur.format("HH : mm : ss"), tx, 123);
        ctx.shadowBlur  = 0;

        ctx.fillStyle = `rgba(${rgb},0.28)`;
        ctx.fillRect(tx, 127, W - tx - 36, 1.5);

        ctx.font        = "bold 25px NotoSans, sans-serif";
        ctx.fillStyle   = "#ffffff";
        ctx.shadowColor = accentColor;
        ctx.shadowBlur  = 6 + 4 * Math.abs(slow);
        ctx.fillText(mCur.format("dddd"), tx, 158);
        ctx.shadowBlur  = 0;

        ctx.font      = "bold 18px NotoSans, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.52)";
        ctx.fillText(mCur.format("DD MMMM YYYY"), tx, 185);

        ctx.strokeStyle = `rgba(${rgb},0.2)`;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(tx, 200);
        ctx.lineTo(W - 36, 200);
        ctx.stroke();

        ctx.font      = "15px NotoSans, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.38)";
        ctx.fillText(`🌐  ${tz.split("/").pop().replace(/_/g, " ")}   (UTC${mCur.format("Z")})`, tx, 225);

        ctx.strokeStyle = `rgba(${rgb},0.13)`;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(tx, 240);
        ctx.lineTo(W - 36, 240);
        ctx.stroke();

        if (weather) {
            const wIcon = getWeatherIcon(weather.desc);
            const rows  = [
                { icon: wIcon.icon, label: "ᴡᴇᴀᴛʜᴇʀ",   value: weather.desc || "N/A" },
                { icon: "🌡️",       label: "ᴛᴇᴍᴘ",       value: `${weather.tempC}°C  /  ${weather.tempF}°F` },
                { icon: "🤔",       label: "ꜰᴇᴇʟꜱ",      value: `${weather.feelsLike}°C` },
                { icon: "💧",       label: "ʜᴜᴍɪᴅɪᴛʏ",   value: `${weather.humidity}%` },
                { icon: "💨",       label: "ᴡɪɴᴅ",       value: `${weather.wind} ᴋᴍ/ʜ` },
            ];
            let ry = 272;
            for (const row of rows) {
                ctx.font        = "bold 18px NotoSans, sans-serif";
                ctx.fillStyle   = `rgba(${rgb},${0.8 + 0.18 * Math.abs(pulse)})`;
                ctx.fillText(`${row.icon}  ${row.label}`, tx, ry);
                ctx.fillStyle   = "rgba(255,255,255,0.85)";
                ctx.fillText(row.value, tx + 170, ry);
                ry += 34;
            }
        } else {
            const rows = [
                { l: "📅  ᴅᴀʏ ᴏꜰ ʏᴇᴀʀ",  v: `ᴅᴀʏ ${mCur.dayOfYear()} ᴏꜰ 365` },
                { l: "📆  ᴡᴇᴇᴋ ɴᴜᴍ",     v: `ᴡᴇᴇᴋ ${mCur.isoWeek()}` },
                { l: "📊  ᴅᴀʏꜱ ɪɴ ᴍᴏɴᴛʜ",v: `${mCur.daysInMonth()} ᴅᴀʏꜱ` },
                { l: "🕰️  ᴜɴɪx ᴛɪᴍᴇ",    v: String(mCur.unix()) },
            ];
            let ry = 275;
            for (const row of rows) {
                ctx.font      = "bold 18px NotoSans, sans-serif";
                ctx.fillStyle = `rgba(${rgb},${0.75 + 0.2 * Math.abs(pulse)})`;
                ctx.fillText(row.l, tx, ry);
                ctx.fillStyle = "rgba(255,255,255,0.82)";
                ctx.fillText(row.v, tx + 198, ry);
                ry += 38;
            }
        }

        ctx.font      = "13px NotoSans, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.textAlign = "center";
        ctx.fillText(`ɢᴏᴀᴛʙᴏᴛ  ◈  ${country.toUpperCase()}`, W / 2, H - 16);

        const borderPulse = 0.35 + 0.28 * Math.abs(pulse);
        ctx.strokeStyle = `rgba(${rgb},${borderPulse})`;
        ctx.lineWidth   = 2.2;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur  = 14 + 10 * Math.abs(slow);
        ctx.beginPath();
        ctx.roundRect(5, 5, W - 10, H - 10, 14);
        ctx.stroke();
        ctx.shadowBlur  = 0;

        drawCorners(ctx, W, H, accentColor);

        encoder.addFrame(ctx);
    }

    encoder.finish();
    return new Promise((res, rej) => {
        gifOut.on("finish", res);
        gifOut.on("error", rej);
    });
}

module.exports = {
    config: {
        name: "time",
        version: "1.0.0",
        author: "SIFAT",
        countDown: 5,
        role: 0,
        description: { en: "ᴀɴɪᴍᴀᴛᴇᴅ ᴄʟᴏᴄᴋ ꜱʜᴏᴡɪɴɢ ᴄᴜʀʀᴇɴᴛ ᴛɪᴍᴇ, ᴅᴀᴛᴇ & ᴡᴇᴀᴛʜᴇʀ ꜰᴏʀ ᴀɴʏ ᴄᴏᴜɴᴛʀʏ." },
        category: "info",
        guide: {
            en:
                "   {pn}               → ʙᴀɴɢʟᴀᴅᴇꜱʜ ᴇʀ ᴛɪᴍᴇ\n" +
                "   {pn} <country>     → ʏᴇᴋᴏɴᴏ ᴅᴇꜱʜᴇʀ ᴛɪᴍᴇ\n\n" +
                "   {pn} japan  |  {pn} usa  |  {pn} london",
        },
    },

    onLoad: async function () {
        const https = require("https");
        const fonts = [
            {
                file: path.join(FONT_DIR, "NotoSans-Bold.ttf"),
                url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf",
                family: "NotoSans", weight: "bold",
            },
            {
                file: path.join(FONT_DIR, "NotoSans-Regular.ttf"),
                url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf",
                family: "NotoSans", weight: "normal",
            },
        ];
        const dl = (url, dest) => new Promise((res, rej) => {
            const file = fs.createWriteStream(dest);
            const req = (u) => {
                https.get(u, (r) => {
                    if (r.statusCode === 301 || r.statusCode === 302) return req(r.headers.location);
                    r.pipe(file);
                    file.on("finish", () => { file.close(); res(); });
                }).on("error", (e) => { try { fs.unlinkSync(dest); } catch {} rej(e); });
            };
            req(url);
        });
        for (const f of fonts) {
            try {
                if (!fs.existsSync(f.file)) await dl(f.url, f.file);
                registerFont(f.file, { family: f.family, weight: f.weight });
            } catch (e) {
                console.error("[time] font:", e.message);
            }
        }
    },

    onStart: async function ({ args, message }) {
        const query = args.join(" ").toLowerCase().trim();
        let tz      = "Asia/Dhaka";
        let country = "Bangladesh";

        if (query) {
            const found = COUNTRY_TZ[query];
            if (found) {
                tz      = found;
                country = args.join(" ");
            } else {
                const partial = Object.keys(COUNTRY_TZ).find(k => k.includes(query) || query.includes(k));
                if (partial) {
                    tz      = COUNTRY_TZ[partial];
                    country = partial;
                } else {
                    return message.reply(`❌ "${args.join(" ")}" ᴇʀ ᴛɪᴍᴇᴢᴏɴᴇ ᴋʜᴜᴊᴇ ᴘᴀᴏᴀ ʏᴀᴄᴄʜᴇ ɴᴀ।\n\nᴜᴅᴀʜᴀʀᴀɴ: .time japan | .time usa | .time india`);
                }
            }
        }

        const wait = await message.reply("⏳ ᴄᴀʟᴄᴜʟᴀᴛɪɴɢ...");

        try {
            const m = moment().tz(tz);

            const ACCENT_MAP = {
                "Asia/Dhaka":        { color: "#00FF88", rgb: "0,255,136" },
                "Asia/Kolkata":      { color: "#FF9D00", rgb: "255,157,0" },
                "Asia/Tokyo":        { color: "#FF6EFF", rgb: "255,110,255" },
                "Asia/Shanghai":     { color: "#FF4444", rgb: "255,68,68" },
                "America/New_York":  { color: "#4488FF", rgb: "68,136,255" },
                "Europe/London":     { color: "#FF6B35", rgb: "255,107,53" },
                "Europe/Paris":      { color: "#FF3D9A", rgb: "255,61,154" },
                "Europe/Berlin":     { color: "#00CFFF", rgb: "0,207,255" },
                "Australia/Sydney":  { color: "#FFD700", rgb: "255,215,0" },
                "Asia/Dubai":        { color: "#FFD700", rgb: "255,215,0" },
                "Asia/Bangkok":      { color: "#FF6B35", rgb: "255,107,53" },
                "Asia/Seoul":        { color: "#00CFFF", rgb: "0,207,255" },
                "Asia/Singapore":    { color: "#FF4ECD", rgb: "255,78,205" },
                "Asia/Riyadh":       { color: "#00FF88", rgb: "0,255,136" },
            };

            const accent  = ACCENT_MAP[tz] || { color: "#00FFFF", rgb: "0,255,255" };
            const weather = await fetchWeather(tz);

            const gifPath = path.join(CACHE_DIR, `time_${Date.now()}.gif`);
            await buildTimeGIF({ m, tz, country, weather, accentColor: accent.color, rgb: accent.rgb }, gifPath);

            try { if (wait?.messageID) message.unsend(wait.messageID); } catch {}

            await message.reply({
                body: `🕐 ${country.toUpperCase()}  •  ${m.format("HH:mm:ss")}  •  ${m.format("ddd, DD MMM YYYY")}`,
                attachment: fs.createReadStream(gifPath),
            });

            setTimeout(() => fs.unlink(gifPath).catch(() => {}), 30_000);

        } catch (err) {
            try { if (wait?.messageID) message.unsend(wait.messageID); } catch {}
            console.error("[time] error:", err);
            return message.reply("❌ ᴇʀʀᴏʀ: " + err.message);
        }
    },
};
