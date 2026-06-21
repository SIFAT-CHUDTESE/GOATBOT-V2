/**
 * @author NTKhang & Modified by SIFAT
 */

process.on('unhandledRejection', (error, promise) => {
        log.error('UNHANDLED_REJECTION', error.message || error);
});

process.on('uncaughtException', (error) => {
        log.error('UNCAUGHT_EXCEPTION', error.message || error);
        log.error('UNCAUGHT_EXCEPTION', error.stack || 'No stack trace');
        setTimeout(() => process.exit(1), 1000);
});

class TTLMap extends Map {
        constructor(options = {}) {
                super();
                this.ttl = options.ttl || 3600000;
                this.maxSize = options.maxSize || 1000;
                this.timestamps = new Map();
                this.cleanupInterval = setInterval(() => this._cleanup(), options.cleanupInterval || 60000);
        }

        set(key, value) {
                if (this.size >= this.maxSize && !this.has(key)) {
                        const oldestKey = this.timestamps.keys().next().value;
                        this.delete(oldestKey);
                }

                super.set(key, value);
                this.timestamps.set(key, Date.now());
                return this;
        }

        get(key) {
                const value = super.get(key);
                if (value !== undefined) {
                        this.timestamps.set(key, Date.now());
                }
                return value;
        }

        delete(key) {
                this.timestamps.delete(key);
                return super.delete(key);
        }

        _cleanup() {
                const now = Date.now();
                const cutoff = now - this.ttl;
                let cleaned = 0;

                for (const [key, timestamp] of this.timestamps) {
                        if (timestamp < cutoff) {
                                this.delete(key);
                                cleaned++;
                        }
                }

                return cleaned;
        }

        destroy() {
                clearInterval(this.cleanupInterval);
                this.clear();
                this.timestamps.clear();
        }
}

const axios = require("axios");
const fs = require("fs-extra");
const { execSync } = require('child_process');
const log = require('./core/logger/log.js');
const path = require("path");

require('./core/setupFonts.js')();

process.env.BLUEBIRD_W_FORGOTTEN_RETURN = 0;

function validJSON(pathDir) {
        try {
                if (!fs.existsSync(pathDir))
                        throw new Error(`File "${pathDir}" not found`);
                const jsonlint = require("jsonlint-mod");
                const content = fs.readFileSync(pathDir, "utf8");
                jsonlint.parse(content);
                return true;
        }
        catch (err) {
                let msgError = err.message;
                const indexPos = msgError.indexOf("    at");
                msgError = msgError.slice(0, indexPos != -1 ? indexPos - 1 : msgError.length);
                throw new Error(msgError);
        }
}

const dirConfig = path.normalize(`${__dirname}/config.json`);
const dirConfigCommands = path.normalize(`${__dirname}/core/configCommands.json`);
const dirAccount = path.normalize(`${__dirname}/accounts/account.txt`);

for (const pathDir of [dirConfig, dirConfigCommands]) {
        try {
                validJSON(pathDir);
        }
        catch (err) {
                log.error("CONFIG", `Invalid JSON file "${pathDir.replace(__dirname, "")}":\n${err.message.split("\n").map(line => `  ${line}`).join("\n")}\nPlease fix it and restart bot`);
                process.exit(0);
        }
}
const config = require(dirConfig);
if (config.whiteListMode?.whiteListIds && Array.isArray(config.whiteListMode.whiteListIds))
        config.whiteListMode.whiteListIds = config.whiteListMode.whiteListIds.map(id => id.toString());
const configCommands = require(dirConfigCommands);

global.GoatBot = {
        startTime: Date.now() - process.uptime() * 1000,
        commands: new Map(),
        eventCommands: new Map(),
        commandFilesPath: [],
        eventCommandsFilesPath: [],
        aliases: new Map(),
        onFirstChat: new Set(),
        onChat: [],
        onEvent: [],
        onReply: new TTLMap({ ttl: 30 * 60 * 1000, maxSize: 500, cleanupInterval: 60000 }),
        onReaction: new TTLMap({ ttl: 30 * 60 * 1000, maxSize: 500, cleanupInterval: 60000 }),
        onAnyEvent: [],
        config,
        configCommands,
        envCommands: {},
        envEvents: {},
        envGlobal: {},
        reLoginBot: function () { },
        Listening: null,
        oldListening: [],
        callbackListenTime: {},
        storage5Message: [],
        fcaApi: null,
        botID: null
};

