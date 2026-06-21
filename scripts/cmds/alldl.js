"use strict";

const axios  = require("axios");
const fs     = require("fs-extra");
const path   = require("path");

let API_BASE = "https://all-dawnloder.onrender.com";

const TMP_DIR = path.join(process.cwd(), "scripts", "tmp");
fs.ensureDirSync(TMP_DIR);

const URL_RE = /https?:\/\/[^\s<>"{}|\\^[\]`]+/gi;

const SUPPORTED_HOSTS = [
    "youtube.com","youtu.be","instagram.com","tiktok.com","vm.tiktok.com",
    "twitter.com","x.com","t.co","facebook.com","fb.watch","fb.com",
    "dailymotion.com","vimeo.com","twitch.tv","reddit.com","soundcloud.com",
    "pinterest.com","snapchat.com","likee.video","bilibili.com",
    "nicovideo.jp","rumble.com","odysee.com","ok.ru","vk.com",
    "threads.net","triller.co","kwai.com","chingari.io",
];

const FORMAT_MAP = {
    best:"best", hd:"best", "1080":"best", "1080p":"best",
    medium:"medium", md:"medium", "720":"medium", "720p":"medium",
    small:"small", sd:"small", low:"small", "480":"small", "480p":"small",
    audio:"audio", mp3:"audio", music:"audio", song:"audio",
};

const QUEUES = new Map();

function react(botApi, messageID, emoji) {
    try { botApi.setMessageReaction(emoji, messageID, () => {}, true); } catch {}
}

function isSupportedUrl(url) {
    try {
        const host = new URL(url).hostname.replace(/^www\./, "");
        return SUPPORTED_HOSTS.some(d => host === d || host.endsWith("." + d));
    } catch { return false; }
}

function extractUrls(text) {
    if (!text) return [];
    const matches = (text.match(URL_RE) || []);
    return [...new Set(matches.filter(u => isSupportedUrl(u)))];
}

function parseFormatFlag(args) {
    for (const a of args) {
        const key = a.replace(/^-+/, "").toLowerCase();
        if (FORMAT_MAP[key]) return FORMAT_MAP[key];
    }
    return "medium";
}

async function startDownload(url, format) {
    const { data } = await axios.post(`${API_BASE}/api/download`, { url, format }, { timeout: 25000 });
    if (!data.id) throw new Error("no download ID");
    return data.id;
}

async function pollStatus(id, maxWait = 300000) {
    const end = Date.now() + maxWait;
    while (Date.now() < end) {
        const { data } = await axios.get(`${API_BASE}/api/status/${id}`, { timeout: 12000 });
        if (data.status === "completed") return data;
        if (data.status === "error") throw new Error(data.error || "server error");
        await new Promise(r => setTimeout(r, 2500));
    }
    throw new Error("timeout");
}

async function fetchFile(id, ext) {
    const fp = path.join(TMP_DIR, `alldl_${id}.${ext}`);
    const { data } = await axios.get(`${API_BASE}/file/${id}`, { responseType: "stream", timeout: 300000 });
    const writer = fs.createWriteStream(fp);
    data.pipe(writer);
    await new Promise((res, rej) => { writer.on("finish", res); writer.on("error", rej); });
    return fp;
}

function resolveExt(filename, format) {
    if (format === "audio") return "mp3";
    return (filename?.match(/\.([a-z0-9]+)$/i) || [])[1] || "mp4";
}

async function downloadOne(botApi, event, url, format) {
    const { threadID, messageID } = event;
    react(botApi, messageID, "📥");
    try {
        const id     = await startDownload(url, format);
        const status = await pollStatus(id);
        const ext    = resolveExt(status.filename, format);
        const fp     = await fetchFile(id, ext);
        const stat   = fs.statSync(fp);
        if (stat.size < 512) { fs.unlink(fp).catch(() => {}); throw new Error("empty file"); }
        await botApi.sendMessage({ attachment: fs.createReadStream(fp) }, threadID, messageID);
        fs.unlink(fp).catch(() => {});
        react(botApi, messageID, "✅");
        return true;
    } catch {
        react(botApi, messageID, "❌");
        return false;
    }
}

async function processQueue(botApi, event, urls, format) {
    const { threadID, senderID, messageID } = event;
    const key = `${threadID}:${senderID}`;

    if (!QUEUES.has(key)) {
        QUEUES.set(key, { items: [], processing: false });
    }

    const queue = QUEUES.get(key);

    let added = 0;
    for (const url of urls) {
        if (!queue.items.some(i => i.url === url)) {
            queue.items.push({ url, format, event });
            added++;
        }
    }

    if (added === 0) return;

    if (queue.processing) {
        react(botApi, messageID, "📋");
        return;
    }

    queue.processing = true;
    try {
        while (queue.items.length > 0) {
            const item = queue.items.shift();
            await downloadOne(botApi, item.event, item.url, item.format);
        }
    } finally {
        queue.processing = false;
        QUEUES.delete(key);
    }
}

module.exports = {
    config: {
        name:        "alldl",
        aliases:     ["dl", "vdl", "downdl"],
        version:     "4.0.0",
        author:      "SIFAT",
        countDown:   5,
        role:        0,
        description: { en: "Download videos/audio from 1000+ platforms. Supports multiple URLs." },
        category:    "media",
        guide:       { en: "{pn} <url1> [url2 ...] [-mp3|-hd|-sd]\n{pn} setapi <url>  (admin)" },
    },

    onChat: async function ({ api, event }) {
        const urls = [
            ...extractUrls(event.body || ""),
            ...extractUrls(event.messageReply?.body || ""),
        ];
        const unique = [...new Set(urls)];
        if (!unique.length) return;
        const format = parseFormatFlag((event.body || "").split(/\s+/));
        await processQueue(api, event, unique, format);
    },

    onStart: async function ({ api, event, args, role }) {
        const { messageID } = event;

        if (args[0] === "setapi") {
            if (role < 1) { react(api, messageID, "❌"); return; }
            const url = (args[1] || "").replace(/\/$/, "");
            if (!url.startsWith("http")) { react(api, messageID, "❌"); return; }
            API_BASE = url;
            react(api, messageID, "✅");
            return;
        }

        const urlsFromArgs  = args.filter(a => isSupportedUrl(a));
        const urlsFromReply = extractUrls(event.messageReply?.body || "");
        const all           = [...new Set([...urlsFromArgs, ...urlsFromReply])];
        const format        = parseFormatFlag(args);

        if (!all.length) { react(api, messageID, "❌"); return; }

        await processQueue(api, event, all, format);
    },
};
