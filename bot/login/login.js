process.stdout.write("\x1b]2;Goat Bot V2 - Made by NTKhang\x1b\x5c");
const defaultRequire = require;

function decode(text) {
        text = Buffer.from(text, 'hex').toString('utf-8');
        text = Buffer.from(text, 'hex').toString('utf-8');
        text = Buffer.from(text, 'base64').toString('utf-8');
        return text;
}

const gradient = defaultRequire("gradient-string");
const axios = defaultRequire("axios");
const path = defaultRequire("path");
const readline = defaultRequire("readline");
const fs = defaultRequire("fs-extra");
const toptp = defaultRequire("totp-generator");
const login = defaultRequire("fca-sifu");
const qr = new (defaultRequire("qrcode-reader"));
const Canvas = defaultRequire("canvas");
const https = defaultRequire("https");

async function getName(userID) {
        try {
                const user = await axios.post(`https://www.facebook.com/api/graphql/?q=${`node(${userID}){name}`}`);
                return user.data[userID].name;
        }
        catch (error) {
                return null;
        }
}

const { writeFileSync, readFileSync, existsSync, watch } = require("fs-extra");
const handlerWhenListenHasError = require("./handlerWhenListenHasError.js");
const checkLiveCookie = require("./checkLiveCookie.js");
const multiAccountManager = require("./multiAccountManager.js");
const { callbackListenTime, storage5Message } = global.GoatBot;
const { log, logColor, getPrefix, createOraDots, jsonStringifyColor, getText, convertTime, colors, randomString } = global.utils;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const currentVersion = require(`${process.cwd()}/package.json`).version;

function centerText(text, length) {
        const width = process.stdout.columns;
        const leftPadding = Math.floor((width - (length || text.length)) / 2);
        const rightPadding = width - leftPadding - (length || text.length);

        const paddedString = ' '.repeat(leftPadding > 0 ? leftPadding : 0) + text + ' '.repeat(rightPadding > 0 ? rightPadding : 0);

        console.log(paddedString);
}

const titles = [
        [
                "██████╗  ██████╗  █████╗ ████████╗    ██╗   ██╗██████╗",
                "██╔════╝ ██╔═══██╗██╔══██╗╚══██╔══╝    ██║   ██║╚════██╗",
                "██║  ███╗██║   ██║███████║   ██║       ██║   ██║ █████╔╝",
                "██║   ██║██║   ██║██╔══██║   ██║       ╚██╗ ██╔╝██╔═══╝",
                "╚██████╔╝╚██████╔╝██║  ██║   ██║        ╚████╔╝ ███████╗",
                "╚═════╝  ╚═════╝ ╚═╝  ╚═╝   ╚═╝         ╚═══╝  ╚══════╝"
        ],
        [
                "█▀▀ █▀█ ▄▀█ ▀█▀  █▄▄ █▀█ ▀█▀  █░█ ▀█",
                "█▄█ █▄█ █▀█ ░█░  █▄█ █▄█ ░█░  ▀▄▀ █▄"
        ],
        [
                "G O A T B O T  V 2 @" + currentVersion
        ],
        [
                "GOATBOT V2"
        ]
];
const maxWidth = process.stdout.columns;
const title = maxWidth > 58 ? titles[0] : maxWidth > 36 ? titles[1] : maxWidth > 26 ? titles[2] : titles[3];

const _bw   = Math.min(maxWidth, 70);
const _box  = Math.min(_bw - 4, 50);
const _bp   = Math.max(0, Math.floor((maxWidth - _box - 2) / 2));
const _bspc = " ".repeat(_bp);

console.log();
centerText(gradient("#2BD2FF", "#5c9ecf", "#2BFF88")("═".repeat(_bw)), _bw);
console.log();

for (const text of title) {
        centerText(gradient("#FA8BFF", "#2BD2FF", "#2BFF88")(text), text.length);
}
console.log();

const _infoLines = [
        `  GoatBot V2  ·  v${currentVersion}  `,
        `  Created by NTKhang  ·  Modified by SIFAT  `,
        `  github.com/ntkhang03/Goat-Bot-V2  `,
];
console.log(_bspc + gradient("#5c9ecf", "#2BD2FF")("╭" + "─".repeat(_box) + "╮"));
for (const _ln of _infoLines) {
        const _padded = _ln.padEnd(_box);
        console.log(_bspc + gradient("#4488bb", "#2BD2FF")("│") + gradient("#c8e4f8", "#aff6cf")(_padded) + gradient("#4488bb", "#2BD2FF")("│"));
}
console.log(_bspc + gradient("#5c9ecf", "#2BD2FF")("╰" + "─".repeat(_box) + "╯"));
console.log();

const _mem    = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);
const _sysStr = `⚡ Node ${process.version}  │  PID ${process.pid}  │  RSS ${_mem} MB`;
centerText(gradient("#9F98E8", "#AFF6CF")(_sysStr), _sysStr.length);
console.log();

const _warnStr = "⚠  ALL UNLISTED RELEASES ARE FAKE  ⚠";
centerText(gradient("#f5af19", "#f12711")(_warnStr), _warnStr.length);
console.log();
centerText(gradient("#f12711", "#f5af19")("═".repeat(_bw)), _bw);
console.log();

let widthConsole = process.stdout.columns;
if (widthConsole > 50)
        widthConsole = 50;

function createLine(content, isMaxWidth = false) {
        if (!content)
                return Array(isMaxWidth ? process.stdout.columns : widthConsole).fill("─").join("");
        else {
                content = ` ${content.trim()} `;
                const lengthContent = content.length;
                const lengthLine = isMaxWidth ? process.stdout.columns - lengthContent : widthConsole - lengthContent;
                let left = Math.floor(lengthLine / 2);
                if (left < 0 || isNaN(left))
                        left = 0;
                const lineOne = Array(left).fill("─").join("");
                return lineOne + content + lineOne;
        }
}

const character = createLine();

const clearLines = (n) => {
        for (let i = 0; i < n; i++) {
                const y = i === 0 ? null : -1;
                process.stdout.moveCursor(0, y);
                process.stdout.clearLine(1);
        }
        process.stdout.cursorTo(0);
        process.stdout.write('');
};

async function input(prompt, isPassword = false) {
        const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
        });

        if (isPassword)
                rl.input.on("keypress", function () {

                        const len = rl.line.length;

                        readline.moveCursor(rl.output, -len, 0);

                        readline.clearLine(rl.output, 1);

                        for (let i = 0; i < len; i++) {
                                rl.output.write("*");
                        }
                });

        return new Promise(resolve => rl.question(prompt, ans => {
                rl.close();
                resolve(ans);
        }));
}

qr.readQrCode = async function (filePath) {
        const image = await Canvas.loadImage(filePath);
        const canvas = Canvas.createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        const data = ctx.getImageData(0, 0, image.width, image.height);
        let value;
        qr.callback = function (error, result) {
                if (error)
                        throw error;
                value = result;
        };
        qr.decode(data);
        return value.result;
};

if (process.env.GOAT_BOT_ACCOUNT_FILE && require("fs-extra").existsSync(process.env.GOAT_BOT_ACCOUNT_FILE)) {
        global.client.dirAccount = process.env.GOAT_BOT_ACCOUNT_FILE;
}

let dirAccount = global.client.dirAccount;
const { facebookAccount } = global.GoatBot.config;

function responseUptimeSuccess(req, res) {
        res.type('json').send({
                status: "success",
                uptime: process.uptime(),
                unit: "seconds"
        });
}

function responseUptimeError(req, res) {
        res.status(500).type('json').send({
                status: "error",
                uptime: process.uptime(),
                statusAccountBot: global.statusAccountBot
        });
}

function checkAndTrimString(string) {
        if (typeof string == "string")
                return string.trim();
        return string;
}

function filterKeysAppState(appState) {
        return appState.filter(item => ["c_user", "xs", "datr", "fr", "sb", "i_user"].includes(item.key));
}

global.responseUptimeCurrent = responseUptimeSuccess;
global.responseUptimeSuccess = responseUptimeSuccess;
global.responseUptimeError = responseUptimeError;

global.statusAccountBot = 'good';
let changeFbStateByCode = false;
let latestChangeContentAccount = fs.statSync(dirAccount).mtimeMs;
let dashBoardIsRunning = false;

const IS_MULTIBOT_MODE = process.env.GOAT_MULTIBOT_MODE === "1";

multiAccountManager.scanAccounts();
let currentAccountFile = multiAccountManager.getCurrentAccount();
if (currentAccountFile && !IS_MULTIBOT_MODE) {
        global.client.dirAccount = currentAccountFile;
        dirAccount = currentAccountFile;
        latestChangeContentAccount = fs.statSync(dirAccount).mtimeMs;
        log.info("MULTI_ACCOUNT", `Using account: ${path.basename(currentAccountFile)}`);
}
if (IS_MULTIBOT_MODE) {
        log.info("MULTIBOT", `Bot-${process.env.GOAT_BOT_ID || "?"} running with: ${path.basename(global.client.dirAccount)}`);
}

