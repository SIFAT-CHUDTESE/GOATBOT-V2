"use strict";

const axios  = require("axios");
const fs     = require("fs-extra");
const path   = require("path");
const moment = require("moment-timezone");
const { Canvas, loadImage, registerFont } = require("canvas");

const TZ       = "Asia/Dhaka";
const FONT_DIR = path.resolve(__dirname, "cache", "fonts");
const SPY_BG   = path.resolve(__dirname, "cache", "spy_bg.json");
const UA       = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";
const FNT      = "NotoSans, NotoSansBengali, NotoEmoji, sans-serif";
const FB_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

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

const THEMES = {
    matrix:  { primary: "#00FF41", rgb: "0,255,65",    accent: "#00CC33", dim: "0,180,30",    label: "MATRIX"  },
    ghost:   { primary: "#00E5FF", rgb: "0,229,255",   accent: "#0099CC", dim: "0,160,180",   label: "GHOST"   },
    crimson: { primary: "#FF2244", rgb: "255,34,68",   accent: "#CC0022", dim: "200,20,50",   label: "CRIMSON" },
    violet:  { primary: "#C77DFF", rgb: "199,125,255", accent: "#9933FF", dim: "160,80,220",  label: "VIOLET"  },
    amber:   { primary: "#FFB300", rgb: "255,179,0",   accent: "#FF8F00", dim: "200,140,0",   label: "AMBER"   },
    ice:     { primary: "#7FEFFF", rgb: "127,239,255", accent: "#00CFFF", dim: "80,200,220",  label: "ICE"     },
    rose:    { primary: "#FF6B9D", rgb: "255,107,157", accent: "#FF1493", dim: "220,60,130",  label: "ROSE"    },
    solar:   { primary: "#FF6B35", rgb: "255,107,53",  accent: "#FF4500", dim: "210,80,30",   label: "SOLAR"   },
    emerald: { primary: "#00FF88", rgb: "0,255,136",   accent: "#00CC66", dim: "0,200,100",   label: "EMERALD" },
    neon:    { primary: "#F0FF00", rgb: "240,255,0",   accent: "#CCDD00", dim: "190,210,0",   label: "NEON"    },
    gold:    { primary: "#FFD700", rgb: "255,215,0",   accent: "#FFA500", dim: "210,170,0",   label: "GOLD"    },
    cobalt:  { primary: "#4488FF", rgb: "68,136,255",  accent: "#2255CC", dim: "50,110,220",  label: "COBALT"  },
};
const THEME_NAMES = Object.keys(THEMES);

function readBgData()   { try { return fs.readJsonSync(SPY_BG); } catch { return {}; } }
function writeBgData(d) { try { fs.writeJsonSync(SPY_BG, d, { spaces: 2 }); } catch {} }

function nextTheme(threadID, store) {
    const key = `${threadID}_themeIdx`;
    const idx = ((store[key] ?? -1) + 1) % THEME_NAMES.length;
    store[key] = idx;
    writeBgData(store);
    return THEMES[THEME_NAMES[idx]];
}

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

function encodeUID(uid) {
    return String(uid || "").split("").map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ (0xAA + i * 7))
    ).join("").slice(0, 16).padEnd(16, "█");
}

function hashStr(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) h ^= s.charCodeAt(i), h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    return (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
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
    const i  = String(uid || "0").split("").reduce((s, ch) => s + ch.charCodeAt(0), 0) % COLS.length;
    const g  = cx.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, COLS[i]); g.addColorStop(1, COLS[(i + 3) % COLS.length]);
    cx.fillStyle = g; cx.fillRect(0, 0, 256, 256);
    cx.fillStyle = "rgba(0,0,0,0.3)"; cx.fillRect(0, 0, 256, 256);
    cx.fillStyle = "#fff"; cx.font = "bold 96px NotoSans, sans-serif";
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

async function loadBgImage(url) {
    try { return await loadImage(await fetchImageBuffer(url)); } catch { return null; }
}

function clipCircle(ctx, img, x, y, r) {
    if (!img) return;
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2); ctx.restore();
}

