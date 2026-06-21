"use strict";

const axios  = require("axios");
const fs     = require("fs-extra");
const path   = require("path");

let createCanvas, loadImage;
try { ({ createCanvas, loadImage } = require("canvas")); } catch {}

const BASE    = "https://xncdi.vercel.app";
const TMP_DIR = path.join(process.cwd(), "scripts", "tmp");
fs.ensureDirSync(TMP_DIR);

const truncate = (str = "", max = 50) => str.length > max ? str.slice(0, max - 1) + "…" : str;

const QUALITY_COLOR = (q = "") =>
    q.includes("1080") ? "#1e7aff" :
    q.includes("720")  ? "#22bb55" :
    q.includes("480")  ? "#e6a800" : "#888888";

const THUMB_GRADIENTS = [
    ["#3d0c0c", "#7a1a1a"],
    ["#0c1e3d", "#1a3a7a"],
    ["#0c3d1a", "#1a7a35"],
    ["#2a0c3d", "#501a7a"],
    ["#3d2a0c", "#7a551a"],
    ["#0c3d3d", "#1a7070"],
    ["#3d3d0c", "#7a7a1a"],
    ["#1a0c3d", "#351a7a"],
];

function react(botApi, event, emoji) {
    try { botApi.setMessageReaction(emoji, event.messageID, () => {}, true); } catch (_) {}
}

