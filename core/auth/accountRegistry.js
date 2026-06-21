"use strict";

const fs = require("fs-extra");
const path = require("path");
const EventEmitter = require("events");

function _log(level, msg) {
    try {
        if (global.utils?.log?.[level]) global.utils.log[level]("ACCOUNT_REGISTRY", msg);
        else console.log(`[ACCOUNT_REGISTRY] [${level.toUpperCase()}] ${msg}`);
    } catch { console.log(`[ACCOUNT_REGISTRY] ${msg}`); }
}

const MAX_ACCOUNTS = 10;
const BASE_RETRY_DELAY_MS = 30_000;
const MAX_RETRY_DELAY_MS = 600_000;
const MIN_SWITCH_INTERVAL_MS = 20_000;
const HEALTH_DECAY_INTERVAL_MS = 60_000;
const RECOVERY_CHECK_INTERVAL_MS = 300_000;
const CIRCUIT_OPEN_THRESHOLD = 3;
const CIRCUIT_HALF_OPEN_TIMEOUT_MS = 120_000;
const PERIODIC_RESCAN_INTERVAL_MS = 3 * 60_000;

const CircuitState = Object.freeze({ CLOSED: "CLOSED", OPEN: "OPEN", HALF_OPEN: "HALF_OPEN" });

class AccountHealth {
    constructor(filePath) {
        this.filePath = filePath;
        this.name = path.basename(filePath);
        this.score = 100;
        this.failureCount = 0;
        this.successCount = 0;
        this.consecutiveFailures = 0;
        this.lastFailureTime = 0;
        this.lastSuccessTime = 0;
        this.lastSwitchedAway = 0;
        this.circuitState = CircuitState.CLOSED;
        this.circuitOpenedAt = 0;
        this.totalSwitches = 0;
        this.errors = [];
    }

    recordSuccess() {
        this.successCount++;
        this.consecutiveFailures = 0;
        this.lastSuccessTime = Date.now();
        this.score = Math.min(100, this.score + 10);
        if (this.circuitState === CircuitState.HALF_OPEN) {
            this.circuitState = CircuitState.CLOSED;
            _log("info", `Circuit CLOSED for ${this.name} after successful probe`);
        }
    }

    recordFailure(reason = "unknown") {
        this.failureCount++;
        this.consecutiveFailures++;
        this.lastFailureTime = Date.now();
        this.score = Math.max(0, this.score - Math.min(35, this.consecutiveFailures * 10));
        this.errors.push({ reason, time: Date.now() });
        if (this.errors.length > 20) this.errors.shift();

        if (this.consecutiveFailures >= CIRCUIT_OPEN_THRESHOLD) {
            if (this.circuitState === CircuitState.CLOSED) {
                this.circuitState = CircuitState.OPEN;
                this.circuitOpenedAt = Date.now();
                _log("warn", `Circuit OPEN for ${this.name} after ${this.consecutiveFailures} failures`);
            }
        }
    }

    isAvailable() {
        if (this.circuitState === CircuitState.OPEN) {
            const elapsed = Date.now() - this.circuitOpenedAt;
            if (elapsed >= CIRCUIT_HALF_OPEN_TIMEOUT_MS) {
                this.circuitState = CircuitState.HALF_OPEN;
                _log("info", `Circuit HALF-OPEN for ${this.name} — probing...`);
                return true;
            }
            return false;
        }
        return true;
    }

    getRetryDelay(attempt) {
        const jitter = Math.random() * 5000;
        return Math.min(BASE_RETRY_DELAY_MS * Math.pow(1.8, attempt) + jitter, MAX_RETRY_DELAY_MS);
    }

    toJSON() {
        return {
            name: this.name,
            score: this.score,
            circuitState: this.circuitState,
            failureCount: this.failureCount,
            successCount: this.successCount,
            consecutiveFailures: this.consecutiveFailures,
            lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
            lastSuccess: this.lastSuccessTime ? new Date(this.lastSuccessTime).toISOString() : null,
            recentErrors: this.errors.slice(-5),
        };
    }
}

