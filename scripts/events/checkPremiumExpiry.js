"use strict";

const fs = require("fs-extra");

let _intervalStarted = false;

function saveConfig(config) {
    try {
        fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
    } catch (_) {}
}

async function runExpiredCleanup() {
    const config = global.GoatBot?.config;
    if (!config) return;

    const expired = global.temp.expiredPremiumUsers || [];
    if (!expired.length) return;

    const removed = [];
    for (const uid of expired) {
        const i = config.premiumUsers.indexOf(uid);
        if (i !== -1) {
            config.premiumUsers.splice(i, 1);
            removed.push(uid);
        }
    }

    if (!removed.length) {
        global.temp.expiredPremiumUsers = [];
        return;
    }

    saveConfig(config);
    global.temp.expiredPremiumUsers = [];

    const adminList = config.adminBot || [];
    if (!adminList.length) return;

    const api = global.client?.api;
    if (!api) return;

    const lines = removed.map(uid => `◦ ${uid}`).join("\n");
    const msg =
        `╔══ 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗘𝗫𝗣𝗜𝗥𝗬 𝗔𝗟𝗘𝗥𝗧 ══╗\n` +
        `◈ ${removed.length} premium user(s) expired & removed:\n` +
        `${lines}\n` +
        `◈ Time: ${new Date().toLocaleString()}\n` +
        `╚══════════════════════════╝`;

    for (const adminID of adminList) {
        try { api.sendMessage(msg, adminID); } catch (_) {}
    }
}

function startInterval() {
    if (_intervalStarted) return;
    _intervalStarted = true;
    setInterval(runExpiredCleanup, 60 * 60 * 1000);
}

module.exports = {
    config: {
        name:     "checkPremiumExpiry",
        version:  "2.0.0",
        author:   "SIFAT",
        category: "events"
    },

    onStart: async () => {
        startInterval();

        const expired = global.temp.expiredPremiumUsers || [];
        if (!expired.length) return;

        await new Promise(r => setTimeout(r, 3000));
        runExpiredCleanup().catch(() => {});
    }
};
