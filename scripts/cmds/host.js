"use strict";

const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");

const CONFIG_RAW  = "https://raw.githubusercontent.com/MYB-SIFU/SIFATChudtese/refs/heads/main/sifatapichudtese.json";
const TIMEOUT     = 60000;
const MAX_BYTES   = 200 * 1024 * 1024;

let _apiBase = null;
let _apiLastFetch = 0;

async function getApiBase() {
    const now = Date.now();
    if (_apiBase && now - _apiLastFetch < 5 * 60 * 1000) return _apiBase;
    try {
        const { data } = await axios.get(CONFIG_RAW, { timeout: 10000 });
        if (data?.album) {
            _apiBase = data.album.replace(/\/$/, "");
            _apiLastFetch = now;
            return _apiBase;
        }
    } catch {}
    if (_apiBase) return _apiBase;
    return "https://album-api-hub-production.up.railway.app";
}

function extractUrl(attach) {
    if (!attach) return null;
    const direct = [
        attach.url, attach.playbackUrl, attach.videoUrl, attach.audioUrl,
        attach.imageUrl, attach.largePreviewUrl, attach.previewUrl,
        attach.thumbnailUrl, attach.link, attach.uri, attach.src,
        attach.sdUrl, attach.hdUrl, attach.streamUrl, attach.fbUrl,
        attach.share?.link, attach.share?.url,
        attach.share?.playbackUrl, attach.share?.previewUrl,
    ];
    for (const u of direct) {
        if (typeof u === "string" && u.startsWith("http")) return u;
    }
    function dig(obj, d) {
        if (d > 5 || !obj || typeof obj !== "object") return null;
        const vals = Object.values(obj);
        for (const v of vals) {
            if (typeof v === "string" && v.startsWith("http") &&
                /fbcdn|\.mp4|\.mp3|\.jpg|\.png|video|audio|media/i.test(v)) return v;
        }
        for (const v of vals) {
            if (typeof v === "string" && v.startsWith("http") && v.length > 20) return v;
            if (v && typeof v === "object") { const f = dig(v, d + 1); if (f) return f; }
        }
        return null;
    }
    return dig(attach, 0);
}

function guessExt(mime, attachType, urlStr) {
    const m = (mime || "").split(";")[0].trim().toLowerCase();
    const map = {
        "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
        "video/x-matroska": "mkv", "video/mpeg": "mp4", "video/3gpp": "mp4",
        "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif",
        "image/webp": "webp", "image/svg+xml": "svg",
        "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/ogg": "ogg",
        "audio/wav": "wav", "audio/flac": "flac", "audio/aac": "aac",
    };
    if (attachType === "audio") return "mp3";
    if (attachType === "photo") return "jpg";
    if (map[m]) return map[m];
    if (m.startsWith("video") || attachType === "video") return "mp4";
    if (m.startsWith("audio")) return "mp3";
    if (m.startsWith("image")) return "jpg";
    if (urlStr) {
        try {
            const ext = path.extname(new URL(urlStr).pathname).slice(1).toLowerCase();
            if (ext && ext.length <= 5) return ext;
        } catch {}
    }
    return "bin";
}

function fmtB(b) {
    if (!b || b === 0) return "0 B";
    const i = Math.floor(Math.log(Math.max(b, 1)) / Math.log(1024));
    return (b / Math.pow(1024, i)).toFixed(2) + " " + ["B", "KB", "MB", "GB"][i];
}

function timeAgo(iso) {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function typeIcon(mime) {
    const t = (mime || "").split("/")[0];
    return t === "video" ? "🎬" : t === "audio" ? "🎵" : t === "image" ? "🖼️" : "📄";
}

async function downloadBuf(url) {
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: TIMEOUT,
        maxContentLength: MAX_BYTES,
        headers: {
            "User-Agent":     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            "Accept":         "*/*",
            "Accept-Language":"en-US,en;q=0.9",
            "Referer":        "https://www.facebook.com/",
            "Origin":         "https://www.facebook.com",
            "Sec-Fetch-Dest": "video",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "cross-site",
        },
    });
    return { buf: Buffer.from(res.data), mime: res.headers["content-type"] || "application/octet-stream" };
}

async function uploadBuf(buf, filename, mimeType) {
    const API = await getApiBase();
    const { data } = await axios.post(`${API}/api/host/base64`, {
        filename, base64: buf.toString("base64"), mimeType,
    }, { timeout: TIMEOUT });
    if (!data.success) throw new Error(data.error || "Upload failed");
    return data.file;
}

