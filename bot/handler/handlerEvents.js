const fs = require("fs-extra");
const SpamTracker = require("../../core/func/spamTracker.js");
const CooldownManager = require("../../core/func/cooldownManager.js");
const analyticsBatcher = require("../../core/func/analyticsBatcher.js");
const nullAndUndefined = [undefined, null];

// Initialize optimized spam tracker on module load
const spamTracker = new SpamTracker({
        commandThreshold: 8,
        timeWindow: 10000, // 10 seconds
        banDuration: 24 * 60 * 60 * 1000, // 24 hours
        maxEntries: 1000,
        cleanupInterval: 60000 // 1 minute
});

// CooldownManager is already a singleton instance
global._spamTracker = spamTracker;
const cooldownManager = require("../../core/func/cooldownManager.js");

function getType(obj) {
        return Object.prototype.toString.call(obj).slice(8, -1);
}

async function checkSpamBannedThread(threadID, globalData) {
        // Use the new spam tracker first (in-memory, fast)
        if (spamTracker.isBanned(threadID)) {
                return true;
        }

        // Fallback to database check
        const spamBannedThreads = await globalData.get("spamBannedThreads", "data", {});
        if (spamBannedThreads[threadID]) {
                if (spamBannedThreads[threadID].expireTime > Date.now()) {
                        // Sync to memory tracker
                        spamTracker.banThread(threadID, spamBannedThreads[threadID].reason, spamBannedThreads[threadID].expireTime - Date.now());
                        return true;
                } else {
                        delete spamBannedThreads[threadID];
                        await globalData.set("spamBannedThreads", spamBannedThreads, "data");
                }
        }
        return false;
}

async function trackCommandSpam(threadID, threadName, globalData, message) {
        const config = global.GoatBot.config;
        if (config.spamProtection?.enable === false) return false;
        const spamConfig = config.spamProtection || {
                commandThreshold: 8,
                timeWindow: 10,
                banDuration: 24
        };

        // Update tracker config if changed
        spamTracker.options.commandThreshold = spamConfig.commandThreshold;
        spamTracker.options.timeWindow = spamConfig.timeWindow * 1000;
        spamTracker.options.banDuration = spamConfig.banDuration * 60 * 60 * 1000;

        // Use optimized spam tracker
        const result = spamTracker.trackCommand(threadID, message.body?.split(' ')[0] || 'unknown');

        if (result.shouldBan) {
                const spamBannedThreads = await globalData.get("spamBannedThreads", "data", {});
                const banDuration = spamConfig.banDuration * 60 * 60 * 1000;
                const now = Date.now();

                spamBannedThreads[threadID] = {
                        bannedAt: now,
                        expireTime: now + banDuration,
                        threadName: threadName || "Unknown",
                        reason: "Command spam flood detected"
                };

                await globalData.set("spamBannedThreads", spamBannedThreads, "data");

                const hours = spamConfig.banDuration;
                message.reply(global.utils.getText({ lang: global.GoatBot.config.language || "en", head: "handlerEvents" }, "spamBanned", hours));

                global.utils.log.warn("SPAM_BAN", `Thread ${threadID} (${threadName}) banned for command spam`);

                return true;
        }

        return false;
}

function getRole(threadData, senderID) {
        const config = global.GoatBot.config;
        const adminBot = config.adminBot || [];
        const devUsers = config.devUsers || [];
        const premiumUsers = config.premiumUsers || [];
        if (!senderID)
                return 0;
        const adminBox = threadData ? threadData.adminIDs || [] : [];

        // Priority: Developer (4) > Bot Admin (2) > Premium (3) > Group Admin (1) > Normal (0)
        // Admin and Dev always get their role regardless of premium membership
        if (devUsers.includes(senderID.toString()))
                return 4;
        if (adminBot.includes(senderID.toString()))
                return 2;
        if (premiumUsers.includes(senderID.toString())) {
                const userData = global.db.allUserData.find(u => u.userID == senderID);
                if (userData && userData.data && userData.data.premiumExpireTime) {
                        if (userData.data.premiumExpireTime < Date.now()) {
                                global.temp.expiredPremiumUsers = global.temp.expiredPremiumUsers || [];
                                if (!global.temp.expiredPremiumUsers.includes(senderID))
                                        global.temp.expiredPremiumUsers.push(senderID);
                                return adminBox.map(String).includes(senderID.toString()) ? 1 : 0;
                        }
                }
                return 3;
        }
        if (adminBox.map(String).includes(senderID.toString()))
                return 1;
        return 0;
}

