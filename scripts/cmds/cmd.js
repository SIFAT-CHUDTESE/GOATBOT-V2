const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");
const { pushFileToGitHub, getAutopush, setAutopush } = require("../../bot/githubSync");
const { configCommands } = global.GoatBot;

const DISABLED_CMDS = new Set();

function getDomain(url) {
        const m = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n]+)/im);
        return m ? m[1] : null;
}

function isURL(str) {
        try { new URL(str); return true; } catch { return false; }
}

function resolveInstallUrl(url) {
        const domain = getDomain(url);
        if (domain === "pastebin.com") {
                const m = url.match(/https:\/\/pastebin\.com\/(?!raw\/)(.*)/);
                if (m) url = `https://pastebin.com/raw/${m[1]}`;
                if (url.endsWith("/")) url = url.slice(0, -1);
        } else if (domain === "github.com") {
                url = url.replace(/https:\/\/github\.com\/(.*)\/blob\/(.*)/, "https://raw.githubusercontent.com/$1/$2");
        }
        return url;
}

function loadOne(fileName, rawCode) {
        const GoatBot = global.GoatBot;
        const filePath = path.normalize(`${process.cwd()}/scripts/cmds/${fileName}.js`);
        try {
                if (rawCode) fs.writeFileSync(filePath, rawCode, "utf-8");
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);
                command.location = filePath;
                const cfg = command.config;
                if (!cfg) throw new Error("config is undefined");
                if (!cfg.name) throw new Error("config.name is undefined");
                if (!cfg.category) throw new Error("config.category is undefined");
                if (!command.onStart) throw new Error("onStart is undefined");
                if (GoatBot.commands.has(cfg.name)) {
                        const old = GoatBot.commands.get(cfg.name);
                        for (const a of (old?.config?.aliases || [])) GoatBot.aliases.delete(a);
                        GoatBot.commands.delete(cfg.name);
                        GoatBot.commandFilesPath = (GoatBot.commandFilesPath || []).filter(i => !i.commandName.includes(cfg.name));
                        GoatBot.onChat = (GoatBot.onChat || []).filter(n => n !== cfg.name);
                        GoatBot.onEvent = (GoatBot.onEvent || []).filter(n => n !== cfg.name);
                }
                const validAliases = [];
                for (const alias of (cfg.aliases || [])) {
                        if (!GoatBot.aliases.has(alias)) { GoatBot.aliases.set(alias, cfg.name); validAliases.push(alias); }
                }
                if (cfg.envConfig) {
                        if (!configCommands.envCommands) configCommands.envCommands = {};
                        if (!configCommands.envCommands[cfg.name]) configCommands.envCommands[cfg.name] = {};
                        for (const [k, v] of Object.entries(cfg.envConfig)) {
                                if (!configCommands.envCommands[cfg.name][k]) configCommands.envCommands[cfg.name][k] = v;
                        }
                }
                if (command.onChat && !GoatBot.onChat.includes(cfg.name)) GoatBot.onChat.push(cfg.name);
                if (command.onEvent && !GoatBot.onEvent.includes(cfg.name)) GoatBot.onEvent.push(cfg.name);
                GoatBot.commands.set(cfg.name.toLowerCase(), command);
                GoatBot.commandFilesPath = GoatBot.commandFilesPath || [];
                GoatBot.commandFilesPath.push({ filePath: path.normalize(filePath), commandName: [cfg.name, ...validAliases] });
                DISABLED_CMDS.delete(cfg.name.toLowerCase());
                return { status: "success", name: cfg.name, cfg };
        } catch (err) {
                return { status: "error", name: fileName, error: err };
        }
}

function unloadOne(commandName) {
        const GoatBot = global.GoatBot;
        const command = GoatBot.commands.get(commandName.toLowerCase());
        if (!command) return { status: "error", name: commandName, error: new Error(`"${commandName}" not found`) };
        const cfg = command.config;
        for (const a of (cfg.aliases || [])) GoatBot.aliases.delete(a);
        GoatBot.onChat = (GoatBot.onChat || []).filter(n => n !== cfg.name);
        GoatBot.onEvent = (GoatBot.onEvent || []).filter(n => n !== cfg.name);
        GoatBot.commands.delete(cfg.name.toLowerCase());
        GoatBot.commandFilesPath = (GoatBot.commandFilesPath || []).filter(i => !i.commandName.includes(cfg.name));
        try { delete require.cache[require.resolve(command.location)]; } catch {}
        return { status: "success", name: cfg.name };
}