async function resolveViaApi(api, attach) {
    const videoID = String(attach.ID || attach.id || "").trim();
    if (!videoID || videoID === "0") return null;
    function httpGet(url, form) {
        return new Promise((resolve, reject) => {
            if (typeof api.httpGet !== "function") return reject(new Error("no httpGet"));
            api.httpGet(url, form || {}, (err, body) => err ? reject(err) : resolve(body || ""));
        });
    }
    function parse(body) {
        if (typeof body !== "string") return null;
        const pats = [
            /"playable_url_quality_hd":"([^"]+)"/,
            /"playable_url":"([^"]+)"/,
            /sd_src\s*:\s*"([^"]+)"/,
            /hd_src\s*:\s*"([^"]+)"/,
            /"src":"(https:[^"]*fbcdn[^"]*\.mp4[^"]*)"/,
            /https:\/\/[^\s"'<>]*fbcdn[^\s"'<>]*\.mp4[^\s"'<>]*/,
        ];
        for (const p of pats) {
            const m = body.match(p);
            if (m) return (m[1] || m[0]).replace(/\\u0025/g, "%").replace(/\\\//g, "/").replace(/\\/g, "");
        }
        return null;
    }
    try { const u = parse(await httpGet("https://www.facebook.com/messages/attachment/download/", { attach_id: videoID })); if (u) return u; } catch {}
    return null;
}

function buildSuccessMsg(file, note) {
    return [
        "╔═══════════════════════╗",
        "║  ✅  𝗨𝗣𝗟𝗢𝗔𝗗 𝗦𝗨𝗖𝗖𝗘𝗦𝗦  ║",
        "╚═══════════════════════╝",
        `🔗 ʟɪɴᴋ  : ${file.url}`,
        `📄 ɴᴀᴍᴇ  : ${file.originalName}`,
        `📦 ꜱɪᴢᴇ  : ${fmtB(file.size)}`,
        `🆔 ɪᴅ    : ${file.id}`,
        `💡 ${note || "ꜱʜᴀʀᴇ ᴛʜɪꜱ ʟɪɴᴋ ᴡɪᴛʜ ᴀɴʏᴏɴᴇ!"}`,
    ].join("\n");
}