async function fetchRetry(url, params = {}, timeout = 20000) {
    for (let i = 0; i < 3; i++) {
        try {
            return await axios.get(url, { params, timeout });
        } catch (err) {
            if (i === 2) throw err;
            await new Promise(r => setTimeout(r, 1500));
        }
    }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = text.split(" ");
    let line = "", linesDrawn = 0;
    for (let i = 0; i < words.length; i++) {
        const test = line + (line ? " " : "") + words[i];
        if (ctx.measureText(test).width > maxWidth && line) {
            if (linesDrawn >= maxLines - 1) { ctx.fillText(line.trimEnd() + "…", x, y); return; }
            ctx.fillText(line, x, y);
            y += lineHeight;
            linesDrawn++;
            line = words[i];
        } else {
            line = test;
        }
    }
    if (line && linesDrawn < maxLines) ctx.fillText(line, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

async function makeXncdiCard(results, query, isTrending) {
    if (!createCanvas) return null;

    const COLS = 4, ROWS = Math.ceil(Math.min(results.length, 8) / COLS);
    const THUMB_W = 192, THUMB_H = 108, INFO_H = 52, GAP = 6;
    const PAD_X = 12, PAD_Y = 12, HEADER_H = 58, FOOTER_H = 36;
    const W = PAD_X * 2 + COLS * THUMB_W + (COLS - 1) * GAP;
    const H = HEADER_H + PAD_Y + ROWS * (THUMB_H + INFO_H + GAP) - GAP + PAD_Y + FOOTER_H;

    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext("2d");
    ctx.antialias = "subpixel";

    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, W, H);

    const hGrad = ctx.createLinearGradient(0, 0, W, HEADER_H);
    hGrad.addColorStop(0, "#c0170f");
    hGrad.addColorStop(1, "#8c0f09");
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, W, HEADER_H);

    ctx.fillStyle = "#ffffff";
    ctx.font      = "bold 28px sans-serif";
    ctx.fillText("XNXX", PAD_X, 38);

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(74, 16, 2, 28);

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font      = "14px sans-serif";
    ctx.fillText(isTrending ? `🔥 Trending${query ? " — " + query : ""}` : `🔍 ${truncate(query, 38)}`, 84, 36);

    const countLabel = `${results.length} videos`;
    const countW     = ctx.measureText(countLabel).width + 16;
    ctx.fillStyle    = "rgba(0,0,0,0.4)";
    roundRect(ctx, W - PAD_X - countW, 17, countW, 22, 11);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font      = "bold 11px sans-serif";
    ctx.fillText(countLabel, W - PAD_X - countW + 8, 32);

    const dotColors = ["#ff5f56", "#ffbd2e", "#27c93f"];
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = dotColors[i];
        ctx.beginPath();
        ctx.arc(PAD_X + i * 18, HEADER_H - 10, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let i = 0; i < Math.min(results.length, 8); i++) {
        const r   = results[i];
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x   = PAD_X + col * (THUMB_W + GAP);
        const y   = HEADER_H + PAD_Y + row * (THUMB_H + INFO_H + GAP);

        const [gc1, gc2] = THUMB_GRADIENTS[i % THUMB_GRADIENTS.length];
        const tGrad      = ctx.createLinearGradient(x, y, x + THUMB_W, y + THUMB_H);
        tGrad.addColorStop(0, gc1);
        tGrad.addColorStop(1, gc2);
        ctx.fillStyle = tGrad;
        roundRect(ctx, x, y, THUMB_W, THUMB_H, 4);
        ctx.fill();

        const thumbUrl = r.thumbnail || r.thumb || r.image || r.cover || null;
        if (thumbUrl && loadImage) {
            try {
                const img = await loadImage(thumbUrl);
                ctx.save();
                roundRect(ctx, x, y, THUMB_W, THUMB_H, 4);
                ctx.clip();
                ctx.drawImage(img, x, y, THUMB_W, THUMB_H);
                ctx.restore();
            } catch {}
        }

        const vigGrad = ctx.createLinearGradient(x, y, x, y + THUMB_H);
        vigGrad.addColorStop(0, "rgba(0,0,0,0)");
        vigGrad.addColorStop(0.6, "rgba(0,0,0,0.15)");
        vigGrad.addColorStop(1, "rgba(0,0,0,0.65)");
        ctx.fillStyle = vigGrad;
        roundRect(ctx, x, y, THUMB_W, THUMB_H, 4);
        ctx.fill();

        const cx = x + THUMB_W / 2, cy = y + THUMB_H / 2;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy - 10);
        ctx.lineTo(cx - 7, cy + 10);
        ctx.lineTo(cx + 12, cy);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#c0170f";
        roundRect(ctx, x + 5, y + 5, 24, 20, 3);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font      = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(i + 1), x + 17, y + 19);
        ctx.textAlign = "left";

        const dur = r.duration || "";
        if (dur) {
            const dW = ctx.measureText(dur).width + 10;
            ctx.fillStyle = "rgba(0,0,0,0.82)";
            roundRect(ctx, x + THUMB_W - dW - 5, y + THUMB_H - 22, dW, 17, 3);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font      = "bold 11px sans-serif";
            ctx.fillText(dur, x + THUMB_W - dW - 1, y + THUMB_H - 9);
        }

        const qual = r.quality || "";
        if (qual) {
            const qW = ctx.measureText(qual).width + 10;
            ctx.fillStyle = QUALITY_COLOR(qual);
            roundRect(ctx, x + 5, y + THUMB_H - 22, qW, 17, 3);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.font      = "bold 10px sans-serif";
            ctx.fillText(qual, x + 9, y + THUMB_H - 9);
        }

        ctx.fillStyle = "#1c1c1c";
        ctx.fillRect(x, y + THUMB_H, THUMB_W, INFO_H);
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(x, y + THUMB_H + INFO_H - 1, THUMB_W, 1);

        ctx.fillStyle = "#e8e8e8";
        ctx.font      = "12px sans-serif";
        wrapText(ctx, r.title || "─", x + 5, y + THUMB_H + 15, THUMB_W - 10, 15, 2);

        ctx.fillStyle = "#777777";
        ctx.font      = "10px sans-serif";
        ctx.fillText(
            [r.views ? `👁 ${r.views}` : "", r.rating ? `⭐ ${r.rating}` : ""].filter(Boolean).join("  "),
            x + 5, y + THUMB_H + 46
        );
    }

    const fGrad = ctx.createLinearGradient(0, H - FOOTER_H, W, H);
    fGrad.addColorStop(0, "#8c0f09");
    fGrad.addColorStop(1, "#c0170f");
    ctx.fillStyle = fGrad;
    ctx.fillRect(0, H - FOOTER_H, W, FOOTER_H);

    ctx.fillStyle = "#ffffff";
    ctx.font      = "bold 13px sans-serif";
    ctx.fillText("⬆ Reply 1–8 to stream", PAD_X, H - FOOTER_H + 23);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font      = "11px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("xncdi", W - PAD_X, H - FOOTER_H + 23);
    ctx.textAlign = "left";

    return canvas;
}