global.db = {
        allThreadData: [],
        allUserData: [],
        allDashBoardData: [],
        allGlobalData: [],

        threadModel: null,
        userModel: null,
        dashboardModel: null,
        globalModel: null,

        threadsData: null,
        usersData: null,
        dashBoardData: null,
        globalData: null,

        receivedTheFirstMessage: {}
};

global.client = {
        dirConfig,
        dirConfigCommands,
        dirAccount,
        countDown: {},
        cache: {},
        database: {
                creatingThreadData: [],
                creatingUserData: [],
                creatingDashBoardData: [],
                creatingGlobalData: []
        },
        commandBanned: configCommands.commandBanned
};

const utils = require("./core/utils.js");
global.utils = utils;
const { colors } = utils;
const shutdownManager = require("./core/func/gracefulShutdown.js");

global.temp = {
        createThreadData: [],
        createUserData: [],
        createThreadDataError: new Set(),
        contentScripts: {
                cmds: {},
                events: {}
        },
        _addWithLimit(arr, item, maxSize = 1000) {
                arr.push(item);
                if (arr.length > maxSize) {
                        arr.splice(0, arr.length - maxSize);
                }
        }
};

const watchAndReloadConfig = (dir, type, prop, logName) => {
        let lastModified = fs.statSync(dir).mtimeMs;
        let isFirstModified = true;

        fs.watch(dir, (eventType) => {
                if (eventType === type) {
                        const oldConfig = global.GoatBot[prop];

                        setTimeout(() => {
                                try {
                                        if (isFirstModified) {
                                                isFirstModified = false;
                                                return;
                                        }
                                        if (lastModified === fs.statSync(dir).mtimeMs) {
                                                return;
                                        }
                                        global.GoatBot[prop] = JSON.parse(fs.readFileSync(dir, 'utf-8'));
                                        log.success(logName, `Reloaded ${dir.replace(process.cwd(), "")}`);
                                }
                                catch (err) {
                                        log.warn(logName, `Can't reload ${dir.replace(process.cwd(), "")}`);
                                        global.GoatBot[prop] = oldConfig;
                                }
                                finally {
                                        lastModified = fs.statSync(dir).mtimeMs;
                                }
                        }, 200);
                }
        });
};

watchAndReloadConfig(dirConfigCommands, 'change', 'configCommands', 'CONFIG COMMANDS');
watchAndReloadConfig(dirConfig, 'change', 'config', 'CONFIG');

global.GoatBot.envGlobal = global.GoatBot.configCommands.envGlobal;
global.GoatBot.envCommands = global.GoatBot.configCommands.envCommands;
global.GoatBot.envEvents = global.GoatBot.configCommands.envEvents;

const getText = global.utils.getText;

class MemoryManager {
        constructor(options = {}) {
                this.options = {
                        checkInterval: options.checkInterval || 5 * 60 * 1000,
                        heapThreshold: options.heapThreshold || 512 * 1024 * 1024,
                        maxOldListening: options.maxOldListening || 10,
                        maxCallbackListenTime: options.maxCallbackListenTime || 100,
                        maxOnFirstChatSize: options.maxOnFirstChatSize || 10000,
                        ...options
                };

                this.stats = {
                        cleanups: 0,
                        lastHeapUsed: 0,
                        peakHeapUsed: 0
                };

                this._startMonitoring();
        }

        _startMonitoring() {
                setInterval(() => this._checkMemory(), this.options.checkInterval);
        }

        _checkMemory() {
                const memUsage = process.memoryUsage();
                this.stats.lastHeapUsed = memUsage.heapUsed;
                this.stats.peakHeapUsed = Math.max(this.stats.peakHeapUsed, memUsage.heapUsed);

                if (memUsage.heapUsed > this.options.heapThreshold) {
                        this._performCleanup();
                }

                this._lightCleanup();
        }

