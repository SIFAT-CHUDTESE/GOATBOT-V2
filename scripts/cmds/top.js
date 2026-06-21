"use strict";

const fs      = require("fs-extra");
const path    = require("path");
const axios   = require("axios");
const { Canvas, loadImage, registerFont } = require("canvas");
const moment  = require("moment-timezone");

const CACHE_DIR = path.resolve(__dirname, "cache");
const FONT_DIR  = path.resolve(__dirname, "cache", "fonts");
const CMD_DATA  = path.resolve(__dirname, "cache", "top_cmd_usage.json");
const BG_DATA   = path.resolve(__dirname, "cache", "top_bg.json");
const TZ        = "Asia/Dhaka";
const UA        = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";
const FNT       = "NotoSans, NotoSansBengali, NotoEmoji, sans-serif";

fs.ensureDirSync(CACHE_DIR);
fs.ensureDirSync(FONT_DIR);

const DEFAULT_BACKGROUNDS = [
    "https://d.uguu.se/rXgpjbtC.jpg",
    "https://i.imgur.com/5Bjb3Qp.jpeg",
];

function readCmdData()   { try { return fs.readJsonSync(CMD_DATA); } catch { return {}; } }
function writeCmdData(d) { try { fs.writeJsonSync(CMD_DATA, d, { spaces: 2 }); } catch {} }
function readBgData()    { try { return fs.readJsonSync(BG_DATA); } catch { return {}; } }
function writeBgData(d)  { try { fs.writeJsonSync(BG_DATA, d, { spaces: 2 }); } catch {} }

const THEME_NAMES_TOP = ["money","exp","cmd","fire","ice","galaxy","emerald","rose","solar","neon","ocean","crimson"];

function nextTopTheme(threadID, bgStore) {
    const key = `${threadID}_themeIdx`;
    const idx  = ((bgStore[key] ?? -1) + 1) % THEME_NAMES_TOP.length;
    bgStore[key] = idx;
    writeBgData(bgStore);
    return THEME_NAMES_TOP[idx];
}

function fmtShort(n) {
    n = Number(n || 0);
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toLocaleString();
}

function fitText(ctx, text, maxW) {
    let t = String(text || "");
    while (t.length > 1 && ctx.measureText(t).width > maxW) t = t.slice(0, -1);
    return t.length < String(text || "").length ? t + "…" : t;
}

const AVATAR_CACHE = new Map();

async function fetchImageBuffer(url) {
    const r = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 12000,
        maxRedirects: 10,
        headers: { "User-Agent": UA, "Accept": "image/webp,image/apng,image/*,*/*;q=0.8" }
    });
    const ct = r.headers["content-type"] || "";
    if (!ct.includes("image") && !ct.includes("octet-stream")) throw new Error("not-image");
    if (!r.data || r.data.byteLength < 500) throw new Error("too-small");
    return Buffer.from(r.data);
}

async function makeFallback(uid) {
    const c  = new Canvas(256, 256);
    const cx = c.getContext("2d");
    const COLS = ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c","#e67e22","#e91e63"];
    const i  = String(uid || "0").split("").reduce((s, ch) => s + ch.charCodeAt(0), 0) % COLS.length;
    const g  = cx.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, COLS[i]);
    g.addColorStop(1, COLS[(i + 3) % COLS.length]);
    cx.fillStyle = g; cx.fillRect(0, 0, 256, 256);
    cx.fillStyle = "rgba(0,0,0,0.2)"; cx.fillRect(0, 0, 256, 256);
    cx.fillStyle = "#fff"; cx.font = `bold 96px NotoSans, sans-serif`;
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText("?", 128, 138);
    return loadImage(c.toBuffer());
}

const FB_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