module.exports = {
    config: {
        name:        "xncdi",
        aliases:     ["xvideo", "xnxx", "xv"],
        version:     "6.0.0",
        author:      "SIFAT",
        countDown:   15,
        role:        2,
        category:    "18+",
        description: { en: "Search & stream 18+ videos from xncdi" },
        guide:       { en: "{pn} [keyword]\n{pn} trending [category]" },
    },

    onStart: async function ({ args, event, message, api: botApi, commandName }) {
        const { senderID } = event;

        if (!args[0]) {
            react(botApi, event, "❌");
            return message.reply(
                "🔞 xɴᴄᴅɪ — ᴜꜱᴀɢᴇ\n" +
                "━━━━━━━━━━━━━━━━\n" +
                "◈ .xncdi [keyword]\n" +
                "◈ .xncdi trending\n" +
                "◈ .xncdi trending bangla\n" +
                "◈ .xncdi trending hentai"
            );
        }

        const isTrending = args[0].toLowerCase() === "trending";
        const query      = isTrending ? args.slice(1).join(" ").trim() : args.join(" ").trim();

        react(botApi, event, "🔍");

        try {
            let results;
            if (isTrending) {
                const { data } = await fetchRetry(`${BASE}/trending`, query ? { category: query } : {});
                results = (data.results || data || []).slice(0, 8);
            } else {
                const { data } = await fetchRetry(`${BASE}/search`, { q: query, page: 1, sort: "relevance" });
                results = (data.results || []).slice(0, 8);
            }

            if (!results.length) {
                react(botApi, event, "❌");
                return message.reply(`⌀ ɴᴏ ʀᴇꜱᴜʟᴛꜱ ꜰᴏʀ "${query || "trending"}"`);
            }

            react(botApi, event, "✅");

            const imgPath = path.join(TMP_DIR, `xncdi_list_${Date.now()}.jpg`);
            let sent;

            const card = await makeXncdiCard(results, query, isTrending);
            if (card) {
                await fs.writeFile(imgPath, card.toBuffer("image/jpeg", { quality: 0.92 }));
                sent = await message.reply({ body: "", attachment: fs.createReadStream(imgPath) });
                setTimeout(() => fs.unlink(imgPath).catch(() => {}), 30_000);
            } else {
                sent = await message.reply(
                    `🔞 ${isTrending ? "Trending" : `"${truncate(query, 30)}"`}\n` +
                    `━━━━━━━━━━━━━━━━\n\n` +
                    results.map((r, i) =>
                        `[${i + 1}] ${truncate(r.title)}\n    ⏱ ${r.duration || "?"} │ 👁 ${r.views || "?"} │ ${r.quality || "?"}`
                    ).join("\n\n") +
                    `\n\n━━━━━━━━━━━━━━━━\n◈ ʀᴇᴘʟʏ 1-${results.length} ᴛᴏ ꜱᴛʀᴇᴀᴍ`
                );
            }

            if (sent?.messageID) {
                global.GoatBot.onReply.set(sent.messageID, {
                    commandName,
                    messageID: sent.messageID,
                    author:    senderID,
                    results,
                });
            }

        } catch (err) {
            react(botApi, event, "❌");
            return message.reply(`⌀ ꜰᴀɪʟᴇᴅ: ${err.message}`);
        }
    },

    onReply: async function ({ event, Reply, message, api: botApi }) {
        if (event.senderID !== Reply.author) return;

        const num = parseInt(event.body?.trim());
        if (isNaN(num) || num < 1 || num > Reply.results.length) {
            return message.reply(`⌀ ᴇɴᴛᴇʀ 1–${Reply.results.length}`);
        }

        react(botApi, event, "📥");

        try { botApi.unsendMessage(Reply.messageID); } catch {}
        global.GoatBot.onReply.delete(Reply.messageID);

        const selected = Reply.results[num - 1];

        try {
            const { data } = await fetchRetry(`${BASE}/video-source`, { url: selected.url }, 35000);

            const streamUrl =
                data.best || data.hq || data.lq ||
                Object.values(data.qualities || {})[0] || null;

            if (!streamUrl) {
                react(botApi, event, "❌");
                return message.reply("⌀ ɴᴏ ꜱᴛʀᴇᴀᴍ ᴜʀʟ ꜰᴏᴜɴᴅ");
            }

            const tmpPath = path.join(TMP_DIR, `xncdi_${Date.now()}.mp4`);
            const writer  = fs.createWriteStream(tmpPath);
            const res     = await axios({
                method: "get", url: streamUrl, responseType: "stream",
                timeout: 120000,
            });

            await new Promise((resolve, reject) => {
                res.data.pipe(writer);
                writer.on("finish", resolve);
                writer.on("error", reject);
                res.data.on("error", reject);
            });

            const stat = fs.statSync(tmpPath);
            if (stat.size < 1024) {
                fs.unlink(tmpPath).catch(() => {});
                react(botApi, event, "❌");
                return message.reply("⌀ ᴇᴍᴘᴛʏ ꜰɪʟᴇ — ʀᴇᴛʀʏ");
            }

            react(botApi, event, "✅");
            await message.reply({ body: "", attachment: fs.createReadStream(tmpPath) });
            setTimeout(() => fs.unlink(tmpPath).catch(() => {}), 30_000);

        } catch (err) {
            react(botApi, event, "❌");
            return message.reply(`⌀ ꜱᴛʀᴇᴀᴍ ꜰᴀɪʟᴇᴅ: ${err.message}`);
        }
    },
};
