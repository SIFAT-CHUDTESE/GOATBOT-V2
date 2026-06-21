"use strict";

const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");

const SIFAT_CHUDTESE    = "https://raw.githubusercontent.com/MYB-SIFAT/SIFATChudtese/refs/heads/main/sifatapichudtese.json";
const SIFU_FALLBACK     = "";

const S1FU_TIMEOUT_MS   = parseInt(process.env.S1FU_TIMEOUT_MS   || "180000", 10);
const MAX_FILE_MB       = parseFloat(process.env.S1FU_MAX_MB      || "25");
const SIFU_CACHE_TTL_MS = parseInt(process.env.SIFU_CACHE_TTL_MS  || String(60 * 60 * 1000), 10);
const SIFU_CACHE_MAX    = parseInt(process.env.SIFU_CACHE_MAX     || String(500 * 1024 * 1024), 10);
const SIFU_SEARCH_TTL   = parseInt(process.env.SIFU_SEARCH_TTL   || String(2 * 60 * 1000), 10);
const SIFU_INFO_TTL     = parseInt(process.env.SIFU_INFO_TTL     || String(5 * 60 * 1000), 10);
const SIFU_LIST_TTL     = 5 * 60 * 1000;
const S1FU_MAX_RETRY    = parseInt(process.env.S1FU_MAX_RETRY    || "4", 10);
const S1FU_RETRY_BASE   = parseInt(process.env.S1FU_RETRY_BASE   || "2000", 10);

const CACHE_DIR = path.join(__dirname, "..", "..", "cache");

let _S1FU_BASE = process.env.S1FU_API_BASE || null;

async function resolveApiBase() {
    if (_S1FU_BASE) return _S1FU_BASE;
    try {
        const res     = await axios.get(SIFAT_CHUDTESE, { timeout: 10000 });
        const raw     = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
        const cleaned = raw.replace(/,\s*([}\]])/g, "$1");
        const json    = JSON.parse(cleaned);
        _S1FU_BASE    = (json.music || "").replace(/\/+$/, "");
        if (!_S1FU_BASE) throw new Error("music field empty");
    } catch (e) {
        _S1FU_BASE = SIFU_FALLBACK;
        console.warn("[S1FU] config fetch failed, fallback:", _S1FU_BASE, e.message);
    }
    return _S1FU_BASE;
}

const YT_HOST_RX = /^(https?:\/\/)?(www\.|music\.|m\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i;
const YT_ID_RX   = /(?:v=|\/shorts\/|\/embed\/|youtu\.be\/|\/v\/)([A-Za-z0-9_-]{11})/;

function isYouTubeUrl(s) { return typeof s === "string" && YT_HOST_RX.test(s.trim()); }
function extractVideoId(url) {
    if (!url || typeof url !== "string") return null;
    const m = url.match(YT_ID_RX);
    return m ? m[1] : null;
}
function normalizeYouTubeUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    const id = extractVideoId(rawUrl);
    if (id) return `https://www.youtube.com/watch?v=${id}`;
    return rawUrl.split("?si=")[0].split("&si=")[0];
}

