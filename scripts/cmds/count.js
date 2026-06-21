"use strict";

const axios   = require("axios");
const fs      = require("fs-extra");
const path    = require("path");
const moment  = require("moment-timezone");
const { Canvas, loadImage, registerFont } = require("canvas");

const TZ            = "Asia/Dhaka";
const FONT_DIR      = path.resolve(__dirname, "cache", "fonts");
const ACTIVITY_PATH = path.resolve(__dirname, "cache", "count_activity.json");
const BG_DATA_PATH  = path.resolve(__dirname, "cache", "count_bg.json");
const UA            = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";
const FNT           = "NotoSans, NotoSansBengali, NotoEmoji, sans-serif";
const FB_TOKEN      = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

const DEFAULT_BACKGROUNDS = [
    "https://d.uguu.se/rXgpjbtC.jpg",
    "https://i.imgur.com/5Bjb3Qp.jpeg",
];

const ALLOWED_BG_HOSTS = [
    "catbox.moe", "files.catbox.moe",
    "i.imgur.com", "imgur.com",
    "i.ibb.co", "ibb.co",
    "uguu.se", "d.uguu.se",
    "telegra.ph", "graph.org",
    "cdn.discordapp.com", "media.discordapp.net",
    "postimg.cc", "i.postimg.cc",
];

function readActivity()   { try { fs.ensureFileSync(ACTIVITY_PATH); return fs.readJsonSync(ACTIVITY_PATH); } catch { return {}; } }
function writeActivity(d) { try { fs.writeJsonSync(ACTIVITY_PATH, d, { spaces: 2 }); } catch {} }
function readBgData()     { try { return fs.readJsonSync(BG_DATA_PATH); } catch { return {}; } }
function writeBgData(d)   { try { fs.writeJsonSync(BG_DATA_PATH, d, { spaces: 2 }); } catch {} }

function fmtNum(n) {
    n = Number(n || 0);
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toLocaleString();
}

function fitText(ctx, txt, maxW) {
    let t = String(txt || "");
    while (t.length > 1 && ctx.measureText(t).width > maxW) t = t.slice(0, -1);
    return t.length < String(txt || "").length ? t + "…" : t;
}

const THEMES = {
    gold:    { primary: "#FFD700", rgb: "255,215,0",   accent: "#FFA500", dark: "#1a1200" },
    cyan:    { primary: "#00E5FF", rgb: "0,229,255",   accent: "#00B8D9", dark: "#001a20" },
    magenta: { primary: "#FF4ECD", rgb: "255,78,205",  accent: "#CC00AA", dark: "#1a0014" },
    green:   { primary: "#39FF14", rgb: "57,255,20",   accent: "#00CC00", dark: "#001a00" },
    fire:    { primary: "#FF6B35", rgb: "255,107,53",  accent: "#FF2200", dark: "#1a0800" },
    ice:     { primary: "#7FEFFF", rgb: "127,239,255", accent: "#00CFFF", dark: "#001520" },
    violet:  { primary: "#C77DFF", rgb: "199,125,255", accent: "#9B59B6", dark: "#0e0020" },
    rose:    { primary: "#FF6B9D", rgb: "255,107,157", accent: "#FF1493", dark: "#1a0010" },
    emerald: { primary: "#00FF88", rgb: "0,255,136",   accent: "#00CC66", dark: "#001a0d" },
    solar:   { primary: "#FFB300", rgb: "255,179,0",   accent: "#FF8F00", dark: "#1a1000" },
    neon:    { primary: "#F0FF00", rgb: "240,255,0",   accent: "#CCDD00", dark: "#141a00" },
    ocean:   { primary: "#0096FF", rgb: "0,150,255",   accent: "#0044CC", dark: "#00060e" },
};

const THEME_NAMES = Object.keys(THEMES);

function nextCountTheme(threadID, bgStore) {
    const key = `${threadID}_themeIdx`;
    const idx  = ((bgStore[key] ?? -1) + 1) % THEME_NAMES.length;
    bgStore[key] = idx;
    writeBgData(bgStore);
    return THEMES[THEME_NAMES[idx]];
}

const AVATAR_CACHE = new Map();

async function fetchImageBuffer(url) {
    const r = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 12000,
        maxRedirects: 10,
        headers: { "User-Agent": UA, "Accept": "image/webp,image/apng,image/*,*/*;q=0.8" },
    });
    const ct = r.headers["content-type"] || "";
    if (!ct.includes("image") && !ct.includes("octet-stream")) throw new Error("not-image");
    if (!r.data || r.data.byteLength < 500) throw new Error("too-small");
    return Buffer.from(r.data);
}

async function makeFallback(uid, name) {
    const c  = new Canvas(256, 256);
    const cx = c.getContext("2d");
    const COLS = ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c","#e67e22","#e91e63"];
    const i    = String(uid || "0").split("").reduce((s, ch) => s + ch.charCodeAt(0), 0) % COLS.length;
    const g    = cx.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, COLS[i]); g.addColorStop(1, COLS[(i + 3) % COLS.length]);
    cx.fillStyle = g; cx.fillRect(0, 0, 256, 256);
    cx.fillStyle = "rgba(0,0,0,0.25)"; cx.fillRect(0, 0, 256, 256);
    cx.fillStyle = "#fff"; cx.font = "bold 100px NotoSans, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText((name || "?")[0].toUpperCase(), 128, 136);
    return loadImage(c.toBuffer());
}

