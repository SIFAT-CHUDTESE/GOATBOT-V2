const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const eta = require("eta");
const http = require("http");

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, "sifu_database", "multibot_state.json");
const ACCOUNTS_DIR = path.join(ROOT, "accounts");

function readState() {
    try { return fs.existsSync(STATE_FILE) ? fs.readJsonSync(STATE_FILE) : { bots: [] }; }
    catch { return { bots: [] }; }
}

function scanAccounts() {
    const files = [];
    const primary = path.join(ACCOUNTS_DIR, "account.txt");
    if (fs.existsSync(primary)) files.push(primary);
    let i = 2;
    while (true) {
        const f = path.join(ACCOUNTS_DIR, `account${i}.txt`);
        if (fs.existsSync(f)) { files.push(f); i++; } else break;
    }
    return files;
}

function hasContent(filePath) {
    try {
        const t = fs.readFileSync(filePath, "utf8").trim();
        return t && t.split("\n").some(l => { const s = l.trim(); return s && !s.startsWith("#"); });
    } catch { return false; }
}

module.exports = async (api) => {
    if (!api) await require("./connectDB.js")();

    const config = global.GoatBot.config;
    const app = express();
    const server = http.createServer(app);

    eta.configure({ useWith: true });
    app.set("views", path.join(__dirname, "views"));
    app.engine("eta", eta.renderFile);
    app.set("view engine", "eta");

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use("/public", express.static(path.join(__dirname, "public")));
    app.use("/images", express.static(path.join(__dirname, "images")));

    app.get("/", (req, res) => {
        res.render("index", {
            botName: config.nameBot || "GOATBOT",
            prefix: config.prefix || "."
        });
    });

    app.get("/api/bots", (req, res) => {
        const state = readState();
        res.json({ ok: true, bots: state.bots || [], savedAt: state.savedAt || null });
    });

    app.get("/api/commands", (req, res) => {
        try {
            const cmdsDir = path.join(ROOT, "scripts/cmds");
            const files = fs.readdirSync(cmdsDir).filter(f =>
                f.endsWith(".js") && !f.endsWith(".eg.js")
            );
            const commands = files.map(f => {
                try {
                    const filePath = path.join(cmdsDir, f);
                    delete require.cache[require.resolve(filePath)];
                    const mod = require(filePath);
                    return {
                        name: mod.config?.name || f.replace(".js", ""),
                        description: mod.config?.description?.en || "",
                        category: mod.config?.category || "other",
                        role: mod.config?.role ?? 0,
                        author: mod.config?.author || "",
                        aliases: mod.config?.aliases || []
                    };
                } catch { return null; }
            }).filter(Boolean);
            res.json(commands);
        } catch { res.json([]); }
    });

    app.get("/api/system", (req, res) => {
        const mem = process.memoryUsage();
        const uptime = process.uptime();
        const h = Math.floor(uptime / 3600), m = Math.floor((uptime % 3600) / 60), s = Math.floor(uptime % 60);
        let pkg = {};
        try { pkg = fs.readJsonSync(path.join(ROOT, "package.json")); } catch {}
        res.json({
            uptime: { raw: uptime, formatted: `${h}h ${m}m ${s}s` },
            memory: {
                rss: (mem.rss / 1024 / 1024).toFixed(1),
                heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(1)
            },
            nodeVersion: process.version,
            botVersion: pkg.version || "2.0.0",
            prefix: config.prefix || ".",
            botName: config.nameBot || "GoatBot"
        });
    });

    app.get("/api/accounts", (req, res) => {
        try {
            const files = scanAccounts();
            const state = readState();
            const usedFiles = new Set((state.bots || []).filter(b => b.status !== "stopped").map(b => b.accountFile));
            const accounts = files.map((f, i) => ({
                index: i + 1,
                name: path.basename(f),
                valid: hasContent(f),
                inUse: usedFiles.has(f)
            }));
            res.json(accounts);
        } catch { res.json([]); }
    });

    app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));
    app.get("/uptime", global.responseUptimeCurrent || ((req, res) => res.json({ status: "ok" })));

    app.use((req, res) => res.redirect("/"));

    const PORT = process.env.PORT || config.dashBoard?.port || 5000;
    const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const dashUrl = replitDomain ? `https://${replitDomain}` : `http://localhost:${PORT}`;

    await server.listen(PORT, "0.0.0.0");
    global.utils?.log?.info("DASHBOARD", `Running → ${dashUrl}`);

    if (config.serverUptime?.socket?.enable)
        require("../../bot/login/socketIO.js")(server);
};