function scanlines(ctx, W, H, alpha = 0.02) {
    for (let y = 0; y < H; y += 4) {
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(0, y, W, 2);
    }
}

function hexGrid(ctx, W, H, rgb, alpha) {
    const s = 22;
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

function glassRect(ctx, x, y, w, h, rgb, r = 10, fillAlpha = 0.07, strokeAlpha = 0.22) {
    ctx.save();
    ctx.fillStyle = `rgba(${rgb},${fillAlpha})`;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = `rgba(${rgb},${strokeAlpha})`; ctx.lineWidth = 1;
    ctx.stroke(); ctx.restore();
}

function drawBg(ctx, W, H, bgImage, theme) {
    const { rgb } = theme;
    if (bgImage) {
        const scale = Math.max(W / bgImage.width, H / bgImage.height);
        const bw = bgImage.width * scale, bh = bgImage.height * scale;
        ctx.drawImage(bgImage, (W - bw) / 2, (H - bh) / 2, bw, bh);
        ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, W, H);
    } else {
        ctx.fillStyle = "#020608"; ctx.fillRect(0, 0, W, H);
        const rg = ctx.createRadialGradient(W * 0.25, H * 0.3, 0, W * 0.25, H * 0.3, W * 0.65);
        rg.addColorStop(0, `rgba(${rgb},0.08)`); rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
        const rg2 = ctx.createRadialGradient(W * 0.82, H * 0.75, 0, W * 0.82, H * 0.75, W * 0.45);
        rg2.addColorStop(0, `rgba(${rgb},0.05)`); rg2.addColorStop(1, "transparent");
        ctx.fillStyle = rg2; ctx.fillRect(0, 0, W, H);
    }
    hexGrid(ctx, W, H, rgb, 0.045);
    scanlines(ctx, W, H, 0.016);
}

function drawBorder(ctx, W, H, primary, rgb) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, `rgba(${rgb},0.8)`); g.addColorStop(0.5, `rgba(${rgb},0.35)`); g.addColorStop(1, `rgba(${rgb},0.8)`);
    ctx.strokeStyle = g; ctx.lineWidth = 1.5;
    ctx.shadowColor = primary; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.roundRect(5, 5, W - 10, H - 10, 16); ctx.stroke(); ctx.shadowBlur = 0;

    const M = 10, sz = 40;
    ctx.strokeStyle = primary; ctx.lineWidth = 3; ctx.lineCap = "square";
    ctx.shadowColor = primary; ctx.shadowBlur = 28;
    for (const [ox, oy, dx, dy] of [[M,M,1,1],[W-M,M,-1,1],[M,H-M,1,-1],[W-M,H-M,-1,-1]]) {
        ctx.beginPath();
        ctx.moveTo(ox, oy + sz * dy); ctx.lineTo(ox, oy); ctx.lineTo(ox + sz * dx, oy);
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
}

function sectionHeader(ctx, title, x, y, endX, rgb, primary) {
    ctx.font = `bold 9px ${FNT}`; ctx.fillStyle = primary;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.letterSpacing = "3px"; ctx.fillText(title, x, y + 5);
    ctx.letterSpacing = "0px";
    const tw = ctx.measureText(title).width + 14;
    ctx.strokeStyle = `rgba(${rgb},0.25)`; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x + tw, y + 5); ctx.lineTo(endX, y + 5); ctx.stroke();
}