async function getAvatar(uid, name) {
    if (!uid) return makeFallback(uid, name);
    if (AVATAR_CACHE.has(uid)) return AVATAR_CACHE.get(uid);
    try {
        const buf = await fetchImageBuffer(
            `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${FB_TOKEN}`
        );
        const img = await loadImage(buf);
        AVATAR_CACHE.set(uid, img);
        return img;
    } catch {
        return makeFallback(uid, name);
    }
}

async function preloadAvatars(users, concurrency = 5) {
    const map = new Map();
    for (let i = 0; i < users.length; i += concurrency) {
        const batch = users.slice(i, i + concurrency);
        const res   = await Promise.allSettled(batch.map(u => getAvatar(u.uid, u.name)));
        res.forEach((r, j) => map.set(batch[j].uid, r.status === "fulfilled" ? r.value : null));
    }
    return map;
}

async function loadBgImage(url) {
    try { return await loadImage(await fetchImageBuffer(url)); } catch { return null; }
}

function clipCircle(ctx, img, x, y, r) {
    if (!img) return;
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2); ctx.restore();
}

function drawHexGrid(ctx, W, H, rgb, alpha) {
    const s = 26;
    ctx.strokeStyle = `rgba(${rgb},${alpha})`; ctx.lineWidth = 0.5;
    for (let row = -1; row < H / (s * 1.5) + 2; row++) {
        for (let col = -1; col < W / (s * 1.73) + 2; col++) {
            const ox = row % 2 ? s * 0.866 : 0;
            const hx = col * s * 1.73 + ox, hy = row * s * 1.5;
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
                const a = (Math.PI / 3) * k + Math.PI / 6;
                k === 0 ? ctx.moveTo(hx + s * Math.cos(a), hy + s * Math.sin(a))
                        : ctx.lineTo(hx + s * Math.cos(a), hy + s * Math.sin(a));
            }
            ctx.closePath(); ctx.stroke();
        }
    }
}

function drawCorners(ctx, W, H, col, sz = 34) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = "square";
    ctx.shadowColor = col; ctx.shadowBlur = 22;
    const M = 10;
    for (const [ox, oy, dx, dy] of [[M,M,1,1],[W-M,M,-1,1],[M,H-M,1,-1],[W-M,H-M,-1,-1]]) {
        ctx.beginPath();
        ctx.moveTo(ox, oy + sz * dy); ctx.lineTo(ox, oy); ctx.lineTo(ox + sz * dx, oy);
        ctx.stroke();
    }
    ctx.shadowBlur = 0; ctx.restore();
}

function glassPanel(ctx, x, y, w, h, rgb, radius = 12) {
    ctx.save();
    ctx.fillStyle = `rgba(${rgb},0.08)`;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
    ctx.strokeStyle = `rgba(${rgb},0.25)`; ctx.lineWidth = 1;
    ctx.stroke(); ctx.restore();
}

function drawBg(ctx, W, H, bgImage, theme) {
    const { rgb } = theme;
    if (bgImage) {
        const scale = Math.max(W / bgImage.width, H / bgImage.height);
        const bw = bgImage.width * scale, bh = bgImage.height * scale;
        ctx.drawImage(bgImage, (W - bw) / 2, (H - bh) / 2, bw, bh);
        ctx.fillStyle = "rgba(0,0,0,0.76)"; ctx.fillRect(0, 0, W, H);
    } else {
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0,   "#010508");
        bg.addColorStop(0.3, `rgba(${rgb},0.04)`);
        bg.addColorStop(0.7, `rgba(${rgb},0.02)`);
        bg.addColorStop(1,   "#010508");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    }
    const rg = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.7);
    rg.addColorStop(0, `rgba(${rgb},0.13)`); rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    const lgL = ctx.createLinearGradient(0, 0, 200, 0);
    lgL.addColorStop(0, `rgba(${rgb},0.07)`); lgL.addColorStop(1, "transparent");
    ctx.fillStyle = lgL; ctx.fillRect(0, 0, 200, H);
    const lgR = ctx.createLinearGradient(W, 0, W - 200, 0);
    lgR.addColorStop(0, `rgba(${rgb},0.07)`); lgR.addColorStop(1, "transparent");
    ctx.fillStyle = lgR; ctx.fillRect(W - 200, 0, 200, H);
    drawHexGrid(ctx, W, H, rgb, bgImage ? 0.07 : 0.045);
}

function drawBorder(ctx, W, H, primary, rgb) {
    const bG = ctx.createLinearGradient(0, 0, W, H);
    bG.addColorStop(0, `rgba(${rgb},0.6)`);
    bG.addColorStop(0.5, `rgba(${rgb},0.3)`);
    bG.addColorStop(1, `rgba(${rgb},0.6)`);
    ctx.strokeStyle = bG; ctx.lineWidth = 2;
    ctx.shadowColor = primary; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.roundRect(5, 5, W - 10, H - 10, 16); ctx.stroke(); ctx.shadowBlur = 0;
    drawCorners(ctx, W, H, primary);
}

const PODMC = ["#FFD700","#C0C0C0","#CD7F32"];
const PODMR = ["255,215,0","192,192,192","205,127,50"];
const PODSY = ["🥇","🥈","🥉"];
const RANKL = ["1ST","2ND","3RD"];

