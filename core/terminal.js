const { spawn } = require("child_process");
const fs = require("fs-extra");
const path = require("path");
const readline = require("readline");
const chalk = require("chalk");

const AUTHOR = "SIFAT";
const ACCOUNTS_DIR = path.join(__dirname, "../accounts");
const STATE_FILE = path.join(__dirname, "../sifu_database", "multibot_state.json");
const MAX_CRASH_RETRIES = 5;
const CRASH_COOLDOWN_MS = 60000;
const CODE2_RESTART_DELAY = 3000;
const SWITCH_DELAY = 5000;
const DEAD_RETRY_DELAY = 120000;

const bots = new Map();
let botIdCounter = 1;
let rl;

function getTimestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    return chalk.gray(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
}

function log(tag, msg, color = "cyan") {
    const c = { cyan: chalk.cyanBright, green: chalk.greenBright, yellow: chalk.yellowBright, red: chalk.redBright, magenta: chalk.magentaBright, white: chalk.white, blue: chalk.blueBright };
    const fn = c[color] || chalk.white;
    process.stdout.write(`${getTimestamp()} ${fn(`[${tag}]`)} ${chalk.white(msg)}\n`);
    if (rl) rl.prompt(true);
}

function banner() {
    console.clear();
    console.log(chalk.magentaBright("╔════════════════════════════════════════╗"));
    console.log(chalk.magentaBright("║") + chalk.bold.whiteBright("        GOATBOT MULTIBOT TERMINAL SYSTEM          ") + chalk.magentaBright("║"));
    console.log(chalk.magentaBright("║") + chalk.yellowBright("               Author: SIFAT                      ") + chalk.magentaBright("║"));
    console.log(chalk.magentaBright("╚════════════════════════════════════════╝"));
    console.log();
}

function hasValidContent(filePath) {
    try {
        const txt = fs.readFileSync(filePath, "utf8").trim();
        if (!txt) return false;
        const lines = txt.split("\n");
        const realLines = lines.filter(l => {
            const t = l.trim();
            return t && !t.startsWith("#");
        });
        return realLines.length > 0;
    } catch (e) {
        return false;
    }
}

function scanAccounts(validOnly = false) {
    fs.ensureDirSync(ACCOUNTS_DIR);
    const all = [];
    const primary = path.join(ACCOUNTS_DIR, "account.txt");
    if (fs.existsSync(primary)) all.push(primary);
    let i = 2;
    while (true) {
        const f = path.join(ACCOUNTS_DIR, `account${i}.txt`);
        if (fs.existsSync(f)) { all.push(f); i++; } else break;
    }
    const primaryJson = path.join(ACCOUNTS_DIR, "account.json");
    if (fs.existsSync(primaryJson) && !all.includes(primaryJson)) all.push(primaryJson);
    let j = 2;
    while (true) {
        const f = path.join(ACCOUNTS_DIR, `account${j}.json`);
        if (fs.existsSync(f) && !all.includes(f)) { all.push(f); j++; } else break;
    }
    if (validOnly) return all.filter(hasValidContent);
    return all;
}

function saveState() {
    try {
        fs.ensureDirSync(path.dirname(STATE_FILE));
        const state = { savedAt: new Date().toISOString(), bots: [] };
        for (const [id, bot] of bots) {
            state.bots.push({ id, accountFile: bot.accountFile, status: bot.status, restartCount: bot.restartCount });
        }
        fs.writeJsonSync(STATE_FILE, state, { spaces: 2 });
    } catch (e) {}
}

function getBotStatus(bot) {
    const map = {
        running: chalk.greenBright("● RUNNING"),
        stopped: chalk.redBright("● STOPPED"),
        crashed: chalk.yellowBright("● CRASHED"),
        dead: chalk.red("● DEAD"),
        restarting: chalk.blueBright("● RESTART"),
        switching: chalk.magentaBright("● SWITCH"),
        starting: chalk.cyanBright("● STARTING")
    };
    return map[bot.status] || chalk.gray(`● ${String(bot.status).toUpperCase()}`);
}