function dataField(ctx, label, value, x, y, w, rgb, primary, accent, mono = false) {
    ctx.font = `8px ${FNT}`; ctx.fillStyle = `rgba(${rgb},0.55)`;
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.letterSpacing = "1.5px"; ctx.fillText(label, x, y);
    ctx.letterSpacing = "0px";
    ctx.font = mono ? `bold 13px ${FNT}` : `bold 14px ${FNT}`;
    ctx.fillStyle = mono ? accent : "#fff";
    ctx.shadowColor = mono ? primary : "transparent"; ctx.shadowBlur = mono ? 5 : 0;
    ctx.fillText(fitText(ctx, value, w - 2), x, y + 12);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(${rgb},0.12)`; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(x, y + 32); ctx.lineTo(x + w, y + 32); ctx.stroke();
}

function threatBar(ctx, x, y, w, level, primary, rgb) {
    const filled = Math.round(level * 10);
    const segW   = Math.floor((w - 18) / 10);
    for (let i = 0; i < 10; i++) {
        const sx     = x + i * (segW + 2);
        const active = i < filled;
        if (active) {
            const intensity = 0.45 + (i / 10) * 0.55;
            ctx.fillStyle = i < 4 ? `rgba(0,255,65,${intensity})` : i < 7 ? `rgba(${rgb},${intensity})` : `rgba(255,50,50,${intensity})`;
            ctx.shadowColor = primary; ctx.shadowBlur = 10;
        } else {
            ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.shadowBlur = 0;
        }
        ctx.beginPath(); ctx.roundRect(sx, y, segW, 11, 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
}

function statBar(ctx, label, val, maxVal, x, y, w, h, rgb, primary) {
    const ratio = Math.min(1, maxVal > 0 ? val / maxVal : 0);
    ctx.font = `8px ${FNT}`; ctx.fillStyle = `rgba(${rgb},0.5)`;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.letterSpacing = "1px"; ctx.fillText(label, x, y + h / 2);
    ctx.letterSpacing = "0px";
    const bx = x + 76, bw = w - 76 - 42;
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath(); ctx.roundRect(bx, y + 2, bw, h - 4, 3); ctx.fill();
    if (ratio > 0) {
        const barG = ctx.createLinearGradient(bx, 0, bx + bw * ratio, 0);
        barG.addColorStop(0, `rgba(${rgb},0.5)`); barG.addColorStop(1, primary);
        ctx.fillStyle = barG; ctx.shadowColor = primary; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.roundRect(bx, y + 2, Math.max(6, bw * ratio), h - 4, 3); ctx.fill();
        ctx.shadowBlur = 0;
    }
    ctx.font = `bold 10px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "right";
    ctx.fillText(fmtNum(val), x + w, y + h / 2);
}