        _performCleanup() {
                const { GoatBot } = global;
                let cleaned = 0;

                if (GoatBot.oldListening.length > this.options.maxOldListening) {
                        const toRemove = GoatBot.oldListening.length - this.options.maxOldListening;
                        for (let i = 0; i < toRemove; i++) {
                                const handle = GoatBot.oldListening.shift();
                                if (handle && typeof handle.stop === 'function') {
                                        try { handle.stop(); } catch (e) {}
                                }
                        }
                        cleaned += toRemove;
                }

                const callbackEntries = Object.keys(GoatBot.callbackListenTime);
                if (callbackEntries.length > this.options.maxCallbackListenTime) {
                        const sorted = callbackEntries
                                .map(key => ({ key, time: GoatBot.callbackListenTime[key] }))
                                .sort((a, b) => a.time - b.time);

                        const toRemove = sorted.length - this.options.maxCallbackListenTime;
                        for (let i = 0; i < toRemove; i++) {
                                delete GoatBot.callbackListenTime[sorted[i].key];
                        }
                        cleaned += toRemove;
                }

                if (GoatBot.onFirstChat.size > this.options.maxOnFirstChatSize) {
                        const entries = Array.from(GoatBot.onFirstChat);
                        const toRemove = entries.slice(0, entries.length - this.options.maxOnFirstChatSize);
                        toRemove.forEach(id => GoatBot.onFirstChat.delete(id));
                        cleaned += toRemove.length;
                }

                if (global.temp?.expiredPremiumUsers?.length > 1000) {
                        global.temp.expiredPremiumUsers.splice(0, global.temp.expiredPremiumUsers.length - 1000);
                        cleaned++;
                }

                if (global.gc && memUsage.heapUsed > this.options.heapThreshold * 1.5) {
                        global.gc();
                        cleaned++;
                }

                if (cleaned > 0) {
                        this.stats.cleanups++;
                        log.info('MEMORY', `Cleaned ${cleaned} items, heap: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
                }
        }

        _lightCleanup() {
                if (global.client?.cache) {
                        const cache = global.client.cache;
                        const now = Date.now();
                        for (const [key, value] of Object.entries(cache)) {
                                if (value?._timestamp && now - value._timestamp > 3600000) {
                                        delete cache[key];
                                }
                        }
                }
        }

        getStats() {
                const memUsage = process.memoryUsage();
                return {
                        ...this.stats,
                        heapUsed: memUsage.heapUsed,
                        heapTotal: memUsage.heapTotal,
                        rss: memUsage.rss,
                        external: memUsage.external,
                        heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
                        heapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
                        rssMB: (memUsage.rss / 1024 / 1024).toFixed(2)
                };
        }
}

const memoryManager = new MemoryManager();

if (config.autoRestart) {
        const time = config.autoRestart.time;
        if (!isNaN(time) && time > 0) {
                utils.log.info("AUTO RESTART", getText("Goat", "autoRestart1", utils.convertTime(time, true)));
                setTimeout(() => {
                        utils.log.info("AUTO RESTART", "Restarting...");
                        process.exit(2);
                }, time);
        }
        else if (typeof time == "string" && time.match(/^((((\d+,)+\d+|(\d+(\/|-|#)\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})$/gmi)) {
                utils.log.info("AUTO RESTART", getText("Goat", "autoRestart2", time));
                const cron = require("node-cron");
                cron.schedule(time, () => {
                        utils.log.info("AUTO RESTART", "Restarting...");
                        process.exit(2);
                });
        }
}

(async () => {
        const { data: { version } } = await axios.get("https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2/main/package.json");
        const currentVersion = require("./package.json").version;
        if (utils.compareVersion(version, currentVersion) === 1)
                utils.log.master("NEW VERSION", getText(
                        "Goat",
                        "newVersionDetected",
                        colors.gray(currentVersion),
                        colors.hex("#eb6a07", version),
                        colors.hex("#eb6a07", "node update")
                ));
        require('./bot/login/login.js');
})();