function startBotProcess(botId, accountFile) {
    const bot = bots.get(botId);
    if (!bot) return;

    if (!hasValidContent(accountFile)) {
        log(`BOT-${botId}`, `Skipped — ${path.basename(accountFile)} has no valid cookie/credentials`, "yellow");
        bot.status = "stopped";
        saveState();
        return;
    }

    bot.accountFile = accountFile;
    bot.status = "running";
    bot.startTime = Date.now();

    const env = Object.assign({}, process.env, {
        GOAT_BOT_ACCOUNT_FILE: accountFile,
        GOAT_BOT_ID: String(botId),
        GOAT_MULTIBOT_MODE: "1",
        FORCE_COLOR: "1"
    });

    const child = spawn("node", ["index.js"], {
        cwd: path.join(__dirname, ".."),
        env,
        stdio: ["ignore", "pipe", "pipe"]
    });

    bot.process = child;
    bot.pid = child.pid;

    child.stdout.on("data", (data) => {
        const lines = data.toString().split("\n").filter(l => l.trim());
        for (const line of lines) {
            process.stdout.write(`${getTimestamp()} ${chalk.cyanBright(`[BOT-${botId}]`)} ${line}\n`);
        }
        if (rl) rl.prompt(true);
    });

    child.stderr.on("data", (data) => {
        const lines = data.toString().split("\n").filter(l => l.trim());
        for (const line of lines) {
            process.stdout.write(`${getTimestamp()} ${chalk.redBright(`[BOT-${botId}|ERR]`)} ${line}\n`);
        }
        if (rl) rl.prompt(true);
    });

    child.on("close", (code) => {
        if (!bots.has(botId)) return;
        const b = bots.get(botId);
        b.process = null;
        b.pid = null;

        if (b.status === "stopped") return;

        b.restartCount = (b.restartCount || 0) + 1;

        if (code === 2) {
            log(`BOT-${botId}`, `Bot requested restart (exit code 2)`, "yellow");
            b.status = "restarting";
            setTimeout(() => {
                if (bots.has(botId) && bots.get(botId).status !== "stopped") {
                    startBotProcess(botId, b.accountFile);
                }
            }, CODE2_RESTART_DELAY);
            return;
        }

        const uptime = Date.now() - (b.startTime || Date.now());
        const quickCrash = uptime < 15000;

        if (quickCrash) {
            b.quickCrashCount = (b.quickCrashCount || 0) + 1;
        } else {
            b.quickCrashCount = 0;
        }

        if (b.quickCrashCount >= MAX_CRASH_RETRIES) {
            const validAccounts = scanAccounts(true);
            const others = validAccounts.filter(a => a !== b.accountFile);
            if (others.length > 0) {
                const next = others[b.switchIndex % others.length] || others[0];
                b.switchIndex = ((b.switchIndex || 0) + 1) % others.length;
                b.quickCrashCount = 0;
                log(`BOT-${botId}`, `${MAX_CRASH_RETRIES} quick crashes — auto-switching to ${path.basename(next)}`, "yellow");
                b.status = "switching";
                setTimeout(() => {
                    if (bots.has(botId) && bots.get(botId).status !== "stopped") {
                        startBotProcess(botId, next);
                    }
                }, SWITCH_DELAY);
            } else {
                b.status = "dead";
                log(`BOT-${botId}`, `Dead after ${MAX_CRASH_RETRIES} crashes. No other valid accounts. Will retry in 2 min.`, "red");
                setTimeout(() => {
                    if (bots.has(botId) && bots.get(botId).status !== "stopped") {
                        b.quickCrashCount = 0;
                        startBotProcess(botId, b.accountFile);
                    }
                }, DEAD_RETRY_DELAY);
            }
        } else {
            log(`BOT-${botId}`, `Crashed (code ${code || "?"}). Restarting in ${CRASH_COOLDOWN_MS / 1000}s... [crash ${b.quickCrashCount}/${MAX_CRASH_RETRIES}]`, "yellow");
            b.status = "restarting";
            setTimeout(() => {
                if (bots.has(botId) && bots.get(botId).status !== "stopped") {
                    startBotProcess(botId, b.accountFile);
                }
            }, CRASH_COOLDOWN_MS);
        }

        saveState();
    });

    log(`BOT-${botId}`, `Started → ${path.basename(accountFile)} (PID: ${child.pid})`, "green");
    saveState();
}

