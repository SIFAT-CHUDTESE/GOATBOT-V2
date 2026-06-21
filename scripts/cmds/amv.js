"use strict";

const path = require("path");
const fs   = require("fs-extra");
const api  = require("./lib/sifu-api");

const VALID_QUALITIES = ["360", "480", "720", "1080"];
const DEFAULT_QUALITY = "720";
const FALLBACK_LADDER = ["720", "480", "360", "240"];

module.exports = {
    config: {
        name:        "amv",
        aliases:     ["AMV", "animemv", "animevideo", "animeamv"],
        version:     "4.0.0",
        author:      "SIFAT",
        category:    "media",
        role:        0,
        countDown:   10,
        description: { en: "Search & download Anime Music Videos (AMV) in HD quality." },
        guide:       { en: "{pn} [query|URL] [-q 360|480|720|1080] [-list]\n{pn} pick <n>" },
    },

    onStart: async function ({ args, event, message, api: botApi }) {
        const ctx = {
            reply: message.reply.bind(message),
            event,
            api:   botApi,
        };
        return module.exports._run({ args: args || [], ctx });
    },

    _run: async function ({ args, ctx }) {
        const event = ctx.event || {};

        let mode = "search", quality = DEFAULT_QUALITY, query = "", pickNum = null;
        const rest = [];
        for (let i = 0; i < args.length; i++) {
            const a = args[i].toLowerCase();
            if (a === "-h" || a === "--help" || a === "help") { mode = "help"; break; }
            if (a === "-list" || a === "--list" || a === "list") { mode = "list"; continue; }
            if (a === "pick" || a === "-pick") {
                const n = parseInt(args[i + 1], 10);
                if (!isNaN(n)) { mode = "pick"; pickNum = n; i++; continue; }
            }
            if ((a === "-q" || a === "--quality") && VALID_QUALITIES.includes(args[i + 1])) {
                quality = args[i + 1]; i++; continue;
            }
            rest.push(args[i]);
        }
        query = rest.join(" ").trim();

        if (mode === "help") {
            return api.safeReply(ctx, [
                "🎥 ᴀᴍᴠ — ʜᴇʟᴘ",
                "━━━━━━━━━━━━━━━━━━━━",
                "amv <query>              → ꜰɪɴᴅ ᴀɴᴅ ᴅᴏᴡɴʟᴏᴀᴅ ʙᴇꜱᴛ AMV",
                "amv <query> -list        → ᴛᴏᴘ 6 ʀᴇꜱᴜʟᴛꜱ ᴛᴏ ᴘɪᴄᴋ",
                "amv pick <n>             → ᴅᴏᴡɴʟᴏᴀᴅ #ɴ ꜰʀᴏᴍ ʟɪꜱᴛ",
                "amv <YouTube URL>        → ᴅɪʀᴇᴄᴛ ᴅᴏᴡɴʟᴏᴀᴅ",
                "amv -q 360|480|720|1080  → ꜱᴇᴛ ǫᴜᴀʟɪᴛʏ",
                "",
                "ᴀᴜᴛᴏ-ꜱᴇᴀʀᴄʜᴇꜱ 'ᴀɴɪᴍᴇ AMV' ᴋᴇʏᴡᴏʀᴅ.",
                "ᴀᴜᴛᴏ-ꜰᴀʟʟʙᴀᴄᴋ ɪꜰ ꜰɪʟᴇ ᴛᴏᴏ ʟᴀʀɢᴇ ꜰᴏʀ Messenger.",
            ].join("\n"));
        }

        if (!query && mode === "search") {
            return api.safeReply(ctx, [
                "⚠️ ᴘʀᴏᴠɪᴅᴇ ᴀɴ AMV ǫᴜᴇʀʏ ᴏʀ YouTube ʟɪɴᴋ.",
                "",
                "ᴇxᴀᴍᴘʟᴇꜱ:",
                "  amv naruto",
                "  amv demon slayer -q 720",
                "  amv attack on titan -list",
                "  amv -h",
            ].join("\n"));
        }

        let progressId = null;
        const sendProgress = async (text) => {
            try {
                const m = await api.safeReply(ctx, text);
                if (m?.messageID) progressId = m.messageID;
            } catch (_) {}
        };
        const delProgress = () => {
            if (progressId) { try { ctx.api?.unsendMessage(progressId); } catch (_) {} progressId = null; }
        };
        const react = (e) => {
            try { if (ctx.api && event.messageID) ctx.api.setMessageReaction(e, event.messageID, () => {}, true); } catch (_) {}
        };

        try {
            await api.pruneCache();
            let videoUrl, videoTitle, videoUploader, videoDuration;

            if (mode === "pick") {
                const recalled = api.recallSearch("amv", ctx);
                if (!recalled) return api.safeReply(ctx, "❌ ɴᴏ ᴀᴄᴛɪᴠᴇ ʟɪꜱᴛ ꜰᴏᴜɴᴅ.\nRun:  amv <query> -list  first.");
                const idx = pickNum - 1;
                if (idx < 0 || idx >= recalled.results.length) {
                    return api.safeReply(ctx, `❌ ɪɴᴠᴀʟɪᴅ ɴᴜᴍʙᴇʀ. ᴄʜᴏᴏꜱᴇ 1–${recalled.results.length}.`);
                }
                const pick = recalled.results[idx];
                videoUrl      = api.normalizeYouTubeUrl(pick.url);
                videoTitle    = pick.title;
                videoUploader = pick.uploader;
                videoDuration = pick.duration;
                api.clearPicker("amv", ctx);
                react("📥");
                await sendProgress(
                    `📥 ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ AMV...\n\n🎥 ${videoTitle}\n📺 ǫᴜᴀʟɪᴛʏ: ${quality}ᴘ\n\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`
                );

            } else if (mode === "list") {
                react("🔍");
                const searchQuery = `${query} anime AMV`;
                await sendProgress(`🔍 ꜱᴇᴀʀᴄʜɪɴɢ AMVꜱ...\n"${searchQuery}"\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`);
                const imgPath = path.join(api.config.CACHE_DIR, `amv_list_${Date.now()}.png`);
                const imgResult = await api.downloadSearchImage(
                    "/api/video/search-image",
                    { q: searchQuery, limit: 6, cmd: "amv pick <1-6>" },
                    imgPath,
                );
                delProgress();
                if (!imgResult.results?.length) {
                    react("❌");
                    return api.safeReply(ctx, `❌ ɴᴏ AMV ꜰᴏᴜɴᴅ ꜰᴏʀ "${query}".`);
                }
                api.rememberSearch("amv", ctx, imgResult.results, "video");
                react("✅");
                await api.safeReply(ctx, { attachment: fs.createReadStream(imgResult.path) });
                setTimeout(() => fs.unlink(imgResult.path).catch(() => {}), 12_000);
                return;

            } else {
                if (api.isYouTubeUrl(query)) {
                    videoUrl = api.normalizeYouTubeUrl(query);
                    react("📥");
                    await sendProgress(`📥 ꜰᴇᴛᴄʜɪɴɢ AMV ꜰʀᴏᴍ ʟɪɴᴋ...\n📺 ǫᴜᴀʟɪᴛʏ: ${quality}ᴘ\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`);
                } else {
                    react("🎥");
                    const searchQuery = `${query} anime AMV`;
                    await sendProgress(`🎥 ꜱᴇᴀʀᴄʜɪɴɢ ꜰᴏʀ AMV...\n"${searchQuery}"\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`);
                    const data    = await api.httpGetJson("/api/music/search", { q: searchQuery, limit: 1 });
                    const results = data?.results || [];
                    if (!results.length || !results[0].url) {
                        delProgress();
                        react("❌");
                        return api.safeReply(ctx, `❌ ɴᴏ AMV ꜰᴏᴜɴᴅ ꜰᴏʀ "${query}". ᴛʀʏ ᴀ ᴅɪꜰꜰᴇʀᴇɴᴛ ǫᴜᴇʀʏ.`);
                    }
                    const top     = results[0];
                    videoUrl      = api.normalizeYouTubeUrl(top.url);
                    videoTitle    = top.title;
                    videoUploader = top.uploader;
                    videoDuration = top.duration;
                    delProgress();
                    react("📥");
                    await sendProgress(
                        `📥 ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ AMV...\n\n🎥 ${videoTitle}\n` +
                        `👤 ${videoUploader || "?"}\n📺 ǫᴜᴀʟɪᴛʏ: ${quality}ᴘ\n\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`
                    );
                }
            }

            const reqIdx = VALID_QUALITIES.indexOf(quality);
            const ladder = [quality, ...FALLBACK_LADDER.filter(q => {
                const i = VALID_QUALITIES.indexOf(q);
                return i !== -1 && i < reqIdx;
            })];
            const videoId = api.extractVideoId(videoUrl);

            if (!videoTitle && videoUrl) {
                try {
                    const info    = await api.getInfo(videoUrl);
                    videoTitle    = info.title;
                    videoUploader = info.uploader;
                    videoDuration = info.duration;
                } catch (_) {}
            }

            let finalResult = null, finalQuality = quality, wasCached = false, finalElapsed = 0;

            for (let i = 0; i < ladder.length; i++) {
                const tryQ = ladder[i];
                let result = videoId ? await api.cacheLookup(videoId, `amv_${tryQ}`, "mp4") : null;
                const cached = !!result;

                if (!result) {
                    const targetPath = videoId
                        ? api.cacheFilenameFor(videoId, `amv_${tryQ}`, "mp4")
                        : path.join(api.config.CACHE_DIR, `tmp_amv_${Date.now()}.mp4`);
                    try {
                        const dl = await api.downloadToDisk("/api/music/video", { url: videoUrl, quality: tryQ }, targetPath);
                        result        = { path: dl.path, size: dl.size };
                        finalElapsed  = dl.elapsedMs;
                    } catch (err) {
                        if (i === ladder.length - 1) throw err;
                        continue;
                    }
                }

                if (result.size < 1024) {
                    await fs.unlink(result.path).catch(() => {});
                    if (i === ladder.length - 1) {
                        delProgress();
                        react("❌");
                        return api.safeReply(ctx, "❌ ᴅᴏᴡɴʟᴏᴀᴅ ꜰᴀɪʟᴇᴅ — ᴇᴍᴘᴛʏ ꜰɪʟᴇ.");
                    }
                    continue;
                }

                const sizeMB = result.size / (1024 * 1024);
                if (sizeMB <= api.config.MAX_FILE_MB) {
                    finalResult  = result;
                    finalQuality = tryQ;
                    wasCached    = cached;
                    break;
                }

                if (i < ladder.length - 1) {
                    delProgress();
                    await sendProgress(`⚠️ ${tryQ}ᴘ = ${sizeMB.toFixed(1)} ᴍʙ → ᴛʀʏɪɴɢ ${ladder[i + 1]}ᴘ...`);
                }
            }

            delProgress();

            if (!finalResult) {
                react("❌");
                return api.safeReply(ctx,
                    `❌ ᴀʟʟ ǫᴜᴀʟɪᴛɪᴇꜱ ᴇxᴄᴇᴇᴅ Messenger ʟɪᴍɪᴛ (${api.config.MAX_FILE_MB} ᴍʙ).\n` +
                    `ᴛʀʏ ᴀ ꜱʜᴏʀᴛᴇʀ ᴠɪᴅᴇᴏ ᴏʀ ᴜꜱᴇ ᴀ ʟᴏᴡᴇʀ ǫᴜᴀʟɪᴛʏ.`
                );
            }

            const fellBack = finalQuality !== quality;
            react("✅");
            await api.safeReply(ctx, {
                body: [
                    "🎥 AMV ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ",
                    "━━━━━━━━━━━━━━━━━━━━",
                    `🎥 ᴛɪᴛʟᴇ    : ${videoTitle    || "?"}`,
                    videoUploader ? `👤 ᴄʜᴀɴɴᴇʟ   : ${videoUploader}` : null,
                    videoDuration ? `⏱ ᴅᴜʀᴀᴛɪᴏɴ  : ${api.formatDuration(videoDuration)}` : null,
                    `📺 ǫᴜᴀʟɪᴛʏ  : ${finalQuality}ᴘ${fellBack ? ` (ꜰᴀʟʟʙᴀᴄᴋ ꜰʀᴏᴍ ${quality}ᴘ)` : ""}`,
                    `🔊 ᴀᴜᴅɪᴏ    : ✅ ɪɴᴄʟᴜᴅᴇᴅ`,
                    `📦 ꜱɪᴢᴇ     : ${api.formatBytes(finalResult.size)}`,
                    wasCached ? `⚡ ꜱᴏᴜʀᴄᴇ   : ᴄᴀᴄʜᴇ ʜɪᴛ ⚡` : `⚡ ᴛɪᴍᴇ     : ${api.formatElapsed(finalElapsed)}`,
                ].filter(Boolean).join("\n"),
                attachment: fs.createReadStream(finalResult.path),
            });

        } catch (error) {
            delProgress();
            react("❌");
            console.error("[amv] error:", error.message);
            return api.safeReply(ctx, api.formatError(error));
        }
    },
};