async function getAvatar(uid) {
    if (!uid) return makeFallback(uid);
    if (AVATAR_CACHE.has(uid)) return AVATAR_CACHE.get(uid);

    const tryLoad = async (buf) => {
        const img = await loadImage(buf);
        AVATAR_CACHE.set(uid, img);
        return img;
    };

    const url = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${FB_TOKEN}`;
    const buf = await fetchImageBuffer(url).catch(() => null);
    if (buf) return tryLoad(buf);

    return makeFallback(uid);
}

function clipCircle(ctx, img, x, y, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    ctx.restore();
}

function hexGrid(ctx, W, H, rgb, alpha) {
    const s = 28;
    ctx.strokeStyle = `rgba(${rgb},${alpha})`; ctx.lineWidth = 0.5;
    for (let row = -1; row < H / (s * 1.5) + 2; row++) {
        for (let col = -1; col < W / (s * 1.73) + 2; col++) {
            const ox = row % 2 ? s * 0.866 : 0;
            const hx = col * s * 1.73 + ox, hy = row * s * 1.5;
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
                const a = (Math.PI / 3) * k + Math.PI / 6;
                k === 0
                    ? ctx.moveTo(hx + s * Math.cos(a), hy + s * Math.sin(a))
                    : ctx.lineTo(hx + s * Math.cos(a), hy + s * Math.sin(a));
            }
            ctx.closePath(); ctx.stroke();
        }
    }
}

function corners(ctx, W, H, col, sz = 36) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = "square";
    ctx.shadowColor = col; ctx.shadowBlur = 20;
    const M = 10;
    for (const [ox, oy, dx, dy] of [[M,M,1,1],[W-M,M,-1,1],[M,H-M,1,-1],[W-M,H-M,-1,-1]]) {
        ctx.beginPath();
        ctx.moveTo(ox, oy + sz * dy); ctx.lineTo(ox, oy); ctx.lineTo(ox + sz * dx, oy);
        ctx.stroke();
    }
    ctx.shadowBlur = 0; ctx.restore();
}

function glassPanel(ctx, x, y, w, h, rgb, r = 12) {
    ctx.save();
    ctx.fillStyle = `rgba(${rgb},0.07)`;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = `rgba(${rgb},0.22)`; ctx.lineWidth = 1;
    ctx.stroke(); ctx.restore();
}

const THEMES = {
    money:   { primary: "#FFD700", rgb: "255,215,0",   label: "MONEY LEADERS",   icon: "💰", sub: "TOP BALANCE HOLDERS",    bg: ["#020608","#030b14","#040d18","#020608"] },
    exp:     { primary: "#00CFFF", rgb: "0,207,255",   label: "EXP LEADERS",     icon: "⭐", sub: "TOP EXPERIENCE HOLDERS",  bg: ["#020a10","#021520","#031a28","#020a10"] },
    cmd:     { primary: "#FF4ECD", rgb: "255,78,205",  label: "CMD LEADERS",     icon: "⚡", sub: "MOST USED COMMANDS",      bg: ["#08020e","#120218","#180320","#08020e"] },
    fire:    { primary: "#FF6B35", rgb: "255,107,53",  label: "FIRE LEADERS",    icon: "🔥", sub: "TOP BLAZING PLAYERS",     bg: ["#0e0500","#1a0800","#200a00","#0e0500"] },
    ice:     { primary: "#7FEFFF", rgb: "127,239,255", label: "ICE LEADERS",     icon: "❄️", sub: "FROZEN TOP PLAYERS",      bg: ["#000d12","#001520","#001a28","#000d12"] },
    galaxy:  { primary: "#C77DFF", rgb: "199,125,255", label: "GALAXY LEADERS",  icon: "🌌", sub: "COSMIC TOP PLAYERS",      bg: ["#05010e","#0a0218","#0e0320","#05010e"] },
    emerald: { primary: "#00FF7F", rgb: "0,255,127",   label: "EMERALD LEADERS", icon: "💚", sub: "TOP GREEN HOLDERS",       bg: ["#000e06","#001a0a","#00200d","#000e06"] },
    rose:    { primary: "#FF6B9D", rgb: "255,107,157", label: "ROSE LEADERS",    icon: "🌹", sub: "TOP ROSE PLAYERS",        bg: ["#0e0008","#180012","#1e0016","#0e0008"] },
    solar:   { primary: "#FFA500", rgb: "255,165,0",   label: "SOLAR LEADERS",   icon: "☀️", sub: "TOP SOLAR PLAYERS",       bg: ["#0e0700","#1a0d00","#201100","#0e0700"] },
    neon:    { primary: "#39FF14", rgb: "57,255,20",   label: "NEON LEADERS",    icon: "💡", sub: "TOP NEON PLAYERS",        bg: ["#010e00","#011800","#021e00","#010e00"] },
    ocean:   { primary: "#0096FF", rgb: "0,150,255",   label: "OCEAN LEADERS",   icon: "🌊", sub: "TOP WAVE RIDERS",         bg: ["#00060e","#000b18","#000e20","#00060e"] },
    crimson: { primary: "#DC143C", rgb: "220,20,60",   label: "CRIMSON LEADERS", icon: "🩸", sub: "TOP CRIMSON PLAYERS",     bg: ["#0e0002","#180004","#1e0006","#0e0002"] },
};

const MDCOLS = ["#FFD700","#C0C0C0","#CD7F32"];
const MDRGB  = ["255,215,0","192,192,192","205,127,50"];
const MDSYM  = ["🥇","🥈","🥉"];
const RANKS  = ["1ST","2ND","3RD"];

async function loadBgImage(url) {
    try {
        const buf = await fetchImageBuffer(url);
        return await loadImage(buf);
    } catch {
        return null;
    }
}

async function buildTopCard(users, theme, topN, bgUrl) {
    const { primary, rgb } = theme;
    const top3   = users.slice(0, 3);
    const rest   = users.slice(3, topN);
    const maxVal = users[0]?.value || 1;

    const W      = 1040;
    const HDR_H  = 120;
    const POD_H  = 380;
    const ROW_H  = 80;
    const FOOT_H = 48;
    const H      = HDR_H + POD_H + rest.length * ROW_H + FOOT_H;

    const canvas = new Canvas(W, H);
    const ctx    = canvas.getContext("2d");

    const resolvedBg = bgUrl || DEFAULT_BACKGROUNDS[Math.floor(Math.random() * DEFAULT_BACKGROUNDS.length)];
    const bgImage = await loadBgImage(resolvedBg);

    if (bgImage) {
        ctx.save();
        const scale = Math.max(W / bgImage.width, H / bgImage.height);
        const bw = bgImage.width * scale, bh = bgImage.height * scale;
        const bx = (W - bw) / 2, by = (H - bh) / 2;
        ctx.drawImage(bgImage, bx, by, bw, bh);
        ctx.fillStyle = "rgba(0,0,0,0.72)";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    } else {
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        (theme.bg || ["#020608","#030b14","#040d18","#020608"]).forEach((c, i, a) =>
            bg.addColorStop(i / (a.length - 1), c)
        );
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    }

    const lgL = ctx.createLinearGradient(0, 0, 260, 0);
    lgL.addColorStop(0, `rgba(${rgb},0.08)`); lgL.addColorStop(1, "transparent");
    ctx.fillStyle = lgL; ctx.fillRect(0, 0, 260, H);

    const lgR = ctx.createLinearGradient(W, 0, W - 260, 0);
    lgR.addColorStop(0, `rgba(${rgb},0.08)`); lgR.addColorStop(1, "transparent");
    ctx.fillStyle = lgR; ctx.fillRect(W - 260, 0, 260, H);

    const rg = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.65);
    rg.addColorStop(0, `rgba(${rgb},0.16)`); rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

    hexGrid(ctx, W, H, rgb, bgImage ? 0.06 : 0.04);

    glassPanel(ctx, 20, 14, W - 40, HDR_H - 18, rgb, 16);

    const crG = ctx.createRadialGradient(W / 2, 30, 0, W / 2, 30, 200);
    crG.addColorStop(0, `rgba(${rgb},0.18)`); crG.addColorStop(1, "transparent");
    ctx.fillStyle = crG; ctx.fillRect(W / 2 - 200, 14, 400, HDR_H - 18);

    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `bold 42px ${FNT}`; ctx.fillStyle = primary;
    ctx.shadowColor = primary; ctx.shadowBlur = 30;
    ctx.fillText(theme.label, W / 2, HDR_H / 2 - 10); ctx.shadowBlur = 0;

    ctx.font = `11px ${FNT}`; ctx.fillStyle = `rgba(${rgb},0.6)`;
    ctx.letterSpacing = "3px";
    ctx.fillText(theme.sub, W / 2, HDR_H / 2 + 22); ctx.letterSpacing = "0px";

    ctx.textAlign = "left"; ctx.font = `18px ${FNT}`;
    ctx.fillStyle = primary; ctx.fillText(theme.icon, 36, HDR_H / 2 - 4);
    ctx.textAlign = "right"; ctx.font = `10px ${FNT}`;
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillText(moment().tz(TZ).format("DD MMM YYYY  ·  HH:mm"), W - 36, HDR_H / 2 - 4);

    const podY0 = HDR_H + 16;

    const podG = ctx.createRadialGradient(W / 2, podY0 + POD_H / 2, 0, W / 2, podY0 + POD_H / 2, 500);
    podG.addColorStop(0, `rgba(${rgb},0.05)`); podG.addColorStop(1, "transparent");
    ctx.fillStyle = podG; ctx.fillRect(0, podY0, W, POD_H);

    const podCfg = [
        { x: W / 2,       cy: podY0 + 170, r: 88,  podH: 58, platW: 260 },
        { x: W / 2 - 290, cy: podY0 + 195, r: 68,  podH: 42, platW: 200 },
        { x: W / 2 + 290, cy: podY0 + 195, r: 68,  podH: 30, platW: 200 },
    ];

    for (let i = 0; i < Math.min(3, top3.length); i++) {
        const { x, cy, r, podH, platW } = podCfg[i];
        const u   = top3[i];
        const mc  = MDCOLS[i];
        const mr  = MDRGB[i];
        const platY = cy + r + 12;

        const avG = ctx.createRadialGradient(x, cy, 0, x, cy, r + 60);
        avG.addColorStop(0, `rgba(${mr},0.2)`); avG.addColorStop(1, "transparent");
        ctx.fillStyle = avG; ctx.fillRect(x - r - 70, cy - r - 70, (r + 70) * 2, (r + 70) * 2);

        ctx.strokeStyle = `rgba(${mr},0.2)`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, cy, r + 22, 0, Math.PI * 2); ctx.stroke();

        ctx.strokeStyle = mc; ctx.lineWidth = i === 0 ? 4.5 : 3.5;
        ctx.shadowColor = mc; ctx.shadowBlur = i === 0 ? 30 : 20;
        ctx.beginPath(); ctx.arc(x, cy, r + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;

        if (!u.noAvatar) {
            const av = await getAvatar(u.uid);
            clipCircle(ctx, av, x, cy, r);
        } else {
            ctx.save();
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill();
            ctx.font = `bold ${r * 0.45}px ${FNT}`; ctx.fillStyle = mc;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(fitText(ctx, u.name || "", r * 1.6), x, cy);
            ctx.restore();
        }

        ctx.fillStyle = mc; ctx.shadowColor = mc; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(x, cy - r - 4, 24, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = `bold ${i === 0 ? 16 : 14}px ${FNT}`;
        ctx.fillStyle = "#000"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(MDSYM[i], x, cy - r - 3);

        ctx.fillStyle = `rgba(${mr},0.12)`;
        ctx.beginPath(); ctx.roundRect(x - platW / 2, platY, platW, podH, [8, 8, 0, 0]); ctx.fill();
        ctx.strokeStyle = mc; ctx.lineWidth = 1.5;
        ctx.shadowColor = mc; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.font = `bold ${i === 0 ? 18 : 15}px ${FNT}`; ctx.fillStyle = mc;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(RANKS[i], x, platY + podH / 2);

        ctx.font = `bold ${i === 0 ? 22 : 18}px ${FNT}`; ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "top"; ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 6;
        ctx.fillText(fitText(ctx, u.name || "User", platW - 16), x, platY + podH + 10);
        ctx.shadowBlur = 0;

        ctx.font = `bold ${i === 0 ? 30 : 24}px ${FNT}`; ctx.fillStyle = mc;
        ctx.shadowColor = mc; ctx.shadowBlur = 14;
        ctx.fillText(fmtShort(u.value), x, platY + podH + 38); ctx.shadowBlur = 0;

        if (u.valueLabel) {
            ctx.font = `11px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.fillText(u.valueLabel, x, platY + podH + 74);
        }
    }

    const divY = HDR_H + POD_H;
    const divG = ctx.createLinearGradient(0, divY, W, divY);
    divG.addColorStop(0, "transparent"); divG.addColorStop(0.5, `rgba(${rgb},0.3)`); divG.addColorStop(1, "transparent");
    ctx.strokeStyle = divG; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(30, divY); ctx.lineTo(W - 30, divY); ctx.stroke();

    let rowY = HDR_H + POD_H + 4;

    for (let i = 0; i < rest.length; i++) {
        const u    = rest[i];
        const rank = i + 4;
        const isEven = i % 2 === 0;

        ctx.fillStyle = isEven ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)";
        ctx.beginPath(); ctx.roundRect(22, rowY + 4, W - 44, ROW_H - 8, 10); ctx.fill();
        if (isEven) {
            ctx.strokeStyle = `rgba(${rgb},0.1)`; ctx.lineWidth = 0.8; ctx.stroke();
        }

        ctx.font = `bold 22px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(`#${rank}`, 76, rowY + ROW_H / 2);

        if (!u.noAvatar) {
            const av = await getAvatar(u.uid);
            ctx.save();
            ctx.beginPath(); ctx.arc(114, rowY + ROW_H / 2, 28, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${rgb},0.5)`; ctx.lineWidth = 1.8;
            ctx.shadowColor = primary; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
            ctx.clip(); ctx.drawImage(av, 86, rowY + ROW_H / 2 - 28, 56, 56); ctx.restore();
        }

        const nameX = u.noAvatar ? 90 : 158;
        ctx.font = `bold 21px ${FNT}`; ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(fitText(ctx, u.name || "User", 310), nameX, rowY + ROW_H / 2);

        const barX = 490, barW = 380, barH = 10;
        const barY = rowY + ROW_H / 2 - barH / 2;
        const prog = Math.max(0, (u.value / maxVal) * barW);

        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, barH / 2); ctx.fill();

        if (prog > 0) {
            const bG = ctx.createLinearGradient(barX, 0, barX + prog, 0);
            bG.addColorStop(0, `rgba(${rgb},0.55)`); bG.addColorStop(1, primary);
            ctx.fillStyle = bG; ctx.shadowColor = primary; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.roundRect(barX, barY, prog, barH, barH / 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#fff"; ctx.shadowColor = primary; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(barX + prog, barY + barH / 2, barH / 2 + 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.font = `bold 21px ${FNT}`; ctx.fillStyle = primary;
        ctx.shadowColor = primary; ctx.shadowBlur = 8;
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(fmtShort(u.value), W - 30, rowY + ROW_H / 2); ctx.shadowBlur = 0;

        rowY += ROW_H;
    }

    ctx.font = `11px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`GoatBot  ◈  ${moment().tz(TZ).format("DD/MM/YYYY  HH:mm")}`, W / 2, H - FOOT_H / 2);

    const bG = ctx.createLinearGradient(0, 0, W, H);
    bG.addColorStop(0, `rgba(${rgb},0.5)`); bG.addColorStop(1, `rgba(${rgb},0.3)`);
    ctx.strokeStyle = bG; ctx.lineWidth = 2;
    ctx.shadowColor = primary; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.roundRect(5, 5, W - 10, H - 10, 16); ctx.stroke(); ctx.shadowBlur = 0;
    corners(ctx, W, H, primary);

    return canvas.toBuffer("image/png");
}