function formatDuration(sec) {
    if (!sec || isNaN(sec)) return "?";
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0
        ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        : `${m}:${String(s).padStart(2, "0")}`;
}
function formatViews(n) {
    if (!n || isNaN(n)) return "?";
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "ʙ";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "ᴍ";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "ᴋ";
    return String(n);
}
function formatBytes(b) {
    if (!b || isNaN(b)) return "0 ʙ";
    if (b >= 1024 * 1024 * 1024) return (b / 1024 / 1024 / 1024).toFixed(2) + " ɢʙ";
    if (b >= 1024 * 1024)        return (b / 1024 / 1024).toFixed(2) + " ᴍʙ";
    if (b >= 1024)               return (b / 1024).toFixed(1) + " ᴋʙ";
    return b + " ʙ";
}
function formatElapsed(ms) {
    if (!ms || ms < 0) return "?";
    if (ms < 1000) return ms + "ᴍꜱ";
    return (ms / 1000).toFixed(1) + "ꜱ";
}
function formatSpeed(bps) {
    if (!bps || bps <= 0) return "?";
    if (bps >= 1024 * 1024) return (bps / 1024 / 1024).toFixed(1) + " ᴍʙ/ꜱ";
    if (bps >= 1024)        return (bps / 1024).toFixed(0) + " ᴋʙ/ꜱ";
    return bps.toFixed(0) + " ʙ/ꜱ";
}
function formatETA(rem, bps) {
    if (!rem || !bps || bps <= 0) return "?";
    const s = Math.ceil(rem / bps);
    return s < 60 ? `~${s}ꜱ` : `~${Math.ceil(s / 60)}ᴍɪɴ`;
}
function formatError(err) {
    const status = err?.response?.status;
    const apiMsg = err?.response?.data?.message;
    const code   = err?.code;
    if (status === 429) return "⚠️ ʀᴀᴛᴇ-ʟɪᴍɪᴛᴇᴅ ʙʏ YouTube. ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ 1–2 ᴍɪɴᴜᴛᴇꜱ ᴀɴᴅ ʀᴇᴛʀʏ.";
    if (status === 404) return "❌ ᴠɪᴅᴇᴏ ɴᴏᴛ ꜰᴏᴜɴᴅ ᴏʀ ᴜɴᴀᴠᴀɪʟᴀʙʟᴇ (ᴘʀɪᴠᴀᴛᴇ/ʀᴇɢɪᴏɴ-ʙʟᴏᴄᴋᴇᴅ).";
    if (status === 403) return "❌ ᴀᴄᴄᴇꜱꜱ ᴅᴇɴɪᴇᴅ — YouTube ᴄᴏᴏᴋɪᴇꜱ ᴍᴀʏ ɴᴇᴇᴅ ʀᴇꜰʀᴇꜱʜɪɴɢ.";
    if (status === 400) return `❌ ɪɴᴠᴀʟɪᴅ ʀᴇQᴜᴇꜱᴛ${apiMsg ? ": " + apiMsg : "."}`;
    if (status >= 500)  return "❌ API ꜱᴇʀᴠᴇʀ ᴇʀʀᴏʀ. ᴘʟᴇᴀꜱᴇ ʀᴇᴛʀʏ ɪɴ ᴀ ꜰᴇᴡ ꜱᴇᴄᴏɴᴅꜱ.";
    if (code === "ECONNRESET" || code === "ECONNABORTED") return "❌ ᴄᴏɴɴᴇᴄᴛɪᴏɴ ᴅʀᴏᴘᴘᴇᴅ. ᴘʟᴇᴀꜱᴇ ʀᴇᴛʀʏ.";
    if (code === "ETIMEDOUT") return "❌ ʀᴇQᴜᴇꜱᴛ ᴛɪᴍᴇᴅ ᴏᴜᴛ. ᴛʜᴇ ᴠɪᴅᴇᴏ ᴍᴀʏ ʙᴇ ᴛᴏᴏ ʟᴏɴɢ ᴏʀ ᴛʜᴇ API ɪꜱ ʙᴜꜱʏ.";
    if (code === "EAI_AGAIN" || code === "ENETUNREACH") return "❌ ɴᴇᴛᴡᴏʀᴋ ᴜɴʀᴇᴀᴄʜᴀʙʟᴇ. ᴄʜᴇᴄᴋ ʙᴏᴛ ᴄᴏɴɴᴇᴄᴛɪᴏɴ.";
    if (apiMsg) return `❌ ${apiMsg}`;
    if (err?.message) return `❌ ${err.message}`;
    return "❌ ᴜɴᴋɴᴏᴡɴ ᴇʀʀᴏʀ.";
}

