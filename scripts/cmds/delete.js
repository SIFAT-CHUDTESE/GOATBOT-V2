const fs = require("fs-extra");
const path = require("path");

const CMD_DIR   = path.join(process.cwd(), "scripts/cmds");
const EVT_DIR   = path.join(process.cwd(), "scripts/events");

function unloadCmd(name) {
        const GoatBot = global.GoatBot;
        const cmd = GoatBot.commands.get(name);
        if (!cmd) return;
        for (const a of (cmd.config?.aliases || [])) GoatBot.aliases.delete(a);
        GoatBot.onChat  = (GoatBot.onChat  || []).filter(n => n !== cmd.config.name);
        GoatBot.onEvent = (GoatBot.onEvent || []).filter(n => n !== cmd.config.name);
        GoatBot.commands.delete(name);
        GoatBot.commandFilesPath = (GoatBot.commandFilesPath || []).filter(i => !i.commandName.includes(cmd.config.name));
        try { delete require.cache[require.resolve(cmd.location)]; } catch {}
}

function unloadEvt(name) {
        const GoatBot = global.GoatBot;
        const evt = GoatBot.eventCommands.get(name);
        if (!evt) return;
        for (const a of (evt.config?.aliases || [])) GoatBot.aliases.delete(a);
        GoatBot.onChat     = (GoatBot.onChat     || []).filter(n => n !== evt.config.name);
        GoatBot.onEvent    = (GoatBot.onEvent    || []).filter(n => n !== evt.config.name);
        GoatBot.onAnyEvent = (GoatBot.onAnyEvent || []).filter(n => n !== evt.config.name);
        GoatBot.eventCommands.delete(name);
        GoatBot.eventCommandsFilesPath = (GoatBot.eventCommandsFilesPath || []).filter(i => !i.commandName.includes(evt.config.name));
        try { delete require.cache[require.resolve(evt.location)]; } catch {}
}

function resolveTarget(rawName) {
        const name = rawName.toLowerCase().replace(/\.js$/, "");
        const cmdPath = path.join(CMD_DIR, `${name}.js`);
        const evtPath = path.join(EVT_DIR, `${name}.js`);
        const results = [];
        if (fs.existsSync(cmdPath)) results.push({ type: "cmd",   name, filePath: cmdPath });
        if (fs.existsSync(evtPath)) results.push({ type: "event", name, filePath: evtPath });
        return results;
}

function doDelete(target) {
        try {
                if (target.type === "cmd")   unloadCmd(target.name);
                if (target.type === "event") unloadEvt(target.name);
                fs.unlinkSync(target.filePath);
                return { status: "success", ...target };
        } catch (err) {
                return { status: "error", ...target, error: err };
        }
}