function deleteOne(commandName) {
        const GoatBot = global.GoatBot;
        const name = commandName.toLowerCase().replace(/\.js$/, "");
        const filePath = path.join(process.cwd(), "scripts/cmds", `${name}.js`);
        if (!fs.existsSync(filePath)) return { status: "error", name, error: new Error(`File not found: ${name}.js`) };
        unloadOne(name);
        fs.unlinkSync(filePath);
        return { status: "success", name };
}

function getCmdStats() {
        const cmds = [...global.GoatBot.commands.values()];
        const byCategory = {};
        const byRole = { 0: 0, 1: 0, 2: 0, 3: 0 };
        for (const cmd of cmds) {
                const cat = cmd.config.category || "other";
                if (!byCategory[cat]) byCategory[cat] = 0;
                byCategory[cat]++;
                const role = cmd.config.role ?? 0;
                if (byRole[role] !== undefined) byRole[role]++;
        }
        return { total: cmds.length, byCategory, byRole };
}

module.exports = {
        config: {
                name: "cmd",
                aliases: ["command"],
                version: "3.0.0",
                author: "SIFAT",
                countDown: 3,
                role: 2,
                description: { en: "ᴍᴀɴᴀɢᴇ ᴄᴏᴍᴍᴀɴᴅ ꜱᴄʀɪᴘᴛꜱ" },
                category: "owner",
                guide: { en: "{pn} load | loadall | unload | reload | reloadall | delete | list | info | source | search | count | enable | disable | install | autopush on/off" }
        },

        langs: {
                en: {
                        noName:        "⌀ ᴇɴᴛᴇʀ ᴄᴏᴍᴍᴀɴᴅ ɴᴀᴍᴇ",
                        loaded:        "✦ ʟᴏᴀᴅᴇᴅ ─ %1",
                        loadFail:      "⌀ ꜰᴀɪʟᴇᴅ ─ %1\n◈ %2",
                        loadAllDone:   "✦ ʟᴏᴀᴅᴇᴅ %1 ᴄᴍᴅ(ꜱ)%2",
                        loadAllFail:   "\n⌀ ꜰᴀɪʟᴇᴅ %1 ᴄᴍᴅ(ꜱ)\n%2",
                        unloaded:      "✦ ᴜɴʟᴏᴀᴅᴇᴅ ─ %1",
                        unloadFail:    "⌀ ᴜɴʟᴏᴀᴅ ꜰᴀɪʟᴇᴅ ─ %1\n◈ %2",
                        reloaded:      "✦ ʀᴇʟᴏᴀᴅᴇᴅ ─ %1",
                        reloadFail:    "⌀ ʀᴇʟᴏᴀᴅ ꜰᴀɪʟᴇᴅ ─ %1\n◈ %2",
                        reloadAllDone: "✦ ʀᴇʟᴏᴀᴅᴇᴅ %1 ᴄᴍᴅ(ꜱ)%2",
                        noUrl:         "⌀ ᴇɴᴛᴇʀ ᴜʀʟ ᴀɴᴅ ꜰɪʟᴇɴᴀᴍᴇ",
                        noFileName:    "⌀ ᴇɴᴛᴇʀ ꜰɪʟᴇɴᴀᴍᴇ (.ᴊꜱ)",
                        badUrl:        "⌀ ɪɴᴠᴀʟɪᴅ ᴜʀʟ",
                        noCode:        "⌀ ᴄᴏᴜʟᴅ ɴᴏᴛ ꜰᴇᴛᴄʜ ᴄᴏᴅᴇ",
                        exists:        "⌀ ꜰɪʟᴇ ᴀʟʀᴇᴀᴅʏ ᴇxɪꜱᴛꜱ ─ ʀᴇᴀᴄᴛ ᴛᴏ ᴏᴠᴇʀᴡʀɪᴛᴇ",
                        installed:     "✦ ɪɴꜱᴛᴀʟʟᴇᴅ ─ %1\n◈ ᴘᴀᴛʜ: %2",
                        installedGh:   "✦ ɪɴꜱᴛᴀʟʟᴇᴅ ─ %1\n◈ ᴘᴀᴛʜ: %2\n◈ ɢɪᴛʜᴜʙ: ᴘᴜꜱʜᴇᴅ (%3)",
                        installFail:   "⌀ ɪɴꜱᴛᴀʟʟ ꜰᴀɪʟᴇᴅ ─ %1\n◈ %2",
                        ghFail:        "⚠ ɢɪᴛʜᴜʙ ᴘᴜꜱʜ ꜰᴀɪʟᴇᴅ ─ %1",
                        notFound:      "⌀ ᴄᴏᴍᴍᴀɴᴅ ɴᴏᴛ ꜰᴏᴜɴᴅ ─ %1",
                        info:          "✦ %1\n◈ ᴠᴇʀꜱɪᴏɴ  : %2\n◈ ᴀᴜᴛʜᴏʀ   : %3\n◈ ᴄᴀᴛᴇɢᴏʀʏ : %4\n◈ ʀᴏʟᴇ     : %5\n◈ ᴀʟɪᴀꜱᴇꜱ  : %6\n◈ ᴄᴏᴏʟᴅᴏᴡɴ : %7ꜱ\n◈ ꜱᴛᴀᴛᴜꜱ   : %8",
                        autopushOn:    "✅ ᴄᴍᴅ ᴀᴜᴛᴏᴘᴜꜱʜ → ᴏɴ\n◈ ɪɴꜱᴛᴀʟʟ ᴇʀ ᴘᴏʀ GitHub ᴇ ᴀᴜᴛᴏ ᴘᴜꜱʜ ʜᴏʙᴇ",
                        autopushOff:   "🔴 ᴄᴍᴅ ᴀᴜᴛᴏᴘᴜꜱʜ → ᴏꜰꜰ\n◈ ᴍᴀɴᴜᴀʟ .ɢɪᴛᴘᴜꜱʜ ʙʏᴀᴠᴀʜᴀʀ ᴋᴏʀᴏ",
                        autopushStat:  "◈ ᴄᴍᴅ ᴀᴜᴛᴏᴘᴜꜱʜ: %1\n◈ ᴜꜱᴀɢᴇ: .ᴄᴍᴅ ᴀᴜᴛᴏᴘᴜꜱʜ ᴏɴ/ᴏꜰꜰ",
                        deleteConfirm: "⚠ ᴅᴇʟᴇᴛᴇ [%1]?\n◈ ᴛʜɪꜱ ᴡɪʟʟ ʀᴇᴍᴏᴠᴇ ᴛʜᴇ .ᴊꜱ ꜰɪʟᴇ ᴘᴇʀᴍᴀɴᴇɴᴛʟʏ\n◈ ʀᴇᴀᴄᴛ 👍 ᴛᴏ ᴄᴏɴꜰɪʀᴍ",
                        deleted:       "🗑 ᴅᴇʟᴇᴛᴇᴅ ─ %1",
                        deleteFail:    "⌀ ᴅᴇʟᴇᴛᴇ ꜰᴀɪʟᴇᴅ ─ %1\n◈ %2",
                        disabled:      "🔴 ᴅɪꜱᴀʙʟᴇᴅ ─ %1",
                        enabled:       "✅ ᴇɴᴀʙʟᴇᴅ ─ %1",
                        alreadyState:  "⌀ %1 ɪꜱ ᴀʟʀᴇᴀᴅʏ %2",
                        noResults:     "⌀ ɴᴏ ʀᴇꜱᴜʟᴛꜱ ꜰᴏʀ: %1",
                        searchResult:  "🔍 ꜱᴇᴀʀᴄʜ [%1] — %2 ʀᴇꜱᴜʟᴛ(ꜱ):\n%3",
                        sourceHeader:  "📄 ꜱᴏᴜʀᴄᴇ ─ %1.ᴊꜱ\n◈ ꜱɪᴢᴇ: %2 ʙʏᴛᴇꜱ | %3 ʟɪɴᴇꜱ\n━━━━━━━━━━━━━━━━\n%4",
                        count:         "📊 ᴄᴍᴅ ꜱᴛᴀᴛꜱ\n◈ ᴛᴏᴛᴀʟ     : %1\n◈ ᴅɪꜱᴀʙʟᴇᴅ  : %2\n◈ ʙʏ ʀᴏʟᴇ   :\n%3\n◈ ʙʏ ᴄᴀᴛ    :\n%4"
                }
        },

        onStart: async function ({ args, message, event, commandName, getLang }) {
                const sub = (args[0] || "").toLowerCase();

                if (sub === "load" && args.length === 2) {
                        if (!args[1]) return message.reply(getLang("noName"));
                        const r = loadOne(args[1]);
                        if (r.status === "success") return message.reply(getLang("loaded", r.name));
                        return message.reply(getLang("loadFail", r.name, r.error.message));
                }

                if (sub === "loadall" || (sub === "load" && args.length > 2)) {
                        const files = sub === "loadall"
                                ? fs.readdirSync(`${process.cwd()}/scripts/cmds`)
                                        .filter(f => f.endsWith(".js") && !f.endsWith(".eg.js") && !configCommands.commandUnload?.includes(f))
                                        .map(f => f.replace(".js", ""))
                                : args.slice(1);
                        const ok = [], fail = [];
                        for (const f of files) {
                                const r = loadOne(f);
                                r.status === "success" ? ok.push(r.name) : fail.push(`  ◦ ${f}: ${r.error.message}`);
                        }
                        return message.reply(getLang("loadAllDone", ok.length, fail.length ? getLang("loadAllFail", fail.length, fail.join("\n")) : ""));
                }

                if (sub === "unload") {
                        if (!args[1]) return message.reply(getLang("noName"));
                        const r = unloadOne(args[1]);
                        if (r.status === "success") return message.reply(getLang("unloaded", r.name));
                        return message.reply(getLang("unloadFail", r.name, r.error.message));
                }

                if (sub === "reload") {
                        if (!args[1]) return message.reply(getLang("noName"));
                        unloadOne(args[1]);
                        const lRes = loadOne(args[1]);
                        if (lRes.status === "success") return message.reply(getLang("reloaded", lRes.name));
                        return message.reply(getLang("reloadFail", args[1], lRes.error.message));
                }

                if (sub === "reloadall") {
                        const files = fs.readdirSync(`${process.cwd()}/scripts/cmds`)
                                .filter(f => f.endsWith(".js") && !f.endsWith(".eg.js") && !configCommands.commandUnload?.includes(f))
                                .map(f => f.replace(".js", ""));
                        const ok = [], fail = [];
                        for (const f of files) {
                                unloadOne(f);
                                const r = loadOne(f);
                                r.status === "success" ? ok.push(r.name) : fail.push(`  ◦ ${f}: ${r.error.message}`);
                        }
                        return message.reply(getLang("reloadAllDone", ok.length, fail.length ? getLang("loadAllFail", fail.length, fail.join("\n")) : ""));
                }

                if (sub === "delete") {
                        if (!args[1]) return message.reply(getLang("noName"));
                        const names = args.slice(1);
                        if (names.length === 1) {
                                return message.reply(getLang("deleteConfirm", names[0]), (err, info) => {
                                        global.GoatBot.onReaction.set(info.messageID, {
                                                commandName, messageID: info.messageID, type: "delete",
                                                author: event.senderID, data: { names }
                                        });
                                });
                        }
                        const lines = [];
                        for (const n of names) {
                                const r = deleteOne(n);
                                lines.push(r.status === "success" ? getLang("deleted", r.name) : getLang("deleteFail", r.name, r.error.message));
                        }
                        return message.reply(lines.join("\n"));
                }

                if (sub === "disable") {
                        if (!args[1]) return message.reply(getLang("noName"));
                        const name = args[1].toLowerCase();
                        if (!global.GoatBot.commands.has(name)) return message.reply(getLang("notFound", args[1]));
                        if (DISABLED_CMDS.has(name)) return message.reply(getLang("alreadyState", args[1], "ᴅɪꜱᴀʙʟᴇᴅ"));
                        DISABLED_CMDS.add(name);
                        const cmd = global.GoatBot.commands.get(name);
                        cmd._originalOnStart = cmd.onStart;
                        cmd.onStart = async ({ message }) => message.reply(`⌀ ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ ɪꜱ ᴅɪꜱᴀʙʟᴇᴅ`);
                        return message.reply(getLang("disabled", args[1]));
                }

                if (sub === "enable") {
                        if (!args[1]) return message.reply(getLang("noName"));
                        const name = args[1].toLowerCase();
                        if (!global.GoatBot.commands.has(name)) return message.reply(getLang("notFound", args[1]));
                        if (!DISABLED_CMDS.has(name)) return message.reply(getLang("alreadyState", args[1], "ᴇɴᴀʙʟᴇᴅ"));
                        DISABLED_CMDS.delete(name);
                        const cmd = global.GoatBot.commands.get(name);
                        if (cmd._originalOnStart) { cmd.onStart = cmd._originalOnStart; delete cmd._originalOnStart; }
                        return message.reply(getLang("enabled", args[1]));
                }

                if (sub === "source") {
                        if (!args[1]) return message.reply(getLang("noName"));
                        const name = args[1].toLowerCase().replace(/\.js$/, "");
                        const filePath = path.join(process.cwd(), "scripts/cmds", `${name}.js`);
                        if (!fs.existsSync(filePath)) return message.reply(getLang("notFound", args[1]));
                        const code = fs.readFileSync(filePath, "utf-8");
                        const lines = code.split("\n").length;
                        const size = Buffer.byteLength(code, "utf-8");
                        const preview = code.length > 1800 ? code.slice(0, 1800) + "\n... [ᴛʀᴜɴᴄᴀᴛᴇᴅ]" : code;
                        return message.reply(getLang("sourceHeader", name, size, lines, preview));
                }

                if (sub === "search") {
                        const query = args.slice(1).join(" ").toLowerCase();
                        if (!query) return message.reply(getLang("noName"));
                        const cmds = [...global.GoatBot.commands.values()];
                        const results = cmds.filter(cmd => {
                                const cfg = cmd.config;
                                return cfg.name.toLowerCase().includes(query)
                                        || (cfg.category || "").toLowerCase().includes(query)
                                        || (cfg.author || "").toLowerCase().includes(query)
                                        || (cfg.aliases || []).some(a => a.toLowerCase().includes(query));
                        });
                        if (!results.length) return message.reply(getLang("noResults", query));
                        const lines = results.map(cmd => {
                                const cfg = cmd.config;
                                const dis = DISABLED_CMDS.has(cfg.name.toLowerCase()) ? " 🔴" : "";
                                return `  ◦ ${cfg.name}${dis} [${cfg.category}] — by ${cfg.author || "─"}`;
                        });
                        return message.reply(getLang("searchResult", query, results.length, lines.join("\n")));
                }

                if (sub === "count") {
                        const stats = getCmdStats();
                        const roleLabels = { 0: "ᴇᴠᴇʀʏᴏɴᴇ", 1: "ɢʀᴘ ᴀᴅᴍɪɴ", 2: "ʙᴏᴛ ᴀᴅᴍɪɴ", 3: "ᴘʀᴇᴍɪᴜᴍ" };
                        const roleLines = Object.entries(stats.byRole)
                                .filter(([, v]) => v > 0)
                                .map(([k, v]) => `  ◦ ${roleLabels[k] || k}: ${v}`)
                                .join("\n");
                        const catLines = Object.entries(stats.byCategory)
                                .sort((a, b) => b[1] - a[1])
                                .map(([k, v]) => `  ◦ ${k}: ${v}`)
                                .join("\n");
                        return message.reply(getLang("count", stats.total, DISABLED_CMDS.size, roleLines, catLines));
                }

                if (sub === "list") {
                        const cmds = [...global.GoatBot.commands.values()];
                        const categories = {};
                        for (const cmd of cmds) {
                                const cat = cmd.config.category || "other";
                                if (!categories[cat]) categories[cat] = [];
                                const dis = DISABLED_CMDS.has(cmd.config.name.toLowerCase()) ? "🔴" : "";
                                categories[cat].push(dis + cmd.config.name);
                        }
                        const lines = ["✦ ᴄᴏᴍᴍᴀɴᴅꜱ [" + Object.keys(categories).length + " ᴄᴀᴛᴇɢᴏʀɪᴇꜱ]:"];
                        for (const [cat, names] of Object.entries(categories).sort()) {
                                lines.push(`│ [${cat}]`);
                                lines.push(`│  ${names.sort().join(", ")}`);
                        }
                        lines.push(`│ ᴛᴏᴛᴀʟ: ${cmds.length} ᴄᴍᴅ(ꜱ) | ᴅɪꜱᴀʙʟᴇᴅ: ${DISABLED_CMDS.size}`);
                        return message.reply(lines.join("\n"));
                }

                if (sub === "info") {
                        if (!args[1]) return message.reply(getLang("noName"));
                        const name = args[1].toLowerCase();
                        const cmd = global.GoatBot.commands.get(name)
                                || global.GoatBot.commands.get(global.GoatBot.aliases.get(name));
                        if (!cmd) return message.reply(getLang("notFound", args[1]));
                        const cfg = cmd.config;
                        const roleMap = { 0: "ᴇᴠᴇʀʏᴏɴᴇ", 1: "ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ", 2: "ʙᴏᴛ ᴀᴅᴍɪɴ", 3: "ᴘʀᴇᴍɪᴜᴍ", 4: "ᴅᴇᴠ" };
                        const status = DISABLED_CMDS.has(cfg.name.toLowerCase()) ? "🔴 ᴅɪꜱᴀʙʟᴇᴅ" : "✅ ᴀᴄᴛɪᴠᴇ";
                        const filePath = path.join(process.cwd(), "scripts/cmds", `${cfg.name.toLowerCase()}.js`);
                        const size = fs.existsSync(filePath) ? `${fs.statSync(filePath).size}ʙ` : "─";
                        return message.reply(getLang("info",
                                cfg.name, cfg.version || "─", cfg.author || "─", cfg.category || "─",
                                roleMap[cfg.role] || String(cfg.role),
                                (cfg.aliases?.length ? cfg.aliases.join(", ") : "─"),
                                cfg.countDown || 0, `${status} | ${size}`
                        ));
                }

                if (sub === "autopush") {
                        const val = (args[1] || "").toLowerCase();
                        if (val === "on")  { setAutopush("cmd", true);  return message.reply(getLang("autopushOn")); }
                        if (val === "off") { setAutopush("cmd", false); return message.reply(getLang("autopushOff")); }
                        const status = getAutopush("cmd") ? "✅ ᴏɴ" : "🔴 ᴏꜰꜰ";
                        return message.reply(getLang("autopushStat", status));
                }

                if (sub === "install") {
                        let url = args[1], fileName = args[2], rawCode;
                        if (!url || !fileName) return message.reply(getLang("noUrl"));
                        if (url.endsWith(".js") && !isURL(url)) { const t = fileName; fileName = url; url = t; }
                        if (isURL(url)) {
                                if (!fileName || !fileName.endsWith(".js")) return message.reply(getLang("noFileName"));
                                const domain = getDomain(url);
                                if (!domain) return message.reply(getLang("badUrl"));
                                url = resolveInstallUrl(url);
                                const res = await axios.get(url);
                                rawCode = res.data;
                                if (domain === "savetext.net") { const $ = cheerio.load(rawCode); rawCode = $("#content").text(); }
                        } else {
                                if (args[args.length - 1].endsWith(".js")) {
                                        fileName = args[args.length - 1];
                                        rawCode = event.body.slice(event.body.indexOf("install") + 7, event.body.indexOf(fileName) - 1).trim();
                                } else if (args[1]?.endsWith(".js")) {
                                        fileName = args[1];
                                        rawCode = event.body.slice(event.body.indexOf(fileName) + fileName.length + 1).trim();
                                } else return message.reply(getLang("noFileName"));
                        }
                        if (!rawCode) return message.reply(getLang("noCode"));
                        const nameNoExt = fileName.replace(".js", "");
                        const destPath = path.join(process.cwd(), "scripts/cmds", fileName);
                        if (fs.existsSync(destPath))
                                return message.reply(getLang("exists"), (err, info) => {
                                        global.GoatBot.onReaction.set(info.messageID, {
                                                commandName, messageID: info.messageID, type: "install",
                                                author: event.senderID, data: { nameNoExt, rawCode, destPath }
                                        });
                                });
                        const r = loadOne(nameNoExt, rawCode);
                        if (r.status !== "success") return message.reply(getLang("installFail", r.name || nameNoExt, r.error.message));
                        const rel = destPath.replace(process.cwd(), "");
                        try {
                                const gh = await pushFileToGitHub(destPath, "cmd");
                                if (gh.success) return message.reply(getLang("installedGh", r.name, rel, gh.action));
                        } catch (e) { message.reply(getLang("ghFail", e.message)); }
                        return message.reply(getLang("installed", r.name, rel));
                }

                return message.SyntaxError();
        },

        onReaction: async function ({ Reaction, message, event, getLang }) {
                if (event.userID !== Reaction.author) return;
                const { type, data } = Reaction;
                const { nameNoExt, rawCode, destPath, names } = data;

                if (type === "delete") {
                        const lines = [];
                        for (const n of names) {
                                const r = deleteOne(n);
                                lines.push(r.status === "success" ? getLang("deleted", r.name) : getLang("deleteFail", r.name, r.error.message));
                        }
                        return message.reply(lines.join("\n"));
                }

                if (type === "install") {
                        const r = loadOne(nameNoExt, rawCode);
                        if (r.status !== "success") return message.reply(getLang("installFail", r.name || nameNoExt, r.error.message));
                        const rel = destPath.replace(process.cwd(), "");
                        try {
                                const gh = await pushFileToGitHub(destPath, "cmd");
                                if (gh.success) return message.reply(getLang("installedGh", r.name, rel, gh.action));
                        } catch (e) { message.reply(getLang("ghFail", e.message)); }
                        return message.reply(getLang("installed", r.name, rel));
                }
        }
};