async function buildLeaderboardCard(combinedData, page, totalPages, theme, avatarMap, bgImage) {
    const { primary, rgb, accent } = theme;
    const PER_PAGE = 10;
    const top3     = combinedData.slice(0, 3);
    const rest     = combinedData.slice(3);
    const pageRows = rest.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const topCount = top3[0]?.count || 1;

    const W      = 1040;
    const HDR_H  = 118;
    const POD_H  = 380;
    const ROW_H  = 80;
    const FOOT_H = 48;
    const H      = HDR_H + POD_H + pageRows.length * ROW_H + FOOT_H;

    const canvas = new Canvas(W, H);
    const ctx    = canvas.getContext("2d");

    drawBg(ctx, W, H, bgImage, theme);

    glassPanel(ctx, 18, 12, W - 36, HDR_H - 20, rgb, 16);

    const hdrGlow = ctx.createRadialGradient(W / 2, 20, 0, W / 2, 20, 260);
    hdrGlow.addColorStop(0, `rgba(${rgb},0.2)`); hdrGlow.addColorStop(1, "transparent");
    ctx.fillStyle = hdrGlow; ctx.fillRect(W / 2 - 260, 12, 520, HDR_H - 20);

    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `bold 44px ${FNT}`; ctx.fillStyle = primary;
    ctx.shadowColor = primary; ctx.shadowBlur = 36;
    ctx.fillText("MESSAGE LEADERBOARD", W / 2, HDR_H / 2 - 10); ctx.shadowBlur = 0;

    ctx.font = `10px ${FNT}`; ctx.fillStyle = `rgba(${rgb},0.65)`;
    ctx.letterSpacing = "4px";
    ctx.fillText(`TOP MESSAGE COUNT  ·  PAGE ${page} / ${totalPages}`, W / 2, HDR_H / 2 + 22);
    ctx.letterSpacing = "0px";

    ctx.textAlign = "left"; ctx.font = `20px ${FNT}`; ctx.fillStyle = primary;
    ctx.fillText("💬", 34, HDR_H / 2 - 4);
    ctx.textAlign = "right"; ctx.font = `10px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillText(moment().tz(TZ).format("DD MMM YYYY  ·  HH:mm"), W - 34, HDR_H / 2 - 4);

    const podY0 = HDR_H + 14;
    const podBg = ctx.createRadialGradient(W / 2, podY0 + POD_H / 2, 0, W / 2, podY0 + POD_H / 2, 520);
    podBg.addColorStop(0, `rgba(${rgb},0.06)`); podBg.addColorStop(1, "transparent");
    ctx.fillStyle = podBg; ctx.fillRect(0, podY0, W, POD_H);

    const podCfg = [
        { x: W / 2,       cy: podY0 + 168, r: 86,  podH: 56, platW: 255 },
        { x: W / 2 - 288, cy: podY0 + 192, r: 66,  podH: 42, platW: 196 },
        { x: W / 2 + 288, cy: podY0 + 192, r: 66,  podH: 30, platW: 196 },
    ];

    for (let i = 0; i < Math.min(3, top3.length); i++) {
        const { x, cy, r, podH, platW } = podCfg[i];
        const u   = top3[i];
        const mc  = PODMC[i], mr = PODMR[i];
        const platY = cy + r + 12;

        const avG = ctx.createRadialGradient(x, cy, 0, x, cy, r + 72);
        avG.addColorStop(0, `rgba(${mr},0.24)`); avG.addColorStop(1, "transparent");
        ctx.fillStyle = avG; ctx.fillRect(x - r - 80, cy - r - 80, (r + 80) * 2, (r + 80) * 2);

        for (const [rr, op] of [[r+30, 0.12],[r+20, 0.18]]) {
            ctx.strokeStyle = `rgba(${mr},${op})`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(x, cy, rr, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.strokeStyle = mc; ctx.lineWidth = i === 0 ? 5 : 3.5;
        ctx.shadowColor = mc; ctx.shadowBlur = i === 0 ? 34 : 22;
        ctx.beginPath(); ctx.arc(x, cy, r + 7, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;

        clipCircle(ctx, avatarMap.get(u.uid), x, cy, r);

        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath(); ctx.arc(x, cy - r - 5, 24, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = mc; ctx.shadowColor = mc; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(x, cy - r - 5, 22, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = `bold ${i === 0 ? 16 : 13}px ${FNT}`; ctx.fillStyle = "#000";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(PODSY[i], x, cy - r - 4);

        const pG = ctx.createLinearGradient(x - platW / 2, platY, x + platW / 2, platY + podH);
        pG.addColorStop(0, `rgba(${mr},0.18)`); pG.addColorStop(1, `rgba(${mr},0.06)`);
        ctx.fillStyle = pG;
        ctx.beginPath(); ctx.roundRect(x - platW / 2, platY, platW, podH, [10,10,0,0]); ctx.fill();
        ctx.strokeStyle = mc; ctx.lineWidth = 1.8;
        ctx.shadowColor = mc; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.font = `bold ${i === 0 ? 18 : 14}px ${FNT}`; ctx.fillStyle = mc;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(RANKL[i], x, platY + podH / 2);

        ctx.font = `bold ${i === 0 ? 22 : 17}px ${FNT}`; ctx.fillStyle = "#fff";
        ctx.textBaseline = "top"; ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.95)"; ctx.shadowBlur = 8;
        ctx.fillText(fitText(ctx, u.name, platW - 14), x, platY + podH + 10); ctx.shadowBlur = 0;

        ctx.font = `bold ${i === 0 ? 32 : 24}px ${FNT}`; ctx.fillStyle = mc;
        ctx.shadowColor = mc; ctx.shadowBlur = 16;
        ctx.fillText(fmtNum(u.count), x, platY + podH + 38); ctx.shadowBlur = 0;

        ctx.font = `10px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.32)";
        ctx.fillText("messages", x, platY + podH + 72);
    }

    const divY = HDR_H + POD_H - 2;
    const dG = ctx.createLinearGradient(0, divY, W, divY);
    dG.addColorStop(0, "transparent"); dG.addColorStop(0.5, `rgba(${rgb},0.35)`); dG.addColorStop(1, "transparent");
    ctx.strokeStyle = dG; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(28, divY); ctx.lineTo(W - 28, divY); ctx.stroke();

    let ry = HDR_H + POD_H + 4;
    for (let i = 0; i < pageRows.length; i++) {
        const u    = pageRows[i];
        const rank = (page - 1) * PER_PAGE + i + 4;
        const isEv = i % 2 === 0;

        ctx.fillStyle = isEv ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.018)";
        ctx.beginPath(); ctx.roundRect(22, ry + 4, W - 44, ROW_H - 8, 10); ctx.fill();
        if (isEv) {
            ctx.strokeStyle = `rgba(${rgb},0.1)`; ctx.lineWidth = 0.8; ctx.stroke();
        }

        const rankColor = rank <= 10 ? accent : "rgba(255,255,255,0.22)";
        ctx.font = `bold 22px ${FNT}`; ctx.fillStyle = rankColor;
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(`#${rank}`, 74, ry + ROW_H / 2);

        const av = avatarMap.get(u.uid);
        if (av) {
            ctx.save(); ctx.beginPath(); ctx.arc(112, ry + ROW_H / 2, 28, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${rgb},0.55)`; ctx.lineWidth = 2;
            ctx.shadowColor = primary; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
            ctx.clip(); ctx.drawImage(av, 84, ry + ROW_H / 2 - 28, 56, 56); ctx.restore();
        }

        ctx.font = `bold 21px ${FNT}`; ctx.fillStyle = "#fff";
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(fitText(ctx, u.name, 300), 154, ry + ROW_H / 2);

        const barX = 480, barW = 380, barH = 10, barY = ry + ROW_H / 2 - barH / 2;
        const prog = Math.max(0, (u.count / topCount) * barW);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, barH / 2); ctx.fill();
        if (prog > 0) {
            const bG = ctx.createLinearGradient(barX, 0, barX + prog, 0);
            bG.addColorStop(0, `rgba(${rgb},0.5)`); bG.addColorStop(1, primary);
            ctx.fillStyle = bG; ctx.shadowColor = primary; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.roundRect(barX, barY, prog, barH, barH / 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#fff"; ctx.shadowColor = primary; ctx.shadowBlur = 14;
            ctx.beginPath(); ctx.arc(barX + prog, barY + barH / 2, barH / 2 + 2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.font = `bold 21px ${FNT}`; ctx.fillStyle = primary;
        ctx.shadowColor = primary; ctx.shadowBlur = 8;
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(fmtNum(u.count), W - 28, ry + ROW_H / 2); ctx.shadowBlur = 0;

        ry += ROW_H;
    }

    ctx.font = `10px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.13)";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(
        totalPages > 1 ? `PAGE ${page} / ${totalPages}  ◈  REPLY WITH PAGE NUMBER TO NAVIGATE` : "GOATBOT  ◈  MESSAGE LEADERBOARD",
        W / 2, H - FOOT_H / 2
    );

    drawBorder(ctx, W, H, primary, rgb);
    return canvas.toBuffer("image/png");
}

