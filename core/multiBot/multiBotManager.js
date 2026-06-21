"use strict";

const { spawn }      = require("child_process");
const path           = require("path");
const fs             = require("fs-extra");
const EventEmitter   = require("events");

const ACCOUNTS_DIR   = path.join(process.cwd(), "accounts");
const BOT_ENTRY      = path.join(process.cwd(), "index.js");
const MAX_LOG_LINES  = 300;
const AUTO_RESTART   = true;
const MAX_RESTARTS   = 5;
const RESTART_WINDOW = 60_000;
const RESTART_DELAY  = 3_000;

const BASE_SLAVE_PORT = 5010;
const PORT_RANGE      = 50;

function _usedPorts() {
    return new Set([...slaveBots.values()].map(b => b.port));
}

function _allocPort() {
    const used = _usedPorts();
    for (let p = BASE_SLAVE_PORT; p < BASE_SLAVE_PORT + PORT_RANGE; p++) {
        if (!used.has(p)) return p;
    }
    return BASE_SLAVE_PORT + slaveBots.size;
}

const emitter = new EventEmitter();

const slaveBots = new Map();

function _appendLog(record, line) {
    record.log.push(`[${new Date().toLocaleTimeString()}] ${line}`);
    if (record.log.length > MAX_LOG_LINES) record.log.shift();
}

function _fmtUptime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d) return `${d}d ${h % 24}h`;
    if (h) return `${h}h ${m % 60}m`;
    if (m) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

const RUNNING_SIGNALS = [
    "Successful login",
    "LOGIN FACEBOOK",
    "BOT_STARTED",
    "START LOGGING",
    "MQTT",
    "Session watchdog",
    "GoatBot",
];

function _looksRunning(line) {
    return RUNNING_SIGNALS.some(sig => line.includes(sig));
}

function _killProcess(record, timeoutMs = 6_000) {
    return new Promise(resolve => {
        if (!record.proc || record.pid === null) { resolve(); return; }
        record._stopRequested = true;
        record.status = "stopping";
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        record.proc.once("close", finish);
        try { record.proc.kill("SIGTERM"); } catch (_) {}
        setTimeout(() => {
            if (!done) {
                try { record.proc.kill("SIGKILL"); } catch (_) {}
                finish();
            }
        }, timeoutMs);
    });
}

async function spawnBot(accountFile, slot, force = false, isRestart = false) {
    const base = path.basename(accountFile);
    const full = path.join(ACCOUNTS_DIR, base);

    if (!fs.existsSync(full)) {
        return { ok: false, reason: `${base} not found (file missing)` };
    }

    const existing = slaveBots.get(base);
    if (existing && (existing.status === "running" || existing.status === "starting")) {
        if (!force) {
            return { ok: false, reason: `${base} already running (PID ${existing.pid}) — use force` };
        }
        await _killProcess(existing);
        slaveBots.delete(base);
    }

    const port = _allocPort();

    const env = {
        ...process.env,
        GOAT_MULTIBOT_MODE    : "1",
        GOAT_BOT_ACCOUNT_FILE : base,
        GOAT_BOT_SLOT         : String(slot),
        GOAT_SLAVE            : "1",
        GOAT_SUPERVISOR_PID   : String(process.pid),
        GOAT_SLAVE_AUTO_RESTART: "0",
        PORT                  : String(port),
        FORCE_COLOR           : "0",
    };

    const proc = spawn("node", [BOT_ENTRY], {
        cwd  : process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
        env,
    });

    const record = {
        accountFile  : base,
        slot,
        port,
        pid          : proc.pid,
        startTime    : Date.now(),
        proc,
        status       : "starting",
        restartCount : isRestart ? (slaveBots.get(base)?.restartCount ?? 0) : 0,
        restartTimes : [],
        msgCount     : existing?.msgCount ?? 0,
        log          : [],
        health       : 100,
        _stopRequested: false,
    };

    slaveBots.set(base, record);

    const handleLine = (src) => (chunk) => {
        const lines = chunk.toString().split("\n").filter(Boolean);
        for (const l of lines) {
            _appendLog(record, `[${src}] ${l}`);
            if (record.status === "starting" && _looksRunning(l)) {
                record.status = "running";
                record.health = Math.min(100, record.health + 10);
                emitter.emit("botRunning", base, record);
            }
            if (/error|exception|crash|failed/i.test(l)) {
                record.health = Math.max(0, record.health - 5);
            }
        }
    };

    proc.stdout.on("data", handleLine("OUT"));
    proc.stderr.on("data", handleLine("ERR"));

    proc.on("error", (err) => {
        record.status = `error: ${err.message}`;
        record.pid    = null;
        record.health = 0;
        _appendLog(record, `[MGR] spawn error: ${err.message}`);
        emitter.emit("botError", base, err, record);
    });

    proc.on("close", (code, signal) => {
        const wasActive = record.status === "running" || record.status === "starting";
        record.status   = code === 0 ? "stopped" : signal ? `killed (${signal})` : `crashed (code ${code ?? "?"})`;
        record.pid      = null;
        record.health   = Math.max(0, record.health - 20);
        _appendLog(record, `[MGR] closed — code=${code} signal=${signal}`);
        emitter.emit("botDied", base, { code, signal, record });

        if (AUTO_RESTART && wasActive && code !== 0 && code !== null && !record._stopRequested) {
            const now = Date.now();
            record.restartTimes = record.restartTimes.filter(t => now - t < RESTART_WINDOW);

            if (record.restartTimes.length >= MAX_RESTARTS) {
                record.status = `failed (max ${MAX_RESTARTS} restarts)`;
                _appendLog(record, `[MGR] auto-restart aborted — restart limit reached`);
                emitter.emit("botFailed", base, record);
                return;
            }

            record.restartTimes.push(now);
            record.restartCount++;
            record.status = `restarting (#${record.restartCount})`;
            _appendLog(record, `[MGR] auto-restart #${record.restartCount} in ${RESTART_DELAY / 1000}s…`);
            emitter.emit("botRestarting", base, record.restartCount, record);

            setTimeout(async () => {
                if (slaveBots.get(base)?._stopRequested) return;
                await spawnBot(base, slot, false, true);
            }, RESTART_DELAY);
        } else if (record._stopRequested) {
            setTimeout(() => {
                const r = slaveBots.get(base);
                if (r && r.pid === null) slaveBots.delete(base);
            }, 15_000);
        }
    });

    setTimeout(() => {
        const r = slaveBots.get(base);
        if (r && r.status === "starting" && r.pid !== null) {
            r.status = "running";
        }
    }, 20_000);

    emitter.emit("botSpawned", base, { pid: proc.pid, port, slot, isRestart });
    return { ok: true, pid: proc.pid, port, slot };
}

