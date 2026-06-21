const fs = require("fs-extra");
const path = require("path");

const CMD_DIR    = path.join(process.cwd(), "scripts/cmds");
const EVT_DIR    = path.join(process.cwd(), "scripts/events");
const BACKUP_DIR = path.join(process.cwd(), "sifu_database", "backups");

fs.ensureDirSync(path.join(BACKUP_DIR, "cmds"));
fs.ensureDirSync(path.join(BACKUP_DIR, "events"));

function getTimestamp() {
        const d = new Date();
        const pad = n => String(n).padStart(2, "0");
        return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function formatSize(bytes) {
        if (bytes < 1024) return `${bytes}B`;
        return `${(bytes / 1024).toFixed(1)}KB`;
}

function formatDate(ms) {
        return new Date(ms).toLocaleString("en-GB", {
                timeZone: global.GoatBot?.config?.timeZone || "Asia/Dhaka",
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit"
        });
}

function findSourceFile(name) {
        const cmdPath = path.join(CMD_DIR, `${name}.js`);
        const evtPath = path.join(EVT_DIR, `${name}.js`);
        if (fs.existsSync(cmdPath)) return { filePath: cmdPath, type: "cmd" };
        if (fs.existsSync(evtPath)) return { filePath: evtPath, type: "event" };
        return null;
}

function getBackupDir(type) {
        return type === "event"
                ? path.join(BACKUP_DIR, "events")
                : path.join(BACKUP_DIR, "cmds");
}

function doBackup(name, typeHint = null) {
        let source;
        if (typeHint) {
                const dir = typeHint === "event" ? EVT_DIR : CMD_DIR;
                const fp  = path.join(dir, `${name}.js`);
                if (fs.existsSync(fp)) source = { filePath: fp, type: typeHint };
        } else {
                source = findSourceFile(name);
        }

        if (!source) return { status: "error", name, error: new Error(`"${name}.js" not found in cmds or events`) };

        const ts       = getTimestamp();
        const bkpName  = `${name}.${ts}.js`;
        const bkpDir   = getBackupDir(source.type);
        const bkpPath  = path.join(bkpDir, bkpName);

        try {
                fs.copySync(source.filePath, bkpPath);
                const stat = fs.statSync(bkpPath);
                return { status: "success", name, type: source.type, bkpName, bkpPath, size: stat.size, ts };
        } catch (err) {
                return { status: "error", name, error: err };
        }
}

function listBackups(filter = null, type = null) {
        const results = [];
        const dirs = type === "event"
                ? [{ dir: path.join(BACKUP_DIR, "events"), type: "event" }]
                : type === "cmd"
                        ? [{ dir: path.join(BACKUP_DIR, "cmds"), type: "cmd" }]
                        : [
                                { dir: path.join(BACKUP_DIR, "cmds"),   type: "cmd"   },
                                { dir: path.join(BACKUP_DIR, "events"), type: "event" },
                          ];

        for (const { dir, type: t } of dirs) {
                if (!fs.existsSync(dir)) continue;
                const files = fs.readdirSync(dir).filter(f => f.endsWith(".js"));
                for (const f of files) {
                        const namePart = f.replace(/\.\d{8}_\d{6}\.js$/, "");
                        if (filter && !namePart.toLowerCase().includes(filter.toLowerCase())) continue;
                        const fp   = path.join(dir, f);
                        const stat = fs.statSync(fp);
                        results.push({ file: f, name: namePart, type: t, filePath: fp, size: stat.size, mtime: stat.mtimeMs });
                }
        }

        results.sort((a, b) => b.mtime - a.mtime);
        return results;
}

function doRestore(backupFile, typeHint = null) {
        const dirs = [];
        if (typeHint === "cmd")   dirs.push({ dir: path.join(BACKUP_DIR, "cmds"),   type: "cmd" });
        else if (typeHint === "event") dirs.push({ dir: path.join(BACKUP_DIR, "events"), type: "event" });
        else {
                dirs.push({ dir: path.join(BACKUP_DIR, "cmds"),   type: "cmd"   });
                dirs.push({ dir: path.join(BACKUP_DIR, "events"), type: "event" });
        }

        let bkpPath = null, bkpType = null;
        for (const { dir, type: t } of dirs) {
                const fp = path.join(dir, backupFile);
                if (fs.existsSync(fp)) { bkpPath = fp; bkpType = t; break; }
        }

        if (!bkpPath) return { status: "error", error: new Error(`Backup "${backupFile}" not found`) };

        const namePart   = backupFile.replace(/\.\d{8}_\d{6}\.js$/, "");
        const destDir    = bkpType === "event" ? EVT_DIR : CMD_DIR;
        const destPath   = path.join(destDir, `${namePart}.js`);
        const hadExisting = fs.existsSync(destPath);

        try {
                if (hadExisting) doBackup(namePart, bkpType);
                fs.copySync(bkpPath, destPath);

                const GoatBot = global.GoatBot;
                if (bkpType === "cmd") {
                        try {
                                const cmd = GoatBot.commands.get(namePart);
                                if (cmd) {
                                        for (const a of (cmd.config?.aliases || [])) GoatBot.aliases.delete(a);
                                        GoatBot.onChat  = (GoatBot.onChat  || []).filter(n => n !== cmd.config.name);
                                        GoatBot.onEvent = (GoatBot.onEvent || []).filter(n => n !== cmd.config.name);
                                        GoatBot.commands.delete(namePart);
                                        GoatBot.commandFilesPath = (GoatBot.commandFilesPath || []).filter(i => !i.commandName.includes(cmd.config.name));
                                        try { delete require.cache[require.resolve(cmd.location)]; } catch {}
                                }
                                delete require.cache[require.resolve(destPath)];
                                const newCmd = require(destPath);
                                newCmd.location = destPath;
                                const cfg = newCmd.config;
                                const validAliases = [];
                                for (const alias of (cfg.aliases || [])) {
                                        if (!GoatBot.aliases.has(alias)) { GoatBot.aliases.set(alias, cfg.name); validAliases.push(alias); }
                                }
                                if (newCmd.onChat  && !GoatBot.onChat.includes(cfg.name))  GoatBot.onChat.push(cfg.name);
                                if (newCmd.onEvent && !GoatBot.onEvent.includes(cfg.name)) GoatBot.onEvent.push(cfg.name);
                                GoatBot.commands.set(cfg.name.toLowerCase(), newCmd);
                                GoatBot.commandFilesPath = GoatBot.commandFilesPath || [];
                                GoatBot.commandFilesPath.push({ filePath: destPath, commandName: [cfg.name, ...validAliases] });
                        } catch {}
                } else {
                        try {
                                const evt = GoatBot.eventCommands.get(namePart);
                                if (evt) {
                                        for (const a of (evt.config?.aliases || [])) GoatBot.aliases.delete(a);
                                        GoatBot.onChat     = (GoatBot.onChat     || []).filter(n => n !== evt.config.name);
                                        GoatBot.onEvent    = (GoatBot.onEvent    || []).filter(n => n !== evt.config.name);
                                        GoatBot.onAnyEvent = (GoatBot.onAnyEvent || []).filter(n => n !== evt.config.name);
                                        GoatBot.eventCommands.delete(namePart);
                                        GoatBot.eventCommandsFilesPath = (GoatBot.eventCommandsFilesPath || []).filter(i => !i.commandName.includes(evt.config.name));
                                        try { delete require.cache[require.resolve(evt.location)]; } catch {}
                                }
                                delete require.cache[require.resolve(destPath)];
                                const newEvt = require(destPath);
                                newEvt.location = destPath;
                                const cfg = newEvt.config;
                                const validAliases = [];
                                for (const alias of (cfg.aliases || [])) {
                                        if (!GoatBot.aliases.has(alias)) { GoatBot.aliases.set(alias, cfg.name); validAliases.push(alias); }
                                }
                                if (newEvt.onChat     && !GoatBot.onChat.includes(cfg.name))      GoatBot.onChat.push(cfg.name);
                                if (newEvt.onEvent    && !GoatBot.onEvent.includes(cfg.name))     GoatBot.onEvent.push(cfg.name);
                                if (newEvt.onAnyEvent && !GoatBot.onAnyEvent.includes(cfg.name))  GoatBot.onAnyEvent.push(cfg.name);
                                GoatBot.eventCommands.set(cfg.name.toLowerCase(), newEvt);
                                GoatBot.eventCommandsFilesPath = GoatBot.eventCommandsFilesPath || [];
                                GoatBot.eventCommandsFilesPath.push({ filePath: destPath, commandName: [cfg.name, ...validAliases] });
                        } catch {}
                }

                return { status: "success", name: namePart, type: bkpType, destPath, hadExisting };
        } catch (err) {
                return { status: "error", error: err };
        }
}

function doDeleteBackup(backupFile, typeHint = null) {
        const dirs = [];
        if (typeHint === "cmd")        dirs.push(path.join(BACKUP_DIR, "cmds"));
        else if (typeHint === "event") dirs.push(path.join(BACKUP_DIR, "events"));
        else { dirs.push(path.join(BACKUP_DIR, "cmds")); dirs.push(path.join(BACKUP_DIR, "events")); }

        for (const dir of dirs) {
                const fp = path.join(dir, backupFile);
                if (fs.existsSync(fp)) { fs.unlinkSync(fp); return { status: "success", file: backupFile }; }
        }
        return { status: "error", error: new Error(`Backup "${backupFile}" not found`) };
}

function doPurge(name, typeHint = null, keepLast = 0) {
        const type    = typeHint === "event" ? "event" : (typeHint === "cmd" ? "cmd" : null);
        const backups = listBackups(name, type).filter(b => b.name === name);
        if (!backups.length) return { status: "error", error: new Error(`No backups for "${name}"`) };
        const toDelete = keepLast > 0 ? backups.slice(keepLast) : backups;
        let deleted = 0;
        for (const b of toDelete) { try { fs.unlinkSync(b.filePath); deleted++; } catch {} }
        return { status: "success", name, deleted, kept: backups.length - deleted };
}

module.exports = {
        config: {
                name: "backup",
                aliases: ["bk"],
                version: "1.0.0",
                author: "SIFAT",
                countDown: 3,
                role: 2,
                description: { en: "ʙᴀᴄᴋᴜᴘ, ʀᴇꜱᴛᴏʀᴇ & ᴍᴀɴᴀɢᴇ ᴄᴍᴅ/ᴇᴠᴇɴᴛ ꜰɪʟᴇꜱ" },
                category: "owner",
                guide: { en: "{pn} save <name> | list [name] | restore <file> | delete <file> | purge <name> [keep] | info <name>" }
        },

        langs: {
                en: {
                        noArgs:        "⌀ ᴇɴᴛᴇʀ ᴀ ꜱᴜʙᴄᴏᴍᴍᴀɴᴅ: ꜱᴀᴠᴇ | ʟɪꜱᴛ | ʀᴇꜱᴛᴏʀᴇ | ᴅᴇʟᴇᴛᴇ | ᴘᴜʀɢᴇ | ɪɴꜰᴏ",
                        noName:        "⌀ ᴇɴᴛᴇʀ ꜰɪʟᴇɴᴀᴍᴇ",
                        saved:         "✦ ʙᴀᴄᴋᴇᴅ ᴜᴘ [%1]\n◈ %2 → %3\n◈ ꜱɪᴢᴇ: %4",
                        saveFail:      "⌀ ʙᴀᴄᴋᴜᴘ ꜰᴀɪʟᴇᴅ [%1]: %2",
                        noBackups:     "⌀ ɴᴏ ʙᴀᴄᴋᴜᴘꜱ ꜰᴏᴜɴᴅ%1",
                        listHeader:    "📦 ʙᴀᴄᴋᴜᴘꜱ%1 ─ %2 ꜰɪʟᴇ(ꜱ):\n%3\n\n◈ ᴜꜱᴇ .ʙᴋ ʀᴇꜱᴛᴏʀᴇ <ꜰɪʟᴇ> ᴛᴏ ʀᴇꜱᴛᴏʀᴇ",
                        listItem:      "  [%1] %2 ─ %3 ─ %4 ─ %5",
                        restored:      "♻️ ʀᴇꜱᴛᴏʀᴇᴅ [%1]\n◈ %2 → ᴀᴄᴛɪᴠᴇ%3",
                        restoreFail:   "⌀ ʀᴇꜱᴛᴏʀᴇ ꜰᴀɪʟᴇᴅ: %1",
                        restoreConfirm:"⚠ ʀᴇꜱᴛᴏʀᴇ [%1]?\n◈ %2\n◈ ᴄᴜʀʀᴇɴᴛ ᴠᴇʀꜱɪᴏɴ ᴡɪʟʟ ʙᴇ ᴀᴜᴛᴏ-ʙᴀᴄᴋᴇᴅ ᴜᴘ\n◈ ʀᴇᴀᴄᴛ 👍 ᴛᴏ ᴄᴏɴꜰɪʀᴍ",
                        deleted:       "🗑 ʙᴀᴄᴋᴜᴘ ᴅᴇʟᴇᴛᴇᴅ: %1",
                        deleteFail:    "⌀ ᴅᴇʟᴇᴛᴇ ꜰᴀɪʟᴇᴅ: %1",
                        purged:        "🗑 ᴘᴜʀɢᴇᴅ %1 ʙᴀᴄᴋᴜᴘ(ꜱ) ꜰᴏʀ [%2] — ᴋᴇᴘᴛ %3",
                        purgeFail:     "⌀ ᴘᴜʀɢᴇ ꜰᴀɪʟᴇᴅ: %1",
                        infoHeader:    "📋 ʙᴀᴄᴋᴜᴘ ɪɴꜰᴏ ─ %1\n◈ ᴛᴏᴛᴀʟ : %2 ʙᴀᴄᴋᴜᴘ(ꜱ)\n◈ ᴛᴏᴛᴀʟ ꜱɪᴢᴇ: %3\n◈ ʟᴀᴛᴇꜱᴛ : %4\n◈ ᴏʟᴅᴇꜱᴛ : %5\n━━━━━━━━━━━━\n%6"
                }
        },

        onStart: async function ({ args, message, event, commandName, getLang }) {
                const sub = (args[0] || "").toLowerCase();

                if (!sub) return message.reply(getLang("noArgs"));

                if (sub === "save" || sub === "s") {
                        const names = args.slice(1);
                        if (!names.length) return message.reply(getLang("noName"));
                        const lines = [];
                        for (const rawName of names) {
                                const name = rawName.replace(/\.js$/, "");
                                const r = doBackup(name);
                                if (r.status === "success")
                                        lines.push(getLang("saved", r.type.toUpperCase(), `${name}.js`, r.bkpName, formatSize(r.size)));
                                else
                                        lines.push(getLang("saveFail", name, r.error.message));
                        }
                        return message.reply(lines.join("\n"));
                }

                if (sub === "list" || sub === "ls" || sub === "l") {
                        const filter = args[1] ? args[1].replace(/\.js$/, "") : null;
                        const backups = listBackups(filter);
                        if (!backups.length) return message.reply(getLang("noBackups", filter ? ` ꜰᴏʀ "${filter}"` : ""));
                        const lines = backups.map((b, i) =>
                                getLang("listItem", i + 1, b.type.toUpperCase(), b.name, b.file.match(/(\d{8}_\d{6})/)?.[1]?.replace(/_/, " ") || "─", formatSize(b.size))
                        );
                        const tag = filter ? ` [${filter}]` : "";
                        return message.reply(getLang("listHeader", tag, backups.length, lines.join("\n")));
                }

                if (sub === "restore" || sub === "r") {
                        if (!args[1]) return message.reply(getLang("noName"));
                        const backupFile = args[1].endsWith(".js") ? args[1] : null;

                        if (!backupFile) {
                                const name    = args[1].replace(/\.js$/, "");
                                const backups = listBackups(name).filter(b => b.name === name);
                                if (!backups.length) return message.reply(getLang("noBackups", ` ꜰᴏʀ "${name}"`));
                                const lines = backups.map((b, i) =>
                                        getLang("listItem", i + 1, b.type.toUpperCase(), b.name, b.file.match(/(\d{8}_\d{6})/)?.[1]?.replace(/_/, " ") || "─", formatSize(b.size))
                                );
                                return message.reply(`📦 ꜱᴇʟᴇᴄᴛ ᴀ ʙᴀᴄᴋᴜᴘ ꜰᴏʀ [${name}]:\n${lines.join("\n")}\n\n◈ ᴜꜱᴇ .ʙᴋ ʀᴇꜱᴛᴏʀᴇ <ꜰᴜʟʟ ꜰɪʟᴇɴᴀᴍᴇ>`);
                        }

                        const found = listBackups().find(b => b.file === backupFile);
                        const dateStr = backupFile.match(/(\d{8}_\d{6})/)?.[1]?.replace(/_/, " ") || "─";
                        return message.reply(getLang("restoreConfirm", backupFile, `ᴅᴀᴛᴇ: ${dateStr}`), (err, info) => {
                                global.GoatBot.onReaction.set(info.messageID, {
                                        commandName, messageID: info.messageID, type: "restore",
                                        author: event.senderID, data: { backupFile, bkpType: found?.type || null }
                                });
                        });
                }

                if (sub === "delete" || sub === "del" || sub === "d") {
                        if (!args[1]) return message.reply(getLang("noName"));
                        const backupFile = args[1];
                        const r = doDeleteBackup(backupFile);
                        if (r.status === "success") return message.reply(getLang("deleted", backupFile));
                        return message.reply(getLang("deleteFail", r.error.message));
                }

                if (sub === "purge" || sub === "p") {
                        if (!args[1]) return message.reply(getLang("noName"));
                        const name     = args[1].replace(/\.js$/, "");
                        const keepLast = args[2] ? parseInt(args[2]) || 0 : 0;
                        const r = doPurge(name, null, keepLast);
                        if (r.status === "success") return message.reply(getLang("purged", r.deleted, name, r.kept));
                        return message.reply(getLang("purgeFail", r.error.message));
                }

                if (sub === "info" || sub === "i") {
                        if (!args[1]) return message.reply(getLang("noName"));
                        const name    = args[1].replace(/\.js$/, "");
                        const backups = listBackups(name).filter(b => b.name === name);
                        if (!backups.length) return message.reply(getLang("noBackups", ` ꜰᴏʀ "${name}"`));
                        const totalSize  = backups.reduce((s, b) => s + b.size, 0);
                        const latest     = backups[0];
                        const oldest     = backups[backups.length - 1];
                        const bkpLines   = backups.map((b, i) =>
                                `  [${i + 1}] ${b.type.toUpperCase()} ─ ${b.file.match(/(\d{8}_\d{6})/)?.[1]?.replace(/_/, " ") || "─"} ─ ${formatSize(b.size)}`
                        ).join("\n");
                        return message.reply(getLang("infoHeader",
                                name, backups.length, formatSize(totalSize),
                                formatDate(latest.mtime), formatDate(oldest.mtime), bkpLines
                        ));
                }

                return message.SyntaxError();
        },

        onReaction: async function ({ Reaction, message, event, getLang }) {
                if (event.userID !== Reaction.author) return;
                if (Reaction.type !== "restore") return;

                const { backupFile, bkpType } = Reaction.data;
                const r = doRestore(backupFile, bkpType);
                if (r.status !== "success") return message.reply(getLang("restoreFail", r.error.message));

                const autoBackupNote = r.hadExisting ? "\n◈ ᴘʀᴇᴠɪᴏᴜꜱ ᴠᴇʀꜱɪᴏɴ ᴀᴜᴛᴏ-ʙᴀᴄᴋᴇᴅ ✅" : "";
                return message.reply(getLang("restored", r.type.toUpperCase(), r.name, autoBackupNote));
        }
};