module.exports = {
    config: {
        name:        "top",
        version:     "1.0.0",
        author:      "SIFAT",
        countDown:   10,
        role:        0,
        description: { en: "Beautiful top leaderboard image card with themes & custom bg." },
        category:    "info",
        guide: {
            en:
                "   {pn}           → top 10 money\n" +
                "   {pn} exp       → top 15 exp\n" +
                "   {pn} cmd       → top 20 commands\n" +
                "   {pn} bg        → show bg info\n" +
                "   {pn} bg <url>  → set custom background\n" +
                "   {pn} bg reset  → remove custom bg\n" +
                "\n   🎨 Theme auto-cycles every use (12 themes)\n" +
                "   🌄 Supported bg: catbox, imgur, ibb, uguu, telegra.ph, discord cdn, postimg",
        },
    },

    onLoad: async function () {
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
            } catch (e) { console.error("[top] font:", e.message); }
        }
    },

    onChat: async function ({ event }) {
        const { body, senderID } = event;
        if (!body || !senderID) return;
        const prefix = global.GoatBot?.config?.prefix || ".";
        if (!body.startsWith(prefix)) return;
        const cmd = body.slice(prefix.length).trim().split(/\s+/)[0]?.toLowerCase();
        if (!cmd || cmd === "top") return;
        const d = readCmdData(); d[cmd] = (d[cmd] || 0) + 1; writeCmdData(d);
    },

    onStart: async function ({ args, message, usersData, event }) {
        const sub  = (args[0] || "").toLowerCase();
        const bgStore = readBgData();
        const threadID = event?.threadID || "global";

        if (sub === "bg") {
            const val = (args[1] || "").toLowerCase();

            if (!val || val === "list") {
                const current = bgStore[threadID] ? `\n\n🖼️ Current custom BG:\n${bgStore[threadID]}` : "\n\n🎲 Using random default backgrounds.";
                const defList = DEFAULT_BACKGROUNDS.map((u, i) => `${i + 1}. ${u}`).join("\n");
                return message.reply(`🌄 Default Backgrounds:\n${defList}${current}\n\n📌 Commands:\n• top bg <url> — set custom bg\n• top bg reset — remove custom bg`);
            }

            if (val === "reset") {
                delete bgStore[threadID];
                writeBgData(bgStore);
                return message.reply("✅ Custom background removed. Now using random default backgrounds.");
            }

            const rawUrl = args[1] || "";
            if (!rawUrl.match(/^https?:\/\//i)) return message.reply("❌ Invalid URL.");

            const allowed = [
                "catbox.moe", "files.catbox.moe",
                "i.imgur.com", "imgur.com",
                "i.ibb.co", "ibb.co",
                "uguu.se", "d.uguu.se",
                "telegra.ph", "graph.org",
                "cdn.discordapp.com", "media.discordapp.net",
                "postimg.cc", "i.postimg.cc",
            ];
            let host;
            try { host = new URL(rawUrl).hostname; } catch { return message.reply("❌ Invalid URL."); }
            if (!allowed.some(d => host.endsWith(d))) {
                return message.reply(`❌ URL not allowed.\n✅ Supported: catbox, imgur, ibb, uguu, telegra.ph, discord cdn, postimg`);
            }

            bgStore[threadID] = rawUrl;
            writeBgData(bgStore);
            return message.reply(`✅ Custom background set!\n🔗 ${rawUrl}`);
        }

        const wait = await message.reply("⏳ Building card...");

        try {
            let users = [], topN = 10, theme;
            const cycledName = nextTopTheme(threadID, bgStore);
            const customBg   = bgStore[threadID] || null;

            if (sub === "exp") {
                topN = 15;
                theme = { ...THEMES[cycledName], label: "EXP LEADERS", icon: "⭐", sub: "TOP EXPERIENCE HOLDERS" };
                const all = await usersData.getAll();
                users = all.filter(u => (u.exp || 0) > 0)
                    .sort((a, b) => b.exp - a.exp).slice(0, topN)
                    .map(u => ({ uid: u.userID, name: u.name || "User", value: u.exp || 0, valueLabel: `Lv ${Math.floor(Math.sqrt(u.exp || 0) / 5) + 1}` }));

            } else if (sub === "cmd") {
                topN = 20;
                theme = { ...THEMES[cycledName], label: "CMD LEADERS", icon: "⚡", sub: "MOST USED COMMANDS" };
                const d = readCmdData();
                users = Object.entries(d).map(([cmd, cnt]) => ({ uid: null, name: `.${cmd}`, value: cnt, noAvatar: true }))
                    .sort((a, b) => b.value - a.value).slice(0, topN);
                if (!users.length) {
                    try { if (wait?.messageID) message.unsend(wait.messageID); } catch {}
                    return message.reply("❌ No command data yet.");
                }
            } else {
                topN = 10;
                theme = { ...THEMES[cycledName], label: "MONEY LEADERS", icon: "💰", sub: "TOP BALANCE HOLDERS" };
                const all = await usersData.getAll();
                users = all.filter(u => (u.money || 0) > 0)
                    .sort((a, b) => b.money - a.money).slice(0, topN)
                    .map(u => ({ uid: u.userID, name: u.name || "User", value: u.money || 0, valueLabel: `$${(u.money || 0).toLocaleString()}` }));
            }

            if (!users.length) {
                try { if (wait?.messageID) message.unsend(wait.messageID); } catch {}
                return message.reply("❌ No data found.");
            }

            const imgBuf  = await buildTopCard(users, theme, topN, customBg);
            const imgPath = path.join(CACHE_DIR, `top_${sub || "money"}_${Date.now()}.png`);
            fs.writeFileSync(imgPath, imgBuf);

            try { if (wait?.messageID) message.unsend(wait.messageID); } catch {}
            await message.reply({ body: "", attachment: fs.createReadStream(imgPath) });
            setTimeout(() => fs.unlink(imgPath).catch(() => {}), 30_000);

        } catch (err) {
            try { if (wait?.messageID) message.unsend(wait.messageID); } catch {}
            console.error("[top]", err);
            message.reply("❌ Error: " + err.message);
        }
    },
};
