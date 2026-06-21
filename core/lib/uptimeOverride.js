"use strict";

const fs   = require("fs-extra");
const path = require("path");

const OVERRIDE_FILE = path.join(process.cwd(), "core/data", "uptimeOverride.json");

function _load() {
    try { return fs.readJsonSync(OVERRIDE_FILE); } catch { return {}; }
}
function _save(data) {
    try { fs.outputJsonSync(OVERRIDE_FILE, data, { spaces: 2 }); } catch {}
}

function getEffectiveUptime(target = "bot") {
    const data = _load();
    const entry = data[target];
    if (!entry) return Math.floor(process.uptime());
    if (entry.frozen) return entry.baseSeconds;
    return entry.baseSeconds + Math.floor(process.uptime() - (entry.setProcessUptime || 0));
}

function getStatus() {
    const data = _load();
    const make = (key) => {
        const entry = data[key];
        if (!entry) {
            const sec = Math.floor(process.uptime());
            return { mode: "real", active: false, effective: sec, baseSeconds: sec };
        }
        const eff = entry.frozen
            ? entry.baseSeconds
            : entry.baseSeconds + Math.floor(process.uptime() - (entry.setProcessUptime || 0));
        return {
            mode:        entry.frozen ? "frozen" : "offset",
            active:      true,
            effective:   eff,
            baseSeconds: entry.baseSeconds,
            setAt:       entry.setAt || null,
        };
    };
    return { bot: make("bot"), sys: make("sys") };
}

function setOverride(target, seconds) {
    const data = _load();
    data[target] = {
        baseSeconds:      seconds,
        setProcessUptime: Math.floor(process.uptime()),
        frozen:           false,
        setAt:            Date.now(),
    };
    _save(data);
}

function freezeAt(target, seconds) {
    const data = _load();
    data[target] = { baseSeconds: seconds, frozen: true, setAt: Date.now() };
    _save(data);
}

function clearOverride(target) {
    const data = _load();
    if (target) { delete data[target]; }
    else { delete data.bot; delete data.sys; }
    _save(data);
}

function parseDuration(str) {
    if (!str) return null;
    const units = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
    let total = 0;
    const matches = [...String(str).toLowerCase().matchAll(/(\d+)\s*([smhdw])/g)];
    for (const [, n, u] of matches) total += parseInt(n) * (units[u] || 0);
    return total > 0 ? total : null;
}

module.exports = { getEffectiveUptime, getStatus, setOverride, freezeAt, clearOverride, parseDuration };