async function buildSpyCard(target, requester, theme, bgImage) {
    const { primary, rgb, accent, dim, label } = theme;
    const W        = 1060;
    const LEFT_W   = 370;
    const RX       = LEFT_W + 22;
    const RW       = W - RX - 18;
    const colW     = Math.floor((RW - 10) / 2);
    const rowH     = 40;
    const TOP_H    = 46;
    const FOOT_H   = 32;

    const sections = [
        { title: "IDENTIFICATION", fields: [
            { l: "FACEBOOK UID",   v: target.uid || "N/A",                            mono: true  },
            { l: "DISPLAY NAME",   v: target.name || "Unknown",                       mono: false },
            { l: "GENDER",         v: target.gender || "UNKNOWN",                     mono: false },
            { l: "VANITY URL",     v: target.vanity ? `fb.com/${target.vanity}` : "NOT SET", mono: true },
            { l: "HASH SIGNATURE", v: hashStr(String(target.uid || "")),              mono: true  },
            { l: "ENCODE TOKEN",   v: encodeUID(target.uid),                          mono: true  },
        ]},
        { title: "PROFILE", fields: [
            { l: "PROFILE URL",  v: target.profileUrl || "N/A",                       mono: true  },
            { l: "ACCOUNT TYPE", v: target.isPage ? "FACEBOOK PAGE" : "PERSONAL",    mono: false },
        ]},
        { title: "GROUP INTELLIGENCE", fields: [
            { l: "GROUP NAME",   v: target.threadName || "Private Group",             mono: false },
            { l: "MEMBER COUNT", v: `${target.memberCount || "?"} members`,           mono: false },
            { l: "MSG COUNT",    v: fmtNum(target.msgCount),                          mono: false },
            { l: "MSG RANK",     v: `#${target.rank || "??"}`,                        mono: true  },
            { l: "NICKNAME",     v: target.nickname || "NOT SET",                     mono: false },
            { l: "CLEARANCE",    v: target.isAdmin ? "⬡ ADMIN" : "◇ MEMBER",        mono: false },
        ]},
        { title: "BOT PROFILE", fields: [
            { l: "EXPERIENCE", v: fmtNum(target.exp),          mono: true },
            { l: "BALANCE",    v: `$${fmtNum(target.money)}`,  mono: true },
        ]},
    ];

    const sectionPad = 12;
    const sectionTitleH = 18;
    let totalSectH = 0;
    for (const sec of sections) {
        const rows = Math.ceil(sec.fields.length / 2);
        totalSectH += sectionTitleH + rows * rowH + sectionPad;
    }
    const threatBlockH = sectionTitleH + 14 + 16 + 50 + sectionPad;
    const idBlockH     = 60;
    const bodyH        = idBlockH + totalSectH + threatBlockH + 20;
    const H = Math.max(TOP_H + bodyH + FOOT_H + 30, 780);

    const canvas = new Canvas(W, H);
    const ctx    = canvas.getContext("2d");

    drawBg(ctx, W, H, bgImage, theme);

    const topG = ctx.createLinearGradient(0, 0, W, 0);
    topG.addColorStop(0, "rgba(0,0,0,0)");
    topG.addColorStop(0.05, `rgba(${rgb},0.16)`);
    topG.addColorStop(0.95, `rgba(${rgb},0.16)`);
    topG.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topG; ctx.fillRect(0, 0, W, TOP_H);
    ctx.strokeStyle = `rgba(${rgb},0.35)`; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, TOP_H); ctx.lineTo(W, TOP_H); ctx.stroke();

    ctx.font = `bold 11px ${FNT}`; ctx.fillStyle = primary;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.shadowColor = primary; ctx.shadowBlur = 14;
    ctx.fillText(`◈ GOATBOT  ·  INTEL DOSSIER  ·  PROTOCOL-${label}`, 18, TOP_H / 2);
    ctx.shadowBlur = 0;

    ctx.font = `10px ${FNT}`; ctx.fillStyle = `rgba(${rgb},0.5)`;
    ctx.textAlign = "center";
    ctx.fillText("[ CLASSIFIED — AUTH REQUIRED ]", W / 2, TOP_H / 2);

    ctx.font = `10px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.textAlign = "right";
    ctx.fillText(moment().tz(TZ).format("DD·MM·YYYY  HH:mm:ss"), W - 18, TOP_H / 2);

    const AVX = 185, AVY = TOP_H + 38 + 115, AVR = 112;

    const leftGlow = ctx.createRadialGradient(AVX, AVY, 0, AVX, AVY, 320);
    leftGlow.addColorStop(0, `rgba(${rgb},0.16)`); leftGlow.addColorStop(1, "transparent");
    ctx.fillStyle = leftGlow; ctx.fillRect(0, TOP_H, LEFT_W, H - TOP_H);

    for (const [rr, op, lw] of [[AVR+52, 0.05, 0.7],[AVR+34, 0.09, 0.9],[AVR+18, 0.14, 1.3]]) {
        ctx.strokeStyle = `rgba(${rgb},${op})`; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.arc(AVX, AVY, rr, 0, Math.PI * 2); ctx.stroke();
    }

    const cross = AVR + 64;
    ctx.strokeStyle = `rgba(${rgb},0.1)`; ctx.lineWidth = 0.7; ctx.setLineDash([3, 9]);
    ctx.beginPath(); ctx.moveTo(AVX - cross, AVY); ctx.lineTo(AVX + cross, AVY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(AVX, AVY - cross); ctx.lineTo(AVX, AVY + cross); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = primary; ctx.lineWidth = 3.5;
    ctx.shadowColor = primary; ctx.shadowBlur = 32;
    ctx.beginPath(); ctx.arc(AVX, AVY, AVR + 7, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;

    clipCircle(ctx, await getAvatar(target.uid, target.name), AVX, AVY, AVR);

    for (let deg = 0; deg < 360; deg += 30) {
        const a  = (deg * Math.PI) / 180;
        const ix = AVX + Math.cos(a) * (AVR + 3), iy  = AVY + Math.sin(a) * (AVR + 3);
        const ox = AVX + Math.cos(a) * (AVR + 15), oy = AVY + Math.sin(a) * (AVR + 15);
        ctx.strokeStyle = `rgba(${rgb},${deg % 90 === 0 ? 0.55 : 0.18})`;
        ctx.lineWidth   = deg % 90 === 0 ? 1.5 : 0.8;
        ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ox, oy); ctx.stroke();
    }

    const idY = AVY + AVR + 20;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.beginPath(); ctx.roundRect(AVX - 82, idY, 164, 28, 14); ctx.fill();
    ctx.strokeStyle = primary; ctx.lineWidth = 1.2;
    ctx.shadowColor = primary; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.font = `bold 10px ${FNT}`; ctx.fillStyle = primary;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("TARGET ACQUIRED", AVX, idY + 14);

    ctx.font = `bold 17px ${FNT}`; ctx.fillStyle = "#fff";
    ctx.textBaseline = "top"; ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 8;
    ctx.fillText(fitText(ctx, target.name, 320), AVX, idY + 36);
    ctx.shadowBlur = 0;

    ctx.font = `9px ${FNT}`; ctx.fillStyle = `rgba(${rgb},0.5)`;
    ctx.fillText(`UID · ${target.uid}`, AVX, idY + 60);

    const genderIcon = target.gender === "MALE" ? "♂" : target.gender === "FEMALE" ? "♀" : "⚲";
    const chipY = idY + 82;
    const chips = [
        target.isAdmin ? "⬡ ADMIN" : "◇ MEMBER",
        target.gender ? genderIcon + " " + target.gender : null,
        target.vanity ? "@" + target.vanity : null,
    ].filter(Boolean);
    let chipX = AVX - (chips.reduce((s, c) => s + Math.max(58, c.length * 7 + 18) + 6, -6)) / 2;
    for (const chip of chips) {
        const cw = Math.max(58, chip.length * 7 + 18);
        ctx.fillStyle = `rgba(${rgb},0.1)`;
        ctx.beginPath(); ctx.roundRect(chipX, chipY, cw, 22, 11); ctx.fill();
        ctx.strokeStyle = `rgba(${rgb},0.38)`; ctx.lineWidth = 1; ctx.stroke();
        ctx.font = `bold 8px ${FNT}`; ctx.fillStyle = accent;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(chip, chipX + cw / 2, chipY + 11);
        chipX += cw + 6;
    }

    const statsY = chipY + 36;
    const statsW = LEFT_W - 24;
    glassRect(ctx, 12, statsY, statsW, 120, rgb, 10, 0.06, 0.18);

    ctx.font = `bold 8px ${FNT}`; ctx.fillStyle = `rgba(${rgb},0.6)`;
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.letterSpacing = "2.5px"; ctx.fillText("ACTIVITY INDEX", 22, statsY + 10);
    ctx.letterSpacing = "0px";

    const statBarX = 20, statBarW = statsW - 8;
    const maxMsg = Math.max(target.msgCount || 1, 5000);
    const maxExp = Math.max(target.exp || 1, 10000);
    const maxMon = Math.max(target.money || 1, 50000);
    statBar(ctx, "MESSAGES", target.msgCount || 0, maxMsg, statBarX, statsY + 30, statBarW, 22, rgb, primary);
    statBar(ctx, "EXP",      target.exp || 0,      maxExp, statBarX, statsY + 57, statBarW, 22, rgb, primary);
    statBar(ctx, "BALANCE",  target.money || 0,    maxMon, statBarX, statsY + 84, statBarW, 22, rgb, primary);

    const sigY = statsY + 130;
    const completeness = [target.uid, target.name, target.gender, target.vanity, target.nickname, target.profileUrl]
        .filter(Boolean).length / 6;
    const sigLabel = completeness > 0.85 ? "STRONG" : completeness > 0.5 ? "PARTIAL" : "WEAK";
    const sigColor = completeness > 0.85 ? "#00FF41" : completeness > 0.5 ? accent : "#FF8800";
    glassRect(ctx, 12, sigY, statsW, 42, rgb, 8, 0.05, 0.15);
    ctx.font = `8px ${FNT}`; ctx.fillStyle = `rgba(${rgb},0.5)`;
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.letterSpacing = "2px"; ctx.fillText("SIGNAL STRENGTH", 22, sigY + 8); ctx.letterSpacing = "0px";
    ctx.font = `bold 14px ${FNT}`; ctx.fillStyle = sigColor;
    ctx.shadowColor = sigColor; ctx.shadowBlur = 8;
    ctx.fillText(sigLabel, 22, sigY + 22); ctx.shadowBlur = 0;
    const sigBarX = 22 + 80, sigBarW = statsW - 92;
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath(); ctx.roundRect(sigBarX, sigY + 26, sigBarW, 7, 3); ctx.fill();
    ctx.fillStyle = sigColor; ctx.shadowColor = sigColor; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.roundRect(sigBarX, sigY + 26, Math.max(6, sigBarW * completeness), 7, 3); ctx.fill();
    ctx.shadowBlur = 0;

    const divX = LEFT_W;
    const divG = ctx.createLinearGradient(divX, TOP_H + 20, divX, H - FOOT_H - 20);
    divG.addColorStop(0, "transparent");
    divG.addColorStop(0.1, `rgba(${rgb},0.28)`);
    divG.addColorStop(0.9, `rgba(${rgb},0.28)`);
    divG.addColorStop(1, "transparent");
    ctx.strokeStyle = divG; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(divX, TOP_H + 20); ctx.lineTo(divX, H - FOOT_H - 18); ctx.stroke();

    glassRect(ctx, RX, TOP_H + 14, RW, 52, rgb, 10, 0.07, 0.22);
    ctx.font = `bold 26px ${FNT}`; ctx.fillStyle = primary;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.shadowColor = primary; ctx.shadowBlur = 22;
    ctx.fillText(fitText(ctx, target.name, RW - 160), RX + 16, TOP_H + 14 + 26);
    ctx.shadowBlur = 0;
    ctx.font = `bold 10px ${FNT}`; ctx.fillStyle = accent;
    ctx.textAlign = "right";
    ctx.fillText(`LV.${target.level ?? "?"}  ·  ${label}`, RX + RW - 16, TOP_H + 14 + 26);

    let cy = TOP_H + 14 + 52 + sectionPad;

    for (const sec of sections) {
        sectionHeader(ctx, sec.title, RX, cy, RX + RW, rgb, primary);
        let fy = cy + sectionTitleH;
        for (let i = 0; i < sec.fields.length; i++) {
            const col = i % 2;
            const fx  = RX + col * (colW + 12);
            if (col === 0 && i > 0) fy += rowH;
            dataField(ctx, sec.fields[i].l, sec.fields[i].v, fx, fy, colW - 4, rgb, primary, accent, sec.fields[i].mono);
        }
        cy = fy + rowH + sectionPad;
    }

    sectionHeader(ctx, "THREAT ASSESSMENT", RX, cy, RX + RW, rgb, primary);
    cy += sectionTitleH;

    const tLevel = Math.min(1, (target.msgCount || 0) / 5000);
    const tLabel = tLevel < 0.3 ? "LOW" : tLevel < 0.6 ? "MODERATE" : tLevel < 0.85 ? "HIGH" : "CRITICAL";
    const tColor = tLevel < 0.3 ? "#00FF41" : tLevel < 0.6 ? accent : tLevel < 0.85 ? "#FF8800" : "#FF2244";

    ctx.font = `bold 8px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.letterSpacing = "1.5px"; ctx.fillText("THREAT LEVEL", RX, cy + 6); ctx.letterSpacing = "0px";
    ctx.font = `bold 14px ${FNT}`; ctx.fillStyle = tColor;
    ctx.shadowColor = tColor; ctx.shadowBlur = 12;
    ctx.fillText(tLabel, RX + 100, cy + 6); ctx.shadowBlur = 0;

    threatBar(ctx, RX, cy + 18, RW, tLevel, primary, rgb);

    const statusY = cy + 38;
    const statItems = [
        { label: "STATUS",    value: "◉ ACTIVE",                               col: "#00FF41" },
        { label: "CLEARANCE", value: target.isAdmin ? "⬡ ADMIN" : "◇ MEMBER", col: target.isAdmin ? "#FFD700" : `rgba(${rgb},0.9)` },
        { label: "PROTOCOL",  value: label,                                     col: primary   },
    ];
    let sx = RX;
    const sw = Math.floor((RW - 16) / 3);
    for (const st of statItems) {
        glassRect(ctx, sx, statusY, sw, 44, dim, 8, 0.07, 0.2);
        ctx.font = `7px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.letterSpacing = "1.5px"; ctx.fillText(st.label, sx + 10, statusY + 9); ctx.letterSpacing = "0px";
        ctx.font = `bold 13px ${FNT}`; ctx.fillStyle = st.col;
        ctx.shadowColor = st.col; ctx.shadowBlur = 8;
        ctx.fillText(st.value, sx + 10, statusY + 24); ctx.shadowBlur = 0;
        sx += sw + 8;
    }

    const footY = H - FOOT_H;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, footY, W, FOOT_H);
    ctx.strokeStyle = `rgba(${rgb},0.2)`; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, footY); ctx.lineTo(W, footY); ctx.stroke();

    ctx.font = `8px ${FNT}`; ctx.fillStyle = `rgba(${rgb},0.45)`;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.letterSpacing = "2px";
    ctx.fillText("GOATBOT INTEL  ·  CLASSIFIED", 18, footY + FOOT_H / 2);
    ctx.letterSpacing = "0px";

    ctx.font = `8px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.textAlign = "center";
    ctx.fillText(`REQUESTED BY  ·  ${requester.name || "UNKNOWN"}`, W / 2, footY + FOOT_H / 2);

    ctx.font = `8px ${FNT}`; ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.textAlign = "right";
    ctx.fillText(moment().tz(TZ).format("HH:mm:ss  ·  DD/MM/YYYY"), W - 18, footY + FOOT_H / 2);

    drawBorder(ctx, W, H, primary, rgb);
    return canvas.toBuffer("image/png");
}