module.exports = {
        config: {
                name: "delete",
                aliases: ["delcmd", "delevt"],
                version: "3.0.0",
                author: "SIFAT",
                countDown: 5,
                role: 2,
                description: { en: "ᴅᴇʟᴇᴛᴇ ᴄᴏᴍᴍᴀɴᴅ / ᴇᴠᴇɴᴛ ꜰɪʟᴇ(ꜱ) ᴘᴇʀᴍᴀɴᴇɴᴛʟʏ" },
                category: "owner",
                guide: { en: "{pn} <ɴᴀᴍᴇ> [ɴᴀᴍᴇ2 ...]\n◈ ꜰʟᴀɢ: -e / --event ᴛᴏ ᴛᴀʀɢᴇᴛ ᴇᴠᴇɴᴛꜱ ᴏɴʟʏ\n◈ ꜰʟᴀɢ: -c / --cmd ᴛᴏ ᴛᴀʀɢᴇᴛ ᴄᴍᴅꜱ ᴏɴʟʏ\n◈ -f ꜰᴏʀᴄᴇ ᴅᴇʟᴇᴛᴇ ᴡɪᴛʜᴏᴜᴛ ᴄᴏɴꜰɪʀᴍ" }
        },

        langs: {
                en: {
                        noArgs:        "⌀ ᴘʀᴏᴠɪᴅᴇ ᴀᴛ ʟᴇᴀꜱᴛ ᴏɴᴇ ɴᴀᴍᴇ",
                        notFound:      "⌀ ɴᴏᴛ ꜰᴏᴜɴᴅ ɪɴ ᴄᴍᴅꜱ ᴏʀ ᴇᴠᴇɴᴛꜱ: %1",
                        deleted:       "🗑 [%1] %2 ᴅᴇʟᴇᴛᴇᴅ",
                        error:         "⌀ [%1] %2 ᴇʀʀᴏʀ: %3",
                        confirm:       "⚠ ᴀʙᴏᴜᴛ ᴛᴏ ᴅᴇʟᴇᴛᴇ ᴘᴇʀᴍᴀɴᴇɴᴛʟʏ:\n%1\n◈ ʀᴇᴀᴄᴛ 👍 ᴛᴏ ᴄᴏɴꜰɪʀᴍ",
                        summary:       "%1",
                        cancelled:     "❌ ᴅᴇʟᴇᴛᴇ ᴄᴀɴᴄᴇʟʟᴇᴅ",
                        ambiguous:     "⚠ [%1] ꜰᴏᴜɴᴅ ɪɴ ʙᴏᴛʜ ᴄᴍᴅꜱ & ᴇᴠᴇɴᴛꜱ\n◈ ᴜꜱᴇ -c ꜰᴏʀ ᴄᴍᴅ ᴏɴʟʏ, -e ꜰᴏʀ ᴇᴠᴇɴᴛ ᴏɴʟʏ"
                }
        },

        onStart: async function ({ args, message, event, commandName, getLang }) {
                if (!args.length) return message.reply(getLang("noArgs"));

                const flags = new Set(args.filter(a => a.startsWith("-")));
                const names = args.filter(a => !a.startsWith("-"));

                if (!names.length) return message.reply(getLang("noArgs"));

                const forceEvt = flags.has("-e") || flags.has("--event");
                const forceCmd = flags.has("-c") || flags.has("--cmd");
                const forceDelete = flags.has("-f") || flags.has("--force");

                const targets = [];
                const ambiguous = [];
                const missing = [];

                for (const rawName of names) {
                        const found = resolveTarget(rawName);

                        let filtered = found;
                        if (forceEvt) filtered = found.filter(t => t.type === "event");
                        else if (forceCmd) filtered = found.filter(t => t.type === "cmd");

                        if (filtered.length === 0) {
                                if (found.length > 0 && (forceEvt || forceCmd)) {
                                        missing.push(`${rawName} (not found as ${forceEvt ? "event" : "cmd"})`);
                                } else {
                                        missing.push(rawName);
                                }
                        } else if (filtered.length > 1 && !forceEvt && !forceCmd) {
                                ambiguous.push(rawName);
                        } else {
                                targets.push(...filtered);
                        }
                }

                if (ambiguous.length) return message.reply(getLang("ambiguous", ambiguous.join(", ")));
                if (!targets.length) return message.reply(getLang("notFound", missing.join(", ")));

                if (forceDelete) {
                        const lines = targets.map(t => {
                                const r = doDelete(t);
                                return r.status === "success"
                                        ? getLang("deleted", t.type.toUpperCase(), r.name)
                                        : getLang("error", t.type.toUpperCase(), r.name, r.error.message);
                        });
                        return message.reply(getLang("summary", lines.join("\n")));
                }

                const confirmList = targets.map((t, i) => `  [${i + 1}] ${t.type.toUpperCase()} — ${t.name}.js`).join("\n");
                return message.reply(getLang("confirm", confirmList), (err, info) => {
                        global.GoatBot.onReaction.set(info.messageID, {
                                commandName, messageID: info.messageID, type: "confirmDelete",
                                author: event.senderID, data: { targets }
                        });
                });
        },

        onReaction: async function ({ Reaction, message, event, getLang }) {
                if (event.userID !== Reaction.author) return;
                if (Reaction.type !== "confirmDelete") return;

                const { targets } = Reaction.data;
                const lines = targets.map(t => {
                        const r = doDelete(t);
                        return r.status === "success"
                                ? getLang("deleted", t.type.toUpperCase(), r.name)
                                : getLang("error", t.type.toUpperCase(), r.name, r.error.message);
                });
                return message.reply(getLang("summary", lines.join("\n")));
        }
};