function spawnBot(accountFile) {
    const id = botIdCounter++;
    bots.set(id, {
        id,
        accountFile,
        status: "starting",
        process: null,
        pid: null,
        restartCount: 0,
        quickCrashCount: 0,
        switchIndex: 0,
        startTime: Date.now()
    });
    startBotProcess(id, accountFile);
    return id;
}

function stopBot(botId) {
    const bot = bots.get(botId);
    if (!bot) return false;
    bot.status = "stopped";
    if (bot.process) {
        try { bot.process.kill("SIGTERM"); } catch (e) {}
        setTimeout(() => {
            try { if (bot.process) bot.process.kill("SIGKILL"); } catch (e) {}
        }, 5000);
    }
    log(`BOT-${botId}`, `Stopped`, "yellow");
    saveState();
    return true;
}

function restartBot(botId) {
    const bot = bots.get(botId);
    if (!bot) return false;
    const account = bot.accountFile;
    const prevStatus = bot.status;
    bot.status = "stopped";
    if (bot.process) {
        try { bot.process.kill("SIGTERM"); } catch (e) {}
    }
    log(`BOT-${botId}`, `Restarting...`, "blue");
    setTimeout(() => {
        if (!bots.has(botId)) return;
        bots.get(botId).status = "restarting";
        bots.get(botId).quickCrashCount = 0;
        startBotProcess(botId, account);
    }, 3000);
    return true;
}

function switchBotAccount(botId, accountFile) {
    const bot = bots.get(botId);
    if (!bot) return false;
    if (!fs.existsSync(accountFile)) { log("ERROR", `Account file not found: ${accountFile}`, "red"); return false; }
    if (!hasValidContent(accountFile)) { log("ERROR", `${path.basename(accountFile)} has no valid credentials`, "red"); return false; }
    log(`BOT-${botId}`, `Switching account → ${path.basename(accountFile)}`, "magenta");
    bot.status = "switching";
    bot.quickCrashCount = 0;
    if (bot.process) {
        try { bot.process.kill("SIGTERM"); } catch (e) {}
    }
    setTimeout(() => {
        if (bots.has(botId)) startBotProcess(botId, accountFile);
    }, 3000);
    saveState();
    return true;
}

function changeCookie(accountFile, cookieData) {
    try {
        let parsed;
        const raw = typeof cookieData === "string" ? cookieData.trim() : "";
        if (raw.startsWith("[")) {
            parsed = JSON.parse(raw);
        } else if (raw.startsWith("{")) {
            parsed = [JSON.parse(raw)];
        } else {
            parsed = raw.split(";").map(part => {
                const eqIdx = part.indexOf("=");
                if (eqIdx === -1) return null;
                return {
                    key: part.slice(0, eqIdx).trim(),
                    value: part.slice(eqIdx + 1).trim(),
                    domain: "facebook.com",
                    path: "/",
                    hostOnly: true,
                    creation: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                };
            }).filter(c => c && c.key && c.value);
        }
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("No valid cookies parsed");
        fs.writeFileSync(accountFile, JSON.stringify(parsed, null, 2), "utf8");
        log("COOKIE", `Updated: ${path.basename(accountFile)} (${parsed.length} cookies)`, "green");
        return true;
    } catch (e) {
        log("COOKIE", `Failed: ${e.message}`, "red");
        return false;
    }
}

function listBots() {
    console.log();
    if (bots.size === 0) {
        log("LIST", "No bots registered. Use 'start' to launch one.", "yellow");
        console.log();
        return;
    }
    console.log(chalk.magentaBright("  ┌──────────┬───────────────────┬──────────────┬──────────┬─────────┐"));
    console.log(chalk.magentaBright("  │") + chalk.bold(" BOT ID   ") + chalk.magentaBright("│") + chalk.bold(" ACCOUNT           ") + chalk.magentaBright("│") + chalk.bold(" STATUS       ") + chalk.magentaBright("│") + chalk.bold(" CRASHES  ") + chalk.magentaBright("│") + chalk.bold(" PID     ") + chalk.magentaBright("│"));
    console.log(chalk.magentaBright("  ├──────────┼───────────────────┼──────────────┼──────────┼─────────┤"));
    for (const [id, bot] of bots) {
        const accName = path.basename(bot.accountFile).padEnd(17).slice(0, 17);
        const crashes = String(bot.restartCount || 0).padEnd(8);
        const pid = String(bot.pid || "-").padEnd(7);
        const status = getBotStatus(bot);
        console.log(chalk.magentaBright("  │") + ` BOT-${String(id).padEnd(4)} ` + chalk.magentaBright("│") + ` ${accName} ` + chalk.magentaBright("│") + ` ${status}` + chalk.magentaBright(" │") + ` ${crashes}` + chalk.magentaBright("│") + ` ${pid}` + chalk.magentaBright("│"));
    }
    console.log(chalk.magentaBright("  └──────────┴───────────────────┴──────────────┴──────────┴─────────┘"));
    console.log();
}