module.exports = {
    config: {
        name:        "spy",
        version:     "3.0.0",
        author:      "SIFAT",
        countDown:   8,
        role:        0,
        description: { en: "Full intel dossier — FB profile, group stats, bot data, threat scan" },
        category:    "info",
        guide: {
            en:
                "   {pn}          → spy yourself\n" +
                "   {pn} @tag     → spy on tagged user\n" +
                "   {pn} uid      → spy by UID\n" +
                "   {pn} bg <url> → set custom background\n" +
                "   {pn} bg reset → remove custom bg\n" +
                "\n   🎨 Theme auto-cycles (12 themes)\n" +
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
            } catch (e) { console.error("[spy] font:", e.message); }
        }
    },

    onStart: async function ({ args, message, event, api, threadsData, usersData }) {
        const { threadID, senderID, mentions, messageReply, type } = event;
        const subCmd = (args[0] || "").toLowerCase();
        const store  = readBgData();

        if (subCmd === "bg") {
            const val = (args[1] || "").toLowerCase();
            if (!val || val === "list") {
                const cur = store[threadID]
                    ? `\n\n🖼️ Current: ${store[threadID]}`
                    : "\n\n🎲 Using random default backgrounds.";
                return message.reply(`🌄 Default BGs:\n${DEFAULT_BACKGROUNDS.map((u, i) => `${i + 1}. ${u}`).join("\n")}${cur}`);
            }
            if (val === "reset") {
                delete store[threadID]; writeBgData(store);
                return message.reply("✅ Custom background removed.");
            }
            const rawUrl = args[1] || "";
            if (!rawUrl.match(/^https?:\/\//i)) return message.reply("❌ Invalid URL.");
            let host;
            try { host = new URL(rawUrl).hostname; } catch { return message.reply("❌ Invalid URL."); }
            if (!ALLOWED_BG_HOSTS.some(d => host.endsWith(d)))
                return message.reply("❌ Unsupported host.\n✅ Allowed: catbox, imgur, ibb, uguu, telegra.ph, discord cdn, postimg");
            store[threadID] = rawUrl; writeBgData(store);
            return message.reply(`✅ Background set!\n🔗 ${rawUrl}`);
        }

        const wait = await message.reply("🔍 Accessing intel...");

        try {
            let targetUID = senderID;

            if (type === "message_reply" && messageReply?.senderID) {
                targetUID = messageReply.senderID;
            } else if (Object.keys(mentions || {}).length > 0) {
                targetUID = Object.keys(mentions)[0];
            } else if (subCmd && /^\d{10,}$/.test(subCmd)) {
                targetUID = subCmd;
            }

            const threadData = await threadsData.get(threadID).catch(() => ({}));
            const members    = threadData?.members || [];
            const memberInfo = members.find(m => m.userID == targetUID);

            let fbInfo = null;
            try {
                const res = await new Promise((rs, rj) =>
                    api.getUserInfo([targetUID], (e, r) => e ? rj(e) : rs(r))
                );
                fbInfo = res?.[targetUID];
            } catch {}

            const targetName = fbInfo?.name || memberInfo?.name || await usersData.getName(targetUID).catch(() => null) || "Unknown";

            let threadName  = threadData?.threadName || "Unknown Group";
            let memberCount = members.length;
            let isAdmin     = false;

            try {
                const tInfo = await api.getThreadInfo(threadID);
                threadName  = tInfo?.name || threadName;
                memberCount = tInfo?.participantIDs?.length || memberCount;
                isAdmin     = (tInfo?.adminIDs || []).some(a => (a?.id || a) == targetUID);
            } catch {}

            const sortedMembers = [...members].sort((a, b) => (b.count || 0) - (a.count || 0));
            const rank = sortedMembers.findIndex(m => m.userID == targetUID) + 1;

            const requesterInfo = members.find(m => m.userID == senderID);
            const requesterName = requesterInfo?.name || await usersData.getName(senderID).catch(() => null) || "Unknown";

            let botUserData = null;
            try { botUserData = await usersData.get(targetUID); } catch {}

            const theme   = nextTheme(threadID, store);
            const bgUrl   = store[threadID] || DEFAULT_BACKGROUNDS[Math.floor(Math.random() * DEFAULT_BACKGROUNDS.length)];
            const bgImage = await loadBgImage(bgUrl);

            const target = {
                uid:        targetUID,
                name:       targetName,
                threadName,
                memberCount,
                msgCount:   memberInfo?.count || 0,
                rank:       rank || "??",
                isAdmin,
                nickname:   memberInfo?.nickname || null,
                gender:     fbInfo?.gender ? String(fbInfo.gender).toUpperCase() : null,
                vanity:     fbInfo?.vanity || null,
                profileUrl: fbInfo?.profileUrl || (fbInfo?.vanity ? `https://fb.com/${fbInfo.vanity}` : `https://fb.com/${targetUID}`),
                isPage:     fbInfo?.type === "page",
                exp:        botUserData?.exp || 0,
                money:      botUserData?.money || 0,
                level:      botUserData?.exp ? Math.floor(Math.sqrt(botUserData.exp) / 5) + 1 : 1,
            };

            const requester = { uid: senderID, name: requesterName };
            const imgBuf    = await buildSpyCard(target, requester, theme, bgImage);
            const imgPath   = path.resolve(__dirname, "cache", `spy_${targetUID}_${Date.now()}.png`);
            fs.ensureDirSync(path.resolve(__dirname, "cache"));
            fs.writeFileSync(imgPath, imgBuf);

            try { if (wait?.messageID) message.unsend(wait.messageID); } catch {}
            await message.reply({ body: "", attachment: fs.createReadStream(imgPath) });
            setTimeout(() => fs.unlink(imgPath).catch(() => {}), 30_000);

        } catch (err) {
            try { if (wait?.messageID) message.unsend(wait.messageID); } catch {}
            console.error("[spy]", err);
            message.reply("❌ Error: " + err.message);
        }
    },
};