async function buildUserCard(user, theme, avatarImg, bgImage) {
    const { primary, rgb, accent } = theme;
    const W = 980, H = 580;

    const canvas = new Canvas(W, H);
    const ctx    = canvas.getContext("2d");

    drawBg(ctx, W, H, bgImage, theme);

    const headerH = 44;
    const hG = ctx.createLinearGradient(0, 0, W, 0);
    hG.addColorStop(0, "rgba(0,0,0,0)");
    hG.addColorStop(0.1, `rgba(${rgb},0.12)`);
    hG.addColorStop(0.9, `rgba(${rgb},0.12)`);
    hG.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hG; ctx.fillRect(0, 0, W, headerH);
    ctx.strokeStyle = `rgba(${rgb},0.28)`; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, headerH); ctx.lineTo(W, headerH); ctx.stroke();

    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.font = `bold 11px ${FNT}`; ctx.fillStyle = primary;
    ctx.shadowColor = primary; ctx.shadowBlur = 10;
    ctx.fillText("◈  GOATBOT  ·  ACTIVITY CARD", 18, headerH / 2); ctx.shadowBlur = 0;
    ctx.textAlign = "right"; ctx.font = `10px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillText(moment().tz(TZ).format("DD/MM/YYYY  ·  HH:mm"), W - 18, headerH / 2);

    const AVX = 192, AVY = H / 2 + 16, AVR = 104;

    const leftGlow = ctx.createRadialGradient(AVX, AVY, 0, AVX, AVY, 320);
    leftGlow.addColorStop(0, `rgba(${rgb},0.22)`); leftGlow.addColorStop(1, "transparent");
    ctx.fillStyle = leftGlow; ctx.fillRect(0, 0, 430, H);

    for (const [rr, op, lw] of [[AVR+46, 0.07, 0.8],[AVR+30, 0.12, 1],[AVR+16, 0.2, 1.5]]) {
        ctx.strokeStyle = `rgba(${rgb},${op})`; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.arc(AVX, AVY, rr, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.strokeStyle = primary; ctx.lineWidth = 4.5;
    ctx.shadowColor = primary; ctx.shadowBlur = 36;
    ctx.beginPath(); ctx.arc(AVX, AVY, AVR + 8, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;

    if (avatarImg) clipCircle(ctx, avatarImg, AVX, AVY, AVR);

    const badgeCol = user.rank === 1 ? "#FFD700" : user.rank === 2 ? "#C0C0C0" : user.rank === 3 ? "#CD7F32" : primary;
    const badgeY   = AVY + AVR + 18;
    const badgeW   = 130, badgeH = 34;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.beginPath(); ctx.roundRect(AVX - badgeW / 2, badgeY, badgeW, badgeH, 17); ctx.fill();
    ctx.strokeStyle = badgeCol; ctx.lineWidth = 2;
    ctx.shadowColor = badgeCol; ctx.shadowBlur = 16; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.font = `bold 14px ${FNT}`; ctx.fillStyle = badgeCol;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`✦  RANK  #${user.rank}`, AVX, badgeY + badgeH / 2);

    ctx.font = `bold 20px ${FNT}`; ctx.fillStyle = "#fff";
    ctx.textBaseline = "top"; ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.95)"; ctx.shadowBlur = 8;
    ctx.fillText(fitText(ctx, user.name, 330), AVX, badgeY + badgeH + 10); ctx.shadowBlur = 0;

    const divX = 395;
    const divG = ctx.createLinearGradient(divX, 50, divX, H - 20);
    divG.addColorStop(0, "transparent");
    divG.addColorStop(0.2, `rgba(${rgb},0.25)`);
    divG.addColorStop(0.8, `rgba(${rgb},0.25)`);
    divG.addColorStop(1, "transparent");
    ctx.strokeStyle = divG; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(divX, 54); ctx.lineTo(divX, H - 18); ctx.stroke();

    const RX = divX + 30, RW = W - divX - 46;

    const dailyData  = user.activity?.daily || {};
    const dayVals    = Object.values(dailyData);
    const activeDays = dayVals.filter(v => v > 0).length;
    const dayTotal   = dayVals.reduce((a, b) => a + b, 0);
    const avgPerDay  = activeDays > 0 ? Math.round(dayTotal / activeDays) : 0;
    const bestDay    = Math.max(...dayVals, 0);

    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.font = `9px ${FNT}`; ctx.fillStyle = `rgba(${rgb},0.65)`;
    ctx.letterSpacing = "3px";
    ctx.fillText("T O T A L   M E S S A G E S", RX, 60);
    ctx.letterSpacing = "0px";

    ctx.font = `bold 76px ${FNT}`; ctx.fillStyle = primary;
    ctx.shadowColor = primary; ctx.shadowBlur = 32;
    ctx.fillText(fmtNum(user.count), RX, 74); ctx.shadowBlur = 0;

    const statsY = 172;
    const statItems = [
        { label: "DAILY AVG",   value: fmtNum(avgPerDay), col: primary },
        { label: "ACTIVE DAYS", value: `${activeDays}d`,  col: accent  },
        { label: "BEST DAY",    value: fmtNum(bestDay),   col: "#fff"  },
    ];
    const statW = Math.floor((RW - 16) / 3);
    for (let i = 0; i < statItems.length; i++) {
        const st  = statItems[i];
        const sx  = RX + i * (statW + 8);
        glassPanel(ctx, sx, statsY, statW, 60, rgb, 10);
        ctx.font = `8px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.38)";
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(st.label, sx + 12, statsY + 10);
        ctx.font = `bold 26px ${FNT}`; ctx.fillStyle = st.col;
        ctx.shadowColor = st.col; ctx.shadowBlur = 10;
        ctx.fillText(st.value, sx + 12, statsY + 26); ctx.shadowBlur = 0;
    }

    const sep1 = statsY + 74;
    ctx.strokeStyle = `rgba(${rgb},0.18)`; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(RX, sep1); ctx.lineTo(W - 22, sep1); ctx.stroke();

    ctx.font = `9px ${FNT}`; ctx.fillStyle = `rgba(255,255,255,0.3)`;
    ctx.textAlign = "center"; ctx.letterSpacing = "2px";
    ctx.fillText("7 - D A Y   A C T I V I T Y", RX + RW / 2, sep1 + 14);
    ctx.letterSpacing = "0px";

    const tz   = global.GoatBot?.config?.timeZone || TZ;
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d   = moment().tz(tz).subtract(i, "days");
        const key = d.format("YYYY-MM-DD");
        days.push({ label: d.format("ddd").toUpperCase(), count: dailyData[key] || 0, isToday: i === 0 });
    }
    const maxDay    = Math.max(...days.map(d => d.count), 1);
    const barBase   = sep1 + 142;
    const barMaxH   = 90;
    const slotW     = Math.floor(RW / 7);

    for (let i = 0; i < 7; i++) {
        const d   = days[i];
        const bx  = RX + i * slotW;
        const bcx = bx + slotW / 2;
        const h   = d.count > 0 ? Math.max(10, (d.count / maxDay) * barMaxH) : 0;
        const by  = barBase - h;

        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.beginPath(); ctx.roundRect(bx + 7, barBase - barMaxH, slotW - 14, barMaxH, 4); ctx.fill();

        if (d.isToday) {
            ctx.strokeStyle = `rgba(${rgb},0.25)`; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(bcx, barBase - barMaxH - 4); ctx.lineTo(bcx, barBase); ctx.stroke();
            ctx.setLineDash([]);
        }

        if (h > 0) {
            const bG = ctx.createLinearGradient(0, by, 0, barBase);
            bG.addColorStop(0, primary); bG.addColorStop(1, `rgba(${rgb},0.15)`);
            if (d.isToday) { ctx.shadowColor = primary; ctx.shadowBlur = 16; }
            ctx.fillStyle = bG;
            ctx.beginPath(); ctx.roundRect(bx + 7, by, slotW - 14, h, [4, 4, 0, 0]); ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.fillRect(bx + 7, by, slotW - 14, 2);

            ctx.font = `bold 9px ${FNT}`; ctx.fillStyle = d.isToday ? primary : "rgba(255,255,255,0.55)";
            ctx.textAlign = "center"; ctx.textBaseline = "bottom";
            ctx.fillText(fmtNum(d.count), bcx, by - 4);
        }

        ctx.font = d.isToday ? `bold 10px ${FNT}` : `9px ${FNT}`;
        ctx.fillStyle = d.isToday ? primary : "rgba(255,255,255,0.35)";
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(d.label, bcx, barBase + 8);
    }

    const sep2 = barBase + 30;
    ctx.strokeStyle = `rgba(${rgb},0.15)`; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(RX, sep2); ctx.lineTo(W - 22, sep2); ctx.stroke();

    const types     = user.activity?.types || { text: 0, sticker: 0, media: 0 };
    const typeTotal = (types.text || 0) + (types.sticker || 0) + (types.media || 0);
    const typeRows  = [
        { label: "TEXT",    icon: "💬", val: types.text    || 0, col: primary  },
        { label: "STICKER", icon: "🎭", val: types.sticker || 0, col: accent   },
        { label: "MEDIA",   icon: "📷", val: types.media   || 0, col: "#FF4ECD" },
    ];
    const trkX = RX + 100, trkW = RW - 110 - 72, trkH = 9;
    let ty = sep2 + 14;
    for (const tr of typeRows) {
        const pct  = typeTotal > 0 ? tr.val / typeTotal : 0;
        const fillW = Math.max(pct > 0 ? 10 : 0, pct * trkW);

        ctx.font = `9px ${FNT}`; ctx.fillStyle = tr.col;
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(`${tr.icon} ${tr.label}`, RX, ty + trkH / 2 + 11);

        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath(); ctx.roundRect(trkX, ty + 7, trkW, trkH, trkH / 2); ctx.fill();

        if (fillW > 0) {
            const fG = ctx.createLinearGradient(trkX, 0, trkX + fillW, 0);
            fG.addColorStop(0, tr.col); fG.addColorStop(1, `${tr.col}55`);
            ctx.fillStyle = fG; ctx.shadowColor = tr.col; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.roundRect(trkX, ty + 7, fillW, trkH, trkH / 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.beginPath(); ctx.arc(trkX + fillW, ty + 7 + trkH / 2, trkH / 2 + 1.5, 0, Math.PI * 2); ctx.fill();
        }

        ctx.font = `bold 11px ${FNT}`; ctx.fillStyle = pct > 0 ? tr.col : "rgba(255,255,255,0.18)";
        ctx.textAlign = "left";
        ctx.fillText(`${(pct * 100).toFixed(0)}%  (${fmtNum(tr.val)})`, trkX + trkW + 14, ty + trkH / 2 + 11);

        ty += 30;
    }

    ctx.font = `9px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`GoatBot  ◈  uid: ${user.uid}`, W / 2, H - 13);

    drawBorder(ctx, W, H, primary, rgb);
    return canvas.toBuffer("image/png");
}

