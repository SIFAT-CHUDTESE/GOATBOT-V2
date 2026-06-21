"use strict";
const axios   = require("axios");
const cheerio = require("cheerio");
const fs      = require("fs-extra");
const path    = require("path");
let createCanvas, loadImage;
try { ({ createCanvas, loadImage } = require("canvas")); } catch {}

const CACHE_DIR = path.join(process.cwd(), "core/database/cache/rank");
fs.ensureDirSync(CACHE_DIR);

function getLevelInfo(exp) {
    const level              = Math.floor(Math.sqrt(exp) / 5) + 1;
    const expForCurrentLevel = Math.pow((level - 1) * 5, 2);
    const expForNextLevel    = Math.pow(level * 5, 2);
    const currentXP          = exp - expForCurrentLevel;
    const requiredXP         = expForNextLevel - expForCurrentLevel;
    const progressPercent    = Math.min(100, Math.round((currentXP / requiredXP) * 100));
    return { level, currentXP, requiredXP, progressPercent };
}

function getStatus(exp) {
    if (exp > 5000) return { label: "online", color: "#43b581" };
    if (exp > 1000) return { label: "idle",   color: "#faa61a" };
    return                  { label: "dnd",   color: "#f04747" };
}

function getTierInfo(level) {
    if (level >= 50) return { tier: "LOCURA!",  color: "#ff6b35" };
    if (level >= 30) return { tier: "DIAMOND",  color: "#00d4ff" };
    if (level >= 20) return { tier: "PLATINUM", color: "#e5e4e2" };
    if (level >= 10) return { tier: "GOLD",     color: "#ffd700" };
    if (level >= 5)  return { tier: "SILVER",   color: "#c0c0c0" };
    return                   { tier: "BRONZE",  color: "#cd7f32" };
}

function fmtXP(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}

function safeUnsend(api, mid) {
    try { api.unsendMessage(mid); } catch {}
}

function getCookieString(api) {
    try {
        if (api?.ctx?.jar) {
            const s = api.ctx.jar.getCookieStringSync("https://www.facebook.com");
            if (s?.length > 10) return s;
        }
    } catch {}
    try {
        const candidates = [
            path.join(process.cwd(), "accounts", "account1.txt"),
            path.join(process.cwd(), "accounts", "account2.txt"),
        ];
        for (const p of candidates) {
            if (!fs.existsSync(p)) continue;
            const data = JSON.parse(fs.readFileSync(p, "utf8"));
            if (!Array.isArray(data) || !data.length) continue;
            const str = data.map(c => `${c.key || c.name}=${c.value}`).join("; ");
            if (str) return str;
        }
    } catch {}
    return null;
}

async function downloadImage(url, cookieStr) {
    const headers = {
        "accept":     "image/webp,image/apng,image/*,*/*;q=0.8",
        "referer":    "https://www.facebook.com/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        ...(cookieStr ? { cookie: cookieStr } : {}),
    };
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 20000, maxRedirects: 5, headers });
    return Buffer.from(res.data);
}

async function fetchViaFCA(api, uid) {
    if (!api?.defaultFuncs?.get || !api?.ctx?.jar) return null;
    const urls = [
        `https://www.facebook.com/profile.php?id=${uid}`,
        `https://www.facebook.com/profile.php?id=${uid}&sk=about`,
    ];
    for (const url of urls) {
        try {
            const res  = await api.defaultFuncs.get(url, api.ctx.jar, null, null, {
                "accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "accept-language":           "en-US,en;q=0.9",
                "upgrade-insecure-requests": "1",
                "sec-fetch-dest":            "document",
                "sec-fetch-mode":            "navigate",
                "sec-fetch-site":            "none",
            });
            const html = typeof res === "string" ? res : res?.body || "";
            if (!html || html.length < 1000) continue;
            const found = extractCoverFromHtml(html);
            if (found?.url) return found;
        } catch {}
    }
    return null;
}

async function fetchViaGraphQL(api, uid) {
    if (!api?.defaultFuncs?.post || !api?.ctx?.jar || !api?.ctx?.fb_dtsg) return null;
    const ctx     = api.ctx;
    const queries = [
        { docId: "6210562829060700", friendlyName: "ProfileCometRouteQuery",      variables: { userID: String(uid), scale: 1 } },
        { docId: "5310186665765099", friendlyName: "CometUserProfileHeaderQuery", variables: { userID: String(uid), scale: 1, shouldDeferMainStories: false } },
    ];
    for (const q of queries) {
        try {
            const form = {
                av:                       String(ctx.userID || ""),
                __user:                   String(ctx.userID || ""),
                __a:                      "1",
                fb_dtsg:                  ctx.fb_dtsg,
                jazoest:                  ctx.jazoest || "",
                lsd:                      ctx.lsd     || "",
                fb_api_caller_class:      "RelayModern",
                fb_api_req_friendly_name: q.friendlyName,
                variables:                JSON.stringify(q.variables),
                doc_id:                   q.docId,
                server_timestamps:        "true",
            };
            const raw  = await api.defaultFuncs.post("https://www.facebook.com/api/graphql/", ctx.jar, form);
            const text = typeof raw === "string" ? raw : JSON.stringify(raw);
            const url  = extractCoverFromJsonText(text);
            if (url) return url;
        } catch {}
    }
    return null;
}

