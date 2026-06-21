"use strict";

const path = require("path");
const fs   = require("fs-extra");
const api  = require("./lib/sifu-api");

const DEFAULT_QUALITY = "320";
const FAST_MODE       = process.env.SIFU_MP3_FAST !== "0";
const MAX_RESULTS     = 8;
const LIST_TTL_MS     = 5 * 60 * 1000;

module.exports = {
    config: {
        name:        "sing2",
        aliases:     ["s2", "mp3list"],
        version:     "1.0.0",
        author:      "SIFAT",
        category:    "media",
        role:        0,
        countDown:   4,
        description: { en: "Search YouTube music, pick from a list by replying with number(s)." },
        guide:       { en: "{pn} <song name> -list\n{pn} <song name>\nThen reply with: 1  or  2,4,6" },
    },

    onStart: async function ({ args, event, message, api: botApi }) {
        const threadID = event.threadID;
        const senderID = event.senderID;

        if (!args.length) {
            return message.reply(
                "🎵 ꜱɪɴɢ2 — ᴜꜱᴀɢᴇ\n" +
                "━━━━━━━━━━━━━━━━━━━━\n" +
                "sing2 <song name> -list\n" +
                "  → Shows a list, reply with number(s)\n\n" +
                "sing2 <song name>\n" +
                "  → Downloads top result directly\n\n" +
                "ᴇxᴀᴍᴘʟᴇ:\n" +
                "  sing2 zara zara -list\n" +
                "  sing2 shape of you"
            );
        }

        const rawArgs  = [...args];
        const listFlag = rawArgs.some(a => a.toLowerCase() === "-list" || a.toLowerCase() === "list");
        const cleanArgs = rawArgs.filter(a => a.toLowerCase() !== "-list" && a.toLowerCase() !== "list");
        const query    = cleanArgs.join(" ").trim();

        if (!query) {
            return message.reply("⚠️ ᴘʀᴏᴠɪᴅᴇ ᴀ ꜱᴏɴɢ ɴᴀᴍᴇ.\nExample: sing2 zara zara -list");
        }

        if (listFlag) {
            return module.exports._showList({ query, threadID, senderID, message, botApi, event });
        }

        return module.exports._downloadDirect({ query, threadID, senderID, message, event, botApi });
    },

    _showList: async function ({ query, threadID, senderID, message, botApi, event }) {
        let progressId = null;
        try {
            const waitMsg = await message.reply(`🔍 ꜱᴇᴀʀᴄʜɪɴɢ...\n"${query}"\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`);
            if (waitMsg?.messageID) progressId = waitMsg.messageID;

            const results = await module.exports._search(query, MAX_RESULTS);

            if (progressId) {
                try { botApi.unsendMessage(progressId); } catch (_) {}
                progressId = null;
            }

            if (!results.length) {
                return message.reply(`❌ ɴᴏ ʀᴇꜱᴜʟᴛꜱ ꜰᴏʀ "${query}".`);
            }

            const lines = [
                `🎵 ꜱᴇᴀʀᴄʜ ʀᴇꜱᴜʟᴛꜱ — "${query}"`,
                "━━━━━━━━━━━━━━━━━━━━",
            ];
            results.forEach((r, i) => {
                const dur = r.duration ? ` (${api.formatDuration(r.duration)})` : "";
                const artist = r.uploader ? ` · ${r.uploader}` : "";
                lines.push(`${i + 1}. ${r.title}${artist}${dur}`);
            });
            lines.push("━━━━━━━━━━━━━━━━━━━━");
            lines.push(`↩️ Reply with number(s) to download`);
            lines.push(`   e.g.  1   or   2,4,6`);

            const sent = await message.reply(lines.join("\n"));

            if (sent?.messageID) {
                global.GoatBot.onReply.set(sent.messageID, {
                    commandName: "sing2",
                    messageID:   sent.messageID,
                    author:      senderID,
                    threadID,
                    results,
                    query,
                    expiresAt:   Date.now() + LIST_TTL_MS,
                });
            }

        } catch (err) {
            if (progressId) {
                try { botApi.unsendMessage(progressId); } catch (_) {}
            }
            console.error("[sing2] list error:", err.message);
            return message.reply(api.formatError(err));
        }
    },

    _downloadDirect: async function ({ query, threadID, senderID, message, event, botApi }) {
        const userId = senderID;
        if (!api.tryAcquireLock(userId, 120_000)) {
            return message.reply("⏳ ʏᴏᴜ ᴀʟʀᴇᴀᴅʏ ʜᴀᴠᴇ ᴀ ᴅᴏᴡɴʟᴏᴀᴅ ɪɴ ᴘʀᴏɢʀᴇꜱꜱ. ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ.");
        }

        let progressId = null;
        try {
            await api.pruneCache();
            const waitMsg = await message.reply(`🔍 ꜱᴇᴀʀᴄʜɪɴɢ...\n"${query}"\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`);
            if (waitMsg?.messageID) progressId = waitMsg.messageID;

            const results = await module.exports._search(query, 1);
            if (!results.length) {
                if (progressId) { try { botApi.unsendMessage(progressId); } catch (_) {} }
                return message.reply(`❌ ɴᴏ ʀᴇꜱᴜʟᴛꜱ ꜰᴏʀ "${query}".`);
            }

            const track = results[0];
            if (progressId) { try { botApi.unsendMessage(progressId); } catch (_) {} progressId = null; }

            const waitMsg2 = await message.reply(
                `📥 ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ...\n\n` +
                `🎵 ${track.title}\n` +
                (track.uploader ? `👤 ${track.uploader}\n` : "") +
                (track.duration  ? `⏱ ${api.formatDuration(track.duration)}\n` : "") +
                `🎚 ${DEFAULT_QUALITY} ᴋʙᴘꜱ\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`
            );
            if (waitMsg2?.messageID) progressId = waitMsg2.messageID;

            const { filePath, sizeBytes, trackTitle, trackUploader, trackDuration, elapsedMs, container, cacheHit } =
                await module.exports._downloadTrack(track);

            if (progressId) { try { botApi.unsendMessage(progressId); } catch (_) {} progressId = null; }

            const sourceInfo = cacheHit
                ? "ᴄᴀᴄʜᴇ ʜɪᴛ — ɪɴꜱᴛᴀɴᴛ ⚡"
                : `${FAST_MODE ? "ꜰᴀꜱᴛ ꜱᴛʀᴇᴀᴍ" : "ᴛʀᴀɴꜱᴄᴏᴅᴇᴅ"} ɪɴ ${api.formatElapsed(elapsedMs)}`;

            await message.reply({
                body: [
                    "🎵 ᴀᴜᴅɪᴏ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ",
                    "━━━━━━━━━━━━━━━━━━━━",
                    `🎵 ᴛɪᴛʟᴇ    : ${trackTitle || "?"}`,
                    trackUploader ? `👤 ᴀʀᴛɪꜱᴛ   : ${trackUploader}` : null,
                    trackDuration ? `⏱ ᴅᴜʀᴀᴛɪᴏɴ : ${api.formatDuration(trackDuration)}` : null,
                    `🎚 ǫᴜᴀʟɪᴛʏ  : ${DEFAULT_QUALITY} ᴋʙᴘꜱ [${container}]`,
                    `📦 ꜱɪᴢᴇ     : ${api.formatBytes(sizeBytes)}`,
                    `⚡ ꜱᴏᴜʀᴄᴇ   : ${sourceInfo}`,
                ].filter(Boolean).join("\n"),
                attachment: fs.createReadStream(filePath),
            });

        } catch (err) {
            if (progressId) { try { botApi.unsendMessage(progressId); } catch (_) {} }
            console.error("[sing2] direct error:", err.message);
            return message.reply(api.formatError(err));
        } finally {
            api.releaseLock(userId);
        }
    },

    onReply: async function ({ event, Reply, message, api: botApi }) {
        if (!Reply || Reply.commandName !== "sing2") return;
        if (event.senderID !== Reply.author) return;

        if (Reply.expiresAt && Date.now() > Reply.expiresAt) {
            global.GoatBot.onReply.delete(Reply.messageID);
            return message.reply("⏰ ʟɪꜱᴛ ᴇxᴘɪʀᴇᴅ. Run the command again.");
        }

        const body    = (event.body || "").trim();
        const numbers = [...new Set(
            body.split(/[\s,،]+/)
                .map(t => parseInt(t, 10))
                .filter(n => !isNaN(n) && n >= 1 && n <= Reply.results.length)
        )];

        if (!numbers.length) {
            return message.reply(
                `❌ ɪɴᴠᴀʟɪᴅ ɪɴᴘᴜᴛ.\n` +
                `ᴄʜᴏᴏꜱᴇ 1–${Reply.results.length}, e.g.: 1  or  2,4,6`
            );
        }

        global.GoatBot.onReply.delete(Reply.messageID);

        const userId = event.senderID;
        if (!api.tryAcquireLock(userId, 180_000)) {
            return message.reply("⏳ ʏᴏᴜ ᴀʟʀᴇᴀᴅʏ ʜᴀᴠᴇ ᴀ ᴅᴏᴡɴʟᴏᴀᴅ ɪɴ ᴘʀᴏɢʀᴇꜱꜱ.");
        }

        let progressId = null;
        try {
            await api.pruneCache();

            const label = numbers.length === 1
                ? `#${numbers[0]}`
                : `#${numbers.join(", #")}`;
            const waitMsg = await message.reply(
                `📥 ᴘʀᴇᴘᴀʀɪɴɢ ${label}...\n⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ...`
            );
            if (waitMsg?.messageID) progressId = waitMsg.messageID;

            for (const num of numbers) {
                const track = Reply.results[num - 1];
                try {
                    const { filePath, sizeBytes, trackTitle, trackUploader, trackDuration, elapsedMs, container, cacheHit } =
                        await module.exports._downloadTrack(track);

                    const sourceInfo = cacheHit
                        ? "ᴄᴀᴄʜᴇ ʜɪᴛ — ɪɴꜱᴛᴀɴᴛ ⚡"
                        : `${FAST_MODE ? "ꜰᴀꜱᴛ ꜱᴛʀᴇᴀᴍ" : "ᴛʀᴀɴꜱᴄᴏᴅᴇᴅ"} ɪɴ ${api.formatElapsed(elapsedMs)}`;

                    await message.reply({
                        body: [
                            `🎵 #${num} — ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ`,
                            "━━━━━━━━━━━━━━━━━━━━",
                            `🎵 ᴛɪᴛʟᴇ    : ${trackTitle || track.title || "?"}`,
                            trackUploader ? `👤 ᴀʀᴛɪꜱᴛ   : ${trackUploader}` : null,
                            trackDuration ? `⏱ ᴅᴜʀᴀᴛɪᴏɴ : ${api.formatDuration(trackDuration)}` : null,
                            `🎚 ǫᴜᴀʟɪᴛʏ  : ${DEFAULT_QUALITY} ᴋʙᴘꜱ [${container}]`,
                            `📦 ꜱɪᴢᴇ     : ${api.formatBytes(sizeBytes)}`,
                            `⚡ ꜱᴏᴜʀᴄᴇ   : ${sourceInfo}`,
                        ].filter(Boolean).join("\n"),
                        attachment: fs.createReadStream(filePath),
                    });
                } catch (err) {
                    console.error(`[sing2] onReply track #${num} error:`, err.message);
                    await message.reply(`❌ #${num} ꜰᴀɪʟᴇᴅ: ${api.formatError(err)}`);
                }
            }

        } finally {
            if (progressId) { try { botApi.unsendMessage(progressId); } catch (_) {} }
            api.releaseLock(userId);
        }
    },

    _search: async function (query, limit) {
        const data = await api.httpGetJson("/api/video/search", { q: query, limit });
        if (Array.isArray(data?.results) && data.results.length) return data.results;
        return await api.searchVideos(query, limit);
    },

    _downloadTrack: async function (track) {
        const trackUrl = api.normalizeYouTubeUrl(track.url || track.webpage_url);
        const videoId  = api.extractVideoId(trackUrl);
        const cacheTag = `${DEFAULT_QUALITY}${FAST_MODE ? "f" : ""}`;

        let cached = videoId ? await api.cacheLookup(videoId, cacheTag, "mp3") : null;
        let filePath, sizeBytes, headers = {}, elapsedMs = 0;

        if (cached) {
            filePath  = cached.path;
            sizeBytes = cached.size;
        } else {
            const targetPath = videoId
                ? api.cacheFilenameFor(videoId, cacheTag, "mp3")
                : path.join(api.config.CACHE_DIR, `tmp_${Date.now()}.mp3`);
            const params = { url: trackUrl, quality: DEFAULT_QUALITY };
            if (FAST_MODE) params.fast = "1";
            const result = await api.downloadToDisk("/api/music/download", params, targetPath);
            filePath  = result.path;
            sizeBytes = result.size;
            headers   = result.headers || {};
            elapsedMs = result.elapsedMs;
        }

        if (sizeBytes < 1024) {
            await fs.unlink(filePath).catch(() => {});
            throw new Error("ᴅᴏᴡɴʟᴏᴀᴅ ꜰᴀɪʟᴇᴅ — ᴇᴍᴘᴛʏ ꜰɪʟᴇ. ᴘʟᴇᴀꜱᴇ ʀᴇᴛʀʏ.");
        }

        const sizeMB = sizeBytes / (1024 * 1024);
        if (sizeMB > api.config.MAX_FILE_MB) {
            throw new Error(
                `ꜰɪʟᴇ ᴛᴏᴏ ʟᴀʀɢᴇ (${sizeMB.toFixed(1)} ᴍʙ > ${api.config.MAX_FILE_MB} ᴍʙ).`
            );
        }

        let trackTitle    = track.title;
        let trackUploader = track.uploader;
        let trackDuration = track.duration || null;

        if (headers["x-track-title"])    trackTitle    = decodeURIComponent(headers["x-track-title"]);
        if (headers["x-track-artist"])   trackUploader = decodeURIComponent(headers["x-track-artist"]);
        if (!trackDuration && headers["x-track-duration"]) trackDuration = Number(headers["x-track-duration"]) || null;

        const container = (headers["x-audio-container"] || (FAST_MODE ? "m4a" : "mp3")).toUpperCase();
        const cacheHit  = !!cached;

        return { filePath, sizeBytes, trackTitle, trackUploader, trackDuration, elapsedMs, container, cacheHit };
    },
};
