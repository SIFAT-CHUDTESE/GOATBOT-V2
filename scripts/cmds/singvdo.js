"use strict";

const path = require("path");
const fs   = require("fs-extra");
const api  = require("./lib/sifu-api");

const VALID_QUALITIES = ["240", "360", "480", "720", "1080"];
const DEFAULT_QUALITY = "480";
const FALLBACK_LADDER = ["720", "480", "360", "240"];

module.exports = {
    config: {
        name:        "singvdo",
        aliases:     ["mp4", "video", "vdo"],
        version:     "4.0.0",
        author:      "SIFAT",
        category:    "media",
        role:        0,
        countDown:   8,
        description: { en: "Search & download MP4 video. Auto-fallback quality. List picker. Smart cache." },
        guide:       { en: "{pn} [query|URL] [-q 240|360|480|720|1080] [-list]\n{pn} pick <n>" },
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
        const event  = ctx.event || {};
        const parsed = api.parseArgs(args, VALID_QUALITIES, DEFAULT_QUALITY);

        if (parsed.mode === "help") {
            return api.safeReply(ctx, [
                "🎬 ꜱɪɴɢᴠᴅᴏ — ʜᴇʟᴘ",
                "━━━━━━━━━━━━━━━━━━━━",
                "singvdo <name or YouTube URL>",
                "singvdo <query> -q 240|360|480|720|1080",
                "singvdo <query> -list",
                "singvdo pick <n>",
                "singvdo -h",
                "",
                "ᴀᴜᴛᴏ-ꜰᴀʟʟʙᴀᴄᴋ ɪꜰ ꜰɪʟᴇ ᴛᴏᴏ ʟᴀʀɢᴇ ꜰᴏʀ Messenger.",
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

            if (parsed.mode === "list") {
                if (!parsed.query) return api.safeReply(ctx, "⚠️ ᴘʀᴏᴠɪᴅᴇ ᴀ ꜱᴇᴀʀᴄʜ ǫᴜᴇʀʏ.\nExample: singvdo attack on titan -list");
                react("🔍");
                await sendProgress(`🔍 ꜱᴇᴀʀᴄʜɪɴɢ ᴠɪᴅᴇᴏꜱ...\n"${parsed.query}"\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`);
                const imgPath = path.join(api.config.CACHE_DIR, `singvdo_list_${Date.now()}.png`);
                const imgResult = await api.downloadSearchImage(
                    "/api/video/search-image",
                    { q: parsed.query, limit: 6, cmd: "singvdo pick <1-6>" },
                    imgPath,
                );
                delProgress();
                if (!imgResult.results?.length) {
                    react("❌");
                    return api.safeReply(ctx, `❌ ɴᴏ ʀᴇꜱᴜʟᴛꜱ ꜰᴏʀ "${parsed.query}".`);
                }
                api.rememberSearch("singvdo", ctx, imgResult.results, "video");
                react("✅");
                await api.safeReply(ctx, { attachment: fs.createReadStream(imgResult.path) });
                setTimeout(() => fs.unlink(imgResult.path).catch(() => {}), 12_000);
                return;
            }

            if (parsed.mode === "pick") {
                const recalled = api.recallSearch("singvdo", ctx);
                if (!recalled || recalled.kind !== "video") {
                    return api.safeReply(ctx, "❌ ɴᴏ ᴀᴄᴛɪᴠᴇ ʟɪꜱᴛ ꜰᴏᴜɴᴅ.\nRun:  singvdo <query> -list  first.");
                }
                const idx = parsed.pickIndex - 1;
                if (idx < 0 || idx >= recalled.results.length) {
                    return api.safeReply(ctx, `❌ ɪɴᴠᴀʟɪᴅ ɴᴜᴍʙᴇʀ. ᴄʜᴏᴏꜱᴇ 1–${recalled.results.length}.`);
                }
                const pick = recalled.results[idx];
                videoUrl      = api.normalizeYouTubeUrl(pick.url);
                videoTitle    = pick.title;
                videoUploader = pick.uploader;
                videoDuration = pick.duration;
                api.clearPicker("singvdo", ctx);
                react("📥");
                await sendProgress(
                    `📥 ᴘʀᴇᴘᴀʀɪɴɢ ᴠɪᴅᴇᴏ...\n\n🎬 ${videoTitle}\n` +
                    `👤 ${videoUploader || "?"}\n📺 ǫᴜᴀʟɪᴛʏ: ${parsed.quality}ᴘ\n\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`
                );

            } else {
                if (!parsed.query) {
                    return api.safeReply(ctx, [
                        "⚠️ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴠɪᴅᴇᴏ ɴᴀᴍᴇ ᴏʀ YouTube URL.",
                        "",
                        "ᴇxᴀᴍᴘʟᴇꜱ:",
                        "  singvdo despacito -q 480",
                        "  singvdo https://youtu.be/XXXXX",
                        "  singvdo naruto opening -list",
                        "  singvdo -h",
                    ].join("\n"));
                }

                if (api.isYouTubeUrl(parsed.query)) {
                    videoUrl = api.normalizeYouTubeUrl(parsed.query);
                    react("📥");
                    await sendProgress(`📥 ꜰᴇᴛᴄʜɪɴɢ ᴠɪᴅᴇᴏ ꜰʀᴏᴍ ʟɪɴᴋ...\n📺 ǫᴜᴀʟɪᴛʏ: ${parsed.quality}ᴘ\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`);
                } else {
                    react("🔍");
                    await sendProgress(`🔍 ꜱᴇᴀʀᴄʜɪɴɢ ᴠɪᴅᴇᴏ...\n"${parsed.query}"\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`);
                    const results = await api.searchVideos(parsed.query, 1);
                    if (!results.length) {
                        delProgress();
                        react("❌");
                        return api.safeReply(ctx, `❌ ɴᴏ ʀᴇꜱᴜʟᴛꜱ ꜰᴏʀ "${parsed.query}".`);
                    }
                    const top     = results[0];
                    videoUrl      = api.normalizeYouTubeUrl(top.url);
                    videoTitle    = top.title;
                    videoUploader = top.uploader;
                    videoDuration = top.duration;
                    delProgress();
                    react("📥");
                    await sendProgress(
                        `📥 ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ᴠɪᴅᴇᴏ...\n\n🎬 ${videoTitle}\n` +
                        `👤 ${videoUploader || "?"}\n📺 ǫᴜᴀʟɪᴛʏ: ${parsed.quality}ᴘ\n\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`
                    );
                }
            }

            const reqIdx = VALID_QUALITIES.indexOf(parsed.quality);
            const ladder = [parsed.quality, ...FALLBACK_LADDER.filter(q => {
                const i = VALID_QUALITIES.indexOf(q);
                return i !== -1 && i < reqIdx;
            })];

            const videoId  = api.extractVideoId(videoUrl);
            let finalResult = null, finalHeaders = {}, finalElapsed = 0;
            let finalQuality = parsed.quality, wasCached = false;

            for (let i = 0; i < ladder.length; i++) {
                const tryQ = ladder[i];
                let result = videoId ? await api.cacheLookup(videoId, tryQ, "mp4") : null;
                const cached = !!result;

                if (!result) {
                    const targetPath = videoId
                        ? api.cacheFilenameFor(videoId, tryQ, "mp4")
                        : path.join(api.config.CACHE_DIR, `tmp_${Date.now()}.mp4`);
                    try {
                        const dl = await api.downloadToDisk("/api/music/video", { url: videoUrl, quality: tryQ }, targetPath);
                        result        = { path: dl.path, size: dl.size };
                        finalHeaders  = dl.headers || {};
                        finalElapsed  = dl.elapsedMs;
                        if (finalHeaders["x-track-title"]) videoTitle = finalHeaders["x-track-title"];
                    } catch (err) {
                        console.error(`[singvdo] ${tryQ}p failed:`, err.message);
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
                    finalResult = result;
                    finalQuality = tryQ;
                    wasCached    = cached;
                    break;
                }

                if (i < ladder.length - 1) {
                    delProgress();
                    await sendProgress(
                        `⚠️ ${tryQ}ᴘ = ${sizeMB.toFixed(1)} ᴍʙ (ᴛᴏᴏ ʟᴀʀɢᴇ)\n` +
                        `🔄 ᴛʀʏɪɴɢ ${ladder[i + 1]}ᴘ...\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`
                    );
                }
            }

            delProgress();

            if (!finalResult) {
                react("❌");
                return api.safeReply(ctx,
                    `❌ ᴀʟʟ ǫᴜᴀʟɪᴛɪᴇꜱ ᴇxᴄᴇᴇᴅ Messenger ʟɪᴍɪᴛ (${api.config.MAX_FILE_MB} ᴍʙ).\n` +
                    `ᴛʀʏ ᴀ ꜱʜᴏʀᴛᴇʀ ᴠɪᴅᴇᴏ ᴏʀ ᴜꜱᴇ ᴛʜᴇ ᴡᴇʙ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ.`
                );
            }

            const fellBack  = finalQuality !== parsed.quality;
            const cacheInfo = wasCached
                ? "ᴄᴀᴄʜᴇ ʜɪᴛ — ɪɴꜱᴛᴀɴᴛ ⚡"
                : `ꜰʀᴇꜱʜ ᴅᴏᴡɴʟᴏᴀᴅ ɪɴ ${api.formatElapsed(finalElapsed)}`;

            react("✅");
            await api.safeReply(ctx, {
                body: [
                    "🎬 ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ",
                    "━━━━━━━━━━━━━━━━━━━━",
                    `🎬 ᴛɪᴛʟᴇ    : ${videoTitle    || "?"}`,
                    videoUploader ? `👤 ᴄʜᴀɴɴᴇʟ   : ${videoUploader}` : null,
                    videoDuration ? `⏱ ᴅᴜʀᴀᴛɪᴏɴ  : ${api.formatDuration(videoDuration)}` : null,
                    `📺 ǫᴜᴀʟɪᴛʏ  : ${finalQuality}ᴘ${fellBack ? ` (ᴀᴜᴛᴏ-ꜰᴀʟʟʙᴀᴄᴋ ꜰʀᴏᴍ ${parsed.quality}ᴘ)` : ""}`,
                    `🔊 ᴀᴜᴅɪᴏ    : ✅ ɪɴᴄʟᴜᴅᴇᴅ`,
                    `📦 ꜱɪᴢᴇ     : ${api.formatBytes(finalResult.size)}`,
                    `⚡ ꜱᴏᴜʀᴄᴇ   : ${cacheInfo}`,
                ].filter(Boolean).join("\n"),
                attachment: fs.createReadStream(finalResult.path),
            });

        } catch (error) {
            delProgress();
            react("❌");
            console.error("[singvdo] error:", error.message);
            return api.safeReply(ctx, api.formatError(error));
        }
    },
};
