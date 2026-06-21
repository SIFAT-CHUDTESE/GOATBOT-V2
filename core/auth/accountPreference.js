"use strict";

/**
 * @module accountPreference
 * @description Tiny shared helper that lets the `'terminal` command pin a
 * preferred login source for the next boot.
 *
 *   { "kind": "cookie",     "value": "account3.txt" }
 *   { "kind": "credential", "value": 2 }              // fbaccount.json slot id
 *
 * accountRegistry  honors `cookie`     by moving that file to currentIndex 0.
 * fbCredentialFb   honors `credential` by trying that slot first.
 *
 * @author SIFAT — MARIN BOT
 */

const fs   = require("fs-extra");
const path = require("path");

const PREF_FILE = path.join(process.cwd(), "accounts", "preferred.json");

function getPreferred() {
        try {
                if (!fs.existsSync(PREF_FILE)) return null;
                const raw = fs.readFileSync(PREF_FILE, "utf8").trim();
                if (!raw) return null;
                const data = JSON.parse(raw);
                if (!data || !data.kind) return null;
                return data;
        } catch (_) {
                return null;
        }
}

function setPreferredCookie(filename) {
        const clean = path.basename(String(filename || "").trim());
        if (!clean) throw new Error("filename required");
        fs.outputJsonSync(PREF_FILE, { kind: "cookie", value: clean, setAt: new Date().toISOString() }, { spaces: 2 });
        return { kind: "cookie", value: clean };
}

function setPreferredCredential(slot) {
        const n = Number(slot);
        if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error("slot must be 1..10");
        fs.outputJsonSync(PREF_FILE, { kind: "credential", value: n, setAt: new Date().toISOString() }, { spaces: 2 });
        return { kind: "credential", value: n };
}

function clearPreferred() {
        try { fs.removeSync(PREF_FILE); } catch (_) {}
        return true;
}

const setPreferred = setPreferredCookie;

module.exports = {
        PREF_FILE,
        getPreferred,
        setPreferred,
        setPreferredCookie,
        setPreferredCredential,
        clearPreferred,
};