// Role permission matrix:
//   Role 0 - Normal user     : can use commands with needRole === 0
//   Role 1 - Group Admin     : can use commands with needRole <= 1
//   Role 2 - Bot Admin       : can use ALL commands (highest rank)
//   Role 3 - Premium         : can use commands with needRole === 0 OR needRole === 3 ONLY
//   Role 4 - Bot Developer   : can use ALL commands (highest rank)
function canUseCommand(userRole, needRole) {
        if (userRole === 4 || userRole === 2)
                return true;
        if (userRole === 3)
                return needRole === 0 || needRole === 3;
        return needRole <= userRole;
}

async function checkMoneyRequirement(userData, requiredMoney) {
        if (!requiredMoney || requiredMoney <= 0)
                return true;
        const userMoney = userData.money || 0;
        return userMoney >= requiredMoney;
}

function getText(type, reason, time, targetID, lang) {
        const utils = global.utils;
        if (type == "userBanned")
                return utils.getText({ lang, head: "handlerEvents" }, "userBanned", reason, time, targetID);
        else if (type == "threadBanned")
                return utils.getText({ lang, head: "handlerEvents" }, "threadBanned", reason, time, targetID);
        else if (type == "onlyAdminBox")
                return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBox");
        else if (type == "onlyAdminBot")
                return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBot");
}

function replaceShortcutInLang(text, prefix, commandName) {
        return text
                .replace(/\{(?:p|prefix)\}/g, prefix)
                .replace(/\{(?:n|name)\}/g, commandName)
                .replace(/\{pn\}/g, `${prefix}${commandName}`);
}

function getRoleConfig(utils, command, isGroup, threadData, commandName) {
        let roleConfig;
        if (utils.isNumber(command.config.role)) {
                roleConfig = {
                        onStart: command.config.role
                };
        }
        else if (typeof command.config.role == "object" && !Array.isArray(command.config.role)) {
                if (!command.config.role.onStart)
                        command.config.role.onStart = 0;
                roleConfig = command.config.role;
        }
        else {
                roleConfig = {
                        onStart: 0
                };
        }

        if (isGroup)
                roleConfig.onStart = threadData.data.setRole?.[commandName] ?? roleConfig.onStart;

        for (const key of ["onChat", "onStart", "onReaction", "onReply"]) {
                if (roleConfig[key] == undefined)
                        roleConfig[key] = roleConfig.onStart;
        }

        return roleConfig;
        // {
        //      onChat,
        //      onStart,
        //      onReaction,
        //      onReply
        // }
}

function isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, replyFn, lang) {
        const config = global.GoatBot.config;
        const { adminBot, hideNotiMessage } = config;

        // check if user banned
        const infoBannedUser = userData.banned;
        if (infoBannedUser.status == true) {
                const { reason, date } = infoBannedUser;
                if (hideNotiMessage.userBanned == false)
                        replyFn(getText("userBanned", reason, date, senderID, lang));
                return true;
        }

        // check if only admin bot
        if (
                config.adminOnly.enable == true
                && !adminBot.includes(senderID)
                && !config.adminOnly.ignoreCommand.includes(commandName)
        ) {
                if (hideNotiMessage.adminOnly == false)
                        replyFn(getText("onlyAdminBot", null, null, null, lang));
                return true;
        }

        // ==========    Check Thread    ========== //
        if (isGroup == true) {
                if (
                        threadData.data.onlyAdminBox === true
                        && !threadData.adminIDs.includes(senderID)
                        && !(threadData.data.ignoreCommanToOnlyAdminBox || []).includes(commandName)
                ) {
                        // check if only admin box
                        if (!threadData.data.hideNotiMessageOnlyAdminBox)
                                replyFn(getText("onlyAdminBox", null, null, null, lang));
                        return true;
                }

                // check if thread banned
                const infoBannedThread = threadData.banned;
                if (infoBannedThread.status == true) {
                        const { reason, date } = infoBannedThread;
                        if (hideNotiMessage.threadBanned == false)
                                replyFn(getText("threadBanned", reason, date, threadID, lang));
                        return true;
                }
        }
        return false;
}


function createGetText2(langCode, pathCustomLang, prefix, command) {
        const commandType = command.config.countDown ? "command" : "command event";
        const commandName = command.config.name;
        let customLang = {};
        let getText2 = () => { };
        if (fs.existsSync(pathCustomLang))
                customLang = require(pathCustomLang)[commandName]?.text || {};
        if (command.langs || customLang || {}) {
                getText2 = function (key, ...args) {
                        let lang = command.langs?.[langCode]?.[key] || customLang[key] || "";
                        lang = replaceShortcutInLang(lang, prefix, commandName);
                        for (let i = args.length - 1; i >= 0; i--)
                                lang = lang.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
                        return lang || `❌ ᴄᴀɴ'ᴛ ғɪɴᴅ ᴛᴇxᴛ ᴏɴ ʟᴀɴɢᴜᴀɢᴇ "${langCode}" ғᴏʀ ${commandType} "${commandName}" ᴡɪᴛʜ ᴋᴇʏ "${key}"`;
                };
        }
        return getText2;
}