async function notifyAdminsAccountSwitch(fromAccount, toAccount, reason, stats) {
        try {
                const api = global.GoatBot?.fcaApi;
                const admins = global.GoatBot?.config?.adminBot || [];
                if (!api || admins.length === 0) return;

                const sep = "━━━━━━━━━━━━━━━━━━━";
                let msg = `🔄 ACCOUNT SWITCHED\n${sep}\n`;
                msg += `📤 From : ${fromAccount}\n`;
                msg += `📥 To   : ${toAccount}\n`;
                msg += `⚡ Reason: ${reason}\n`;
                msg += `🕐 Time : ${new Date().toLocaleString("en-US", { timeZone: global.GoatBot?.config?.timeZone || "Asia/Dhaka" })}\n`;
                msg += `🔁 Total Switches: ${stats?.switchCount || 0}\n`;
                msg += `${sep}\n`;

                if (stats?.accounts?.length > 0) {
                        msg += `📊 Account Health:\n`;
                        for (const acc of stats.accounts) {
                                const icon = acc.isLocked ? "🔒" : acc.isDead ? "💀" : acc.health >= 70 ? "🟢" : acc.health >= 40 ? "🟡" : "🔴";
                                const cur  = acc.isCurrent ? " ◄ active" : "";
                                const cd   = acc.onCooldown ? ` ⏳${acc.cooldownSecsLeft}s` : "";
                                const ft   = acc.failType ? ` [${acc.failType}]` : "";
                                msg += `${icon} ${acc.name} — ❤️${acc.health}${ft}${cd}${cur}\n`;
                        }
                        msg += sep;
                }

                msg += `\n⚙️ Bot reconnecting...`;

                for (const adminID of admins) {
                        try { await api.sendMessage(msg, adminID); } catch (e) {  }
                }
        } catch (e) {  }
}

async function notifyAdminsEmergency(accounts) {
        try {
                const api = global.GoatBot?.fcaApi;
                const admins = global.GoatBot?.config?.adminBot || [];
                if (!api || admins.length === 0) return;
                const sep = "━━━━━━━━━━━━━━━━━━━";
                const msg = `🚨 EMERGENCY MODE\n${sep}\nAll ${accounts.length} account(s) are dead/locked!\n\n💀 Accounts:\n${accounts.map((a, i) => `[${i + 1}] ${a}`).join("\n")}\n${sep}\n🔄 Bot will retry with escalating delays.\n⚠️ Please update cookies via .term cookie`;
                for (const adminID of admins) {
                        try { await api.sendMessage(msg, adminID); } catch (e) {  }
                }
        } catch (e) {  }
}

let _emergencyWatcherStarted = false;
const _accountFileWatchers = new Map();

function startEmergencyWatcher() {
        if (_emergencyWatcherStarted || IS_MULTIBOT_MODE) return;
        _emergencyWatcherStarted = true;

        const accDir = path.join(process.cwd(), "accounts");
        const MAX_ACCOUNTS = 10;

        function getWatchTargets() {
                const targets = [];
                const primary = path.join(accDir, "account.txt");
                if (existsSync(primary)) targets.push(primary);
                for (let i = 2; i <= MAX_ACCOUNTS; i++) {
                        const f = path.join(accDir, `account${i}.txt`);
                        if (existsSync(f)) targets.push(f);
                        else break;
                }
                for (let i = 1; i <= MAX_ACCOUNTS; i++) {
                        const f = path.join(accDir, i === 1 ? "account.json" : `account${i}.json`);
                        if (existsSync(f)) targets.push(f);
                        else if (i > 1) break;
                }
                return targets;
        }

        async function handleFileChange(filePath) {
                const name = path.basename(filePath);
                await sleep(500);

                const check = await multiAccountManager.validateCookie(filePath);
                if (!check.valid) {
                        log.warn("EMERGENCY_WATCHER", `📄 ${name} changed but cookie still invalid: ${check.reason}`);
                        return;
                }

                log.info("EMERGENCY_WATCHER", `✅ Valid cookie detected in ${name}!`);

                const isEmergency = multiAccountManager.emergencyMode;
                const isCurrent   = filePath === (global.client.dirAccount || dirAccount);

                if (isEmergency || (!isCurrent && multiAccountManager.isSwitching === false)) {
                        log.info("EMERGENCY_WATCHER", `🚀 Auto-recovering with ${name}...`);

                        if (!multiAccountManager.accounts.includes(filePath)) {
                                multiAccountManager.accounts.push(filePath);
                                multiAccountManager._initNewAccounts?.();
                        }

                        const idx = multiAccountManager.accounts.indexOf(filePath);
                        if (idx !== -1) multiAccountManager.currentIndex = idx;

                        multiAccountManager.unlockAccount?.(filePath);
                        multiAccountManager.clearCooldown?.(filePath);
                        multiAccountManager.boostAccount?.(filePath, 80);

                        if (multiAccountManager.emergencyMode) multiAccountManager.exitEmergencyMode();

                        global.client.dirAccount = filePath;
                        dirAccount = filePath;
                        latestChangeContentAccount = fs.statSync(dirAccount).mtimeMs;
                        changeFbStateByCode = true;
                        setTimeout(() => { changeFbStateByCode = false; }, 2000);

                        try {
                                const api = global.GoatBot?.fcaApi;
                                const admins = global.GoatBot?.config?.adminBot || [];
                                if (api && admins.length > 0) {
                                        const msg = `✅ EMERGENCY RESOLVED\n━━━━━━━━━━━━━━━━━━━\n📥 New cookie detected in: ${name}\n🚀 Bot is recovering automatically...\n🕐 ${new Date().toLocaleString("en-US", { timeZone: global.GoatBot?.config?.timeZone || "Asia/Dhaka" })}`;
                                        for (const adminID of admins) {
                                                try { await api.sendMessage(msg, adminID); } catch (_) {}
                                        }
                                }
                        } catch (_) {}

                        setTimeout(() => startBot(), 2000);
                }
        }

        function watchFile(filePath) {
                if (_accountFileWatchers.has(filePath)) return;
                try {
                        let lastMtime = existsSync(filePath) ? fs.statSync(filePath).mtimeMs : 0;
                        const watcher = watch(filePath, async (eventType) => {
                                if (eventType !== "change") return;
                                try {
                                        const newMtime = existsSync(filePath) ? fs.statSync(filePath).mtimeMs : 0;
                                        if (newMtime === lastMtime) return;
                                        lastMtime = newMtime;
                                        if (changeFbStateByCode) return;
                                        if (filePath === (global.client.dirAccount || dirAccount) && !multiAccountManager.emergencyMode) return;
                                        await handleFileChange(filePath);
                                } catch (_) {}
                        });
                        _accountFileWatchers.set(filePath, watcher);
                        log.info("EMERGENCY_WATCHER", `👁 Watching: ${path.basename(filePath)}`);
                } catch (_) {}
        }

        const targets = getWatchTargets();
        for (const t of targets) watchFile(t);

        setInterval(() => {
                const current = getWatchTargets();
                for (const f of current) {
                        if (!_accountFileWatchers.has(f)) {
                                watchFile(f);
                                if (multiAccountManager.emergencyMode) {
                                        handleFileChange(f).catch(() => {});
                                }
                        }
                }
        }, 10000);

        log.info("EMERGENCY_WATCHER", `🛡 Emergency watcher active — watching ${targets.length} account file(s)`);
}