module.exports = {
    config: {
        name:        "count",
        version:     "1.0.0",
        author:      "SIFAT",
        countDown:   10,
        role:        0,
        description: { en: "Advanced message count leaderboard & activity card" },
        category:    "box chat",
        guide: {
            en:
                "   {pn}              → your activity card\n" +
                "   {pn} @tag         → tagged user's card\n" +
                "   {pn} all          → leaderboard page 1\n" +
                "   {pn} all 2        → leaderboard page 2\n" +
                "   {pn} top          → text top 5\n" +
                "   {pn} bg <url>     → set custom background\n" +
                "   {pn} bg reset     → remove custom background\n" +
                "   {pn} reset        → reset count (admin)\n" +
                "\n   🎨 Theme auto-cycles every use (12 themes)\n" +
                "   🌄 Supported bg: catbox, imgur, ibb, uguu, telegra.ph, discord, postimg",
        },
    },

    onLoad: async function () {
        fs.ensureDirSync(FONT_DIR);
        const fonts = [
            { file: path.join(FONT_DIR, "NotoSans-Bold.ttf"),          url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf",                  family: "NotoSans",        weight: "bold"   },
            { file: path.join(FONT_DIR, "NotoSans-Regular.ttf"),        url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf",                family: "NotoSans",        weight: "normal" },
            { file: path.join(FONT_DIR, "NotoSansBengali-Bold.ttf"),    url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansBengali/NotoSansBengali-Bold.ttf",    family: "NotoSansBengali", weight: "bold"   },
            { file: path.join(FONT_DIR, "NotoSansBengali-Regular.ttf"), url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansBengali/NotoSansBengali-Regular.ttf", family: "NotoSansBengali", weight: "normal" },
            { file: path.join(FONT_DIR, "NotoEmoji-Regular.ttf"),       url: "https://raw.githubusercontent.com/googlefonts/noto-emoji/main/fonts/Noto-COLRv1-noflags.ttf",                         family: "NotoEmoji",       weight: "normal" },
        ];
        const dl = (url, dest) => new Promise((res, rej) => {
            const file = fs.createWriteStream(dest);
            const req  = u => require("https").get(u, r => {
                if (r.statusCode === 301 || r.statusCode === 302) return req(r.headers.location);
                r.pipe(file); file.on("finish", () => { file.close(); res(); });
            }).on("error", e => { try { fs.unlinkSync(dest); } catch {} rej(e); });
            req(url);
        });
        for (const f of fonts) {
            try {
                if (!fs.existsSync(f.file)) await dl(f.url, f.file);
                registerFont(f.file, { family: f.family, weight: f.weight });
            } catch (e) { console.error("[count] font:", e.message); }
        }
    },

    onChat: async function ({ event, threadsData, usersData }) {
        const { threadID, senderID } = event;
        if (!threadID || !senderID) return;
        try {
            const members = await threadsData.get(threadID, "members");
            if (!Array.isArray(members)) return;
            const m = members.find(u => u.userID == senderID);
            if (!m) {
                members.push({ userID: senderID, name: (await usersData.getName(senderID)) || "Facebook User", nickname: null, inGroup: true, count: 1 });
            } else { m.count = (m.count || 0) + 1; }
            await threadsData.set(threadID, members, "members");
        } catch {}
        try {
            const all = readActivity();
            if (!all[threadID]) all[threadID] = {};
            if (!all[threadID][senderID])
                all[threadID][senderID] = { total: 0, types: { text: 0, sticker: 0, media: 0 }, daily: {} };
            const tz    = global.GoatBot?.config?.timeZone || TZ;
            const u     = all[threadID][senderID];
            const today = moment().tz(tz).format("YYYY-MM-DD");
            u.total = (u.total || 0) + 1;
            u.daily[today] = (u.daily[today] || 0) + 1;
            const atts = event.attachments || [];
            if (atts.some(a => a.type === "sticker")) u.types.sticker = (u.types.sticker || 0) + 1;
            else if (atts.length > 0)                 u.types.media   = (u.types.media   || 0) + 1;
            else                                       u.types.text    = (u.types.text    || 0) + 1;
            const sorted = Object.keys(u.daily).sort((a, b) => new Date(b) - new Date(a));
            sorted.slice(7).forEach(k => delete u.daily[k]);
            writeActivity(all);
        } catch {}
    },

    onStart: async function ({ args, threadsData, message, event, api, role }) {
        const { threadID, senderID, mentions, type, messageReply } = event;
        fs.ensureDirSync(path.resolve(__dirname, "cache"));

        const bgStore  = readBgData();
        const subCmd   = (args[0] || "").toLowerCase();

        if (subCmd === "bg") {
            const val = (args[1] || "").toLowerCase();
            if (!val || val === "list") {
                const cur = bgStore[threadID] ? `\n\n🖼️ Current: ${bgStore[threadID]}` : "\n\n🎲 Using random default backgrounds.";
                return message.reply(`🌄 Default BGs:\n${DEFAULT_BACKGROUNDS.map((u, i) => `${i + 1}. ${u}`).join("\n")}${cur}`);
            }
            if (val === "reset") {
                delete bgStore[threadID];
                writeBgData(bgStore);
                return message.reply("✅ Custom background removed.");
            }
            const rawUrl = args[1] || "";
            if (!rawUrl.match(/^https?:\/\//i)) return message.reply("❌ Invalid URL.");
            let host;
            try { host = new URL(rawUrl).hostname; } catch { return message.reply("❌ Invalid URL."); }
            if (!ALLOWED_BG_HOSTS.some(d => host.endsWith(d)))
                return message.reply("❌ Unsupported host.\n✅ Allowed: catbox, imgur, ibb, uguu, telegra.ph, discord cdn, postimg");
            bgStore[threadID] = rawUrl;
            writeBgData(bgStore);
            return message.reply(`✅ Background set!\n🔗 ${rawUrl}`);
        }

        const threadData  = await threadsData.get(threadID);
        const allActivity = readActivity()[threadID] || {};
        let participantIDs;
        try { participantIDs = (await api.getThreadInfo(threadID)).participantIDs; }
        catch { participantIDs = (threadData.members || []).map(m => m.userID); }

        const members      = threadData.members || [];
        const combinedData = members
            .filter(m => participantIDs.includes(m.userID))
            .map(m => ({
                uid:      m.userID,
                name:     m.name || "Facebook User",
                count:    m.count || 0,
                activity: allActivity[m.userID] || { total: m.count || 0, types: { text: 0, sticker: 0, media: 0 }, daily: {} },
            }))
            .sort((a, b) => b.count - a.count)
            .map((u, i) => ({ ...u, rank: i + 1 }));

        if (!combinedData.length) return message.reply("📊 No data yet. Start chatting!");

        const theme   = nextCountTheme(threadID, bgStore);
        const bgUrl   = bgStore[threadID] || DEFAULT_BACKGROUNDS[Math.floor(Math.random() * DEFAULT_BACKGROUNDS.length)];
        const bgImage = await loadBgImage(bgUrl);

        if (subCmd === "reset") {
            if (role < 1) return message.reply("⚠️ Admin only.");
            try {
                await threadsData.set(threadID, members.map(m => ({ ...m, count: 0 })), "members");
                const all = readActivity(); delete all[threadID]; writeActivity(all);
                return message.reply("✅ Count reset for this group!");
            } catch (e) { return message.reply("❌ Reset failed: " + e.message); }
        }

        if (subCmd === "top") {
            const top5   = combinedData.slice(0, 5);
            const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
            return message.reply(`📊 Top ${top5.length}:\n\n${top5.map((u, i) => `${medals[i]} ${u.name} — ${u.count.toLocaleString()} msgs`).join("\n")}`);
        }

        const wait = await message.reply("⏳ Building card...");

        if (subCmd === "all") {
            const PER_PAGE   = 10;
            const rest       = combinedData.slice(3);
            const totalPages = Math.max(1, Math.ceil(rest.length / PER_PAGE));
            const page       = Math.max(1, Math.min(parseInt(args[1]) || 1, totalPages));
            try {
                const toLoad    = combinedData.slice(0, 3 + PER_PAGE);
                const avatarMap = await preloadAvatars(toLoad, 5);
                const imgBuf    = await buildLeaderboardCard(combinedData, page, totalPages, theme, avatarMap, bgImage);
                const imgPath   = path.resolve(__dirname, "cache", `lb_${threadID}_${Date.now()}.png`);
                fs.writeFileSync(imgPath, imgBuf);
                try { if (wait?.messageID) message.unsend(wait.messageID); } catch {}
                message.reply({ body: "", attachment: fs.createReadStream(imgPath) }, (err, info) => {
                    try { fs.unlinkSync(imgPath); } catch {}
                    if (err || !info?.messageID || totalPages <= 1) return;
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName: "count", messageID: info.messageID,
                        author: senderID, threadID, type: "leaderboard",
                        page, totalPages,
                    });
                });
            } catch (e) {
                try { if (wait?.messageID) message.unsend(wait.messageID); } catch {}
                console.error("[count] all:", e);
                message.reply("❌ Error: " + e.message);
            }
            return;
        }

        let targetUIDs = [];
        if (type === "message_reply" && messageReply?.senderID) targetUIDs = [messageReply.senderID];
        else if (Object.keys(mentions || {}).length > 0) targetUIDs = Object.keys(mentions);
        else targetUIDs = [senderID];

        for (const uid of targetUIDs) {
            const user = combinedData.find(u => u.uid == uid);
            if (!user) { message.reply("❌ No data for this user in this group."); continue; }
            try {
                const avatarImg = await getAvatar(uid, user.name);
                const imgBuf    = await buildUserCard(user, theme, avatarImg, bgImage);
                const imgPath   = path.resolve(__dirname, "cache", `uc_${uid}_${Date.now()}.png`);
                fs.writeFileSync(imgPath, imgBuf);
                try { if (wait?.messageID) message.unsend(wait.messageID); } catch {}
                await message.reply({ body: "", attachment: fs.createReadStream(imgPath) });
                setTimeout(() => fs.unlink(imgPath).catch(() => {}), 30_000);
            } catch (e) {
                try { if (wait?.messageID) message.unsend(wait.messageID); } catch {}
                console.error("[count] card:", e);
                message.reply("❌ Error: " + e.message);
            }
        }
    },

    onReply: async function ({ event, Reply, message, threadsData, api }) {
        if (event.senderID !== Reply.author) return;
        if (Reply.type !== "leaderboard") return;

        const pg = parseInt(event.body);
        if (isNaN(pg) || pg < 1) return message.reply("❌ Invalid page number.");

        const threadID   = Reply.threadID;
        const threadData = await threadsData.get(threadID);
        const allAct     = readActivity()[threadID] || {};
        let partIDs;
        try { partIDs = (await api.getThreadInfo(threadID)).participantIDs; }
        catch { partIDs = (threadData.members || []).map(m => m.userID); }

        const members = threadData.members || [];
        const cd = members
            .filter(m => partIDs.includes(m.userID))
            .map(m => ({ uid: m.userID, name: m.name || "User", count: m.count || 0, activity: allAct[m.userID] || {} }))
            .sort((a, b) => b.count - a.count)
            .map((u, i) => ({ ...u, rank: i + 1 }));

        const PER_PAGE   = 10;
        const totalPages = Math.max(1, Math.ceil(cd.slice(3).length / PER_PAGE));
        const page       = Math.max(1, Math.min(pg, totalPages));

        const bgStore  = readBgData();
        const theme    = nextCountTheme(threadID, bgStore);
        const bgUrl    = bgStore[threadID] || DEFAULT_BACKGROUNDS[Math.floor(Math.random() * DEFAULT_BACKGROUNDS.length)];
        const bgImage  = await loadBgImage(bgUrl);

        const toLoad    = cd.slice(0, 3 + PER_PAGE);
        const avatarMap = await preloadAvatars(toLoad, 5);
        const imgBuf    = await buildLeaderboardCard(cd, page, totalPages, theme, avatarMap, bgImage);
        const imgPath   = path.resolve(__dirname, "cache", `lb_${threadID}_${Date.now()}.png`);
        fs.writeFileSync(imgPath, imgBuf);

        message.reply({ body: "", attachment: fs.createReadStream(imgPath) }, (err, info) => {
            try { fs.unlinkSync(imgPath); } catch {}
            if (err || !info?.messageID || totalPages <= 1) return;
            global.GoatBot.onReply.set(info.messageID, {
                commandName: "count", messageID: info.messageID,
                author: Reply.author, threadID, type: "leaderboard",
                page, totalPages,
            });
        });
    },
};