function listAccounts() {
    const all = scanAccounts(false);
    console.log();
    log("ACCOUNTS", `Found ${all.length} account file(s) in accounts/`, "cyan");
    all.forEach((acc, i) => {
        const valid = hasValidContent(acc);
        const size = fs.existsSync(acc) ? (fs.statSync(acc).size / 1024).toFixed(1) + "KB" : "?";
        const inUse = Array.from(bots.values()).some(b => b.accountFile === acc && b.status !== "stopped");
        const tag = inUse ? chalk.greenBright("[IN USE]") : (valid ? chalk.blueBright("[READY]") : chalk.gray("[EMPTY]"));
        console.log(`  ${chalk.yellowBright(`[${i + 1}]`)} ${path.basename(acc)} ${chalk.gray(`(${size})`)} ${tag}`);
    });
    console.log();
}

function showHelp() {
    console.log();
    console.log(chalk.bold.cyanBright("  ╔═══════════════════ MULTIBOT COMMANDS ════════════════════╗"));
    const cmds = [
        ["list / ls", "Show all running bots and their status"],
        ["accounts / acc", "Show all account files (READY/EMPTY/IN USE)"],
        ["start [acc_index]", "Start bot (picks unused account if no index given)"],
        ["stop <bot_id>", "Stop a specific bot"],
        ["restart <bot_id>", "Restart a specific bot"],
        ["switch <bot_id> <acc_index>", "Switch bot to a different account"],
        ["cookie <acc_index> <data>", "Update cookie for account (JSON or key=val;...)"],
        ["cookiefile <acc_index> <file>", "Load cookie for account from a file path"],
        ["addbot", "Start bots for all READY unused accounts"],
        ["stopall", "Stop all running bots"],
        ["restartall", "Restart all running bots"],
        ["status", "Show system overview"],
        ["clear", "Clear terminal screen"],
        ["help / h / ?", "Show this help message"],
        ["exit / quit", "Stop all bots and exit"]
    ];
    for (const [cmd, desc] of cmds) {
        console.log(`  ${chalk.yellowBright(cmd.padEnd(34))} ${chalk.gray(desc)}`);
    }
    console.log(chalk.bold.cyanBright("  ╚══════════════════════════════════════════════════════════╝"));
    console.log();
}

function showStatus() {
    const all = scanAccounts(false);
    const valid = all.filter(hasValidContent);
    const running = Array.from(bots.values()).filter(b => b.status === "running").length;
    const stopped = Array.from(bots.values()).filter(b => b.status === "stopped").length;
    const crashed = Array.from(bots.values()).filter(b => ["crashed", "dead"].includes(b.status)).length;
    const mem = process.memoryUsage();
    console.log();
    console.log(chalk.cyanBright("  ┌─── SYSTEM STATUS ────────────────────────────┐"));
    console.log(`  │ ${chalk.white("Total Bots:")}       ${chalk.yellowBright(String(bots.size).padEnd(28))}│`);
    console.log(`  │ ${chalk.white("Running:")}          ${chalk.greenBright(String(running).padEnd(28))}│`);
    console.log(`  │ ${chalk.white("Stopped/Dead:")}     ${chalk.redBright(String(stopped + crashed).padEnd(28))}│`);
    console.log(`  │ ${chalk.white("Account Files:")}    ${chalk.cyanBright(`${valid.length} valid / ${all.length} total`.padEnd(28))}│`);
    console.log(`  │ ${chalk.white("Memory (RSS):")}     ${chalk.magentaBright(((mem.rss / 1024 / 1024).toFixed(1) + "MB").padEnd(28))}│`);
    console.log(`  │ ${chalk.white("Uptime:")}           ${chalk.blueBright(formatUptime(process.uptime()).padEnd(28))}│`);
    console.log(chalk.cyanBright("  └──────────────────────────────────────────────┘"));
    console.log();
}