module.exports = function (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) {
        return async function (event, message) {

                const { utils, client, GoatBot } = global;
                const { getPrefix, removeHomeDir, log, getTime } = utils;
                const { config, configCommands: { envGlobal, envCommands, envEvents } } = GoatBot;
                const { autoRefreshThreadInfoFirstTime } = config.database;
                let { hideNotiMessage = {} } = config;

                const { body, messageID, threadID, isGroup } = event;

                // Check if has threadID
                if (!threadID)
                        return;

                const senderID = event.userID || event.senderID || event.author;

                let threadData = global.db.allThreadData.find(t => t.threadID == threadID);
                let userData = global.db.allUserData.find(u => u.userID == senderID);

                if (!userData && !isNaN(senderID))
                        userData = await usersData.create(senderID);

                if (!threadData && !isNaN(threadID)) {
                        if (global.temp.createThreadDataError.has(threadID))
                                return;
                        threadData = await threadsData.create(threadID);
                        global.db.receivedTheFirstMessage[threadID] = true;
                }
                else {
                        if (
                                autoRefreshThreadInfoFirstTime === true
                                && !global.db.receivedTheFirstMessage[threadID]
                        ) {
                                global.db.receivedTheFirstMessage[threadID] = true;
                                await threadsData.refreshInfo(threadID);
                        }
                }

                if (typeof threadData.settings.hideNotiMessage == "object")
                        hideNotiMessage = threadData.settings.hideNotiMessage;

                const prefix = getPrefix(threadID);
                const role = getRole(threadData, senderID);
                const parameters = {
                        api, usersData, threadsData, message, event,
                        userModel, threadModel, prefix, dashBoardModel,
                        globalModel, dashBoardData, globalData, envCommands,
                        envEvents, envGlobal, role,
                        removeCommandNameFromBody: function removeCommandNameFromBody(body_, prefix_, commandName_) {
                                if ([body_, prefix_, commandName_].every(x => nullAndUndefined.includes(x)))
                                        throw new Error("Please provide body, prefix and commandName to use this function, this function without parameters only support for onStart");
                                for (let i = 0; i < arguments.length; i++)
                                        if (typeof arguments[i] != "string")
                                                throw new Error(`The parameter "${i + 1}" must be a string, but got "${getType(arguments[i])}"`);

                                return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
                        }
                };
                const langCode = threadData.data.lang || config.language || "en";

                function replyMention(text) {
                        const userName = userData?.name || "ᴜꜱᴇʀ";
                        const greeting = `ʜᴇʏ ${userName}`;
                        return message.reply({
                                body: `${greeting}, ${text}`,
                                mentions: [{ tag: userName, id: senderID, fromIndex: greeting.indexOf(userName) }]
                        });
                }

                function replyLord(text) {
                        const userName = userData?.name || "ᴜꜱᴇʀ";
                        const greeting = `ʜᴇʏ ${userName} ᴍʏ ʟᴏʀᴅ`;
                        return message.reply({
                                body: `${greeting}, ${text}`,
                                mentions: [{ tag: userName, id: senderID, fromIndex: greeting.indexOf(userName) }]
                        });
                }

                function getRandomCommands(n) {
                        const keys = [...GoatBot.commands.keys()];
                        for (let i = keys.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [keys[i], keys[j]] = [keys[j], keys[i]];
                        }
                        return keys.slice(0, n);
                }

                function createMessageSyntaxError(commandName) {
                        message.SyntaxError = async function () {
                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "commandSyntaxError", prefix, commandName));
                        };
                }

                /*
                        +-----------------------------------------------+
                        |                                                        WHEN CALL COMMAND                                                              |
                        +-----------------------------------------------+
                */
                let isUserCallCommand = false;
                async function onStart() {
                        // —————————————— CHECK USE BOT —————————————— //
                        if (!body)
                                return;

                        const npMode    = config.noPrefix;
                        const adminPfx  = config.adminPrefix || "";
                        const devPfx    = config.devPrefix   || "";

                        const hasPrefix      = body.startsWith(prefix);
                        const hasAdminPrefix = adminPfx && body.startsWith(adminPfx) && (role === 2 || role === 4);
                        const hasDevPrefix   = devPfx   && body.startsWith(devPfx)   && role === 4;

                        const userCanSkipPrefix =
                                npMode === true        ? true :
                                npMode === "adminOnly" ? (role === 2 || role === 4) :
                                false;
                        const hasNoPrefix = userCanSkipPrefix && !hasPrefix && !hasAdminPrefix && !hasDevPrefix;

                        if (!hasPrefix && !hasAdminPrefix && !hasDevPrefix && !hasNoPrefix)
                                return;

                        // —————————— CHECK SPAM BANNED THREAD —————————— //
                        if (isGroup) {
                                const isSpamBanned = await checkSpamBannedThread(threadID, globalData);
                                if (isSpamBanned) {
                                        if (!hideNotiMessage.threadBanned)
                                                replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "spamBannedInline"));
                                        return;
                                }
                        }
                        const dateNow = Date.now();
                        const activePrefix = hasAdminPrefix ? adminPfx : hasDevPrefix ? devPfx : hasPrefix ? prefix : "";
                        const args = activePrefix
                                ? body.slice(activePrefix.length).trim().split(/ +/)
                                : body.trim().split(/ +/);
                        // ————————————  CHECK HAS COMMAND ——————————— //
                        let commandName = args.shift().toLowerCase();
                        let command = GoatBot.commands.get(commandName) || GoatBot.commands.get(GoatBot.aliases.get(commandName));
                        // ———————— CHECK ALIASES SET BY GROUP ———————— //
                        const aliasesData = threadData.data.aliases || {};
                        for (const cmdName in aliasesData) {
                                if (aliasesData[cmdName].includes(commandName)) {
                                        command = GoatBot.commands.get(cmdName);
                                        break;
                                }
                        }
                        // ————————————— SET COMMAND NAME ————————————— //
                        if (command)
                                commandName = command.config.name;
                        // ——————— FUNCTION REMOVE COMMAND NAME ———————— //
                        function removeCommandNameFromBody(body_, prefix_, commandName_) {
                                if (arguments.length) {
                                        if (typeof body_ != "string")
                                                throw new Error(`The first argument (body) must be a string, but got "${getType(body_)}"`);
                                        if (typeof prefix_ != "string")
                                                throw new Error(`The second argument (prefix) must be a string, but got "${getType(prefix_)}"`);
                                        if (typeof commandName_ != "string")
                                                throw new Error(`The third argument (commandName) must be a string, but got "${getType(commandName_)}"`);

                                        return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
                                }
                                else {
                                        return body.replace(new RegExp(`^${prefix}(\\s+|)${commandName}`, "i"), "").trim();
                                }
                        }
                        // —————  CHECK BANNED OR ONLY ADMIN BOX  ————— //
                        if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, replyMention, langCode))
                                return;
                        if (!command) {
                                // In noPrefix mode, only respond if the user explicitly used the prefix.
                                // If the message had no prefix, silently ignore unrecognized words.
                                if (!hasPrefix)
                                        return;
                                if (!hideNotiMessage.commandNotFound) {
                                        if (!commandName) {
                                                if (role >= 2) {
                                                        // If noPrefix mode is on, remind admin/dev they don't need the prefix
                                                        if (npMode === true || npMode === "adminOnly") {
                                                                return await replyLord(utils.getText({ lang: langCode, head: "handlerEvents" }, "noPrefixReminder"));
                                                        }
                                                        const cmds = getRandomCommands(3);
                                                        const list = cmds.map((c, i) => `${i + 1}} ${c}`).join("\n");
                                                        return await replyLord(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyPrefixLord") + "\n" + list);
                                                }
                                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyPrefix", prefix));
                                        }
                                        
                                        // Command suggestion with caching
                                        function getCachedCommandNames() {
                                                const cmdCount = GoatBot.commands.size;
                                                const aliasCount = GoatBot.aliases.size;
                                                const cache = GoatBot._cmdNameCache || {};
                                                if (!cache.list || cache.cmdCount !== cmdCount || cache.aliasCount !== aliasCount) {
                                                        const list = [...GoatBot.commands.keys(), ...GoatBot.aliases.keys()];
                                                        GoatBot._cmdNameCache = {
                                                                list,
                                                                lower: list.map(s => s.toLowerCase()),
                                                                cmdCount,
                                                                aliasCount
                                                        };
                                                }
                                                return GoatBot._cmdNameCache;
                                        }

                                        function editDistance(a, b) {
                                                const m = a.length, n = b.length;
                                                if (Math.abs(m - n) > 3) return 99;
                                                const dp = Array.from({ length: m + 1 }, (_, i) => i);
                                                for (let j = 1; j <= n; j++) {
                                                        let prev = j - 1;
                                                        let cur = j;
                                                        for (let i = 1; i <= m; i++) {
                                                                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                                                                const tmp = Math.min(
                                                                        dp[i] + 1,
                                                                        cur + 1,
                                                                        dp[i - 1] + cost
                                                                );
                                                                dp[i - 1] = prev;
                                                                prev = tmp;
                                                                cur = tmp;
                                                        }
                                                        dp[m] = cur;
                                                }
                                                return dp[m];
                                        }

                                        const { list, lower } = getCachedCommandNames();
                                        const input = commandName.toLowerCase();

                                        // Score all commands by similarity to input
                                        const scored = [];
                                        for (let i = 0; i < lower.length; i++) {
                                                const name = lower[i];
                                                let score;
                                                if (name === input) score = 0;
                                                else if (name.startsWith(input) || input.startsWith(name)) score = 1;
                                                else if (Math.abs(name.length - input.length) <= 3) {
                                                        const d = editDistance(input, name);
                                                        if (d <= 3) score = d + 1;
                                                        else continue;
                                                } else continue;
                                                scored.push({ name: list[i], score });
                                        }
                                        scored.sort((a, b) => a.score - b.score);
                                        const topMatches = scored.map(s => s.name).slice(0, 4);
                                        const bestMatch = topMatches[0] || null;

                                        if (role >= 2) {
                                                // Admin path: smart matches first, fill rest with random commands (no mixing of formats)
                                                const smartSet = new Set(topMatches.map(s => s.toLowerCase()));
                                                const randomFill = getRandomCommands(5).filter(c => !smartSet.has(c.toLowerCase()));
                                                const displayList = [...topMatches, ...randomFill].slice(0, 4);
                                                const listStr = displayList.map((c, i) => `${i + 1}} ${c}`).join("\n");
                                                let lordMsg = utils.getText({ lang: langCode, head: "handlerEvents" }, "commandNotFoundLord", commandName);
                                                lordMsg += "\n" + listStr;
                                                return await replyLord(lordMsg);
                                        }

                                        // Normal user path: clean numbered suggestion list
                                        let suggestionMsg = utils.getText({ lang: langCode, head: "handlerEvents" }, "commandNotFound", commandName, prefix);
                                        const topFive = scored.map(s => s.name).slice(0, 5);
                                        if (topFive.length > 0) {
                                                suggestionMsg += "\n\nᴍᴀʏʙᴇ ʏᴏᴜ ᴍᴇᴀɴ:\n" + topFive.map((c, i) => `${i + 1}} ${c}`).join("\n");
                                        }
                                        return await replyMention(suggestionMsg);
                                }
                                else
                                        return true;
                        }
                        // ————————— CHECK MONEY REQUIREMENT (FIRST) ————————— //
                        const requiredMoney = (config.commandMoney?.[commandName] ?? command.config.requiredMoney);
                        if (requiredMoney && requiredMoney > 0) {
                                const hasEnoughMoney = await checkMoneyRequirement(userData, requiredMoney);
                                if (!hasEnoughMoney) {
                                        const userMoney = userData.money || 0;
                                        return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "notEnoughMoney", requiredMoney, userMoney, requiredMoney - userMoney));
                                }
                        }

                        // ————————————— CHECK PERMISSION ———————————— //
                        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                        const needRole = roleConfig.onStart;

                        if (!canUseCommand(role, needRole)) {
                                if (!hideNotiMessage.needRoleToUseCmd) {
                                        if (needRole == 1)
                                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdmin", commandName));
                                        else if (needRole == 2)
                                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2", commandName));
                                        else if (needRole == 3)
                                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyPremium"));
                                        else if (needRole == 4)
                                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyDev"));
                                        else
                                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "noPermission"));
                                }
                                else {
                                        return true;
                                }
                        }
                        // ———————————————— OPTIMIZED COOLDOWN ———————————————— //
                        let getCoolDown = command.config.countDown;
                        if ((!getCoolDown && getCoolDown !== 0) || isNaN(getCoolDown))
                                getCoolDown = 0;
                        const cooldownMs = getCoolDown * 1000;
                        
                        const cooldownCheck = cooldownManager.checkCooldown(commandName, senderID, cooldownMs);
                        if (cooldownCheck.onCooldown) {
                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "waitingForCommand", cooldownCheck.remainingTime.toString()));
                        }
                        
                        // ——————————————— RUN COMMAND ——————————————— //
                        const time = getTime("DD/MM/YYYY HH:mm:ss");
                        isUserCallCommand = true;

                        const _ti = config.typingIndicator;
                        if (_ti?.enable !== false && !(_ti?.excludeThreads || []).includes(threadID)) {
                                try {
                                        api.sendTypingIndicator(true, threadID);
                                        setTimeout(() => { try { api.sendTypingIndicator(false, threadID); } catch (_) {} }, _ti?.duration ?? 2000);
                                } catch (_) {}
                        }

                        // —————————— TRACK SPAM AND AUTO-BAN —————————— //
                        if (isGroup) {
                                const threadName = threadData?.threadName || "Unknown Group";
                                const wasSpamBanned = await trackCommandSpam(threadID, threadName, globalData, message);
                                if (wasSpamBanned) {
                                        return;
                                }
                        }

                        try {
                                // analytics command call - batched for performance
                                analyticsBatcher.record(commandName);

                                createMessageSyntaxError(commandName);
                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                await command.onStart({
                                        ...parameters,
                                        args,
                                        commandName,
                                        getLang: getText2,
                                        removeCommandNameFromBody
                                });
                                
                                // Set cooldown after successful execution
                                cooldownManager.setCooldown(commandName, senderID);
                                
                                // Deduct money if requiredMoney was set
                                if (requiredMoney && requiredMoney > 0) {
                                        try {
                                                await usersData.subtractMoney(senderID, requiredMoney);
                                                // Route fee to feeCollectorUID if configured
                                                const feeUID = global.GoatBot?.config?.feeCollectorUID;
                                                if (feeUID && feeUID !== senderID) {
                                                        try {
                                                                await usersData.addMoney(feeUID, requiredMoney);
                                                        } catch (feeErr) {
                                                                log.err("FEE_COLLECTOR", `Failed to credit $${requiredMoney} to ${feeUID}`, feeErr);
                                                        }
                                                }
                                        } catch (err) {
                                                log.err("MONEY", `Failed to deduct $${requiredMoney} from ${senderID}`, err);
                                        }
                                }
                                
                                log.info("CALL COMMAND", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
                        }
                        catch (err) {
                                log.err("CALL COMMAND", `An error occurred when calling the command ${commandName}`, err);
                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                        }
                }


                /*
                 +------------------------------------------------+
                 |                    ON CHAT                     |
                 +------------------------------------------------+
                */
                async function onChat() {
                        const allOnChat = GoatBot.onChat || [];
                        const args = body ? body.split(/ +/) : [];
                        for (const key of allOnChat) {
                                const command = GoatBot.commands.get(key);
                                if (!command)
                                        continue;
                                const commandName = command.config.name;

                                // —————————————— CHECK PERMISSION —————————————— //
                                const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                                const needRole = roleConfig.onChat;
                                if (!canUseCommand(role, needRole))
                                        continue;

                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                createMessageSyntaxError(commandName);

                                if (getType(command.onChat) == "Function") {
                                        const defaultOnChat = command.onChat;
                                        // convert to AsyncFunction
                                        command.onChat = async function () {
                                                return defaultOnChat(...arguments);
                                        };
                                }

                                command.onChat({
                                        ...parameters,
                                        isUserCallCommand,
                                        args,
                                        commandName,
                                        getLang: getText2
                                })
                                        .then(async (handler) => {
                                                if (typeof handler == "function") {
                                                        if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, replyMention, langCode))
                                                                return;
                                                        try {
                                                                await handler();
                                                                log.info("onChat", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
                                                        }
                                                        catch (err) {
                                                                await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred2", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                        }
                                                }
                                        })
                                        .catch(err => {
                                                log.err("onChat", `An error occurred when calling the command onChat ${commandName}`, err);
                                        });
                        }
                }


                /*
                 +------------------------------------------------+
                 |                   ON ANY EVENT                 |
                 +------------------------------------------------+
                */
                async function onAnyEvent() {
                        const allOnAnyEvent = GoatBot.onAnyEvent || [];
                        let args = [];
                        if (typeof event.body == "string" && event.body.startsWith(prefix))
                                args = event.body.split(/ +/);

                        for (const key of allOnAnyEvent) {
                                if (typeof key !== "string")
                                        continue;
                                const command = GoatBot.commands.get(key);
                                if (!command)
                                        continue;
                                const commandName = command.config.name;
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                createMessageSyntaxError(commandName);

                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, command);

                                if (getType(command.onAnyEvent) == "Function") {
                                        const defaultOnAnyEvent = command.onAnyEvent;
                                        // convert to AsyncFunction
                                        command.onAnyEvent = async function () {
                                                return defaultOnAnyEvent(...arguments);
                                        };
                                }

                                command.onAnyEvent({
                                        ...parameters,
                                        args,
                                        commandName,
                                        getLang: getText2
                                })
                                        .then(async (handler) => {
                                                if (typeof handler == "function") {
                                                        try {
                                                                await handler();
                                                                log.info("onAnyEvent", `${commandName} | ${senderID} | ${userData.name} | ${threadID}`);
                                                        }
                                                        catch (err) {
                                                                replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred7", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                                log.err("onAnyEvent", `An error occurred when calling the command onAnyEvent ${commandName}`, err);
                                                        }
                                                }
                                        })
                                        .catch(err => {
                                                log.err("onAnyEvent", `An error occurred when calling the command onAnyEvent ${commandName}`, err);
                                        });
                        }
                }

                /*
                 +------------------------------------------------+
                 |                  ON FIRST CHAT                 |
                 +------------------------------------------------+
                */
                async function onFirstChat() {
                                        // onFirstChat is now a Set of threadIDs that have been first chatted
                                        // Commands register themselves in GoatBot.onChat with a flag for firstChat
                                        if (GoatBot.onFirstChat.has(threadID))
                                                return;

                                        const args = body ? body.split(/ +/) : [];

                                        for (const commandName of GoatBot.onFirstChat._commandNames || []) {
                                                const command = GoatBot.commands.get(commandName);
                                                if (!command || !command.onFirstChat)
                                                        continue;

                                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                                createMessageSyntaxError(commandName);

                                                if (getType(command.onFirstChat) == "Function") {
                                                        const defaultOnFirstChat = command.onFirstChat;
                                                        // convert to AsyncFunction
                                                        command.onFirstChat = async function () {
                                                                return defaultOnFirstChat(...arguments);
                                                        };
                                                }

                                                command.onFirstChat({
                                                        ...parameters,
                                                        isUserCallCommand,
                                                        args,
                                                        commandName,
                                                        getLang: getText2
                                                })
                                                        .then(async (handler) => {
                                                                if (typeof handler == "function") {
                                                                        if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                                                                return;
                                                                        try {
                                                                                await handler();
                                                                                log.info("onFirstChat", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
                                                                        }
                                                                        catch (err) {
                                                                                await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred2", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                                        }
                                                                }
                                                        })
                                                        .catch(err => {
                                                                log.err("onFirstChat", `An error occurred when calling the command onFirstChat ${commandName}`, err);
                                                        });
                                        }

                                        // Mark this thread as having received first chat
                                        GoatBot.onFirstChat.add(threadID);
                }


                /* 
                 +------------------------------------------------+
                 |                    ON REPLY                    |
                 +------------------------------------------------+
                */
                async function onReply() {
                        if (!event.messageReply)
                                return;
                        const { onReply } = GoatBot;
                        const Reply = onReply.get(event.messageReply.messageID);
                        if (!Reply)
                                return;
                        Reply.delete = () => onReply.delete(messageID);
                        const commandName = Reply.commandName;
                        if (!commandName) {
                                replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommandName"));
                                return log.err("onReply", `Can't find command name to execute this reply!`, Reply);
                        }
                        const command = GoatBot.commands.get(commandName);
                        if (!command) {
                                replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommand", commandName));
                                return log.err("onReply", `Command "${commandName}" not found`, Reply);
                        }

                        // —————————————— CHECK PERMISSION —————————————— //
                        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                        const needRole = roleConfig.onReply;
                        if (!canUseCommand(role, needRole)) {
                                if (!hideNotiMessage.needRoleToUseCmdOnReply) {
                                        if (needRole == 1)
                                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminToUseOnReply", commandName));
                                        else if (needRole == 2)
                                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2ToUseOnReply", commandName));
                                        else if (needRole == 3)
                                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyPremium"));
                                        else if (needRole == 4)
                                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyDev"));
                                }
                                else {
                                        return true;
                                }
                        }

                        const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                        const time = getTime("DD/MM/YYYY HH:mm:ss");
                        try {
                                if (!command)
                                        throw new Error(`Cannot find command with commandName: ${commandName}`);
                                const args = body ? body.split(/ +/) : [];
                                createMessageSyntaxError(commandName);
                                if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, replyMention, langCode))
                                        return;
                                await command.onReply({
                                        ...parameters,
                                        Reply,
                                        args,
                                        commandName,
                                        getLang: getText2
                                });
                                log.info("onReply", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
                        }
                        catch (err) {
                                log.err("onReply", `An error occurred when calling the command onReply ${commandName}`, err);
                                await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred3", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                        }
                }


                /*
                 +------------------------------------------------+
                 |                   ON REACTION                  |
                 +------------------------------------------------+
                */
                async function onReaction() {
                        const { onReaction } = GoatBot;
                        const Reaction = onReaction.get(messageID);
                        const reaction = event.reaction;
                        
                        // Developer unsend reaction feature - works for any bot message
                        if ((reaction === "😡" || reaction === "😠") && role >= 4) {
                                try {
                                        await api.unsendMessage(messageID);
                                        if (Reaction) {
                                                onReaction.delete(messageID);
                                        }
                                        return;
                                } catch (err) {
                                        log.err("onReaction", "Failed to unsend message", err);
                                }
                        }
                        
                        if (!Reaction)
                                return;
                        Reaction.delete = () => onReaction.delete(messageID);
                        const commandName = Reaction.commandName;
                        if (!commandName) {
                                replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommandName"));
                                return log.err("onReaction", `Can't find command name to execute this reaction!`, Reaction);
                        }
                        const command = GoatBot.commands.get(commandName);
                        if (!command) {
                                replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommand", commandName));
                                return log.err("onReaction", `Command "${commandName}" not found`, Reaction);
                        }

                        // —————————————— CHECK PERMISSION —————————————— //
                        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                        const needRole = roleConfig.onReaction;
                        if (!canUseCommand(role, needRole)) {
                                if (!hideNotiMessage.needRoleToUseCmdOnReaction) {
                                        if (needRole == 1)
                                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminToUseOnReaction", commandName));
                                        else if (needRole == 2)
                                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2ToUseOnReaction", commandName));
                                        else if (needRole == 3)
                                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyPremium"));
                                        else if (needRole == 4)
                                                return await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyDev"));
                                }
                                else {
                                        return true;
                                }
                        }
                        // —————————————————————————————————————————————— //

                        const time = getTime("DD/MM/YYYY HH:mm:ss");
                        try {
                                if (!command)
                                        throw new Error(`Cannot find command with commandName: ${commandName}`);
                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                const args = [];
                                createMessageSyntaxError(commandName);
                                if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, replyMention, langCode))
                                        return;
                                await command.onReaction({
                                        ...parameters,
                                        Reaction,
                                        args,
                                        commandName,
                                        getLang: getText2
                                });
                                log.info("onReaction", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${event.reaction}`);
                        }
                        catch (err) {
                                log.err("onReaction", `An error occurred when calling the command onReaction ${commandName}`, err);
                                await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred4", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                        }
                }


                /*
                 +------------------------------------------------+
                 |                 EVENT COMMAND                  |
                 +------------------------------------------------+
                */
                async function handlerEvent() {
                        const { author } = event;
                        const allEventCommand = GoatBot.eventCommands.entries();
                        for (const [key] of allEventCommand) {
                                const getEvent = GoatBot.eventCommands.get(key);
                                if (!getEvent)
                                        continue;
                                const commandName = getEvent.config.name;
                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, getEvent);
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                try {
                                        const handler = await getEvent.onStart({
                                                ...parameters,
                                                commandName,
                                                getLang: getText2
                                        });
                                        if (typeof handler == "function") {
                                                await handler();
                                                log.info("EVENT COMMAND", `Event: ${commandName} | ${author} | ${userData.name} | ${threadID}`);
                                        }
                                }
                                catch (err) {
                                        log.err("EVENT COMMAND", `An error occurred when calling the command event ${commandName}`, err);
                                        await replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred5", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                }
                        }
                }


                /*
                 +------------------------------------------------+
                 |                    ON EVENT                    |
                 +------------------------------------------------+
                */
                async function onEvent() {
                        const allOnEvent = GoatBot.onEvent || [];
                        const args = [];
                        const { author } = event;
                        for (const key of allOnEvent) {
                                if (typeof key !== "string")
                                        continue;
                                const command = GoatBot.commands.get(key);
                                if (!command)
                                        continue;
                                const commandName = command.config.name;
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                createMessageSyntaxError(commandName);

                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, command);

                                if (getType(command.onEvent) == "Function") {
                                        const defaultOnEvent = command.onEvent;
                                        // convert to AsyncFunction
                                        command.onEvent = async function () {
                                                return defaultOnEvent(...arguments);
                                        };
                                }

                                command.onEvent({
                                        ...parameters,
                                        args,
                                        commandName,
                                        getLang: getText2
                                })
                                        .then(async (handler) => {
                                                if (typeof handler == "function") {
                                                        try {
                                                                await handler();
                                                                log.info("onEvent", `${commandName} | ${author} | ${userData.name} | ${threadID}`);
                                                        }
                                                        catch (err) {
                                                                replyMention(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred6", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                                log.err("onEvent", `An error occurred when calling the command onEvent ${commandName}`, err);
                                                        }
                                                }
                                        })
                                        .catch(err => {
                                                log.err("onEvent", `An error occurred when calling the command onEvent ${commandName}`, err);
                                        });
                        }
                }

                /*
                 +------------------------------------------------+
                 |                    PRESENCE                    |
                 +------------------------------------------------+
                */
                async function presence() {
                        // Your code here
                }

                /*
                 +------------------------------------------------+
                 |                  READ RECEIPT                  |
                 +------------------------------------------------+
                */
                async function read_receipt() {
                        // Your code here
                }

                /*
                 +------------------------------------------------+
                 |                               TYP                            |
                 +------------------------------------------------+
                */
                async function typ() {
                        // Your code here
                }

                return {
                        onAnyEvent,
                        onFirstChat,
                        onChat,
                        onStart,
                        onReaction,
                        onReply,
                        onEvent,
                        handlerEvent,
                        presence,
                        read_receipt,
                        typ
                };
        };
};
