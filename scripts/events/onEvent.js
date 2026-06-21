"use strict";

const allOnEvent = global.GoatBot.onEvent;

module.exports = {
    config: {
        name:        "onEvent",
        version:     "2.0.0",
        author:      "SIFAT",
        description: "Dispatches each event to all registered onEvent handlers with full error isolation.",
        category:    "events"
    },

    onStart: async ({ api, args, message, event, threadsData, usersData, dashBoardData, threadModel, userModel, dashBoardModel, role, commandName }) => {
        if (!allOnEvent || !allOnEvent.length) return;

        for (const item of allOnEvent) {
            if (typeof item === "string") continue;
            if (typeof item?.onStart !== "function") continue;

            try {
                item.onStart({
                    api, args, message, event,
                    threadsData, usersData,
                    threadModel, dashBoardData,
                    userModel, dashBoardModel,
                    role, commandName
                });
            } catch (e) {
                global.utils?.log?.err?.("onEvent dispatch", `Handler error`, e);
            }
        }
    }
};