function formatUptime(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return `${h}h ${m}m ${sec}s`;
}

function handleCommand(input) {
    const trimmed = input.trim();
    if (!trimmed) return;
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
        case "list": case "ls":
            listBots(); break;

        case "accounts": case "acc":
            listAccounts(); break;

        case "start": {
            const allAccounts = scanAccounts(false);
            if (allAccounts.length === 0) { log("ERROR", "No account files in accounts/ folder", "red"); break; }
            let accountFile;
            if (parts[1]) {
                const idx = parseInt(parts[1]) - 1;
                if (isNaN(idx) || idx < 0 || idx >= allAccounts.length) { log("ERROR", `Invalid index. Valid: 1-${allAccounts.length}`, "red"); break; }
                accountFile = allAccounts[idx];
            } else {
                const validAccs = scanAccounts(true);
                const usedAccounts = new Set(Array.from(bots.values()).filter(b => b.status !== "stopped").map(b => b.accountFile));
                accountFile = validAccs.find(a => !usedAccounts.has(a)) || validAccs[0];
                if (!accountFile) { log("ERROR", "All valid accounts are already in use. Add new accounts first.", "yellow"); break; }
            }
            const id = spawnBot(accountFile);
            log("MULTIBOT", `Bot-${id} launched with ${path.basename(accountFile)}`, "green");
            break;
        }

        case "stop": {
            if (!parts[1]) { log("ERROR", "Usage: stop <bot_id>", "red"); break; }
            const id = parseInt(parts[1]);
            if (isNaN(id)) { log("ERROR", "Bot ID must be a number", "red"); break; }
            if (!stopBot(id)) log("ERROR", `Bot-${id} not found`, "red");
            break;
        }

        case "restart": {
            if (!parts[1]) { log("ERROR", "Usage: restart <bot_id>", "red"); break; }
            const id = parseInt(parts[1]);
            if (isNaN(id)) { log("ERROR", "Bot ID must be a number", "red"); break; }
            if (!restartBot(id)) log("ERROR", `Bot-${id} not found`, "red");
            break;
        }

        case "switch": {
            if (!parts[1] || !parts[2]) { log("ERROR", "Usage: switch <bot_id> <account_index>", "red"); break; }
            const botId = parseInt(parts[1]);
            const accIdx = parseInt(parts[2]) - 1;
            const accounts = scanAccounts(false);
            if (isNaN(botId) || isNaN(accIdx)) { log("ERROR", "Invalid arguments", "red"); break; }
            if (accIdx < 0 || accIdx >= accounts.length) { log("ERROR", `Account index out of range (1-${accounts.length})`, "red"); break; }
            if (!bots.has(botId)) { log("ERROR", `Bot-${botId} not found`, "red"); break; }
            switchBotAccount(botId, accounts[accIdx]);
            break;
        }

        case "cookie": {
            if (!parts[1] || !parts[2]) { log("ERROR", "Usage: cookie <account_index> <cookie_data>", "red"); break; }
            const accIdx = parseInt(parts[1]) - 1;
            const accounts = scanAccounts(false);
            if (isNaN(accIdx) || accIdx < 0 || accIdx >= accounts.length) { log("ERROR", `Invalid account index (1-${accounts.length})`, "red"); break; }
            const cookieData = parts.slice(2).join(" ");
            const ok = changeCookie(accounts[accIdx], cookieData);
            if (ok) {
                for (const [id, bot] of bots) {
                    if (bot.accountFile === accounts[accIdx] && bot.status !== "stopped") restartBot(id);
                }
            }
            break;
        }

        case "cookiefile": {
            if (!parts[1] || !parts[2]) { log("ERROR", "Usage: cookiefile <account_index> <filepath>", "red"); break; }
            const accIdx = parseInt(parts[1]) - 1;
            const accounts = scanAccounts(false);
            if (isNaN(accIdx) || accIdx < 0 || accIdx >= accounts.length) { log("ERROR", `Invalid account index (1-${accounts.length})`, "red"); break; }
            const filePath = path.resolve(parts.slice(2).join(" "));
            if (!fs.existsSync(filePath)) { log("ERROR", `File not found: ${filePath}`, "red"); break; }
            const rawData = fs.readFileSync(filePath, "utf8");
            const ok = changeCookie(accounts[accIdx], rawData);
            if (ok) {
                for (const [id, bot] of bots) {
                    if (bot.accountFile === accounts[accIdx] && bot.status !== "stopped") restartBot(id);
                }
            }
            break;
        }

        case "addbot": {
            const valid = scanAccounts(true);
            if (valid.length === 0) { log("ERROR", "No valid account files found (all are empty/placeholder)", "red"); break; }
            const usedAccounts = new Set(Array.from(bots.values()).filter(b => b.status !== "stopped").map(b => b.accountFile));
            const unused = valid.filter(a => !usedAccounts.has(a));
            if (unused.length === 0) { log("MULTIBOT", "All valid accounts already have a bot running", "yellow"); break; }
            for (const acc of unused) {
                const id = spawnBot(acc);
                log("MULTIBOT", `Bot-${id} → ${path.basename(acc)}`, "green");
            }
            break;
        }

        case "stopall": {
            if (bots.size === 0) { log("MULTIBOT", "No bots registered", "yellow"); break; }
            let count = 0;
            for (const [id, bot] of bots) { if (bot.status !== "stopped") { stopBot(id); count++; } }
            log("MULTIBOT", `Stopped ${count} bot(s)`, "yellow");
            break;
        }

        case "restartall": {
            if (bots.size === 0) { log("MULTIBOT", "No bots registered", "yellow"); break; }
            for (const [id] of bots) restartBot(id);
            log("MULTIBOT", "All bots restarting...", "blue");
            break;
        }

        case "status":
            showStatus(); break;

        case "clear":
            console.clear(); banner(); break;

        case "help": case "h": case "?":
            showHelp(); break;

        case "exit": case "quit":
            log("SYSTEM", "Stopping all bots and exiting...", "yellow");
            for (const [id] of bots) stopBot(id);
            setTimeout(() => { log("SYSTEM", "Goodbye.", "cyan"); process.exit(0); }, 2000);
            break;

        default:
            log("ERROR", `Unknown command: "${cmd}". Type "help" for available commands.`, "red");
    }
}