const SIFU_TRANSIENT = new Set(["ECONNRESET", "ETIMEDOUT", "ECONNABORTED", "EAI_AGAIN", "ENETUNREACH", "EPIPE"]);
function isRetriable(err) {
    const code   = err?.code;
    const status = err?.response?.status;
    return SIFU_TRANSIENT.has(code) || (status && status >= 500 && status <= 599);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function S1FU_backoff(attempt) {
    const base   = S1FU_RETRY_BASE * Math.pow(2, attempt);
    const jitter = base * 0.25 * (Math.random() * 2 - 1);
    return Math.round(Math.min(base + jitter, 12000));
}

class SifuMemCache {
    constructor(ttlMs, maxEntries = 200) {
        this._store = new Map();
        this._ttl   = ttlMs;
        this._max   = maxEntries;
    }
    get(key) {
        const e = this._store.get(key);
        if (!e) return undefined;
        if (e.expiresAt < Date.now()) { this._store.delete(key); return undefined; }
        return e.data;
    }
    set(key, data) {
        if (this._store.size >= this._max) {
            const oldest = [...this._store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
            if (oldest) this._store.delete(oldest[0]);
        }
        this._store.set(key, { data, expiresAt: Date.now() + this._ttl });
    }
    has(key)    { return this.get(key) !== undefined; }
    delete(key) { this._store.delete(key); }
}

const SIFU_searchCache = new SifuMemCache(SIFU_SEARCH_TTL, 200);
const SIFU_infoCache   = new SifuMemCache(SIFU_INFO_TTL,   300);
const S1FU_pending     = new Map();

function S1FU_reqKey(urlPath, params) {
    return `${urlPath}?${new URLSearchParams(params || {}).toString()}`;
}

async function httpGetJson(urlPath, params, { timeout = S1FU_TIMEOUT_MS } = {}) {
    const key     = S1FU_reqKey(urlPath, params);
    const base    = await resolveApiBase();
    const fullUrl = `${base}${urlPath}`;

    if (S1FU_pending.has(key)) return S1FU_pending.get(key);

    const promise = (async () => {
        let lastErr;
        for (let attempt = 0; attempt < S1FU_MAX_RETRY; attempt++) {
            try {
                const res = await axios.get(fullUrl, {
                    params, timeout,
                    validateStatus: s => s >= 200 && s < 300,
                });
                return res.data;
            } catch (err) {
                lastErr = err;
                if (!isRetriable(err) || attempt === S1FU_MAX_RETRY - 1) break;
                await sleep(S1FU_backoff(attempt));
            }
        }
        throw lastErr;
    })();

    S1FU_pending.set(key, promise);
    promise.finally(() => S1FU_pending.delete(key));
    return promise;
}

async function httpGetStream(urlPath, params, { timeout = S1FU_TIMEOUT_MS } = {}) {
    const base    = await resolveApiBase();
    const fullUrl = `${base}${urlPath}`;
    let lastErr;
    for (let attempt = 0; attempt < S1FU_MAX_RETRY; attempt++) {
        try {
            return await axios.get(fullUrl, {
                params, timeout,
                responseType: "stream",
                validateStatus: s => s >= 200 && s < 300,
            });
        } catch (err) {
            lastErr = err;
            if (!isRetriable(err) || attempt === S1FU_MAX_RETRY - 1) break;
            await sleep(S1FU_backoff(attempt));
        }
    }
    throw lastErr;
}

async function searchVideos(query, limit = 5) {
    const key    = `s1fu:search:${String(query).toLowerCase().trim()}:${limit}`;
    const cached = SIFU_searchCache.get(key);
    if (cached) return cached;
    const data    = await httpGetJson("/api/music/search", { q: query, limit });
    const results = Array.isArray(data?.results) ? data.results : [];
    if (results.length) SIFU_searchCache.set(key, results);
    return results;
}

async function getInfo(url) {
    const key    = `s1fu:info:${normalizeYouTubeUrl(url)}`;
    const cached = SIFU_infoCache.get(key);
    if (cached) return cached;
    const data = await httpGetJson("/api/music/info", { url });
    if (data && data.title) SIFU_infoCache.set(key, data);
    return data;
}

async function getPlaylist(url, { page = 1, perPage = 20, shuffle = false } = {}) {
    return httpGetJson("/api/music/playlist", { url, page, per_page: perPage, shuffle: shuffle ? "1" : "0" });
}

async function ensureCacheDir() { await fs.ensureDir(CACHE_DIR); }

function cacheFilenameFor(videoId, quality, ext) {
    const safeId  = String(videoId).replace(/[^A-Za-z0-9_-]/g, "");
    const safeQ   = String(quality).replace(/[^A-Za-z0-9]/g, "");
    const safeExt = String(ext).replace(/[^A-Za-z0-9]/g, "");
    return path.join(CACHE_DIR, `${safeId}_${safeQ}.${safeExt}`);
}

async function cacheLookup(videoId, quality, ext) {
    if (!videoId) return null;
    const p = cacheFilenameFor(videoId, quality, ext);
    try {
        const st = await fs.stat(p);
        if (Date.now() - st.mtimeMs > SIFU_CACHE_TTL_MS) { await fs.unlink(p).catch(() => {}); return null; }
        if (st.size < 1024) return null;
        const now = new Date();
        await fs.utimes(p, now, now).catch(() => {});
        return { path: p, size: st.size, age: Date.now() - st.mtimeMs };
    } catch (_) { return null; }
}

async function pruneCache() {
    try {
        await ensureCacheDir();
        const files = await fs.readdir(CACHE_DIR);
        const stats = [];
        let total   = 0;
        const now   = Date.now();
        for (const f of files) {
            const fp = path.join(CACHE_DIR, f);
            try {
                const st = await fs.stat(fp);
                if (!st.isFile()) continue;
                if (now - st.mtimeMs > SIFU_CACHE_TTL_MS) { await fs.unlink(fp).catch(() => {}); continue; }
                stats.push({ fp, size: st.size, mtime: st.mtimeMs });
                total += st.size;
            } catch (_) {}
        }
        if (total <= SIFU_CACHE_MAX) return;
        stats.sort((a, b) => a.mtime - b.mtime);
        for (const s of stats) {
            if (total <= SIFU_CACHE_MAX) break;
            await fs.unlink(s.fp).catch(() => {});
            total -= s.size;
        }
    } catch (_) {}
}

async function downloadToDisk(urlPath, params, savePath, onProgress) {
    await ensureCacheDir();
    const start = Date.now();
    const res   = await httpGetStream(urlPath, params);

    if (res.headers["x-has-audio"] === "0") {
        throw new Error("ᴠɪᴅᴇᴏ ʜᴀꜱ ɴᴏ ᴀᴜᴅɪᴏ ᴛʀᴀᴄᴋ — ᴘʟᴇᴀꜱᴇ ʀᴇᴛʀʏ ᴏʀ ᴄʜᴏᴏꜱᴇ ᴀ ᴅɪꜰꜰᴇʀᴇɴᴛ ᴠɪᴅᴇᴏ.");
    }

    const tmp = savePath + ".part";
    let writer;
    try {
        let received  = 0;
        let lastTick  = Date.now();
        let lastBytes = 0;
        const total   = parseInt(res.headers["content-length"] || "0", 10) || 0;

        res.data.on("data", chunk => {
            received += chunk.length;
            const now = Date.now();
            if (onProgress && now - lastTick >= 1200) {
                const elapsed  = now - start;
                const speedBps = ((received - lastBytes) / (now - lastTick)) * 1000;
                const percent  = total > 0 ? Math.floor((received / total) * 100) : 0;
                const etaMs    = (speedBps > 0 && total > 0) ? ((total - received) / speedBps) * 1000 : 0;
                try { onProgress({ receivedBytes: received, totalBytes: total, speedBps, etaMs, elapsedMs: elapsed, percent }); } catch (_) {}
                lastTick  = now;
                lastBytes = received;
            }
        });

        await new Promise((resolve, reject) => {
            writer = fs.createWriteStream(tmp);
            res.data.pipe(writer);
            writer.on("finish", resolve);
            writer.on("error", reject);
            res.data.on("error", reject);
        });

        await fs.move(tmp, savePath, { overwrite: true });
        const st = await fs.stat(savePath);
        return { path: savePath, size: st.size, headers: res.headers, elapsedMs: Date.now() - start };
    } catch (err) {
        try { if (writer) writer.destroy(); } catch (_) {}
        await fs.unlink(tmp).catch(() => {});
        throw err;
    }
}

async function downloadSearchImage(urlPath, params, savePath) {
    await ensureCacheDir();
    const start = Date.now();
    const res   = await httpGetStream(urlPath, params);
    const tmp   = savePath + ".part";
    let writer;
    try {
        await new Promise((resolve, reject) => {
            writer = fs.createWriteStream(tmp);
            res.data.pipe(writer);
            writer.on("finish", resolve);
            writer.on("error", reject);
            res.data.on("error", reject);
        });
        await fs.move(tmp, savePath, { overwrite: true });
        const st = await fs.stat(savePath);

        let results = [];
        try {
            const encoded = res.headers["x-search-results"];
            if (encoded) results = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
        } catch (_) {}

        return { path: savePath, size: st.size, results, elapsedMs: Date.now() - start };
    } catch (err) {
        try { if (writer) writer.destroy(); } catch (_) {}
        await fs.unlink(tmp).catch(() => {});
        throw err;
    }
}

const SIFU_pickerStore = new Map();

function S1FU_pickerKey(commandName, ctx) {
    const ev = ctx?.event || {};
    return `${commandName}:${ev.threadID || "?"}:${ev.senderID || "?"}`;
}
function rememberSearch(commandName, ctx, results, kind) {
    const key = S1FU_pickerKey(commandName, ctx);
    SIFU_pickerStore.set(key, { results, kind, expiresAt: Date.now() + SIFU_LIST_TTL });
    if (SIFU_pickerStore.size > 500) {
        const now = Date.now();
        for (const [k, v] of SIFU_pickerStore) if (v.expiresAt < now) SIFU_pickerStore.delete(k);
    }
}
function recallSearch(commandName, ctx) {
    const key   = S1FU_pickerKey(commandName, ctx);
    const entry = SIFU_pickerStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) { SIFU_pickerStore.delete(key); return null; }
    return entry;
}
function clearPicker(commandName, ctx) { SIFU_pickerStore.delete(S1FU_pickerKey(commandName, ctx)); }

function parseArgs(args, validQualities, defaultQuality) {
    const out  = { quality: String(defaultQuality), mode: "search", pickIndex: null, query: "", type: null };
    const rest = [];
    for (let i = 0; i < args.length; i++) {
        const a = String(args[i]).toLowerCase();
        if (a === "-q" || a === "--quality") {
            const v = args[i + 1];
            if (v && validQualities.includes(String(v))) { out.quality = String(v); i++; } else i++;
            continue;
        }
        if (a === "-list" || a === "--list" || a === "list") { out.mode = "list"; continue; }
        if (a === "pick" || a === "-pick") {
            const n = parseInt(args[i + 1], 10);
            if (!isNaN(n)) { out.mode = "pick"; out.pickIndex = n; i++; continue; }
        }
        if (a === "-h" || a === "--help" || a === "help") { out.mode = "help"; continue; }
        if ((a === "-t" || a === "--type") && args[i + 1]) { out.type = args[i + 1].toLowerCase(); i++; continue; }
        rest.push(args[i]);
    }
    out.query = rest.join(" ").trim();
    return out;
}

const SIFU_locks = new Map();
function tryAcquireLock(userId, timeoutMs = 120_000) {
    if (!userId) return true;
    const now = Date.now();
    const exp = SIFU_locks.get(userId);
    if (exp && exp > now) return false;
    SIFU_locks.set(userId, now + timeoutMs);
    return true;
}
function releaseLock(userId) { if (userId) SIFU_locks.delete(userId); }

async function safeReply(ctx, payload) {
    try {
        if (ctx && typeof ctx.reply === "function") return await ctx.reply(payload);
    } catch (e) {
        console.error("[S1FU] reply failed:", e.message);
    }
}

function safeReact(ctx, emoji) {
    try {
        const ev = ctx?.event || {};
        if (ctx?.api && ev.messageID) {
            ctx.api.setMessageReaction(emoji, ev.messageID, () => {}, true);
        }
    } catch (_) {}
}

function safeUnsend(ctx, messageId) {
    if (!messageId) return;
    try { ctx?.api?.unsendMessage(messageId); } catch (_) {}
}

module.exports = {
    config: {
        CACHE_DIR,
        MAX_FILE_MB,
        SIFU_CACHE_TTL_MS,
        S1FU_TIMEOUT_MS,
    },
    resolveApiBase,
    isYouTubeUrl,
    extractVideoId,
    normalizeYouTubeUrl,
    formatDuration,
    formatViews,
    formatBytes,
    formatElapsed,
    formatSpeed,
    formatETA,
    formatError,
    httpGetJson,
    httpGetStream,
    searchVideos,
    getInfo,
    getPlaylist,
    ensureCacheDir,
    cacheFilenameFor,
    cacheLookup,
    pruneCache,
    downloadToDisk,
    downloadSearchImage,
    rememberSearch,
    recallSearch,
    clearPicker,
    parseArgs,
    tryAcquireLock,
    releaseLock,
    safeReply,
    safeReact,
    safeUnsend,
};