async function switchToNextAccount(reason = "Account issue detected") {
        if (IS_MULTIBOT_MODE) {
                log.warn("MULTIBOT", `Account issue: ${reason} — exiting so terminal.js can handle recovery`);
                process.exit(1);
                return false;
        }

        if (!multiAccountManager.canSwitch()) {
                log.warn("MULTI_ACCOUNT", "Switch cooldown active, cannot switch accounts now");
                return false;
        }

        const failedAccount = multiAccountManager.getCurrentAccount();
        const fromAccount = path.basename(failedAccount || "unknown");
        multiAccountManager.penalizeAccount(failedAccount, reason);

        log.warn("MULTI_ACCOUNT", `⚡ ${reason} — scanning all accounts for valid cookie...`);
        multiAccountManager.isSwitching = true;
        multiAccountManager.stopWatchdog();

        try {
                await stopListening();

                const allAccounts = multiAccountManager.accounts;
                let validTarget = null;

                for (const acc of allAccounts) {
                        if (acc === failedAccount) continue;
                        if (multiAccountManager.isLocked(acc)) {
                                log.warn("MULTI_ACCOUNT", `🔒 ${path.basename(acc)} — locked, skipping`);
                                continue;
                        }
                        const check = await multiAccountManager.validateCookie(acc);
                        if (check.valid) {
                                log.info("MULTI_ACCOUNT", `✅ ${path.basename(acc)} — valid cookie found`);
                                validTarget = acc;
                                break;
                        } else {
                                log.warn("MULTI_ACCOUNT", `⛔ ${path.basename(acc)} — ${check.reason}, skipping`);
                                multiAccountManager.penalizeAccount(acc, `Invalid cookie: ${check.reason}`, "loginFail");
                        }
                }

                if (!validTarget) {
                        log.warn("MULTI_ACCOUNT", "❌ No account with valid cookie found — entering emergency mode");
                        multiAccountManager.isSwitching = false;
                        multiAccountManager.enterEmergencyMode();
                        const stats = multiAccountManager.getStats();
                        await notifyAdminsEmergency(stats.accounts.map(a => a.name));

                        const revived = multiAccountManager.emergencyRevive();
                        if (revived) {
                                log.warn("MULTI_ACCOUNT", `🔄 Emergency revived: ${path.basename(revived)} — retrying in 30s`);
                        }
                        const delay = multiAccountManager.getEmergencyRetryDelay();
                        log.warn("MULTI_ACCOUNT", `⏳ Retrying in ${Math.round(delay / 1000)}s...`);
                        setTimeout(() => switchToNextAccount("Emergency retry"), delay);
                        return false;
                }

                const targetIndex = allAccounts.indexOf(validTarget);
                multiAccountManager.switchToIndex(targetIndex);

                global.client.dirAccount = validTarget;
                dirAccount = validTarget;
                latestChangeContentAccount = fs.statSync(dirAccount).mtimeMs;

                const toAccount = path.basename(validTarget);
                log.info("MULTI_ACCOUNT", `🚀 Switched: ${fromAccount} → ${toAccount}`);

                if (multiAccountManager.emergencyMode) multiAccountManager.exitEmergencyMode();

                const stats = multiAccountManager.getStats();
                await notifyAdminsAccountSwitch(fromAccount, toAccount, reason, stats);

                setTimeout(() => {
                        multiAccountManager.isSwitching = false;
                        startBot();
                }, 3000);

                multiAccountManager.emit("switched", { from: fromAccount, to: toAccount, reason });
                return true;
        } catch (err) {
                log.err("MULTI_ACCOUNT", "Error switching accounts:", err);
                multiAccountManager.isSwitching = false;
                return false;
        }
}

async function getAppStateFromEmail(spin = { _start: () => { }, _stop: () => { } }, facebookAccount) {
        const { email, password, userAgent, proxy } = facebookAccount;
        const getFbstate = require(process.env.NODE_ENV === 'development' ? "./getFbstate1.dev.js" : "./getFbstate1.js");
        let code2FATemp;
        let appState;
        try {
                try {
                        appState = await getFbstate(checkAndTrimString(email), checkAndTrimString(password), userAgent, proxy);
                        spin._stop();
                }
                catch (err) {
                        if (err.continue) {
                                let tryNumber = 0;
                                let isExit = false;

                                await (async function submitCode(message) {
                                        if (message && isExit) {
                                                spin._stop();
                                                log.error("LOGIN FACEBOOK", message);
                                                process.exit();
                                        }

                                        if (message) {
                                                spin._stop();
                                                log.warn("LOGIN FACEBOOK", message);
                                        }

                                        if (facebookAccount["2FASecret"] && tryNumber == 0) {
                                                switch (['.png', '.jpg', '.jpeg'].some(i => facebookAccount["2FASecret"].endsWith(i))) {
                                                        case true:
                                                                code2FATemp = (await qr.readQrCode(`${process.cwd()}/${facebookAccount["2FASecret"]}`)).replace(/.*secret=(.*)&digits.*/g, '$1');
                                                                break;
                                                        case false:
                                                                code2FATemp = facebookAccount["2FASecret"];
                                                                break;
                                                }
                                        }
                                        else {
                                                spin._stop();
                                                code2FATemp = await input("> Enter 2FA code or secret: ");
                                                readline.moveCursor(process.stderr, 0, -1);
                                                readline.clearScreenDown(process.stderr);
                                        }

                                        const code2FA = isNaN(code2FATemp) ?
                                                toptp(
                                                        code2FATemp.normalize("NFD")
                                                                .toLowerCase()
                                                                .replace(/[\u0300-\u036f]/g, "")
                                                                .replace(/[đ|Đ]/g, (x) => x == "đ" ? "d" : "D")
                                                                .replace(/\(|\)|\,/g, "")
                                                                .replace(/ /g, "")
                                                ) :
                                                code2FATemp;
                                        spin._start();
                                        try {
                                                appState = JSON.parse(JSON.stringify(await err.continue(code2FA)));
                                                appState = appState.map(item => ({
                                                        key: item.key,
                                                        value: item.value,
                                                        domain: item.domain,
                                                        path: item.path,
                                                        hostOnly: item.hostOnly,
                                                        creation: item.creation,
                                                        lastAccessed: item.lastAccessed
                                                })).filter(item => item.key);
                                                spin._stop();
                                        }
                                        catch (err) {
                                                tryNumber++;
                                                if (!err.continue)
                                                        isExit = true;
                                                await submitCode(err.message);
                                        }
                                })(err.message);
                        }
                        else
                                throw err;
                }
        }
        catch (err) {
                const loginMbasic = require(process.env.NODE_ENV === 'development' ? "./loginMbasic.dev.js" : "./loginMbasic.js");
                if (facebookAccount["2FASecret"]) {
                        switch (['.png', '.jpg', '.jpeg'].some(i => facebookAccount["2FASecret"].endsWith(i))) {
                                case true:
                                        code2FATemp = (await qr.readQrCode(`${process.cwd()}/${facebookAccount["2FASecret"]}`)).replace(/.*secret=(.*)&digits.*/g, '$1');
                                        break;
                                case false:
                                        code2FATemp = facebookAccount["2FASecret"];
                                        break;
                        }
                }

                appState = await loginMbasic({
                        email,
                        pass: password,
                        twoFactorSecretOrCode: code2FATemp,
                        userAgent,
                        proxy
                });

                appState = appState.map(item => {
                        item.key = item.name;
                        delete item.name;
                        return item;
                });
                appState = filterKeysAppState(appState);
        }

        global.GoatBot.config.facebookAccount['2FASecret'] = code2FATemp || "";
        writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
        return appState;
}

function isNetScapeCookie(cookie) {
        if (typeof cookie !== 'string')
                return false;
        return /(.+)\t(1|TRUE|true)\t([\w\/.-]*)\t(1|TRUE|true)\t\d+\t([\w-]+)\t(.+)/i.test(cookie);

}

function netScapeToCookies(cookieData) {
        const cookies = [];
        const lines = cookieData.split('\n');
        lines.forEach((line) => {
                if (line.trim().startsWith('#')) {
                        return;
                }
                const fields = line.split('\t').map((field) => field.trim()).filter((field) => field.length > 0);
                if (fields.length < 7) {
                        return;
                }
                const cookie = {
                        key: fields[5],
                        value: fields[6],
                        domain: fields[0],
                        path: fields[2],
                        hostOnly: fields[1] === 'TRUE',
                        creation: new Date(fields[4] * 1000).toISOString(),
                        lastAccessed: new Date().toISOString()
                };
                cookies.push(cookie);
        });
        return cookies;
}

function pushI_user(appState, value) {
        appState.push({
                key: "i_user",
                value: value || facebookAccount.i_user,
                domain: "facebook.com",
                path: "/",
                hostOnly: false,
                creation: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
        });
        return appState;
}