function initTerminal() {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
        prompt: chalk.magentaBright("MULTIBOT") + chalk.white(" › ")
    });
    rl.on("line", (line) => { handleCommand(line); rl.prompt(); });
    rl.on("close", () => { for (const [id] of bots) stopBot(id); process.exit(0); });
    rl.prompt();
}

function autoStartBots() {
    const valid = scanAccounts(true);
    const all = scanAccounts(false);
    const skipped = all.length - valid.length;
    if (all.length === 0) {
        log("SYSTEM", "No account files in accounts/ folder. Paste cookies then use 'start'.", "yellow");
        return;
    }
    if (valid.length === 0) {
        log("SYSTEM", `Found ${all.length} account file(s) but all are empty placeholders.`, "yellow");
        log("SYSTEM", "Paste real Facebook cookies into account files then use 'start'.", "yellow");
        return;
    }
    if (skipped > 0) log("SYSTEM", `${skipped} placeholder account(s) skipped (no credentials)`, "yellow");
    log("SYSTEM", `Starting ${valid.length} bot(s)...`, "cyan");
    for (const acc of valid) {
        const id = spawnBot(acc);
        log("MULTIBOT", `Auto-started Bot-${id} → ${path.basename(acc)}`, "green");
    }
}

const QUEUE_FILE = path.join(__dirname, "../sifu_database", "terminal_queue.json");
const RESULT_DIR = path.join(__dirname, "../sifu_database", "terminal_results");

function writeResult(reqId, ok, msg) {
    try {
        fs.ensureDirSync(RESULT_DIR);
        fs.writeJsonSync(path.join(RESULT_DIR, `${reqId}.json`), { ok, msg }, { spaces: 2 });
    } catch (e) {}
}