module.exports = {
    config: {
        name:        "host",
        aliases:     ["upload", "cdn"],
        version:     "5.0.0",
        author:      "SIFAT",
        countDown:   5,
        role:        0,
        description: { en: "ᴜᴘʟᴏᴀᴅ ᴀɴʏ ᴍᴇᴅɪᴀ ᴀɴᴅ ɢᴇᴛ ᴀ ᴘᴇʀᴍᴀɴᴇɴᴛ ꜱʜᴀʀᴇᴀʙʟᴇ ʟɪɴᴋ" },
        category:    "media",
        guide: {
            en: "   {pn}              — ʀᴇᴘʟʏ ᴛᴏ ᴀɴʏ ᴍᴇᴅɪᴀ\n" +
                "   {pn} url <link>   — ᴜᴘʟᴏᴀᴅ ꜰʀᴏᴍ ᴜʀʟ\n" +
                "   {pn} list         — ʀᴇᴄᴇɴᴛ ᴜᴘʟᴏᴀᴅꜱ\n" +
                "   {pn} del <id>     — ᴅᴇʟᴇᴛᴇ ꜰɪʟᴇ\n" +
                "   {pn} info <id>    — ꜰɪʟᴇ ᴅᴇᴛᴀɪʟꜱ\n" +
                "   {pn} debug        — ᴅᴇʙᴜɢ ᴀᴛᴛᴀᴄʜᴍᴇɴᴛ"
        },
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID, messageReply } = event;
        const sub = (args[0] || "").toLowerCase();

        if (sub === "debug") {
            if (!messageReply?.attachments?.length)
                return api.sendMessage("❌ ʀᴇᴘʟʏ ᴛᴏ ᴀ ᴍᴇᴅɪᴀ ᴍᴇꜱꜱᴀɢᴇ ꜰɪʀꜱᴛ, ᴛʜᴇɴ: host debug", threadID, messageID);
            const attach = messageReply.attachments[0];
            const info = {};
            for (const k of Object.keys(attach)) {
                const v = attach[k];
                if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
                    info[k] = typeof v === "string" && v.length > 80 ? v.slice(0, 80) + "…" : v;
                else if (v && typeof v === "object")
                    info[k] = JSON.stringify(v).slice(0, 100);
            }
            const url = extractUrl(attach);
            const API = await getApiBase();
            return api.sendMessage(
                [
                    "🔍 𝗗𝗘𝗕𝗨𝗚 𝗥𝗘𝗣𝗢𝗥𝗧",
                    `━━━━━━━━━━━━━━━━━`,
                    `🌐 ᴀᴘɪ   : ${API}`,
                    `📎 ᴛʏᴘᴇ  : ${attach.type || "unknown"}`,
                    `🔗 ᴜʀʟ   : ${url ? "✅ ꜰᴏᴜɴᴅ" : "❌ ɴᴏᴛ ꜰᴏᴜɴᴅ"}`,
                    `━━━━━━━━━━━━━━━━━`,
                    ...Object.entries(info).map(([k, v]) => `${k}: ${v}`),
                ].join("\n"),
                threadID, messageID
            );
        }

        if (sub === "list") {
            try {
                const API = await getApiBase();
                const { data } = await axios.get(`${API}/api/host/list?limit=12`, { timeout: 15000 });
                if (!data.files?.length)
                    return api.sendMessage(
                        "📭 ɴᴏ ʜᴏꜱᴛᴇᴅ ꜰɪʟᴇꜱ ʏᴇᴛ.\nʀᴇᴘʟʏ ᴛᴏ ᴀɴʏ ᴍᴇᴅɪᴀ ᴀɴᴅ ᴛʏᴘᴇ host ᴛᴏ ᴜᴘʟᴏᴀᴅ.",
                        threadID, messageID
                    );
                const lines = data.files.map((f, i) => {
                    const ic = typeIcon(f.mimeType);
                    return `${i + 1}. ${ic} ${f.originalName}\n   🆔 ${f.id}  📦 ${fmtB(f.size)}  🕐 ${timeAgo(f.uploadedAt)}\n   🔗 ${f.url}`;
                }).join("\n\n");
                return api.sendMessage(
                    [
                        "╔════════════════════╗",
                        "║  🗂️  𝗛𝗢𝗦𝗧𝗘𝗗 𝗙𝗜𝗟𝗘𝗦  ║",
                        "╚════════════════════╝",
                        `📊 ᴛᴏᴛᴀʟ: ${data.total} ꜰɪʟᴇꜱ · ${fmtB(data.totalSize)}`,
                        "",
                        lines,
                        "",
                        "━━━━━━━━━━━━━━━━━━━━",
                        "📌 host del <id>  →  ᴅᴇʟᴇᴛᴇ",
                        "📌 host info <id> →  ᴅᴇᴛᴀɪʟꜱ",
                    ].join("\n"),
                    threadID, messageID
                );
            } catch (e) {
                return api.sendMessage(`❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ʟᴏᴀᴅ ʟɪꜱᴛ: ${e.message}`, threadID, messageID);
            }
        }

        if (sub === "del" || sub === "delete") {
            const id = args[1];
            if (!id) return api.sendMessage("❌ ᴜꜱᴀɢᴇ: host del <id>", threadID, messageID);
            try {
                const API = await getApiBase();
                const { data } = await axios.delete(`${API}/api/host/${id}`, { timeout: 10000 });
                return api.sendMessage(
                    [
                        "🗑️ 𝗗𝗘𝗟𝗘𝗧𝗘𝗗 𝗦𝗨𝗖𝗖𝗘𝗦𝗦𝗙𝗨𝗟𝗟𝗬",
                        `━━━━━━━━━━━━━━━━━`,
                        `🆔 ɪᴅ   : ${id}`,
                        `📄 ꜰɪʟᴇ : ${data.file?.originalName || "—"}`,
                    ].join("\n"),
                    threadID, messageID
                );
            } catch (e) {
                return api.sendMessage(`❌ ᴅᴇʟᴇᴛᴇ ꜰᴀɪʟᴇᴅ: ${e.response?.data?.error || e.message}`, threadID, messageID);
            }
        }

        if (sub === "info") {
            const id = args[1];
            if (!id) return api.sendMessage("❌ ᴜꜱᴀɢᴇ: host info <id>", threadID, messageID);
            try {
                const API = await getApiBase();
                const { data } = await axios.get(`${API}/api/host/info/${id}`, { timeout: 10000 });
                if (!data.file) return api.sendMessage(`❌ ꜰɪʟᴇ [${id}] ɴᴏᴛ ꜰᴏᴜɴᴅ.`, threadID, messageID);
                const f  = data.file;
                const ic = typeIcon(f.mimeType);
                return api.sendMessage(
                    [
                        `${ic} 𝗙𝗜𝗟𝗘 𝗜𝗡𝗙𝗢`,
                        `━━━━━━━━━━━━━━━━━`,
                        `🆔 ɪᴅ      : ${f.id}`,
                        `📄 ɴᴀᴍᴇ    : ${f.originalName}`,
                        `📦 ꜱɪᴢᴇ    : ${fmtB(f.size)}`,
                        `🎞️  ᴛʏᴘᴇ    : ${f.mimeType || "unknown"}`,
                        `🕐 ᴜᴘʟᴏᴀᴅ  : ${timeAgo(f.uploadedAt)}`,
                        `🔗 ʟɪɴᴋ    : ${f.url}`,
                    ].join("\n"),
                    threadID, messageID
                );
            } catch (e) {
                return api.sendMessage(`❌ ${e.response?.data?.error || e.message}`, threadID, messageID);
            }
        }

        if (sub === "url") {
            const dlUrl = args[1];
            if (!dlUrl || !dlUrl.startsWith("http"))
                return api.sendMessage(
                    "❌ ᴜꜱᴀɢᴇ: host url <direct-url>\nᴇ.ɢ.  host url https://example.com/video.mp4",
                    threadID, messageID
                );
            const wait = await new Promise(r => api.sendMessage("⏳ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ & ᴜᴘʟᴏᴀᴅɪɴɢ…", threadID, (e, i) => r(i)));
            try {
                const { buf, mime } = await downloadBuf(dlUrl);
                const ext  = guessExt(mime, null, dlUrl);
                const file = await uploadBuf(buf, `host_url_${Date.now()}.${ext}`, mime);
                try { api.unsendMessage(wait?.messageID); } catch {}
                return api.sendMessage(buildSuccessMsg(file, "🌐 ᴜᴘʟᴏᴀᴅᴇᴅ ꜰʀᴏᴍ ᴜʀʟ"), threadID, messageID);
            } catch (e) {
                try { api.unsendMessage(wait?.messageID); } catch {}
                return api.sendMessage(`❌ ᴜʀʟ ᴜᴘʟᴏᴀᴅ ꜰᴀɪʟᴇᴅ: ${e.response?.data?.error || e.message}`, threadID, messageID);
            }
        }

        if (!messageReply?.attachments?.length) {
            return api.sendMessage(
                [
                    "╔═══════════════════════╗",
                    "║  📎  𝗛𝗢𝗦𝗧 𝗖𝗢𝗠𝗠𝗔𝗡𝗗  ║",
                    "╚═══════════════════════╝",
                    "ʀᴇᴘʟʏ ᴛᴏ ᴀɴʏ ᴍᴇᴅɪᴀ ᴀɴᴅ ᴛʏᴘᴇ:",
                    "  𝗵𝗼𝘀𝘁",
                    "",
                    "ꜱᴜᴘᴘᴏʀᴛꜱ: 🎬 ᴠɪᴅᴇᴏ · 🖼️  ɪᴍᴀɢᴇ",
                    "          🎵 ᴀᴜᴅɪᴏ · 🎞️  ɢɪꜰ · 📄 ꜰɪʟᴇ",
                    "",
                    "📌 ᴏᴛʜᴇʀ ꜱᴜʙᴄᴏᴍᴍᴀɴᴅꜱ:",
                    "  host url <link>   → ᴜᴘʟᴏᴀᴅ ꜰʀᴏᴍ ᴜʀʟ",
                    "  host list         → ʀᴇᴄᴇɴᴛ ᴜᴘʟᴏᴀᴅꜱ",
                    "  host del <id>     → ᴅᴇʟᴇᴛᴇ ꜰɪʟᴇ",
                    "  host info <id>    → ꜰɪʟᴇ ᴅᴇᴛᴀɪʟꜱ",
                    "  host debug        → ɪɴꜱᴘᴇᴄᴛ ᴀᴛᴛᴀᴄʜᴍᴇɴᴛ",
                ].join("\n"),
                threadID, messageID
            );
        }

        const attach     = messageReply.attachments[0];
        const attachType = attach.type || "";
        let   dlUrl      = extractUrl(attach);

        if (!dlUrl) dlUrl = await resolveViaApi(api, attach);

        if (!dlUrl) {
            return api.sendMessage(
                [
                    "❌ 𝗖𝗔𝗡𝗡𝗢𝗧 𝗥𝗘𝗔𝗗 𝗔𝗧𝗧𝗔𝗖𝗛𝗠𝗘𝗡𝗧",
                    `━━━━━━━━━━━━━━━━━`,
                    `📎 ᴛʏᴘᴇ : ${attachType || "unknown"}`,
                    `🆔 ɪᴅ   : ${attach.ID || attach.id || "none"}`,
                    "",
                    "📌 ꜰɪxᴇꜱ:",
                    "• ꜰᴏʀᴡᴀʀᴅ/ꜱᴀᴠᴇ ᴍᴇᴅɪᴀ ᴛᴏ ʏᴏᴜʀꜱᴇʟꜰ ꜰɪʀꜱᴛ",
                    "• ʀᴇᴘʟʏ ᴛᴏ ʏᴏᴜʀ ᴏᴡɴ ꜱᴀᴠᴇᴅ ᴄᴏᴘʏ",
                    "• ᴜꜱᴇ: host url <direct-link>",
                    "• ᴜꜱᴇ: host debug (ʀᴇᴘʟʏ ᴛᴏ ᴍᴇᴅɪᴀ)",
                    "⚠️ ꜱᴛᴏʀɪᴇꜱ & ʀᴇᴇʟꜱ ʜᴀᴠᴇ ɴᴏ ᴅᴏᴡɴʟᴏᴀᴅᴀʙʟᴇ ᴜʀʟ",
                ].join("\n"),
                threadID, messageID
            );
        }

        const ic   = attachType === "video" ? "🎬" : attachType === "audio" ? "🎵" : attachType === "photo" ? "🖼️" : "📄";
        const wait = await new Promise(r => api.sendMessage(`${ic} ᴜᴘʟᴏᴀᴅɪɴɢ ${attachType || "ꜰɪʟᴇ"}… ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ.`, threadID, (e, i) => r(i)));

        try {
            const { buf, mime } = await downloadBuf(dlUrl);
            const ext  = guessExt(mime, attachType, dlUrl);
            const file = await uploadBuf(buf, `sifu_host_${Date.now()}.${ext}`, mime);
            try { api.unsendMessage(wait?.messageID); } catch {}
            return api.sendMessage(buildSuccessMsg(file, "📤 ᴜᴘʟᴏᴀᴅᴇᴅ ꜰʀᴏᴍ ʀᴇᴘʟʏ"), threadID, messageID);
        } catch (e) {
            try { api.unsendMessage(wait?.messageID); } catch {}
            if (e.response?.status === 403)
                return api.sendMessage(
                    [
                        "❌ ᴅᴏᴡɴʟᴏᴀᴅ ʙʟᴏᴄᴋᴇᴅ (403 ꜰᴏʀʙɪᴅᴅᴇɴ)",
                        "ꜰᴀᴄᴇʙᴏᴏᴋ ɪꜱ ʙʟᴏᴄᴋɪɴɢ ᴛʜᴇ ᴅɪʀᴇᴄᴛ ᴅᴏᴡɴʟᴏᴀᴅ.",
                        "",
                        "📌 ꜰɪx:",
                        "• ꜰᴏʀᴡᴀʀᴅ/ꜱᴀᴠᴇ ᴛʜᴇ ᴠɪᴅᴇᴏ ᴛᴏ ʏᴏᴜʀꜱᴇʟꜰ",
                        "• ʀᴇᴘʟʏ ᴛᴏ ʏᴏᴜʀ ᴏᴡɴ ꜱᴀᴠᴇᴅ ᴄᴏᴘʏ",
                        "• ᴜꜱᴇ: host url <direct-link>",
                    ].join("\n"),
                    threadID, messageID
                );
            return api.sendMessage(
                `❌ ᴜᴘʟᴏᴀᴅ ꜰᴀɪʟᴇᴅ: ${e.response?.data?.error || e.message}`,
                threadID, messageID
            );
        }
    },
};