let spin;
async function getAppStateToLogin(loginWithEmail) {
        let appState = [];
        if (loginWithEmail)
                return await getAppStateFromEmail(undefined, facebookAccount);
        if (!existsSync(dirAccount))
                return log.error("LOGIN FACEBOOK", getText('login', 'notFoundDirAccount', colors.green(dirAccount)));
        const accountText = readFileSync(dirAccount, "utf8");

        try {
                const splitAccountText = accountText.replace(/\|/g, '\n').split('\n').map(i => i.trim()).filter(i => i);

                if (accountText.startsWith('EAAAA')) {
                        try {
                                spin = createOraDots(getText('login', 'loginToken'));
                                spin._start();
                                appState = await require('./getFbstate.js')(accountText);
                        }
                        catch (err) {
                                err.name = "TOKEN_ERROR";
                                throw err;
                        }
                }

                else {
                        if (accountText.match(/^(?:\s*\w+\s*=\s*[^;]*;?)+/)) {
                                spin = createOraDots(getText('login', 'loginCookieString'));
                                spin._start();
                                appState = accountText.split(';')
                                        .map(i => {
                                                const [key, value] = i.split('=');
                                                return {
                                                        key: (key || "").trim(),
                                                        value: (value || "").trim(),
                                                        domain: "facebook.com",
                                                        path: "/",
                                                        hostOnly: true,
                                                        creation: new Date().toISOString(),
                                                        lastAccessed: new Date().toISOString()
                                                };
                                        })
                                        .filter(i => i.key && i.value && i.key != "x-referer");
                        }

                        else if (isNetScapeCookie(accountText)) {
                                spin = createOraDots(getText('login', 'loginCookieNetscape'));
                                spin._start();
                                appState = netScapeToCookies(accountText);
                        }
                        else if (
                                (splitAccountText.length == 2 || splitAccountText.length == 3) &&
                                !splitAccountText.slice(0, 2).map(i => i.trim()).some(i => i.includes(' '))
                        ) {

                                global.GoatBot.config.facebookAccount.email = splitAccountText[0];
                                global.GoatBot.config.facebookAccount.password = splitAccountText[1];
                                if (splitAccountText[2]) {
                                        const code2FATemp = splitAccountText[2].replace(/ /g, "");
                                        global.GoatBot.config.facebookAccount['2FASecret'] = code2FATemp;
                                }
                                writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
                        }

                        else {
                                try {
                                        spin = createOraDots(getText('login', 'loginCookieArray'));
                                        spin._start();
                                        appState = JSON.parse(accountText);
                                }
                                catch (err) {
                                        const error = new Error(`${path.basename(dirAccount)} is invalid`);
                                        error.name = "ACCOUNT_ERROR";
                                        throw error;
                                }
                                if (appState.some(i => i.name))
                                        appState = appState.map(i => {
                                                i.key = i.name;
                                                delete i.name;
                                                return i;
                                        });
                                else if (!appState.some(i => i.key)) {
                                        const error = new Error(`${path.basename(dirAccount)} is invalid`);
                                        error.name = "ACCOUNT_ERROR";
                                        throw error;
                                }
                                appState = appState
                                        .map(item => ({
                                                ...item,
                                                domain: "facebook.com",
                                                path: "/",
                                                hostOnly: false,
                                                creation: new Date().toISOString(),
                                                lastAccessed: new Date().toISOString()
                                        }))
                                        .filter(i => i.key && i.value && i.key != "x-referer");
                        }
                }
        }
        catch (err) {
                spin && spin._stop();
                let {
                        email,
                        password
                } = facebookAccount;
                if (err.name === "TOKEN_ERROR")
                        log.err("LOGIN FACEBOOK", getText('login', 'tokenError', colors.green("EAAAA..."), colors.green(dirAccount)));
                else if (err.name === "COOKIE_INVALID")
                        log.err("LOGIN FACEBOOK", getText('login', 'cookieError'));
                else if (err.name === "CHECKPOINT_ERROR") {
                        log.err("LOGIN FACEBOOK", colors.red(err.message));
                        log.warn("LOGIN FACEBOOK", "You must complete the Facebook checkpoint process before the bot can login.");
                        log.warn("LOGIN FACEBOOK", "After completing the checkpoint, export fresh cookies or add your email/password to config.json");
                }

                if (!email || !password) {
                        log.warn("LOGIN FACEBOOK", getText('login', 'cannotFindAccount'));
                        const rl = readline.createInterface({
                                input: process.stdin,
                                output: process.stdout
                        });
                        const options = [
                                getText('login', 'chooseAccount'),
                                getText('login', 'chooseToken'),
                                getText('login', 'chooseCookieString'),
                                getText('login', 'chooseCookieArray')
                        ];
                        let currentOption = 0;
                        await new Promise((resolve) => {
                                const character = '>';
                                function showOptions() {
                                        rl.output.write(`\r${options.map((option, index) => index === currentOption ? colors.blueBright(`${character} (${index + 1}) ${option}`) : `  (${index + 1}) ${option}`).join('\n')}\u001B`);
                                        rl.write('\u001B[?25l');
                                }
                                rl.input.on('keypress', (_, key) => {
                                        if (key.name === 'up') {
                                                currentOption = (currentOption - 1 + options.length) % options.length;
                                        }
                                        else if (key.name === 'down') {
                                                currentOption = (currentOption + 1) % options.length;
                                        }
                                        else if (!isNaN(key.name)) {
                                                const number = parseInt(key.name);
                                                if (number >= 0 && number <= options.length)
                                                        currentOption = number - 1;
                                                process.stdout.write('\x1b[1D');
                                        }
                                        else if (key.name === 'enter' || key.name === 'return') {
                                                rl.input.removeAllListeners('keypress');
                                                rl.close();
                                                clearLines(options.length + 1);
                                                showOptions();
                                                resolve();
                                        }
                                        else {
                                                process.stdout.write('\x1b[1D');
                                        }

                                        clearLines(options.length);
                                        showOptions();
                                });
                                showOptions();
                        });

                        rl.write('\u001B[?25h\n');
                        clearLines(options.length + 1);
                        log.info("LOGIN FACEBOOK", getText('login', 'loginWith', options[currentOption]));

                        if (currentOption == 0) {
                                email = await input(`${getText('login', 'inputEmail')} `);
                                password = await input(`${getText('login', 'inputPassword')} `, true);
                                const twoFactorAuth = await input(`${getText('login', 'input2FA')} `);
                                facebookAccount.email = email || '';
                                facebookAccount.password = password || '';
                                facebookAccount['2FASecret'] = twoFactorAuth || '';
                                writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
                        }
                        else if (currentOption == 1) {
                                const token = await input(getText('login', 'inputToken') + " ");
                                writeFileSync(global.client.dirAccount, token);
                        }
                        else if (currentOption == 2) {
                                const cookie = await input(getText('login', 'inputCookieString') + " ");
                                writeFileSync(global.client.dirAccount, cookie);
                        }
                        else {
                                const cookie = await input(getText('login', 'inputCookieArray') + " ");
                                writeFileSync(global.client.dirAccount, JSON.stringify(JSON.parse(cookie), null, 2));
                        }
                        return await getAppStateToLogin();
                }

                log.info("LOGIN FACEBOOK", getText('login', 'loginPassword'));
                log.info("ACCOUNT INFO", `Email: ${facebookAccount.email}, I_User: ${facebookAccount.i_user || "(empty)"}`);
                spin = createOraDots(getText('login', 'loginPassword'));
                spin._start();

                try {
                        appState = await getAppStateFromEmail(spin, facebookAccount);
                        spin._stop();
                }
                catch (err) {
                        spin._stop();
                        log.err("LOGIN FACEBOOK", getText('login', 'loginError'), err.message, err);
                        process.exit();
                }
        }
        return appState;
}

function stopListening(keyListen) {
        keyListen = keyListen || Object.keys(callbackListenTime).pop();
        return new Promise((resolve) => {
                if (!global.GoatBot?.fcaApi) return resolve();
                global.GoatBot.fcaApi.stopListening?.(() => {
                        if (callbackListenTime[keyListen]) {
                                callbackListenTime[keyListen] = () => { };
                        }
                        resolve();
                }) || resolve();
        });
}