async function processQueueItem(item) {
    const { id, action, params = [] } = item;

    try {
        switch (action) {
            case "start": {
                const allAccounts = scanAccounts(false);
                if (allAccounts.length === 0) return writeResult(id, false, "ɴᴏ ᴀᴄᴄᴏᴜɴᴛ ꜰɪʟᴇꜱ ꜰᴏᴜɴᴅ");
                let accountFile;
                if (params[0] && !isNaN(params[0])) {
                    const idx = parseInt(params[0]) - 1;
                    if (idx < 0 || idx >= allAccounts.length) return writeResult(id, false, `ɪɴᴅᴇx ᴏᴜᴛ ᴏꜰ ʀᴀɴɢᴇ (1-${allAccounts.length})`);
                    accountFile = allAccounts[idx];
                } else {
                    const valid = scanAccounts(true);
                    const used = new Set(Array.from(bots.values()).filter(b => b.status !== "stopped").map(b => b.accountFile));
                    accountFile = valid.find(a => !used.has(a));
                    if (!accountFile) return writeResult(id, false, "ᴀʟʟ ᴠᴀʟɪᴅ ᴀᴄᴄᴏᴜɴᴛꜱ ᴀʟʀᴇᴀᴅʏ ɪɴ ᴜꜱᴇ");
                }
                const botId = spawnBot(accountFile);
                log(`QUEUE`, `start → Bot-${botId} → ${path.basename(accountFile)}`, "green");
                return writeResult(id, true, `✦ ʙᴏᴛ-${botId} ꜱᴛᴀʀᴛᴇᴅ ᴡɪᴛʜ ${path.basename(accountFile)}`);
            }

            case "stop": {
                const botId = parseInt(params[0]);
                if (isNaN(botId) || !bots.has(botId)) return writeResult(id, false, `ʙᴏᴛ-${params[0]} ɴᴏᴛ ꜰᴏᴜɴᴅ`);
                stopBot(botId);
                log(`QUEUE`, `stop → Bot-${botId}`, "yellow");
                return writeResult(id, true, `⏹ ʙᴏᴛ-${botId} ꜱᴛᴏᴘᴘᴇᴅ`);
            }

            case "restart": {
                const botId = parseInt(params[0]);
                if (isNaN(botId) || !bots.has(botId)) return writeResult(id, false, `ʙᴏᴛ-${params[0]} ɴᴏᴛ ꜰᴏᴜɴᴅ`);
                restartBot(botId);
                log(`QUEUE`, `restart → Bot-${botId}`, "blue");
                return writeResult(id, true, `🔄 ʙᴏᴛ-${botId} ʀᴇꜱᴛᴀʀᴛɪɴɢ...`);
            }

            case "switch": {
                const botId = parseInt(params[0]);
                const accIdx = parseInt(params[1]) - 1;
                const allAccounts = scanAccounts(false);
                if (isNaN(botId) || !bots.has(botId)) return writeResult(id, false, `ʙᴏᴛ-${params[0]} ɴᴏᴛ ꜰᴏᴜɴᴅ`);
                if (isNaN(accIdx) || accIdx < 0 || accIdx >= allAccounts.length) return writeResult(id, false, `ɪɴᴅᴇx ᴏᴜᴛ ᴏꜰ ʀᴀɴɢᴇ (1-${allAccounts.length})`);
                const accFile = allAccounts[accIdx];
                if (!hasValidContent(accFile)) return writeResult(id, false, `${path.basename(accFile)} ʜᴀꜱ ɴᴏ ᴄʀᴇᴅᴇɴᴛɪᴀʟꜱ`);
                switchBotAccount(botId, accFile);
                log(`QUEUE`, `switch → Bot-${botId} → ${path.basename(accFile)}`, "magenta");
                return writeResult(id, true, `🔀 ʙᴏᴛ-${botId} ꜱᴡɪᴛᴄʜɪɴɢ → ${path.basename(accFile)}`);
            }

            case "addbot": {
                const valid = scanAccounts(true);
                if (valid.length === 0) return writeResult(id, false, "ɴᴏ ᴠᴀʟɪᴅ ᴀᴄᴄᴏᴜɴᴛꜱ ꜰᴏᴜɴᴅ");
                const used = new Set(Array.from(bots.values()).filter(b => b.status !== "stopped").map(b => b.accountFile));
                const unused = valid.filter(a => !used.has(a));
                if (unused.length === 0) return writeResult(id, false, "ᴀʟʟ ᴀᴄᴄᴏᴜɴᴛꜱ ᴀʟʀᴇᴀᴅʏ ɪɴ ᴜꜱᴇ");
                const started = [];
                for (const acc of unused) {
                    const botId = spawnBot(acc);
                    started.push(`ʙᴏᴛ-${botId} → ${path.basename(acc)}`);
                }
                log(`QUEUE`, `addbot → started ${started.length}`, "green");
                return writeResult(id, true, `✦ ꜱᴛᴀʀᴛᴇᴅ ${started.length} ʙᴏᴛ(ꜱ):\n${started.join("\n")}`);
            }

            case "stopall": {
                let count = 0;
                for (const [botId, bot] of bots) { if (bot.status !== "stopped") { stopBot(botId); count++; } }
                log(`QUEUE`, `stopall → ${count} bot(s)`, "yellow");
                return writeResult(id, true, `⏹ ꜱᴛᴏᴘᴘᴇᴅ ${count} ʙᴏᴛ(ꜱ)`);
            }

            case "restartall": {
                let count = 0;
                for (const [botId] of bots) { restartBot(botId); count++; }
                log(`QUEUE`, `restartall → ${count} bot(s)`, "blue");
                return writeResult(id, true, `🔄 ʀᴇꜱᴛᴀʀᴛɪɴɢ ${count} ʙᴏᴛ(ꜱ)`);
            }

            case "restart_by_account": {
                const accFile = params[0];
                let count = 0;
                for (const [botId, bot] of bots) {
                    if (bot.accountFile === accFile && bot.status !== "stopped") { restartBot(botId); count++; }
                }
                return writeResult(id, true, count > 0 ? `🔄 ʀᴇꜱᴛᴀʀᴛɪɴɢ ${count} ʙᴏᴛ(ꜱ) ᴜꜱɪɴɢ ᴛʜɪꜱ ᴀᴄᴄᴏᴜɴᴛ` : "◈ ɴᴏ ᴀᴄᴛɪᴠᴇ ʙᴏᴛ ᴜꜱɪɴɢ ᴛʜɪꜱ ᴀᴄᴄᴏᴜɴᴛ");
            }

            default:
                return writeResult(id, false, `ᴜɴᴋɴᴏᴡɴ ᴀᴄᴛɪᴏɴ: ${action}`);
        }
    } catch (e) {
        writeResult(id, false, `ᴇʀʀᴏʀ: ${e.message}`);
    }
}