class AccountRegistry extends EventEmitter {
    constructor() {
        super();
        this.accounts = [];
        this.healthMap = new Map();
        this.currentIndex = 0;
        this.isSwitching = false;
        this.switchCount = 0;
        this.lastSwitchTime = 0;
        this.singleAccountRetryCount = 0;
        this._healthDecayTimer = null;
        this._recoveryTimer = null;
        this._rescanTimer = null;
        this._lastRescanAt = 0;
        this._metrics = {
            totalSwitches: 0,
            successfulLogins: 0,
            failedLogins: 0,
            startTime: Date.now(),
        };
    }

    rescanNow() {
        const prevCount = this.accounts.length;
        this._lastRescanAt = Date.now();
        this.scanAccounts();
        const newCount = this.accounts.length;
        if (newCount > prevCount) {
            _log("info", `Rescan detected ${newCount - prevCount} new account(s) — total: ${newCount}`);
            this.emit("newAccounts", { prevCount, newCount });
            return true;
        }
        return false;
    }

    startPeriodicRescan(onNewAccount = null) {
        if (this._rescanTimer) return;
        this._rescanTimer = setInterval(() => {
            const prevCount = this.accounts.length;
            const prevNames = new Set(this.accounts);
            this._lastRescanAt = Date.now();

            const baseDir = process.cwd();
            const accountsDir = path.join(baseDir, "accounts");
            const tryAdd = (filePath) => {
                if (!fs.existsSync(filePath) || prevNames.has(filePath)) return false;
                try {
                    const raw = fs.readFileSync(filePath, "utf8").trim();
                    const effective = raw.split("\n").filter(l => !l.startsWith("#") && l.trim() !== "").join("").trim();
                    const isJson = filePath.endsWith(".json");
                    if (isJson && effective.length <= 2) return false;
                    if (!isJson && effective.length === 0) return false;
                    if (effective === "[]") return false;
                    return true;
                } catch (_) { return false; }
            };

            const hasNew = [
                path.join(accountsDir, "account2.txt"), path.join(accountsDir, "account2.json"),
                path.join(accountsDir, "account3.txt"), path.join(accountsDir, "account3.json"),
                path.join(accountsDir, "account4.txt"), path.join(accountsDir, "account4.json"),
            ].some(fp => tryAdd(fp));

            if (hasNew) {
                this.scanAccounts();
                const newCount = this.accounts.length;
                if (newCount > prevCount) {
                    _log("info", `Periodic rescan: ${newCount - prevCount} new account(s) found`);
                    this.emit("newAccounts", { prevCount, newCount });
                    if (typeof onNewAccount === "function") onNewAccount(newCount - prevCount);
                }
            }
        }, PERIODIC_RESCAN_INTERVAL_MS);
        this._rescanTimer.unref?.();
        _log("info", `Periodic account rescan started (every ${PERIODIC_RESCAN_INTERVAL_MS / 60000}min)`);
    }

    stopPeriodicRescan() {
        if (this._rescanTimer) { clearInterval(this._rescanTimer); this._rescanTimer = null; }
    }

    scanAccounts() {
        const baseDir = process.cwd();
        const accountsDir = path.join(baseDir, "accounts");
        const previousAccounts = new Set(this.accounts);
        this.accounts = [];

        const tryAdd = (filePath) => {
            if (!fs.existsSync(filePath)) return;
            try {
                const raw = fs.readFileSync(filePath, "utf8").trim();
                if (!raw) return;
                const lines = raw.split("\n").filter(l => !l.startsWith("#") && l.trim() !== "");
                if (lines.length === 0) return;
                const effective = lines.join("").trim();
                if (effective === "[]" || effective === "{}") return;
                this.accounts.push(filePath);
            } catch (_) {}
        };

        if (fs.existsSync(accountsDir)) {
            const primary = path.join(accountsDir, "account.txt");
            tryAdd(primary);

            for (let i = 2; i <= MAX_ACCOUNTS; i++) {
                const f = path.join(accountsDir, `account${i}.txt`);
                if (!fs.existsSync(f)) break;
                tryAdd(f);
            }

            const pJson = path.join(accountsDir, "account.json");
            if (!this.accounts.includes(pJson)) tryAdd(pJson);

            for (let j = 2; j <= MAX_ACCOUNTS; j++) {
                const f = path.join(accountsDir, `account${j}.json`);
                if (!fs.existsSync(f)) break;
                if (!this.accounts.includes(f)) tryAdd(f);
            }
        }

        if (this.accounts.length === 0) {
            const legacy = path.join(baseDir, "account.txt");
            tryAdd(legacy);
        }

        for (const fp of this.accounts) {
            if (!this.healthMap.has(fp)) {
                this.healthMap.set(fp, new AccountHealth(fp));
            }
        }

        const newAccounts = this.accounts.filter(fp => !previousAccounts.has(fp));
        if (newAccounts.length > 0) {
            _log("info", `Found ${newAccounts.length} new account(s): ${newAccounts.map(fp => path.basename(fp)).join(", ")}`);
        }

        if (this.currentIndex >= this.accounts.length) {
            this.currentIndex = 0;
        }

        if (!this._healthDecayTimer) this._startHealthDecay();
        if (!this._recoveryTimer) this._startRecoveryCheck();

        return this.accounts.length;
    }