async function startBot(loginWithEmail) {
        console.log(colors.hex("#f5ab00")(createLine("START LOGGING IN", true)));
        const currentVersion = require("../../package.json").version;
        const tooOldVersion = (await axios.get("https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2-Storage/main/tooOldVersions.txt")).data || "0.0.0";

        if ([-1, 0].includes(global.utils.compareVersion(currentVersion, tooOldVersion))) {
                log.err("VERSION", getText('version', 'tooOldVersion', colors.yellowBright('node update')));
                process.exit();
        }

        if (global.GoatBot.Listening)
                await stopListening();

        log.info("LOGIN FACEBOOK", getText('login', 'currentlyLogged'));

        let appState = await getAppStateToLogin(loginWithEmail);
        changeFbStateByCode = true;
        appState = filterKeysAppState(appState);
        writeFileSync(dirAccount, JSON.stringify(appState, null, 2));
        setTimeout(() => changeFbStateByCode = false, 1000);

        (function loginBot(appState) {
                global.GoatBot.commands = new Map();
                global.GoatBot.eventCommands = new Map();
                global.GoatBot.aliases = new Map();
                global.GoatBot.onChat = [];
                global.GoatBot.onEvent = [];
                global.GoatBot.onReply = new Map();
                global.GoatBot.onReaction = new Map();
                clearInterval(global.intervalRestartListenMqtt);
                delete global.intervalRestartListenMqtt;

                if (facebookAccount.i_user)
                        pushI_user(appState, facebookAccount.i_user);

                let isSendNotiErrorMessage = false;

                const _fcaCfgPre = (() => {
                        try {
                                delete require.cache[require.resolve(`${process.cwd()}/fca-config.json`)];
                                return require(`${process.cwd()}/fca-config.json`);
                        } catch (_) { return {}; }
                })();
                const _loginOptions = _fcaCfgPre.optionsFca
                        ? Object.fromEntries(Object.entries(_fcaCfgPre.optionsFca).filter(([k]) => !k.startsWith("_")))
                        : (global.GoatBot.config.optionsFca || {});

                login({ appState }, _loginOptions, async function (error, api) {
                        if (!isNaN(facebookAccount.intervalGetNewCookie) && facebookAccount.intervalGetNewCookie > 0)
                                if (facebookAccount.email && facebookAccount.password) {
                                        spin?._stop();
                                        log.info("REFRESH COOKIE", getText('login', 'refreshCookieAfter', convertTime(facebookAccount.intervalGetNewCookie * 60 * 1000, true)));
                                        setTimeout(async function refreshCookie() {
                                                try {
                                                        log.info("REFRESH COOKIE", getText('login', 'refreshCookie'));
                                                        const appState = await getAppStateFromEmail(undefined, facebookAccount);
                                                        if (facebookAccount.i_user)
                                                                pushI_user(appState, facebookAccount.i_user);
                                                        changeFbStateByCode = true;
                                                        writeFileSync(dirAccount, JSON.stringify(filterKeysAppState(appState), null, 2));
                                                        setTimeout(() => changeFbStateByCode = false, 1000);
                                                        log.info("REFRESH COOKIE", getText('login', 'refreshCookieSuccess'));
                                                        return startBot(appState);
                                                }
                                                catch (err) {
                                                        log.err("REFRESH COOKIE", getText('login', 'refreshCookieError'), err.message, err);
                                                        setTimeout(refreshCookie, facebookAccount.intervalGetNewCookie * 60 * 1000);
                                                }
                                        }, facebookAccount.intervalGetNewCookie * 60 * 1000);
                                }
                                else {
                                        spin?._stop();
                                        log.warn("REFRESH COOKIE", getText('login', 'refreshCookieWarning'));
                                }
                        spin ? spin._stop() : null;

                        if (error) {
                                log.err("LOGIN FACEBOOK", getText('login', 'loginError'), error);
                                global.statusAccountBot = 'can\'t login';

                                if (multiAccountManager.isSingleAccount()) {
                                        multiAccountManager.singleAccountRetryCount++;
                                        const retryDelay = multiAccountManager.getRetryDelay(multiAccountManager.singleAccountRetryCount);

                                        log.warn("SINGLE ACCOUNT", `Only one account configured. Will retry in ${(retryDelay / 1000).toFixed(0)} seconds (attempt #${multiAccountManager.singleAccountRetryCount})...`);

                                        setTimeout(() => {
                                                log.info("SINGLE ACCOUNT", "Retrying login with same account...");
                                                startBot(true);
                                        }, retryDelay);
                                        return;
                                }

                                if (multiAccountManager.getAvailableAccounts().length > 0) {
                                        log.warn("LOGIN FACEBOOK", "Login failed, switching to best available account...");
                                        multiAccountManager.penalizeAccount(multiAccountManager.getCurrentAccount(), `Login failed: ${error.message || error}`, true);
                                        const switched = await switchToNextAccount(`Login failed: ${error.message || error}`);
                                        if (switched) {
                                                return;
                                        }
                                }

                                if (facebookAccount.email && facebookAccount.password) {
                                        return startBot(true);
                                }

                                if (global.GoatBot.config.dashBoard?.enable == true) {
                                        try {
                                                await require("../../core/dashboard/app.js")(null);
                                                log.info("DASHBOARD", getText('login', 'openDashboardSuccess'));
                                        }
                                        catch (err) {
                                                log.err("DASHBOARD", getText('login', 'openDashboardError'), err);
                                        }
                                        return;
                                }
                                else {
                                        process.exit();
                                }
                        }

                        global.GoatBot.fcaApi = api;
                        global.GoatBot.botID = api.getCurrentUserID();
                        log.info("LOGIN FACEBOOK", getText('login', 'loginSuccess'));

                        multiAccountManager.markCurrentAsWorking();

                        (() => {
                                const BLOCK_PATTERNS = [
                                        "action blocked", "temporarily blocked", "feature's blocked",
                                        "you're blocked", "message delivery failed",
                                        "content not delivered", "this message failed",
                                        "couldn't send", "you can't send",
                                        "message limit", "sending limit",
                                ];
                                const MAX_CONSECUTIVE = 4;
                                const RESET_AFTER_MS  = 60 * 1000;
                                let consecutiveFails  = 0;
                                let resetTimer        = null;
                                const origSend = api.sendMessage.bind(api);

                                api.sendMessage = function(msg, threadID, callback, messageID) {
                                        const isBlocked = err => {
                                                if (!err) return false;
                                                const txt = (typeof err === "string" ? err : (err.message || err.error || JSON.stringify(err))).toLowerCase();
                                                return BLOCK_PATTERNS.some(p => txt.includes(p));
                                        };

                                        const handleErr = async (err) => {
                                                if (isBlocked(err)) {
                                                        consecutiveFails++;
                                                        log.warn("MSG_BLOCK", `Send failed [${consecutiveFails}/${MAX_CONSECUTIVE}]: ${typeof err === "string" ? err : (err.message || err.error || "block detected")}`);
                                                        if (consecutiveFails >= MAX_CONSECUTIVE && !multiAccountManager.isSwitching) {
                                                                consecutiveFails = 0;
                                                                log.warn("MSG_BLOCK", `🔴 Message block confirmed — switching account`);
                                                                await switchToNextAccount("Message block: consecutive send failures");
                                                        }
                                                } else {
                                                        consecutiveFails = 0;
                                                }
                                        };

                                        const onSuccess = () => {
                                                if (consecutiveFails > 0) consecutiveFails = 0;
                                                if (resetTimer) clearTimeout(resetTimer);
                                                resetTimer = setTimeout(() => { consecutiveFails = 0; }, RESET_AFTER_MS);
                                        };

                                        if (typeof callback === "function") {
                                                return origSend(msg, threadID, async (err, info) => {
                                                        if (err) await handleErr(err); else onSuccess();
                                                        callback(err, info);
                                                }, messageID);
                                        }
                                        return new Promise((resolve, reject) => {
                                                origSend(msg, threadID, async (err, info) => {
                                                        if (err) { await handleErr(err); reject(err); } else { onSuccess(); resolve(info); }
                                                }, messageID);
                                        });
                                };
                        })();

                        multiAccountManager.startWatchdog(5 * 60 * 1000, async () => {
                                if (!multiAccountManager.isSwitching) {
                                        const switched = await switchToNextAccount("Watchdog: MQTT connection lost");
                                        if (!switched) {
                                                log.warn("WATCHDOG", "All accounts unavailable — will retry same account");
                                                setTimeout(() => startBot(true), 30000);
                                        }
                                }
                        });

                        let hasBanned = false;
                        global.botID = api.getCurrentUserID();
                        logColor("#f5ab00", createLine("BOT INFO"));
                        log.info("NODE VERSION", process.version);
                        log.info("PROJECT VERSION", currentVersion);
                        log.info("BOT ID", `${global.botID} - ${await getName(global.botID)}`);
                        log.info("PREFIX", global.GoatBot.config.prefix);
                        log.info("LANGUAGE", global.GoatBot.config.language);
                        log.info("BOT NICK NAME", global.GoatBot.config.nickNameBot || "GOAT BOT");

                        try {
                                const fcaConfig = (() => {
                                        delete require.cache[require.resolve(`${process.cwd()}/fca-config.json`)];
                                        return require(`${process.cwd()}/fca-config.json`);
                                })();

                                global.GoatBot.fcaConfig = fcaConfig;
                                const { globalAntiSuspension, globalShield } = require("fca-sifu");

                                if (fcaConfig.antiSuspension?.enabled !== false && fcaConfig.antiSuspension?.warmupOnStart !== false) {
                                        if (typeof globalAntiSuspension?.enableWarmup === "function") {
                                                globalAntiSuspension.enableWarmup();
                                        }
                                        log.info("FCA-SIFU", "Anti-suspension warmup mode enabled (limits rate for 20 min on fresh start)");
                                }

                                if (fcaConfig.shield && globalShield) {
                                        const sh = fcaConfig.shield;
                                        const shield = globalShield;

                                        if (sh.enabled === false) {

                                                if (typeof shield.setMessageDelay === "function") shield.setMessageDelay(0);
                                                if (typeof shield.setThreadDelay  === "function") shield.setThreadDelay(0);
                                                if (typeof shield.setBurstLimit   === "function") shield.setBurstLimit(999999);
                                                if (typeof shield.setHourlyLimit  === "function") shield.setHourlyLimit(999999);
                                                if (typeof shield.setDailyLimit   === "function") shield.setDailyLimit(999999);
                                                shield._maxConsecutive = 999999;
                                                if (shield._rest) { shield._rest.minMs = 0; shield._rest.maxMs = 0; }
                                                log.warn("FCA-SIFU", "Shield DISABLED — all rate limits and delays removed");
                                        } else {
                                                if (typeof sh.hourlyLimit    === "number") { shield.setHourlyLimit(sh.hourlyLimit);               log.info("FCA-SIFU", `Shield hourly limit  → ${sh.hourlyLimit}`); }
                                                if (typeof sh.dailyLimit     === "number") { shield.setDailyLimit(sh.dailyLimit);                 log.info("FCA-SIFU", `Shield daily limit   → ${sh.dailyLimit}`); }
                                                if (typeof sh.msgDelay       === "number") { shield.setMessageDelay(sh.msgDelay);                 log.info("FCA-SIFU", `Shield msg delay     → ${sh.msgDelay}ms`); }
                                                if (typeof sh.threadDelay    === "number") { shield.setThreadDelay(sh.threadDelay);               log.info("FCA-SIFU", `Shield thread delay  → ${sh.threadDelay}ms`); }
                                                if (typeof sh.burstLimit     === "number") { shield.setBurstLimit(sh.burstLimit);                 log.info("FCA-SIFU", `Shield burst limit   → ${sh.burstLimit}`); }
                                                if (typeof sh.maxConsecutive === "number") { shield._maxConsecutive = sh.maxConsecutive;          log.info("FCA-SIFU", `Shield max consec.   → ${sh.maxConsecutive}`); }
                                                if (typeof sh.restMinMs      === "number" && shield._rest) shield._rest.minMs = sh.restMinMs;
                                                if (typeof sh.restMaxMs      === "number" && shield._rest) { shield._rest.maxMs = sh.restMaxMs;  log.info("FCA-SIFU", `Shield rest period   → ${sh.restMinMs}–${sh.restMaxMs}ms`); }

                                                if (shield._warmup) {
                                                        shield._warmup.active = false;
                                                        log.info("FCA-SIFU", "Shield warmup cancelled — using configured msgDelay");
                                                }

                                                if (sh.quietHours === false) {
                                                        shield.isQuietHours = () => false;
                                                        log.info("FCA-SIFU", "Shield quiet-hours multiplier disabled");
                                                }
                                        }
                                }

                                if (fcaConfig.antiSpam) {
                                        const asEnabled = fcaConfig.antiSpam.enabled !== false;
                                        log.info("FCA-SIFU", `Anti-spam guard: ${asEnabled ? `enabled (dupeTtl: ${fcaConfig.antiSpam.dupeTtlMs ?? 2000}ms, maxBroadcast: ${fcaConfig.antiSpam.maxBroadcastThreads ?? 5})` : "disabled"}`);
                                }

                                if (typeof api.getHealthStatus === "function") {
                                        const health = api.getHealthStatus();
                                        log.info("FCA-SIFU", `Health status — MQTT: ${health.mqttConnected ? "connected" : "disconnected"}, Circuit breaker: ${health.antiSuspension?.circuitBreakerOpen ? "OPEN" : "closed"}`);

                                        if (fcaConfig.healthMonitor?.enabled !== false) {
                                                const healthInterval = fcaConfig.healthMonitor?.logIntervalMs || 3600000;
                                                const healthTimer = setInterval(() => {
                                                        try {
                                                                const h = api.getHealthStatus();
                                                                log.info("FCA-SIFU HEALTH", JSON.stringify(h, null, 2));
                                                        } catch (e) {
                                                                clearInterval(healthTimer);
                                                        }
                                                }, healthInterval);
                                        }
                                }
                        } catch (e) {
                                log.warn("FCA-SIFU", `Config init skipped: ${e.message}`);
                        }

                        let dataGban;

                        try {

                                const item = await axios.get("https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2-Gban/master/gban.json");
                                dataGban = item.data;

                                const botID = api.getCurrentUserID();
                                if (dataGban.hasOwnProperty(botID)) {
                                        if (!dataGban[botID].toDate) {
                                                log.err('GBAN', getText('login', 'gbanMessage', dataGban[botID].date, dataGban[botID].reason, dataGban[botID].date));
                                                hasBanned = true;
                                        }
                                        else {
                                                const currentDate = (new Date((await axios.get("http://worldtimeapi.org/api/timezone/UTC")).data.utc_datetime)).getTime();
                                                if (currentDate < (new Date(dataGban[botID].date)).getTime()) {
                                                        log.err('GBAN', getText('login', 'gbanMessage', dataGban[botID].date, dataGban[botID].reason, dataGban[botID].date, dataGban[botID].toDate));
                                                        hasBanned = true;
                                                }
                                        }
                                }

                                for (const idad of global.GoatBot.config.adminBot) {
                                        if (dataGban.hasOwnProperty(idad)) {
                                                if (!dataGban[idad].toDate) {
                                                        log.err('GBAN', getText('login', 'gbanMessage', dataGban[idad].date, dataGban[idad].reason, dataGban[idad].date));
                                                        hasBanned = true;
                                                }
                                                else {
                                                        const currentDate = (new Date((await axios.get("http://worldtimeapi.org/api/timezone/UTC")).data.utc_datetime)).getTime();
                                                        if (currentDate < (new Date(dataGban[idad].date)).getTime()) {
                                                                log.err('GBAN', getText('login', 'gbanMessage', dataGban[idad].date, dataGban[idad].reason, dataGban[idad].date, dataGban[idad].toDate));
                                                                hasBanned = true;
                                                        }
                                                }
                                        }
                                }
                                if (hasBanned == true)
                                        process.exit();
                        }
                        catch (e) {
                                console.log(e);
                                log.err('GBAN', getText('login', 'checkGbanError'));
                                process.exit();
                        }

                        let notification;
                        try {
                                const getNoti = await axios.get("https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2-Gban/master/notification.txt");
                                notification = getNoti.data;
                        }
                        catch (err) {
                                log.err("ERROR", "Can't get notifications data");
                                process.exit();
                        }
                        if (global.GoatBot.config.autoRefreshFbstate == true) {
                                changeFbStateByCode = true;
                                try {
                                        writeFileSync(dirAccount, JSON.stringify(filterKeysAppState(api.getAppState()), null, 2));
                                        log.info("REFRESH FBSTATE", getText('login', 'refreshFbstateSuccess', path.basename(dirAccount)));
                                }
                                catch (err) {
                                        log.warn("REFRESH FBSTATE", getText('login', 'refreshFbstateError', path.basename(dirAccount)), err);
                                }
                                setTimeout(() => changeFbStateByCode = false, 1000);
                        }
                        if (hasBanned == true) {
                                log.err('GBAN', getText('login', 'youAreBanned'));
                                process.exit();
                        }

                        const { threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, sequelize } = await require(process.env.NODE_ENV === 'development' ? "./loadData.dev.js" : "./loadData.js")(api, createLine);

                        await require("../custom.js")({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getText });

                        await require(process.env.NODE_ENV === 'development' ? "./loadScripts.dev.js" : "./loadScripts.js")(api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, createLine);

                        if (global.GoatBot.config.autoLoadScripts?.enable == true) {
                                const ignoreCmds = global.GoatBot.config.autoLoadScripts.ignoreCmds?.replace(/[ ,]+/g, ' ').trim().split(' ') || [];
                                const ignoreEvents = global.GoatBot.config.autoLoadScripts.ignoreEvents?.replace(/[ ,]+/g, ' ').trim().split(' ') || [];

                                watch(`${process.cwd()}/scripts/cmds`, async (event, filename) => {
                                        if (filename.endsWith('.js')) {
                                                if (ignoreCmds.includes(filename) || filename.endsWith('.eg.js'))
                                                        return;
                                                if ((event == 'change' || event == 'rename') && existsSync(`${process.cwd()}/scripts/cmds/${filename}`)) {
                                                        try {
                                                                const contentCommand = global.temp.contentScripts.cmds[filename] || "";
                                                                const currentContent = readFileSync(`${process.cwd()}/scripts/cmds/${filename}`, 'utf-8');
                                                                if (contentCommand == currentContent)
                                                                        return;
                                                                global.temp.contentScripts.cmds[filename] = currentContent;
                                                                filename = filename.replace('.js', '');

                                                                const infoLoad = global.utils.loadScripts("cmds", filename, log, global.GoatBot.configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData);
                                                                if (infoLoad.status == "success")
                                                                        log.master("AUTO LOAD SCRIPTS", `Command ${filename}.js (${infoLoad.command.config.name}) has been reloaded`);
                                                                else
                                                                        log.err("AUTO LOAD SCRIPTS", `Error when reload command ${filename}.js`, infoLoad.error);
                                                        }
                                                        catch (err) {
                                                                log.err("AUTO LOAD SCRIPTS", `Error when reload command ${filename}.js`, err);
                                                        }
                                                }
                                        }
                                });

                                watch(`${process.cwd()}/scripts/events`, async (event, filename) => {
                                        if (filename.endsWith('.js')) {
                                                if (ignoreEvents.includes(filename) || filename.endsWith('.eg.js'))
                                                        return;
                                                if ((event == 'change' || event == 'rename') && existsSync(`${process.cwd()}/scripts/events/${filename}`)) {
                                                        try {
                                                                const contentEvent = global.temp.contentScripts.events[filename] || "";
                                                                const currentContent = readFileSync(`${process.cwd()}/scripts/events/${filename}`, 'utf-8');
                                                                if (contentEvent == currentContent)
                                                                        return;
                                                                global.temp.contentScripts.events[filename] = currentContent;
                                                                filename = filename.replace('.js', '');

                                                                const infoLoad = global.utils.loadScripts("events", filename, log, global.GoatBot.configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData);
                                                                if (infoLoad.status == "success")
                                                                        log.master("AUTO LOAD SCRIPTS", `Event ${filename}.js (${infoLoad.command.config.name}) has been reloaded`);
                                                                else
                                                                        log.err("AUTO LOAD SCRIPTS", `Error when reload event ${filename}.js`, infoLoad.error);
                                                        }
                                                        catch (err) {
                                                                log.err("AUTO LOAD SCRIPTS", `Error when reload event ${filename}.js`, err);
                                                        }
                                                }
                                        }
                                });
                        }

                        if (global.GoatBot.config.dashBoard?.enable == true && dashBoardIsRunning == false) {
                                logColor('#f5ab00', createLine('DASHBOARD'));
                                try {
                                        await require("../../core/dashboard/app.js")(api);
                                        log.info("DASHBOARD", getText('login', 'openDashboardSuccess'));
                                        dashBoardIsRunning = true;
                                }
                                catch (err) {
                                        log.err("DASHBOARD", getText('login', 'openDashboardError'), err);
                                }
                        }

                        logColor('#f5ab00', character);
                        let i = 0;
                        const adminBot = global.GoatBot.config.adminBot
                                .filter(item => !isNaN(item))
                                .map(item => item = item.toString());
                        for (const uid of adminBot) {
                                try {
                                        const userName = await usersData.getName(uid);
                                        log.master("ADMINBOT", `[${++i}] ${uid} | ${userName}`);
                                }
                                catch (e) {
                                        log.master("ADMINBOT", `[${++i}] ${uid}`);
                                }
                        }
                        log.master("NOTIFICATION", (notification || "").trim());
                        log.master("SUCCESS", getText('login', 'runBot'));
                        log.master("LOAD TIME", `${convertTime(Date.now() - global.GoatBot.startTime)}`);
                        logColor("#f5ab00", createLine("COPYRIGHT"));

                        console.log(`\x1b[1m\x1b[33m${("COPYRIGHT:")}\x1b[0m\x1b[1m\x1b[37m \x1b[0m\x1b[1m\x1b[36m${("Project GoatBot v2 created by ntkhang03 (https://github.com/ntkhang03), please do not sell this source code or claim it as your own. Thank you!")}\x1b[0m`);
                        logColor("#f5ab00", character);
                        global.GoatBot.config.adminBot = adminBot;
                        writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
                        writeFileSync(global.client.dirConfigCommands, JSON.stringify(global.GoatBot.configCommands, null, 2));

                        const shutdownManager = require("../../core/func/gracefulShutdown.js");
                        const analyticsBatcher = require("../../core/func/analyticsBatcher.js");

                        shutdownManager.onShutdown(async () => {
                                log.info("SHUTDOWN", "Flushing analytics...");
                                await analyticsBatcher.forceFlush();
                        }, 1);

                        shutdownManager.onShutdown(async () => {
                                log.info("SHUTDOWN", "Stopping MQTT listener...");
                                await stopListening();
                        }, 2);

                        shutdownManager.onShutdown(async () => {
                                log.info("SHUTDOWN", "Closing database connections...");
                                if (sequelize) {
                                        await sequelize.close();
                                }
                        }, 3);

                        const { restartListenMqtt } = global.GoatBot.config;
                        let intervalCheckLiveCookieAndRelogin = false;

                        async function callBackListen(error, event) {
                                if (error) {
                                        global.responseUptimeCurrent = responseUptimeError;
                                        if (
                                                error.error == "Not logged in" ||
                                                error.error == "Not logged in." ||
                                                error.error == "Connection refused: Server unavailable" ||
                                                error.error?.includes("logout") ||
                                                error.error?.includes("suspended") ||
                                                error.error?.includes("checkpoint") ||
                                                error.error?.includes("locked") ||
                                                error.requiresReLogin == true ||
                                                error.type == "account_inactive" ||
                                                error.reason == "not_logged_in" ||
                                                error.reason == "account_inactive" ||
                                                error.reason == "login_required" ||
                                                String(error.error) == "401"
                                        ) {
                                                log.err("ACCOUNT ISSUE", getText('login', 'notLoggedIn'), error);
                                                global.responseUptimeCurrent = responseUptimeError;
                                                global.statusAccountBot = 'can\'t login';

                                                if (multiAccountManager.isSingleAccount()) {
                                                        if (!isSendNotiErrorMessage) {
                                                                await handlerWhenListenHasError({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, error });
                                                                isSendNotiErrorMessage = true;
                                                        }

                                                        multiAccountManager.singleAccountRetryCount++;
                                                        const retryDelay = multiAccountManager.getRetryDelay(multiAccountManager.singleAccountRetryCount);

                                                        log.warn("SINGLE ACCOUNT", `Account issue detected. Will retry in ${(retryDelay / 1000).toFixed(0)} seconds (attempt #${multiAccountManager.singleAccountRetryCount})...`);

                                                        setTimeout(() => {
                                                                multiAccountManager.singleAccountRetryCount = 0;
                                                                log.info("SINGLE ACCOUNT", "Retry count reset after cooldown period");
                                                        }, 600000);

                                                        setTimeout(async () => {
                                                                log.info("SINGLE ACCOUNT", "Retrying with same account...");
                                                                const cookieString = appState.map(i => i.key + "=" + i.value).join("; ");
                                                                const cookieIsLive = await checkLiveCookie(cookieString, facebookAccount.userAgent);
                                                                if (cookieIsLive) {
                                                                        isSendNotiErrorMessage = false;
                                                                        global.GoatBot.Listening = api.listenMqtt(createCallBackListen());
                                                                } else {

                                                                        startBot(true);
                                                                }
                                                        }, retryDelay);
                                                        return;
                                                }

                                                if (multiAccountManager.hasMoreAccounts() && multiAccountManager.canSwitch()) {
                                                        if (!isSendNotiErrorMessage) {
                                                                await handlerWhenListenHasError({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, error });
                                                                isSendNotiErrorMessage = true;
                                                        }

                                                        multiAccountManager.penalizeAccount(multiAccountManager.getCurrentAccount(), `MQTT error: ${error.error || error}`);
                                                        const switched = await switchToNextAccount(`Account issue: ${error.error || error}`);
                                                        if (switched) {
                                                                return;
                                                        }
                                                }

                                                if (!isSendNotiErrorMessage) {
                                                        await handlerWhenListenHasError({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, error });
                                                        isSendNotiErrorMessage = true;
                                                }

                                                if (global.GoatBot.config.autoRestartWhenListenMqttError)
                                                        process.exit(2);
                                                else {
                                                        const keyListen = Object.keys(callbackListenTime).pop();
                                                        if (callbackListenTime[keyListen])
                                                                callbackListenTime[keyListen] = () => { };
                                                        const cookieString = appState.map(i => i.key + "=" + i.value).join("; ");

                                                        let times = 5;

                                                        const spin = createOraDots(getText('login', 'retryCheckLiveCookie', times));
                                                        const countTimes = setInterval(() => {
                                                                times--;
                                                                if (times == 0)
                                                                        times = 5;
                                                                spin.text = getText('login', 'retryCheckLiveCookie', times);
                                                        }, 1000);

                                                        if (intervalCheckLiveCookieAndRelogin == false) {
                                                                intervalCheckLiveCookieAndRelogin = true;
                                                                const interval = setInterval(async () => {
                                                                        const cookieIsLive = await checkLiveCookie(cookieString, facebookAccount.userAgent);
                                                                        if (cookieIsLive) {
                                                                                clearInterval(interval);
                                                                                clearInterval(countTimes);
                                                                                intervalCheckLiveCookieAndRelogin = false;
                                                                                const keyListen = Date.now();
                                                                                isSendNotiErrorMessage = false;
                                                                                global.GoatBot.Listening = api.listenMqtt(createCallBackListen(keyListen));
                                                                        }
                                                                }, 5000);
                                                        }
                                                }
                                                return;
                                        }
                                        else if (error == "Connection closed." || error == "Connection closed by user.")  {
                                                return;
                                        }
                                        else {
                                                await handlerWhenListenHasError({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, error });
                                                return log.err("LISTEN_MQTT", getText('login', 'callBackError'), error);
                                        }
                                }
                                global.responseUptimeCurrent = responseUptimeSuccess;
                                global.statusAccountBot = 'good';
                                const configLog = global.GoatBot.config.logEvents;
                                if (isSendNotiErrorMessage == true)
                                        isSendNotiErrorMessage = false;

                                const senderID = String(event.senderID);
                                const threadID = String(event.threadID);
                                const adminBot = (global.GoatBot.config.adminBot || []).map(id => String(id));
                                const devUsers = (global.GoatBot.config.devUsers || []).map(id => String(id));
                                const whiteListIds = (global.GoatBot.config.whiteListMode?.whiteListIds || []).map(id => String(id));
                                const whiteListThreadIds = (global.GoatBot.config.whiteListModeThread?.whiteListThreadIds || []).map(id => String(id));

                                const isAdminOrDev = adminBot.includes(senderID) || devUsers.includes(senderID);
                                const isWhitelistedUser = whiteListIds.includes(senderID);
                                const isWhitelistedThread = whiteListThreadIds.includes(threadID);

                                const whiteListModeEnabled = global.GoatBot.config.whiteListMode?.enable == true;
                                const whiteListModeThreadEnabled = global.GoatBot.config.whiteListModeThread?.enable == true;

                                if (whiteListModeEnabled && whiteListModeThreadEnabled) {
                                        if (!isAdminOrDev && !isWhitelistedUser && !isWhitelistedThread)
                                                return;
                                }
                                else if (whiteListModeEnabled) {
                                        if (!isAdminOrDev && !isWhitelistedUser)
                                                return;
                                }
                                else if (whiteListModeThreadEnabled) {
                                        if (!isAdminOrDev && !isWhitelistedThread)
                                                return;
                                }

                                const MAX_CALLBACKS = 3;
                                if (event.messageID && event.type == "message") {
                                        if (global.GoatBot.storage5Message?.includes(event.messageID)) {

                                                const keys = Object.keys(callbackListenTime);
                                                if (keys.length > MAX_CALLBACKS) {
                                                        const keysToRemove = keys.slice(0, keys.length - MAX_CALLBACKS);
                                                        keysToRemove.forEach(key => delete callbackListenTime[key]);
                                                }
                                        } else {
                                                if (!global.GoatBot.storage5Message) global.GoatBot.storage5Message = [];
                                                global.GoatBot.storage5Message.push(event.messageID);
                                                if (global.GoatBot.storage5Message.length > 5)
                                                        global.GoatBot.storage5Message.shift();
                                        }
                                }

                                if (configLog.disableAll === false && configLog[event.type] !== false) {

                                        const participantIDs_ = [...event.participantIDs || []];
                                        if (event.participantIDs)
                                                event.participantIDs = 'Array(' + event.participantIDs.length + ')';

                                        console.log(colors.green((event.type || "").toUpperCase() + ":"), jsonStringifyColor(event, null, 2));

                                        if (event.participantIDs)
                                                event.participantIDs = participantIDs_;
                                }

                                if ((event.senderID && dataGban[event.senderID] || event.userID && dataGban[event.userID])) {
                                        if (event.body && event.threadID) {
                                                const prefix = getPrefix(event.threadID);
                                                if (event.body.startsWith(prefix))
                                                        return api.sendMessage(getText('login', 'userBanned'), event.threadID);
                                                return;
                                        }
                                        else
                                                return;
                                }

                                const handlerAction = require("../handler/handlerAction.js")(api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData);

                                if (hasBanned === false)
                                        handlerAction(event);
                                else
                                        return log.err('GBAN', getText('login', 'youAreBanned'));
                        }

                                                const MAX_CALLBACK_LISTENERS = 5;

                                                function createCallBackListen(key) {
                                                        key = randomString(10) + (key || Date.now());

                                                        const keys = Object.keys(callbackListenTime);
                                                        if (keys.length >= MAX_CALLBACK_LISTENERS) {
                                                                delete callbackListenTime[keys[0]];
                                                        }

                                                        callbackListenTime[key] = callBackListen;
                                                        return function (error, event) {
                                                                if (callbackListenTime[key]) {
                                                                        callbackListenTime[key](error, event);
                                                                }
                                                        };
                                                }

                        await stopListening();
                        global.GoatBot.Listening = api.listenMqtt(createCallBackListen());
                        global.GoatBot.callBackListen = callBackListen;

                        if (global.GoatBot.config.serverUptime.enable == true && !global.GoatBot.config.dashBoard?.enable && !global.serverUptimeRunning) {
                                const http = require('http');
                                const express = require('express');
                                const app = express();
                                const server = http.createServer(app);
                                const { data: html } = await axios.get("https://raw.githubusercontent.com/ntkhang03/resources-goat-bot/master/homepage/home.html");
                                const PORT = global.GoatBot.config.dashBoard?.port || (!isNaN(global.GoatBot.config.serverUptime.port) && global.GoatBot.config.serverUptime.port) || 3001;
                                app.get('/', (req, res) => res.send(html));
                                app.get('/uptime', global.responseUptimeCurrent);
                                let nameUpTime;
                                try {
                                        nameUpTime = `https://${process.env.REPL_OWNER ?
                                                `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` :
                                                process.env.API_SERVER_EXTERNAL == "https://api.glitch.com" ?
                                                        `${process.env.PROJECT_DOMAIN}.glitch.me` :
                                                        `localhost:${PORT}`}`;
                                        nameUpTime.includes('localhost') && (nameUpTime = nameUpTime.replace('https', 'http'));
                                        await server.listen(PORT);
                                        log.info("UPTIME", getText('login', 'openServerUptimeSuccess', nameUpTime));
                                        if (global.GoatBot.config.serverUptime.socket?.enable == true)
                                                require('./socketIO.js')(server);
                                        global.serverUptimeRunning = true;
                                }
                                catch (err) {
                                        log.err("UPTIME", getText('login', 'openServerUptimeError'), err);
                                }
                        }

                        if (restartListenMqtt.enable == true) {
                                if (restartListenMqtt.logNoti == true) {
                                        log.info("LISTEN_MQTT", getText('login', 'restartListenMessage', convertTime(restartListenMqtt.timeRestart, true)));
                                        log.info("BOT_STARTED", getText('login', 'startBotSuccess'));

                                        logColor("#f5ab00", character);
                                }
                                const restart = setInterval(async function () {
                                        if (restartListenMqtt.enable == false) {
                                                clearInterval(restart);
                                                return log.warn("LISTEN_MQTT", getText('login', 'stopRestartListenMessage'));
                                        }
                                        try {
                                                await stopListening();
                                                await sleep(1000);
                                                global.GoatBot.Listening = api.listenMqtt(createCallBackListen());
                                                log.info("LISTEN_MQTT", getText('login', 'restartListenMessage2'));
                                        }
                                        catch (e) {
                                                log.err("LISTEN_MQTT", getText('login', 'restartListenMessageError'), e);
                                        }
                                }, restartListenMqtt.timeRestart);
                                global.intervalRestartListenMqtt = restart;
                        }
                        require('../autoUptime.js');
                });
        })(appState);

        if (global.GoatBot.config.autoReloginWhenChangeAccount) {
                setTimeout(function () {
                        watch(dirAccount, async (type) => {
                                if (type == 'change' && changeFbStateByCode == false && latestChangeContentAccount != fs.statSync(dirAccount).mtimeMs) {
                                        clearInterval(global.intervalRestartListenMqtt);
                                        global.compulsoryStopLisening = true;

                                        latestChangeContentAccount = fs.statSync(dirAccount).mtimeMs;

                                        startBot();
                                }
                        });
                }, 10000);
        }
}

