const fs = require("fs-extra");
const path = require("path");
const EventEmitter = require("events");

const STATE_FILE = path.join(process.cwd(), "sifu_database", "account_state.json");

const FAIL_TYPE = {
    CHECKPOINT:  "checkpoint",
    SUSPENDED:   "suspended",
    RATE_LIMIT:  "rateLimit",
    MSG_BLOCK:   "msgBlock",
    MQTT_DEAD:   "mqttDead",
    LOGIN_FAIL:  "loginFail",
    TIMEOUT:     "timeout",
    UNKNOWN:     "unknown",
};

const FAIL_PENALTY = {
    [FAIL_TYPE.CHECKPOINT]:  45,
    [FAIL_TYPE.SUSPENDED]:   100,
    [FAIL_TYPE.RATE_LIMIT]:  25,
    [FAIL_TYPE.MSG_BLOCK]:   35,
    [FAIL_TYPE.MQTT_DEAD]:   15,
    [FAIL_TYPE.LOGIN_FAIL]:  40,
    [FAIL_TYPE.TIMEOUT]:     10,
    [FAIL_TYPE.UNKNOWN]:     30,
};

const FAIL_COOLDOWN_MS = {
    [FAIL_TYPE.CHECKPOINT]:  10 * 60 * 1000,
    [FAIL_TYPE.SUSPENDED]:   60 * 60 * 1000,
    [FAIL_TYPE.RATE_LIMIT]:  8  * 60 * 1000,
    [FAIL_TYPE.MSG_BLOCK]:   20 * 60 * 1000,
    [FAIL_TYPE.MQTT_DEAD]:   2  * 60 * 1000,
    [FAIL_TYPE.LOGIN_FAIL]:  15 * 60 * 1000,
    [FAIL_TYPE.TIMEOUT]:     1  * 60 * 1000,
    [FAIL_TYPE.UNKNOWN]:     3  * 60 * 1000,
};

const LOCK_ON_FAIL = new Set([FAIL_TYPE.SUSPENDED, FAIL_TYPE.CHECKPOINT]);

const PRIORITY = { PRIMARY: 0, NORMAL: 1, BACKUP: 2 };

const HEALTH = {
    MAX: 100,
    MIN: 0,
    DEAD_THRESHOLD:       10,
    REWARD_SUCCESS:       15,
    REWARD_RECOVER:       25,
    DECAY_PER_HOUR:       3,
    DECAY_IDLE_MS:        30 * 60 * 1000,
    RECOVERY_AFTER_MS:    25 * 60 * 1000,
    RECOVERY_INTERVAL_MS: 5  * 60 * 1000,
};

const SWITCH_COOLDOWN_MS = 20000;
const WATCHDOG_DEAD_THRESHOLD = 2;
const MAX_HISTORY = 20;
const MAX_MSG_RATE_WINDOW_MS = 60 * 60 * 1000;

function classifyFailure(reason = "") {
    const r = reason.toLowerCase();
    if (r.includes("checkpoint") || r.includes("captcha") || r.includes("confirm identity")) return FAIL_TYPE.CHECKPOINT;
    if (r.includes("suspend") || r.includes("disabled") || r.includes("banned"))              return FAIL_TYPE.SUSPENDED;
    if (r.includes("action blocked") || r.includes("msg block") || r.includes("message block") ||
        r.includes("temporarily blocked") || r.includes("couldn't send") ||
        r.includes("message delivery failed"))                                                 return FAIL_TYPE.MSG_BLOCK;
    if (r.includes("rate") || r.includes("too many") || r.includes("flood") || r.includes("spam")) return FAIL_TYPE.RATE_LIMIT;
    if (r.includes("mqtt") || r.includes("connection") || r.includes("disconnected"))         return FAIL_TYPE.MQTT_DEAD;
    if (r.includes("login") || r.includes("cookie") || r.includes("appstate") || r.includes("invalid")) return FAIL_TYPE.LOGIN_FAIL;
    if (r.includes("timeout") || r.includes("timed out"))                                     return FAIL_TYPE.TIMEOUT;
    return FAIL_TYPE.UNKNOWN;
}