async function fetchViaMbasic(uid, cookieStr) {
    const UA      = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
    const headers = {
        cookie:                      cookieStr,
        "user-agent":                UA,
        "accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "accept-language":           "en-US,en;q=0.9",
        "upgrade-insecure-requests": "1",
        "sec-fetch-dest":            "document",
        "sec-fetch-mode":            "navigate",
        "sec-fetch-site":            "none",
    };
    for (const url of [
        `https://www.facebook.com/profile.php?id=${uid}`,
        `https://www.facebook.com/profile.php?id=${uid}&sk=about`,
    ]) {
        try {
            const res = await axios.get(url, { headers, timeout: 20000, maxRedirects: 5 });
            if (res.status === 200 && res.data?.length > 5000) {
                const found = extractCoverFromHtml(res.data);
                if (found?.url) return found.url;
            }
        } catch {}
    }
    try {
        const mHeaders = { ...headers, "user-agent": "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36" };
        const res      = await axios.get(`https://mbasic.facebook.com/profile.php?id=${uid}`, {
            headers: mHeaders, timeout: 15000, maxRedirects: 10,
        });
        return extractCoverFromHtml(res.data || "")?.url || null;
    } catch { return null; }
}

async function fetchCoverAlbum(api, uid) {
    if (!api?.defaultFuncs?.get || !api?.ctx?.jar) return null;
    try {
        const res = await api.defaultFuncs.get(
            `https://mbasic.facebook.com/media/albums/?id=${uid}`,
            api.ctx.jar, null, null, {
                "accept":          "text/html,application/xhtml+xml",
                "accept-language": "en-US,en;q=0.9",
                "user-agent":      "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36",
            }
        );
        const html       = typeof res === "string" ? res : res?.body || "";
        if (!html) return null;
        const albumMatch = html.match(/href="([^"]*cover[^"]*album[^"]*|[^"]*album[^"]*cover[^"]*)"/i);
        if (!albumMatch) return null;
        const albumUrl   = "https://mbasic.facebook.com" + albumMatch[1].replace(/&amp;/g, "&");
        const res2       = await api.defaultFuncs.get(albumUrl, api.ctx.jar);
        const html2      = typeof res2 === "string" ? res2 : res2?.body || "";
        return extractCoverFromHtml(html2)?.url || null;
    } catch { return null; }
}

function extractCoverFromHtml(html) {
    if (!html) return null;
    let name = null;
    const nameMatch = html.match(/"name"\s*:\s*"([^"]{2,60})"/);
    if (nameMatch) name = nameMatch[1];

    const r1 = extractCoverFromJsonText(html);
    if (r1) return { url: r1, name };

    try {
        const $        = cheerio.load(html);
        const coverImg = $('img[data-imgperflogname="profileCoverPhoto"]').first();
        if (coverImg.length) {
            const src = coverImg.attr("src");
            if (src && src.startsWith("http")) return { url: src.replace(/&amp;/g, "&"), name };
        }
        const containerImg = $("#profile_cover_photo_container img").first();
        if (containerImg.length) {
            const src = containerImg.attr("src");
            if (src && src.startsWith("http")) return { url: src.replace(/&amp;/g, "&"), name };
        }
    } catch {}

    const tagMatch = /<img[^>]*data-imgperflogname="profileCoverPhoto"[^>]*>/i.exec(html);
    if (tagMatch) {
        const srcInTag = /src="([^"]+)"/.exec(tagMatch[0]);
        if (srcInTag) return { url: srcInTag[1].replace(/&amp;/g, "&"), name };
    }

    const boxMatch = html.match(/id="profile_cover_photo_container"[^>]*>[\s\S]{0,500}?<img[^>]+src="([^"]+)"/);
    if (boxMatch) return { url: boxMatch[1].replace(/&amp;/g, "&"), name };

    const linkRe = /https:\/\/(?:scontent|lookaside)\.[^"'<>\s]+/g;
    const found  = [];
    let m;
    while ((m = linkRe.exec(html)) !== null) {
        const u = m[0].replace(/&amp;/g, "&");
        if (!u.includes("s160x160") && !u.includes("s40x40") && !u.includes("cp0_dst-jpg"))
            found.push(u);
    }
    const bySid = found.find(u => u.includes("_nc_sid=cc71e4"));
    if (bySid) return { url: bySid, name };
    const big   = found.find(u => u.includes("_s720x720") || u.includes("1500x") || u.includes("t39.30808"));
    if (big) return { url: big, name };
    if (found[0]) return { url: found[0], name };

    return null;
}