async function spawnBots(accountFiles, force = true) {
    const results = [];
    let slotCounter = 2;

    for (const file of accountFiles) {
        const base     = path.basename(file);
        const existing = slaveBots.get(base);
        const slot     = existing?.slot ?? slotCounter;
        slotCounter    = Math.max(slotCounter, slot) + 1;

        const r = await spawnBot(base, slot, force);
        results.push({ file: base, ...r });
    }

    return results;
}

function killBot(accountFile) {
    const base = path.basename(accountFile);
    const r    = slaveBots.get(base);
    if (!r) return false;
    _killProcess(r);
    return true;
}

async function restartBot(accountFile) {
    const base = path.basename(accountFile);
    const r    = slaveBots.get(base);
    if (!r) return { ok: false, reason: `${base} is not registered` };
    const slot = r.slot;
    await _killProcess(r);
    await new Promise(res => setTimeout(res, RESTART_DELAY));
    return spawnBot(base, slot, false, true);
}

function killAll() {
    let killed = 0;
    for (const r of slaveBots.values()) {
        _killProcess(r);
        killed++;
    }
    setTimeout(() => {
        for (const [key, r] of slaveBots) {
            if (r.pid === null) slaveBots.delete(key);
        }
    }, 10_000);
    return killed;
}

function getStatus() {
    const out = [];
    for (const r of slaveBots.values()) {
        out.push({
            account      : r.accountFile,
            slot         : r.slot,
            port         : r.port,
            pid          : r.pid,
            status       : r.status,
            health       : r.health,
            uptime       : _fmtUptime(Date.now() - r.startTime),
            uptimeMs     : Date.now() - r.startTime,
            restartCount : r.restartCount,
            msgCount     : r.msgCount,
        });
    }
    return out;
}

function getLogs(accountFile, n = 50) {
    const r = slaveBots.get(path.basename(accountFile));
    if (!r) return [];
    return r.log.slice(-n);
}

function runningCount() {
    return [...slaveBots.values()].filter(r =>
        r.status === "running" || r.status === "starting"
    ).length;
}

function on(evt, cb)  { emitter.on(evt, cb);  }
function off(evt, cb) { emitter.off(evt, cb); }

module.exports = {
    spawnBot,
    spawnBots,
    killBot,
    restartBot,
    killAll,
    getStatus,
    getLogs,
    runningCount,
    on,
    off,
};