class MultiAccountManager extends EventEmitter {
    constructor() {
        super();
        this.accounts = [];
        this.currentIndex = 0;
        this.isSwitching = false;
        this.switchCount = 0;
        this.lastSwitchTime = 0;

        this.health = {};
        this.failCount = {};
        this.failType = {};
        this.failReason = {};
        this.lastFailTime = {};
        this.accountCooldown = {};
        this.lockedAccounts = new Set();

        this.priority = {};

        this.sessionStart = {};
        this.totalUptimeMs = {};
        this.sessionCount = {};

        this.msgSent = {};
        this.msgFailed = {};
        this.msgTimestamps = {};

        this.switchHistory = [];

        this._watchdogDeadCount = 0;
        this._watchdogInterval = null;
        this._recoveryInterval = null;
        this._decayInterval = null;
        this._rotationInterval = null;

        this.emergencyMode = false;
        this.emergencyRetryCount = 0;

        this.singleAccountRetryCount = 0;
    }

    _hasValidContent(filePath) {
        try {
            const txt = fs.readFileSync(filePath, "utf8").trim();
            if (!txt) return false;
            return txt.split("\n").some(l => { const t = l.trim(); return t && !t.startsWith("#"); });
        } catch { return false; }
    }

    scanAccounts() {
        const baseDir = process.cwd();
        const accDir = path.join(baseDir, "accounts");
        this.accounts = [];
        fs.ensureDirSync(accDir);

        if (process.env.GOAT_MULTIBOT_MODE === "1" && process.env.GOAT_BOT_ACCOUNT_FILE) {
            const f = process.env.GOAT_BOT_ACCOUNT_FILE;
            if (fs.existsSync(f)) this.accounts.push(f);
            if (this.accounts.length > 0) {
                this._initNewAccounts();
                this._loadState();
                return this.accounts.length;
            }
        }

        const primary = path.join(accDir, "account.txt");
        if (fs.existsSync(primary) && this._hasValidContent(primary)) this.accounts.push(primary);

        for (let i = 2; ; i++) {
            const f = path.join(accDir, `account${i}.txt`);
            if (fs.existsSync(f)) { if (this._hasValidContent(f)) this.accounts.push(f); }
            else break;
        }

        const pJson = path.join(accDir, "account.json");
        if (fs.existsSync(pJson) && !this.accounts.includes(pJson) && this._hasValidContent(pJson))
            this.accounts.push(pJson);

        for (let j = 2; ; j++) {
            const f = path.join(accDir, `account${j}.json`);
            if (!fs.existsSync(f)) break;
            if (!this.accounts.includes(f) && this._hasValidContent(f)) this.accounts.push(f);
        }

        if (this.accounts.length === 0) {
            const legacy = path.join(baseDir, "account.txt");
            if (fs.existsSync(legacy) && this._hasValidContent(legacy)) {
                this._log("warn", "account.txt found in root — please move to accounts/ folder");
                this.accounts.push(legacy);
            }
        }

        this._initNewAccounts();
        this._loadState();
        this._applyPreferred();

        if (this.accounts.length === 0) {
            this._log("warn", "No account files found!");
        } else {
            this._log("info", `Found ${this.accounts.length} account(s): ${this.accounts.map(a => path.basename(a)).join(", ")}`);
            this._log("info", `Health: ${this.accounts.map(a => `${path.basename(a)}=${this.health[a]}`).join(", ")}`);
        }

        this._startRecoveryChecker();
        this._startDecayChecker();
        return this.accounts.length;
    }

    _applyPreferred() {
        try {
            const prefFile = path.join(process.cwd(), "accounts", "preferred.json");
            if (!fs.existsSync(prefFile)) return;
            const pref = fs.readJsonSync(prefFile);
            if (!pref || pref.kind !== "cookie" || !pref.value) return;
            const accDir = path.join(process.cwd(), "accounts");
            const target = path.join(accDir, path.basename(pref.value));
            const idx = this.accounts.indexOf(target);
            if (idx !== -1) {
                this.currentIndex = idx;
                this._log("info", `preferred.json: starting with ${path.basename(target)} (index ${idx})`);
                fs.removeSync(prefFile);
            } else {
                this._log("warn", `preferred.json: ${pref.value} not found in account list — ignored`);
            }
        } catch (e) {
            this._log("warn", `Could not apply preferred.json: ${e.message}`);
        }
    }