function extractCoverFromJsonText(text) {
    if (!text) return null;
    const patterns = [
        /"coverPhoto"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/,
        /"cover_photo"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/,
        /"cover"\s*:\s*\{[^}]*"source"\s*:\s*"([^"]+)"/,
        /"cover"\s*:\s*\{"uri"\s*:\s*"([^"]+)"/,
        /"cover_image"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/,
        /"CoverPhoto"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/,
        /"full_screen_image"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/,
        /"coverPhoto"\s*:\s*"(https:[^"]+)"/,
    ];
    for (const re of patterns) {
        const m = re.exec(text);
        if (m) {
            return m[1]
                .replace(/\\u0026/g, "&")
                .replace(/\\u002F/g, "/")
                .replace(/\\\//g, "/")
                .replace(/\\/g, "")
                .trim();
        }
    }
    return null;
}

async function buildRankCardCanvas({ coverBuffer, ppBuffer, username, currentXP, requiredXP, progressPercent, level, rank, tierInfo, status }) {
    if (!createCanvas || !loadImage) return null;
    const W = 934, H = 282;
    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext("2d");

    ctx.save();
    const r = 20;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(W - r, 0);
    ctx.quadraticCurveTo(W, 0, W, r);
    ctx.lineTo(W, H - r);
    ctx.quadraticCurveTo(W, H, W - r, H);
    ctx.lineTo(r, H);
    ctx.quadraticCurveTo(0, H, 0, H - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.clip();

    if (coverBuffer) {
        try {
            const bg    = await loadImage(coverBuffer);
            const scale = Math.max(W / bg.width, H / bg.height);
            const bw    = bg.width  * scale;
            const bh    = bg.height * scale;
            const bx    = (W - bw) / 2;
            const by    = (H - bh) / 2;
            ctx.drawImage(bg, bx, by, bw, bh);
            ctx.fillStyle = "rgba(10,12,30,0.68)";
            ctx.fillRect(0, 0, W, H);
        } catch {
            ctx.fillStyle = "#1a1c2e";
            ctx.fillRect(0, 0, W, H);
        }
    } else {
        ctx.fillStyle = "#1a1c2e";
        ctx.fillRect(0, 0, W, H);
    }

    ctx.strokeStyle = tierInfo.color;
    ctx.lineWidth   = 4;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(W - r, 0);
    ctx.quadraticCurveTo(W, 0, W, r);
    ctx.lineTo(W, H - r);
    ctx.quadraticCurveTo(W, H, W - r, H);
    ctx.lineTo(r, H);
    ctx.quadraticCurveTo(0, H, 0, H - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    const avatarX = 50, avatarY = H / 2, avatarR = 90;

    ctx.save();
    ctx.shadowColor = tierInfo.color;
    ctx.shadowBlur  = 18;
    ctx.beginPath();
    ctx.arc(avatarX + avatarR, avatarY, avatarR + 4, 0, Math.PI * 2);
    ctx.strokeStyle = tierInfo.color;
    ctx.lineWidth   = 5;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarR, avatarY, avatarR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (ppBuffer) {
        try {
            const avatar = await loadImage(ppBuffer);
            ctx.drawImage(avatar, avatarX, avatarY - avatarR, avatarR * 2, avatarR * 2);
        } catch {
            ctx.fillStyle = "#2c2f48";
            ctx.fillRect(avatarX, avatarY - avatarR, avatarR * 2, avatarR * 2);
        }
    } else {
        ctx.fillStyle = "#2c2f48";
        ctx.fillRect(avatarX, avatarY - avatarR, avatarR * 2, avatarR * 2);
    }
    ctx.restore();

    const statusR = 16;
    const statusX = avatarX + avatarR * 2 - statusR + 6;
    const statusY = avatarY + avatarR - statusR + 6;
    ctx.save();
    ctx.beginPath();
    ctx.arc(statusX, statusY, statusR + 3, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1c2e";
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(statusX, statusY, statusR, 0, Math.PI * 2);
    ctx.fillStyle = status.color;
    ctx.fill();

    const textX = avatarX + avatarR * 2 + 28;

    ctx.font      = "bold 38px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(username.length > 18 ? username.slice(0, 17) + "…" : username, textX, avatarY - 44);

    ctx.font      = "22px sans-serif";
    ctx.fillStyle = "#b0b3c6";
    ctx.fillText(`${fmtXP(currentXP)} / ${fmtXP(requiredXP)} XP`, textX, avatarY - 14);

    const barX    = textX, barY = avatarY + 10, barW = W - textX - 40, barH = 18;
    const barFill = Math.max(0, Math.min(barW, Math.round(barW * progressPercent / 100)));

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, barH / 2);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fill();
    ctx.restore();

    if (barFill > 0) {
        const grad = ctx.createLinearGradient(barX, 0, barX + barFill, 0);
        grad.addColorStop(0, tierInfo.color);
        grad.addColorStop(1, "#ffffff44");
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(barX, barY, barFill, barH, barH / 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
    }

    const botY = avatarY + 52;

    ctx.font      = "bold 22px sans-serif";
    ctx.fillStyle = "#ffd700";
    ctx.fillText(`RANK #${rank}`, textX, botY);

    ctx.font      = "bold 22px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Lvl ${level}`, textX + 120, botY);

    ctx.font      = "bold 22px sans-serif";
    ctx.fillStyle = tierInfo.color;
    ctx.fillText(tierInfo.tier, textX + 220, botY);

    ctx.restore();

    return canvas.toBuffer("image/png");
}

module.exports = {
    config: {
        name:        "rank",
        aliases:     ["level", "xp", "score"],
        version:     "5.0.0",
        author:      "SIFAT",
        category:    "rank",
        role:        0,
        countDown:   5,
        description: { en: "Rank card — cover photo as background, profile picture as avatar" },
        guide:       { en: "{pn} [@mention | uid]  •  reply then use {pn}" },
    },

    onRun: async ({ args, ctx }) => {
        const { reply, event, api, usersData } = ctx;

        let uid;
        if (Object.keys(event.mentions || {}).length)
            uid = Object.keys(event.mentions)[0];
        else if (args[0] && /^\d{5,}$/.test(args[0]))
            uid = args[0];
        else if (event.type === "message_reply" && event.messageReply?.senderID)
            uid = event.messageReply.senderID;
        else
            uid = event.senderID;

        const wait = await reply("ɢᴇɴᴇʀᴀᴛɪɴɢ ʀᴀɴᴋ ᴄᴀʀᴅ..!¡");

        try {
            const userData   = await usersData.get(uid);
            const allUsers   = await usersData.getAll();
            const username   = userData?.name || "Unknown User";
            const exp        = userData?.exp  || 0;
            const sorted     = [...allUsers].sort((a, b) => (b.exp || 0) - (a.exp || 0));
            const rank       = sorted.findIndex(u => String(u.userID) === String(uid)) + 1;

            const { level, currentXP, requiredXP, progressPercent } = getLevelInfo(exp);
            const status    = getStatus(exp);
            const tierInfo  = getTierInfo(level);
            const cookieStr = getCookieString(api);

            let coverUrl = null;
            let fbName   = "";

            try {
                const result = await fetchViaFCA(api, uid);
                coverUrl = result?.url || null;
                if (result?.name) fbName = result.name;
            } catch {}
            if (!coverUrl) {
                try { coverUrl = await fetchViaGraphQL(api, uid); } catch {}
            }
            if (!coverUrl && cookieStr) {
                try { coverUrl = await fetchViaMbasic(uid, cookieStr); } catch {}
            }
            if (!coverUrl) {
                try { coverUrl = await fetchCoverAlbum(api, uid); } catch {}
            }

            const profilePicUrl = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

            let coverBuffer = null;
            let ppBuffer    = null;

            if (coverUrl) {
                [coverBuffer, ppBuffer] = await Promise.all([
                    downloadImage(coverUrl,      cookieStr).catch(() => null),
                    downloadImage(profilePicUrl, cookieStr).catch(() => null),
                ]);
            } else {
                ppBuffer = await downloadImage(profilePicUrl, cookieStr).catch(() => null);
            }

            const cardBuffer = await buildRankCardCanvas({
                coverBuffer,
                ppBuffer,
                username: fbName || username,
                currentXP,
                requiredXP,
                progressPercent,
                level,
                rank,
                tierInfo,
                status,
            }).catch(() => null);

            if (wait?.messageID) safeUnsend(api, wait.messageID);

            if (!cardBuffer) {
                return reply("❌ canvas module ni 🦖");
            }

            const rankFile = path.join(CACHE_DIR, `rank_${uid}_${Date.now()}.png`);
            await fs.writeFile(rankFile, cardBuffer);

            await reply({ body: "", attachment: fs.createReadStream(rankFile) });

            setTimeout(() => fs.remove(rankFile).catch(() => {}), 60_000);

        } catch (e) {
            if (wait?.messageID) safeUnsend(api, wait.messageID);
            return reply(`❌ ${e.message || "Could not generate rank card."}`);
        }
    },

    onStart: async function ({ event, usersData, message, api }) {
        return module.exports.onRun({
            args: [],
            ctx:  { reply: message.reply.bind(message), event, api, usersData },
        });
    },
};
