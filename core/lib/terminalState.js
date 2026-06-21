"use strict";

const fs   = require("fs-extra");
const path = require("path");

const DIR   = path.join(process.cwd(), "core/data", "terminal");
const HIST  = path.join(DIR, "history.json");
const MET   = path.join(DIR, "metrics.json");
const SCHED = path.join(DIR, "scheduled.json");
const MAINT = path.join(DIR, "maintenance.json");
const BACKUP_DIR = path.join(process.cwd(), "core/data", "backups");

const HISTORY_CAP = 200;

function _r(p, d) { try { return fs.existsSync(p) ? fs.readJsonSync(p) : d; } catch { return d; } }
function _w(p, v) { try { fs.outputJsonSync(p, v, { spaces: 2 }); return true; } catch { return false; } }

function recordInvocation({ sub, args, by, ok, ms, note }) {
    const hist = _r(HIST, []);
    hist.push({
        t:    Date.now(),
        sub:  sub || "?",
        args: Array.isArray(args) ? args.slice(0, 6) : [],
        by:   by || "?",
        ok:   !!ok,
        ms:   Math.round(ms || 0),
        note: note ? String(note).slice(0, 120) : undefined,
    });
    while (hist.length > HISTORY_CAP) hist.shift();
    _w(HIST, hist);

    const met = _r(MET, { commands: {}, errors: 0, total: 0, since: Date.now() });
    met.total = (met.total || 0) + 1;
    met.commands[sub] = (met.commands[sub] || 0) + 1;
    if (!ok) met.errors = (met.errors || 0) + 1;
    _w(MET, met);
}

function getHistory(n = 20) {
    const all = _r(HIST, []);
    return all.slice(-Math.max(1, Math.min(HISTORY_CAP, n))).reverse();
}

function clearHistory() { return _w(HIST, []); }

function getMetrics() {
    const m = _r(MET, { commands: {}, errors: 0, total: 0, since: Date.now() });
    const top = Object.entries(m.commands).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return {
        total:  m.total || 0,
        errors: m.errors || 0,
        since:  m.since || Date.now(),
        top,
        errorRate: m.total ? Math.round((m.errors / m.total) * 1000) / 10 : 0,
    };
}

function resetMetrics() { return _w(MET, { commands: {}, errors: 0, total: 0, since: Date.now() }); }

function listScheduled() {
    return _r(SCHED, []).filter(t => t.runAt > Date.now() - 1000);
}

function addScheduled({ runAt, sub, args, by }) {
    const list = listScheduled();
    const id   = "S" + Math.random().toString(36).slice(2, 7).toUpperCase();
    list.push({ id, runAt, sub, args, by, createdAt: Date.now() });
    _w(SCHED, list);
    return id;
}

function removeScheduled(id) {
    const list = listScheduled().filter(t => t.id !== id);
    return _w(SCHED, list);
}

function popDueScheduled() {
    const list = _r(SCHED, []);
    const now  = Date.now();
    const due  = list.filter(t => t.runAt <= now);
    const keep = list.filter(t => t.runAt > now);
    if (due.length) _w(SCHED, keep);
    return due;
}

function getMaintenance() {
    return _r(MAINT, { enabled: false, since: null, by: null, reason: null });
}

function setMaintenance(enabled, by, reason) {
    return _w(MAINT, {
        enabled: !!enabled,
        since:   enabled ? Date.now() : null,
        by:      enabled ? (by || null) : null,
        reason:  enabled ? (reason || null) : null,
    });
}

function ensureBackupDir() { try { fs.mkdirpSync(BACKUP_DIR); } catch {} }

function listBackups() {
    ensureBackupDir();
    try {
        return fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith(".json"))
            .map(f => {
                const stat = fs.statSync(path.join(BACKUP_DIR, f));
                return { name: f, size: stat.size, mtime: stat.mtimeMs };
            })
            .sort((a, b) => b.mtime - a.mtime);
    } catch { return []; }
}

module.exports = {
    DIR,
    HIST, MET, SCHED, MAINT, BACKUP_DIR,
    recordInvocation, getHistory, clearHistory,
    getMetrics, resetMetrics,
    listScheduled, addScheduled, removeScheduled, popDueScheduled,
    getMaintenance, setMaintenance,
    ensureBackupDir, listBackups,
};