    _initNewAccounts() {
        for (const acc of this.accounts) {
            if (this.health[acc]        === undefined) this.health[acc]        = HEALTH.MAX;
            if (this.failCount[acc]     === undefined) this.failCount[acc]     = 0;
            if (this.totalUptimeMs[acc] === undefined) this.totalUptimeMs[acc] = 0;
            if (this.sessionCount[acc]  === undefined) this.sessionCount[acc]  = 0;
            if (this.msgSent[acc]       === undefined) this.msgSent[acc]       = 0;
            if (this.msgFailed[acc]     === undefined) this.msgFailed[acc]     = 0;
            if (this.msgTimestamps[acc] === undefined) this.msgTimestamps[acc] = [];
            if (this.priority[acc]      === undefined) this.priority[acc]      = PRIORITY.NORMAL;
        }
    }

    _loadState() {
        try {
            if (!fs.existsSync(STATE_FILE)) return;
            const raw = fs.readJsonSync(STATE_FILE);
            const load = (src, dest, clamp = false) => {
                if (!src) return;
                for (const [acc, val] of Object.entries(src)) {
                    if (this.accounts.includes(acc))
                        dest[acc] = clamp ? Math.max(HEALTH.MIN, Math.min(HEALTH.MAX, val)) : val;
                }
            };
            load(raw.health,        this.health, true);
            load(raw.failCount,     this.failCount);
            load(raw.failType,      this.failType);
            load(raw.failReason,    this.failReason);
            load(raw.lastFailTime,  this.lastFailTime);
            load(raw.totalUptimeMs, this.totalUptimeMs);
            load(raw.sessionCount,  this.sessionCount);
            load(raw.msgSent,       this.msgSent);
            load(raw.msgFailed,     this.msgFailed);
            load(raw.priority,      this.priority);

            if (Array.isArray(raw.lockedAccounts))
                raw.lockedAccounts.forEach(acc => { if (this.accounts.includes(acc)) this.lockedAccounts.add(acc); });

            if (typeof raw.currentIndex === "number" && raw.currentIndex < this.accounts.length)
                this.currentIndex = raw.currentIndex;
            if (typeof raw.switchCount === "number") this.switchCount = raw.switchCount;
            if (Array.isArray(raw.switchHistory)) this.switchHistory = raw.switchHistory.slice(-MAX_HISTORY);

            this._log("info", "Loaded persistent account state");
        } catch (e) {
            this._log("warn", `Could not load state: ${e.message}`);
        }
    }

    _saveState() {
        try {
            fs.ensureDirSync(path.dirname(STATE_FILE));
            fs.writeJsonSync(STATE_FILE, {
                health:         this.health,
                failCount:      this.failCount,
                failType:       this.failType,
                failReason:     this.failReason,
                lastFailTime:   this.lastFailTime,
                totalUptimeMs:  this.totalUptimeMs,
                sessionCount:   this.sessionCount,
                msgSent:        this.msgSent,
                msgFailed:      this.msgFailed,
                priority:       this.priority,
                lockedAccounts: Array.from(this.lockedAccounts),
                currentIndex:   this.currentIndex,
                switchCount:    this.switchCount,
                switchHistory:  this.switchHistory.slice(-MAX_HISTORY),
                savedAt:        new Date().toISOString(),
            }, { spaces: 2 });
        } catch (e) {
            this._log("warn", `Could not save state: ${e.message}`);
        }
    }

    _setHealth(acc, score) {
        this.health[acc] = Math.max(HEALTH.MIN, Math.min(HEALTH.MAX, score));
    }

    getCompositeScore(acc) {
        const h = this.health[acc] ?? HEALTH.MAX;
        const sent   = (this.msgSent[acc]   || 0);
        const failed = (this.msgFailed[acc] || 0);
        const total  = sent + failed;
        const successRate = total > 0 ? (sent / total) * 100 : 100;
        const priorityBonus = ((2 - (this.priority[acc] ?? PRIORITY.NORMAL)) / 2) * 100;
        return (h * 0.6) + (successRate * 0.25) + (priorityBonus * 0.15);
    }