    getCurrentAccount() {
        if (this.accounts.length === 0) return null;
        const idx = this.currentIndex % this.accounts.length;
        return this.accounts[idx] || null;
    }

    selectBestAccount(excludeCurrent = false) {
        const available = this.accounts
            .filter(fp => {
                if (excludeCurrent && fp === this.getCurrentAccount()) return false;
                const h = this.healthMap.get(fp);
                return h ? h.isAvailable() : true;
            })
            .map(fp => ({ fp, health: this.healthMap.get(fp) }))
            .sort((a, b) => (b.health?.score ?? 0) - (a.health?.score ?? 0));

        if (available.length === 0) return null;
        return available[0].fp;
    }

    nextAccount(reason = "unknown") {
        const previous = this.getCurrentAccount();
        const health = this.healthMap.get(previous);
        if (health) health.recordFailure(reason);

        this.currentIndex++;
        this.switchCount++;
        this._metrics.totalSwitches++;
        this.lastSwitchTime = Date.now();

        const next = this.getCurrentAccount();
        const nextName = next ? path.basename(next) : "none";
        const prevName = previous ? path.basename(previous) : "none";

        _log("info", `Account switch #${this.switchCount}: ${prevName} → ${nextName} (reason: ${reason})`);
        this.emit("switch", { from: prevName, to: nextName, reason, switchCount: this.switchCount });

        return next;
    }

    switchToAvailableAccount(reason = "unknown") {
        const current = this.getCurrentAccount();
        if (current) {
            const h = this.healthMap.get(current);
            if (h) h.recordFailure(reason);
        }

        const available = this.accounts
            .map((fp, idx) => ({ fp, idx, health: this.healthMap.get(fp) }))
            .filter(({ health }) => !health || health.isAvailable())
            .sort((a, b) => (b.health?.score ?? 0) - (a.health?.score ?? 0));

        if (!available.length) return null;

        const best = available[0].fp;
        const bestIndex = this.accounts.indexOf(best);
        if (bestIndex > 0) {
            this.accounts.splice(bestIndex, 1);
            this.accounts.unshift(best);
        }
        this.currentIndex = 0;
        this.lastSwitchTime = Date.now();
        this.switchCount++;
        this._metrics.totalSwitches++;

        const prevName = current ? path.basename(current) : "none";
        const nextName = path.basename(best);
        _log("info", `Account failover #${this.switchCount}: ${prevName} → ${nextName} (reason: ${reason})`);
        this.emit("switch", { from: prevName, to: nextName, reason, switchCount: this.switchCount });
        return best;
    }

    markCurrentAsWorking() {
        const current = this.getCurrentAccount();
        if (!current) return;
        const health = this.healthMap.get(current);
        if (health) {
            health.recordSuccess();
            this._metrics.successfulLogins++;
            this.singleAccountRetryCount = 0;
        }
    }

    markCurrentAsFailed(reason = "unknown") {
        const current = this.getCurrentAccount();
        if (!current) return;
        const health = this.healthMap.get(current);
        if (health) {
            health.recordFailure(reason);
            this._metrics.failedLogins++;
        }
    }