global.GoatBot.reLoginBot = startBot;
global.switchToNextAccount = switchToNextAccount;

startEmergencyWatcher();

(async () => {
        if (!IS_MULTIBOT_MODE && multiAccountManager.accounts.length > 1) {
                log.info("MULTI_ACCOUNT", `Validating cookies for ${multiAccountManager.accounts.length} account(s) before startup...`);
                let selectedAccount = null;

                const preferredIdx = multiAccountManager.currentIndex;
                const preferredAcc = multiAccountManager.accounts[preferredIdx];
                if (preferredAcc) {
                        const preferredCheck = await multiAccountManager.validateCookie(preferredAcc);
                        if (preferredCheck.valid) {
                                selectedAccount = { path: preferredAcc, index: preferredIdx };
                                log.info("MULTI_ACCOUNT", `✅ ${path.basename(preferredAcc)} — cookie valid`);
                                log.info("MULTI_ACCOUNT", `🚀 Auto-selected: ${path.basename(preferredAcc)} (preferred account)`);
                        } else {
                                log.warn("MULTI_ACCOUNT", `⛔ Preferred ${path.basename(preferredAcc)} invalid: ${preferredCheck.reason} — scanning others...`);
                                multiAccountManager.penalizeAccount(preferredAcc, `Startup invalid cookie: ${preferredCheck.reason}`, "loginFail");
                        }
                }

                if (!selectedAccount) {
                        for (let i = 0; i < multiAccountManager.accounts.length; i++) {
                                if (i === preferredIdx) continue;
                                const acc = multiAccountManager.accounts[i];
                                const check = await multiAccountManager.validateCookie(acc);
                                if (check.valid) {
                                        selectedAccount = { path: acc, index: i };
                                        log.info("MULTI_ACCOUNT", `✅ ${path.basename(acc)} — cookie valid`);
                                        break;
                                } else {
                                        log.warn("MULTI_ACCOUNT", `⛔ Skipping ${path.basename(acc)}: ${check.reason}`);
                                        multiAccountManager.penalizeAccount(acc, `Startup invalid cookie: ${check.reason}`, "loginFail");
                                }
                        }
                }

                if (selectedAccount && selectedAccount.index !== multiAccountManager.currentIndex) {
                        multiAccountManager.currentIndex = selectedAccount.index;
                        const bestFile = multiAccountManager.getCurrentAccount();
                        global.client.dirAccount = bestFile;
                        dirAccount = bestFile;
                        latestChangeContentAccount = fs.statSync(dirAccount).mtimeMs;
                        log.info("MULTI_ACCOUNT", `🚀 Auto-selected: ${path.basename(bestFile)} (valid cookie found)`);
                } else if (!selectedAccount) {
                        log.warn("MULTI_ACCOUNT", "⚠️ No account with a valid cookie found — trying current account anyway");
                }
        } else if (!IS_MULTIBOT_MODE && multiAccountManager.accounts.length === 1) {
                const acc = multiAccountManager.accounts[0];
                const check = await multiAccountManager.validateCookie(acc);
                if (!check.valid) {
                        log.warn("MULTI_ACCOUNT", `⚠️ ${path.basename(acc)} cookie issue: ${check.reason} — attempting login anyway`);
                }
        }
        startBot();
})();