    penalizeAccount(acc, reason = "unknown", failTypeOverride = null) {
        if (!acc) acc = this.getCurrentAccount();
        if (!acc) return;

        const fType   = failTypeOverride || classifyFailure(reason);
        const penalty = FAIL_PENALTY[fType]      ?? FAIL_PENALTY[FAIL_TYPE.UNKNOWN];
        const cdMs    = FAIL_COOLDOWN_MS[fType]  ?? FAIL_COOLDOWN_MS[FAIL_TYPE.UNKNOWN];

        this._setHealth(acc, (this.health[acc] || HEALTH.MAX) - penalty);
        this.failCount[acc]    = (this.failCount[acc] || 0) + 1;
        this.failType[acc]     = fType;
        this.failReason[acc]   = reason;
        this.lastFailTime[acc] = Date.now();
        this.accountCooldown[acc] = Date.now() + cdMs;
        this.msgFailed[acc]    = (this.msgFailed[acc] || 0) + 1;

        if (LOCK_ON_FAIL.has(fType)) this.lockAccount(acc, `Auto-locked: ${fType}`);

        this._saveState();
        this._log("warn", `Penalized ${path.basename(acc)} [${fType}] → health=${this.health[acc]} | ${reason}`);
    }

    rewardAccount(acc) {
        if (!acc) acc = this.getCurrentAccount();
        if (!acc) return;
        if ((this.health[acc] || 0) < HEALTH.MAX) {
            this._setHealth(acc, (this.health[acc] || 0) + HEALTH.REWARD_SUCCESS);
            if (this.health[acc] >= HEALTH.MAX) this.failCount[acc] = 0;
        }
    }

    markCurrentAsWorking() {
        const acc = this.getCurrentAccount();
        if (!acc) return;
        const wasLow = (this.health[acc] || 0) < 50;
        this._setHealth(acc, (this.health[acc] || 0) + HEALTH.REWARD_RECOVER);
        this.accountCooldown[acc] = 0;
        this.singleAccountRetryCount = 0;
        this._watchdogDeadCount = 0;
        if (wasLow) {
            this._log("info", `${path.basename(acc)} recovered → health=${this.health[acc]}`);
            this.emit("recovered", acc);
        }
        this._saveState();
    }

    boostAccount(acc, amount = 20) {
        if (!acc) return;
        this._setHealth(acc, (this.health[acc] || 0) + amount);
        this._saveState();
        this._log("info", `Boosted ${path.basename(acc)} +${amount} → health=${this.health[acc]}`);
    }

    recordSendSuccess(acc) {
        if (!acc) acc = this.getCurrentAccount();
        if (!acc) return;
        this.msgSent[acc] = (this.msgSent[acc] || 0) + 1;
        if (!this.msgTimestamps[acc]) this.msgTimestamps[acc] = [];
        const now = Date.now();
        this.msgTimestamps[acc].push(now);

        this.msgTimestamps[acc] = this.msgTimestamps[acc].filter(t => now - t <= MAX_MSG_RATE_WINDOW_MS);
    }

    recordSendFail(acc) {
        if (!acc) acc = this.getCurrentAccount();
        if (!acc) return;
        this.msgFailed[acc] = (this.msgFailed[acc] || 0) + 1;
    }

    getMsgRatePerHour(acc) {
        if (!this.msgTimestamps[acc]) return 0;
        const now = Date.now();
        const recent = this.msgTimestamps[acc].filter(t => now - t <= MAX_MSG_RATE_WINDOW_MS);
        this.msgTimestamps[acc] = recent;
        return recent.length;
    }

    getSuccessRate(acc) {
        const sent   = this.msgSent[acc]   || 0;
        const failed = this.msgFailed[acc] || 0;
        const total  = sent + failed;
        return total > 0 ? Math.round((sent / total) * 100) : 100;
    }

    lockAccount(acc, reason = "manual") {
        if (!acc) return;
        this.lockedAccounts.add(acc);
        this._setHealth(acc, 0);
        this._log("warn", `🔒 LOCKED: ${path.basename(acc)} — ${reason}`);
        this.emit("locked", { acc, reason });
        this._saveState();
    }