function startQueueWatcher() {
    fs.ensureDirSync(path.dirname(QUEUE_FILE));
    fs.ensureDirSync(RESULT_DIR);

    setInterval(async () => {
        try {
            if (!fs.existsSync(QUEUE_FILE)) return;
            const queue = fs.readJsonSync(QUEUE_FILE);
            if (!Array.isArray(queue) || queue.length === 0) return;

            const stale = Date.now() - 30000;
            const pending = queue.filter(item => !item.processed && item.time > stale);
            if (pending.length === 0) {
                if (queue.length > 0) fs.writeJsonSync(QUEUE_FILE, [], { spaces: 2 });
                return;
            }

            fs.writeJsonSync(QUEUE_FILE, [], { spaces: 2 });

            for (const item of pending) {
                await processQueueItem(item);
            }
        } catch (e) {}
    }, 1500);

    log("SYSTEM", "Chat command queue watcher active", "cyan");
}

process.on("SIGINT", () => {
    log("SYSTEM", "SIGINT received. Shutting down...", "yellow");
    for (const [id] of bots) stopBot(id);
    setTimeout(() => process.exit(0), 3000);
});

process.on("SIGTERM", () => {
    for (const [id] of bots) stopBot(id);
    setTimeout(() => process.exit(0), 3000);
});

process.on("uncaughtException", (err) => {
    log("TERMINAL_ERR", err.message, "red");
});

process.on("unhandledRejection", (reason) => {
    log("TERMINAL_ERR", String(reason), "red");
});

banner();
log("SYSTEM", `Multibot Terminal — Author: ${AUTHOR}`, "magenta");
log("SYSTEM", `Type "help" for all commands`, "cyan");
console.log();
startQueueWatcher();
autoStartBots();
initTerminal();
