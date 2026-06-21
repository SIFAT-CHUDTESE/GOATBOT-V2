"use strict";

if (!global.temp._autoUpdateQueue) global.temp._autoUpdateQueue = new Map();
if (!global.temp._autoUpdateProcessing) global.temp._autoUpdateProcessing = new Set();

const DEBOUNCE_MS = 800;

async function retryApiCall(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try { return await fn(); }
        catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, delay * (i + 1)));
        }
    }
}

async function processQueue(threadID, threadsData, api) {
    if (global.temp._autoUpdateProcessing.has(threadID)) return;
    global.temp._autoUpdateProcessing.add(threadID);

    try {
        const queue = global.temp._autoUpdateQueue.get(threadID) || [];
        if (!queue.length) return;
        global.temp._autoUpdateQueue.delete(threadID);

        const threadInfo = await threadsData.get(threadID);
        let { members = [], adminIDs = [] } = threadInfo;

        let threadInfoFca = null;
        let needFcaInfo = queue.some(e =>
            e.logMessageType === "log:subscribe" ||
            e.logMessageType === "log:thread-image" ||
            e.logMessageType === "log:thread-name"
        );

        if (needFcaInfo) {
            try { threadInfoFca = await retryApiCall(() => api.getThreadInfo(threadID)); }
            catch (_) {}
        }

        let pendingMemberSave = false;
        let pendingAdminSave  = false;

        for (const event of queue) {
            const { logMessageType, logMessageData } = event;

            switch (logMessageType) {
                case "log:subscribe": {
                    const { addedParticipants = [] } = logMessageData;
                    if (threadInfoFca) {
                        try { await threadsData.refreshInfo(threadID, threadInfoFca); }
                        catch (_) {}
                    }
                    for (const user of addedParticipants) {
                        const uid = user.userFbId;
                        const existing = members.find(m => m.userID === uid);
                        const nicknameMap = threadInfoFca?.nicknames || {};
                        const userInfoArr = threadInfoFca?.userInfo || [];
                        const gender = userInfoArr.find(u => u.id == uid)?.gender || null;

                        const newData = {
                            userID:    uid,
                            name:      user.fullName || existing?.name || "Unknown",
                            gender,
                            nickname:  nicknameMap[uid] || null,
                            inGroup:   true,
                            count:     (existing?.count || 0) + (existing ? 0 : 0),
                            joinTime:  Date.now()
                        };

                        if (existing) {
                            const idx = members.indexOf(existing);
                            members[idx] = { ...existing, ...newData, count: existing.count || 0 };
                        } else {
                            members.push(newData);
                        }
                    }
                    pendingMemberSave = true;
                    break;
                }

                case "log:unsubscribe": {
                    const uid = logMessageData.leftParticipantFbId;
                    const m = members.find(m => m.userID === uid);
                    if (m) {
                        m.inGroup  = false;
                        m.leftTime = Date.now();
                        pendingMemberSave = true;
                    }
                    break;
                }

                case "log:thread-admins": {
                    const targetID = logMessageData.TARGET_ID;
                    if (logMessageData.ADMIN_EVENT === "add_admin") {
                        if (!adminIDs.includes(targetID)) adminIDs.push(targetID);
                    } else {
                        adminIDs = adminIDs.filter(id => id !== targetID);
                    }
                    adminIDs = [...new Set(adminIDs)];
                    pendingAdminSave = true;
                    break;
                }

                case "log:thread-name": {
                    const name = logMessageData.name;
                    if (name) {
                        try { await threadsData.set(threadID, name, "threadName"); }
                        catch (_) {}
                    }
                    break;
                }

                case "log:thread-image": {
                    if (logMessageData.url) {
                        try { await threadsData.set(threadID, logMessageData.url, "imageSrc"); }
                        catch (_) {}
                    }
                    break;
                }

                case "log:thread-icon": {
                    if (logMessageData.thread_icon !== undefined) {
                        try { await threadsData.set(threadID, logMessageData.thread_icon, "emoji"); }
                        catch (_) {}
                    }
                    break;
                }

                case "log:thread-color": {
                    if (logMessageData.theme_id !== undefined) {
                        try { await threadsData.set(threadID, logMessageData.theme_id, "threadThemeID"); }
                        catch (_) {}
                    }
                    break;
                }

                case "log:user-nickname": {
                    const { participant_id, nickname } = logMessageData;
                    const m = members.find(m => m.userID === participant_id);
                    if (m) {
                        m.nickname = nickname;
                        pendingMemberSave = true;
                    }
                    break;
                }
            }
        }

        if (pendingMemberSave) {
            try { await threadsData.set(threadID, members, "members"); }
            catch (_) {}
        }
        if (pendingAdminSave) {
            try { await threadsData.set(threadID, adminIDs, "adminIDs"); }
            catch (_) {}
        }

    } finally {
        global.temp._autoUpdateProcessing.delete(threadID);

        const remaining = global.temp._autoUpdateQueue.get(threadID);
        if (remaining && remaining.length) {
            setTimeout(() => processQueue(threadID, threadsData, api), 100);
        }
    }
}

const WATCHED = new Set([
    "log:subscribe", "log:unsubscribe", "log:thread-admins",
    "log:thread-name", "log:thread-image", "log:thread-icon",
    "log:thread-color", "log:user-nickname"
]);

module.exports = {
    config: {
        name:     "autoUpdateThreadInfo",
        version:  "3.0.0",
        author:   "SIFAT",
        category: "events"
    },

    onStart: async ({ threadsData, event, api }) => {
        if (!WATCHED.has(event.logMessageType)) return;

        const { threadID } = event;

        const queue = global.temp._autoUpdateQueue.get(threadID) || [];
        queue.push(event);
        global.temp._autoUpdateQueue.set(threadID, queue);

        const existing = global.temp[`_autoUpdateTimer_${threadID}`];
        if (existing) clearTimeout(existing);

        global.temp[`_autoUpdateTimer_${threadID}`] = setTimeout(() => {
            delete global.temp[`_autoUpdateTimer_${threadID}`];
            processQueue(threadID, threadsData, api).catch(() => {});
        }, DEBOUNCE_MS);
    }
};