    unlockAccount(acc) {
        if (!acc) return;
        this.lockedAccounts.delete(acc);
        this._setHealth(acc, 50);
        this.accountCooldown[acc] = 0;
        this._log("info", `🔓 UNLOCKED: ${path.basename(acc)}`);
        this.emit("unlocked", acc);
        this._saveState();
    }

    isLocked(acc) { return this.lockedAccounts.has(acc); }

    setPriority(acc, level) {
        if (!acc || ![0, 1, 2].includes(level)) return;
        this.priority[acc] = level;
        this._saveState();
        const labels = ["PRIMARY", "NORMAL", "BACKUP"];
        this._log("info", `Priority set: ${path.basename(acc)} → ${labels[level]}`);
    }

    clearCooldown(acc) {
        if (!acc) return;
        this.accountCooldown[acc] = 0;
        this._saveState();
        this._log("info", `Cooldown cleared: ${path.basename(acc)}`);
    }

    _startSession(acc) {
        if (!acc) return;
        this.sessionStart[acc]  = Date.now();
        this.sessionCount[acc]  = (this.sessionCount[acc] || 0) + 1;
    }

    _endSession(acc) {
        if (!acc || !this.sessionStart[acc]) return;
        this.totalUptimeMs[acc] = (this.totalUptimeMs[acc] || 0) + (Date.now() - this.sessionStart[acc]);
        delete this.sessionStart[acc];
    }