    canSwitch() {
        if (this.isSwitching) return false;
        const elapsed = Date.now() - this.lastSwitchTime;
        if (elapsed < MIN_SWITCH_INTERVAL_MS) {
            const remaining = Math.ceil((MIN_SWITCH_INTERVAL_MS - elapsed) / 1000);
            _log("warn", `Switch cooldown active — wait ${remaining}s`);
            return false;
        }
        return true;
    }

    getCooldownRemaining() {
        if (this.isSwitching) return Infinity;
        const elapsed = Date.now() - this.lastSwitchTime;
        const remaining = MIN_SWITCH_INTERVAL_MS - elapsed;
        return remaining > 0 ? remaining : 0;
    }

    hasMoreAccounts() {
        return this.getAvailableAccounts().length > 1;
    }

    getAvailableAccounts() {
        return this.accounts.filter(fp => {
            const h = this.healthMap.get(fp);
            return h ? h.isAvailable() : true;
        });
    }

    isSingleAccount() {
        return this.accounts.length <= 1;
    }

    getRetryDelay(attempt) {
        const current = this.getCurrentAccount();
        const health = current ? this.healthMap.get(current) : null;
        return health ? health.getRetryDelay(attempt) : BASE_RETRY_DELAY_MS;
    }

    resetFailedAccounts() {
        let reset = 0;
        for (const health of this.healthMap.values()) {
            if (health.circuitState !== CircuitState.CLOSED) {
                health.circuitState = CircuitState.CLOSED;
                health.consecutiveFailures = 0;
                health.score = Math.max(50, health.score);
                reset++;
            }
        }
        if (reset > 0) _log("info", `Reset ${reset} circuit(s) — all accounts available`);
        this.singleAccountRetryCount = 0;
    }

    getStats() {
        const uptime = Math.floor((Date.now() - this._metrics.startTime) / 1000);
        return {
            uptime: `${Math.floor(uptime / 60)}m ${uptime % 60}s`,
            totalAccounts: this.accounts.length,
            availableAccounts: this.getAvailableAccounts().length,
            currentIndex: this.currentIndex,
            currentAccount: this.getCurrentAccount() ? path.basename(this.getCurrentAccount()) : null,
            switchCount: this.switchCount,
            isSwitching: this.isSwitching,
            canSwitch: this.canSwitch(),
            singleAccountRetryCount: this.singleAccountRetryCount,
            metrics: { ...this._metrics },
            accounts: Array.from(this.healthMap.values()).map(h => h.toJSON()),
        };
    }

    _startHealthDecay() {
        if (this._healthDecayTimer) clearInterval(this._healthDecayTimer);
        this._healthDecayTimer = setInterval(() => {
            for (const health of this.healthMap.values()) {
                if (health.score < 100 && health.consecutiveFailures === 0) {
                    health.score = Math.min(100, health.score + 2);
                }
            }
        }, HEALTH_DECAY_INTERVAL_MS);
        this._healthDecayTimer.unref?.();
    }

    _startRecoveryCheck() {
        if (this._recoveryTimer) clearInterval(this._recoveryTimer);
        this._recoveryTimer = setInterval(() => {
            const unavailable = this.accounts.filter(fp => {
                const h = this.healthMap.get(fp);
                return h && !h.isAvailable();
            });
            if (unavailable.length > 0) {
                for (const fp of unavailable) {
                    const h = this.healthMap.get(fp);
                    if (h && Date.now() - h.circuitOpenedAt >= CIRCUIT_HALF_OPEN_TIMEOUT_MS) {
                        h.circuitState = CircuitState.HALF_OPEN;
                        _log("info", `${h.name} moved to HALF-OPEN for probe`);
                    }
                }
            }
        }, RECOVERY_CHECK_INTERVAL_MS);
        this._recoveryTimer.unref?.();
    }

    destroy() {
        if (this._healthDecayTimer) clearInterval(this._healthDecayTimer);
        if (this._recoveryTimer) clearInterval(this._recoveryTimer);
        this.removeAllListeners();
    }
}

const accountRegistry = new AccountRegistry();
module.exports = accountRegistry;