    _formatUptime(ms) {
        if (!ms || ms <= 0) return "0m";
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    getCurrentAccount() {
        if (this.accounts.length === 0) this.scanAccounts();
        if (this.currentIndex >= this.accounts.length) this.currentIndex = 0;
        return this.accounts[this.currentIndex] || null;
    }

    selectBestAccount(excludeCurrent = true) {
        const now     = Date.now();
        const current = this.getCurrentAccount();

        let candidates = this.accounts.filter(acc => {
            if (excludeCurrent && acc === current) return false;
            if (this.isLocked(acc)) return false;
            return true;
        });
        if (candidates.length === 0) return null;

        const ready = candidates.filter(acc => !this.accountCooldown[acc] || now >= this.accountCooldown[acc]);
        const pool  = ready.length > 0 ? ready : candidates;

        pool.sort((a, b) => this.getCompositeScore(b) - this.getCompositeScore(a));
        return pool[0] || null;
    }

    nextAccount() {
        const prev = this.getCurrentAccount();
        this._endSession(prev);
        this.currentIndex = (this.currentIndex + 1) % this.accounts.length;
        this.switchCount++;
        this.lastSwitchTime = Date.now();
        const next = this.getCurrentAccount();
        this._startSession(next);
        this._recordHistory(prev, next, "round-robin");
        this._log("info", `Switched ${path.basename(prev)} → ${path.basename(next)} (#${this.switchCount})`);
        this._saveState();
        return next;
    }

    switchToIndex(index) {
        if (index < 0 || index >= this.accounts.length) return null;
        const prev = this.getCurrentAccount();
        this._endSession(prev);
        this.currentIndex = index;
        this.switchCount++;
        this.lastSwitchTime = Date.now();
        const next = this.getCurrentAccount();
        this._startSession(next);
        this._recordHistory(prev, next, "manual");
        this._log("info", `Manual switch ${path.basename(prev)} → ${path.basename(next)} (#${this.switchCount})`);
        this._saveState();
        return next;
    }

    switchToBest() {
        const best = this.selectBestAccount(true);
        if (!best) return null;
        const idx = this.accounts.indexOf(best);
        return idx === -1 ? null : this.switchToIndex(idx);
    }

    _recordHistory(fromAcc, toAcc, trigger = "auto") {
        this.switchHistory.push({
            time:     Date.now(),
            from:     fromAcc ? path.basename(fromAcc) : "?",
            to:       toAcc   ? path.basename(toAcc)   : "?",
            trigger,
            reason:   fromAcc ? (this.failReason[fromAcc] || null) : null,
            failType: fromAcc ? (this.failType[fromAcc]   || null) : null,
        });
        if (this.switchHistory.length > MAX_HISTORY)
            this.switchHistory = this.switchHistory.slice(-MAX_HISTORY);
    }

    getHistory() { return this.switchHistory.slice().reverse(); }

    async validateCookie(accPath) {
        try {
            const raw = fs.readFileSync(accPath, "utf8").trim();
            if (!raw) return { valid: false, reason: "empty file" };

            let cookies;
            try { cookies = JSON.parse(raw); }
            catch {
                const lines = raw.split("\n").filter(l => l.trim() && !l.startsWith("#"));
                return lines.length > 0 ? { valid: true, reason: "plaintext" } : { valid: false, reason: "no valid lines" };
            }

            if (!Array.isArray(cookies) || cookies.length === 0)
                return { valid: false, reason: "empty array" };

            const keys      = cookies.map(c => c.key || c.name || "").filter(Boolean);
            const hasUser   = keys.some(k => k === "c_user");
            const hasXS     = keys.some(k => k === "xs");
            const hasDatr   = keys.some(k => k === "datr");

            if (!hasUser) return { valid: false, reason: "missing c_user" };
            if (!hasXS)   return { valid: false, reason: "missing xs" };
            if (!hasDatr) return { valid: false, reason: "missing datr" };

            const now     = Date.now() / 1000;
            const expired = cookies.filter(c => c.expirationDate && c.expirationDate < now);
            if (expired.length > cookies.length * 0.5)
                return { valid: false, reason: `${expired.length} cookies expired` };

            return { valid: true, reason: "ok" };
        } catch (e) {
            return { valid: false, reason: e.message };
        }
    }

    async validateAllCookies() {
        const results = {};
        for (const acc of this.accounts) results[acc] = await this.validateCookie(acc);
        return results;
    }

    canSwitch() {
        if (this.isSwitching) return false;
        const elapsed = Date.now() - this.lastSwitchTime;
        if (this.lastSwitchTime > 0 && elapsed < SWITCH_COOLDOWN_MS) {
            this._log("warn", `Switch cooldown: ${Math.ceil((SWITCH_COOLDOWN_MS - elapsed) / 1000)}s remaining`);
            return false;
        }
        return true;
    }

    hasMoreAccounts()  { return this.selectBestAccount(true) !== null; }
    isSingleAccount()  { return this.accounts.length <= 1; }

    allAccountsDead() {
        return this.accounts.filter(acc => !this.isLocked(acc) && (this.health[acc] || 0) > HEALTH.DEAD_THRESHOLD).length === 0;
    }

    enterEmergencyMode() {
        if (this.emergencyMode) return;
        this.emergencyMode = true;
        this.emergencyRetryCount = 0;
        this._log("warn", "🚨 EMERGENCY MODE: all accounts dead");
        this.emit("emergency", { accounts: this.accounts.map(a => path.basename(a)) });
    }

    exitEmergencyMode() {
        if (!this.emergencyMode) return;
        this.emergencyMode = false;
        this.emergencyRetryCount = 0;
        this._log("info", "✅ Emergency mode resolved");
        this.emit("emergencyResolved");
    }

    getEmergencyRetryDelay() {
        const delay = Math.min(30000 * Math.pow(1.5, this.emergencyRetryCount), 10 * 60 * 1000);
        this.emergencyRetryCount++;
        return delay;
    }

    emergencyRevive() {
        const low = this.accounts
            .filter(acc => !this.isLocked(acc))
            .sort((a, b) => (this.health[b] || 0) - (this.health[a] || 0));
        if (low.length > 0) {
            this._setHealth(low[0], 30);
            this.accountCooldown[low[0]] = 0;
            this._saveState();
            return low[0];
        }
        const locked = this.accounts
            .filter(acc => this.isLocked(acc) && this.failType[acc] !== FAIL_TYPE.SUSPENDED)
            .sort((a, b) => (this.failCount[a] || 0) - (this.failCount[b] || 0));
        if (locked.length > 0) { this.unlockAccount(locked[0]); return locked[0]; }
        return null;
    }

    _startRecoveryChecker() {
        if (this._recoveryInterval) clearInterval(this._recoveryInterval);
        this._recoveryInterval = setInterval(() => {
            const now = Date.now();
            let recovered = [];
            for (const acc of this.accounts) {
                if (this.isLocked(acc)) continue;
                const t = this.lastFailTime[acc];
                const h = this.health[acc] || HEALTH.MAX;
                if (t && h < 50 && (now - t) >= HEALTH.RECOVERY_AFTER_MS) {
                    this._setHealth(acc, Math.min(HEALTH.MAX, h + HEALTH.REWARD_RECOVER));
                    this.accountCooldown[acc] = 0;
                    recovered.push(path.basename(acc));
                    this._log("info", `Auto-recovery: ${path.basename(acc)} → health=${this.health[acc]}`);
                }
            }
            if (recovered.length > 0) {
                this._saveState();
                this.emit("autoRecovered", recovered);
                if (this.emergencyMode) this.exitEmergencyMode();
            }
        }, HEALTH.RECOVERY_INTERVAL_MS);
        this._recoveryInterval.unref?.();
    }

    _startDecayChecker() {
        if (this._decayInterval) clearInterval(this._decayInterval);
        this._decayInterval = setInterval(() => {
            const now = Date.now();
            let changed = false;
            for (const acc of this.accounts) {
                if (this.isLocked(acc) || acc === this.getCurrentAccount()) continue;
                const lastEvent = Math.max(this.lastFailTime[acc] || 0, this.sessionStart[acc] || 0);
                if (lastEvent > 0 && (now - lastEvent) > HEALTH.DECAY_IDLE_MS) {
                    const h = this.health[acc] || HEALTH.MAX;
                    if (h > 50) { this._setHealth(acc, h - HEALTH.DECAY_PER_HOUR); changed = true; }
                }
            }
            if (changed) this._saveState();
        }, 60 * 60 * 1000);
        this._decayInterval.unref?.();
    }

    startProactiveRotation(intervalMs = 6 * 60 * 60 * 1000, onRotate) {
        if (this._rotationInterval) clearInterval(this._rotationInterval);
        this._rotationInterval = setInterval(async () => {
            if (this.isSwitching || this.isSingleAccount()) return;
            const best = this.selectBestAccount(true);
            if (!best) return;
            const curScore  = this.getCompositeScore(this.getCurrentAccount());
            const bestScore = this.getCompositeScore(best);
            if (bestScore > curScore + 15) {
                this._log("info", `Proactive rotation: ${path.basename(this.getCurrentAccount())} → ${path.basename(best)}`);
                this.emit("proactiveRotation", { from: this.getCurrentAccount(), to: best });
                if (typeof onRotate === "function") await onRotate(best);
            }
        }, intervalMs);
        this._rotationInterval.unref?.();
        this._log("info", `Proactive rotation started (every ${intervalMs / 3600000}h)`);
    }

    stopProactiveRotation() {
        if (this._rotationInterval) { clearInterval(this._rotationInterval); this._rotationInterval = null; }
    }

    startWatchdog(intervalMs = 5 * 60 * 1000, onDead) {
        if (this._watchdogInterval) clearInterval(this._watchdogInterval);
        this._watchdogDeadCount = 0;

        this._watchdogInterval = setInterval(async () => {
            try {
                const api = global.GoatBot?.fcaApi;
                if (!api) return;
                let isDead = false;

                if (typeof api.getHealthStatus === "function") {
                    const h = api.getHealthStatus();
                    if (h?.mqtt?.connected === false) isDead = true;
                }
                if (global.statusAccountBot && global.statusAccountBot !== "good") isDead = true;

                if (isDead) {
                    this._watchdogDeadCount++;
                    this._log("warn", `🔴 Watchdog dead (${this._watchdogDeadCount}/${WATCHDOG_DEAD_THRESHOLD})`);
                    if (this._watchdogDeadCount >= WATCHDOG_DEAD_THRESHOLD) {
                        this._watchdogDeadCount = 0;
                        this.penalizeAccount(this.getCurrentAccount(), "Watchdog: MQTT dead", FAIL_TYPE.MQTT_DEAD);
                        this.emit("watchdogDead", this.getCurrentAccount());
                        if (typeof onDead === "function") await onDead();
                    }
                } else {
                    this._watchdogDeadCount = 0;
                    this.rewardAccount(this.getCurrentAccount());
                }
            } catch (e) {
                this._log("warn", `Watchdog error: ${e.message}`);
            }
        }, intervalMs);

        this._watchdogInterval.unref?.();
        this._log("info", `Watchdog started (${intervalMs / 60000}min interval, threshold=${WATCHDOG_DEAD_THRESHOLD})`);
    }

    stopWatchdog() {
        if (this._watchdogInterval) { clearInterval(this._watchdogInterval); this._watchdogInterval = null; }
        this._watchdogDeadCount = 0;
    }

    resetFailedAccounts() {
        for (const acc of this.accounts) {
            this._setHealth(acc, HEALTH.MAX);
            this.failCount[acc]      = 0;
            this.accountCooldown[acc] = 0;
            this.lockedAccounts.delete(acc);
        }
        this._saveState();
        this._log("info", "All account health reset to 100, all locks cleared");
    }

    getAvailableAccounts() {
        const now = Date.now();
        return this.accounts.filter(acc =>
            !this.isLocked(acc) &&
            (this.health[acc] || HEALTH.MAX) > HEALTH.DEAD_THRESHOLD &&
            (!this.accountCooldown[acc] || now >= this.accountCooldown[acc])
        );
    }

    getRetryDelay(attemptCount) {
        return Math.min(30000 * Math.pow(1.5, attemptCount), 300000);
    }

    getStats() {
        const current = this.getCurrentAccount();
        const now     = Date.now();
        return {
            totalAccounts:  this.accounts.length,
            currentIndex:   this.currentIndex,
            currentAccount: current ? path.basename(current) : null,
            switchCount:    this.switchCount,
            isSwitching:    this.isSwitching,
            canSwitch:      this.canSwitch(),
            emergencyMode:  this.emergencyMode,
            singleAccountRetryCount: this.singleAccountRetryCount,
            accounts: this.accounts.map((acc, i) => {
                const cdLeft     = this.accountCooldown[acc] ? Math.max(0, this.accountCooldown[acc] - now) : 0;
                const sessionMs  = this.sessionStart[acc] ? (now - this.sessionStart[acc]) : 0;
                const totalMs    = (this.totalUptimeMs[acc] || 0) + sessionMs;
                const priLabels  = ["PRIMARY", "NORMAL", "BACKUP"];
                return {
                    index:            i + 1,
                    name:             path.basename(acc),
                    path:             acc,
                    health:           this.health[acc] ?? HEALTH.MAX,
                    score:            Math.round(this.getCompositeScore(acc)),
                    failCount:        this.failCount[acc]    ?? 0,
                    failType:         this.failType[acc]     || null,
                    failReason:       this.failReason[acc]   || null,
                    priority:         this.priority[acc]     ?? PRIORITY.NORMAL,
                    priorityLabel:    priLabels[this.priority[acc] ?? PRIORITY.NORMAL],
                    isCurrent:        acc === current,
                    isLocked:         this.isLocked(acc),
                    onCooldown:       cdLeft > 0,
                    cooldownSecsLeft: Math.ceil(cdLeft / 1000),
                    isDead:           (this.health[acc] ?? HEALTH.MAX) <= HEALTH.DEAD_THRESHOLD,
                    sessionCount:     this.sessionCount[acc]  || 0,
                    totalUptime:      this._formatUptime(totalMs),
                    totalUptimeMs:    totalMs,
                    currentSessionMs: sessionMs,
                    msgSent:          this.msgSent[acc]       || 0,
                    msgFailed:        this.msgFailed[acc]     || 0,
                    successRate:      this.getSuccessRate(acc),
                    msgRatePerHour:   this.getMsgRatePerHour(acc),
                };
            }),
        };
    }

    getAccountDetail(accPath) {
        if (!this.accounts.includes(accPath)) return null;
        const stats = this.getStats();
        return stats.accounts.find(a => a.path === accPath) || null;
    }

    _log(level, msg) {
        try {
            if (global.utils?.log?.[level]) global.utils.log[level]("MULTI_ACCOUNT", msg);
            else console.log(`[MULTI_ACCOUNT] [${level.toUpperCase()}] ${msg}`);
        } catch { console.log(`[MULTI_ACCOUNT] ${msg}`); }
    }
}

const multiAccountManager = new MultiAccountManager();
module.exports = multiAccountManager;
module.exports.classifyFailure = classifyFailure;
module.exports.FAIL_TYPE       = FAIL_TYPE;
module.exports.PRIORITY        = PRIORITY;
