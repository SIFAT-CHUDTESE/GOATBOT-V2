const { colors } = require('../func/colors.js');
const moment = require("moment-timezone");

const DEFAULT_TZ  = "Asia/Dhaka";
const PREFIX_WIDTH = 18;

function now() {
    const tz = global?.GoatBot?.config?.timeZone || DEFAULT_TZ;
    return moment().tz(tz).format("HH:mm:ss DD/MM");
}

function pad(str, len) {
    str = String(str);
    return str.length >= len ? str : str + " ".repeat(len - str.length);
}

function printLine(badge, prefix, message) {
    const ts  = colors.gray(`[${now()}]`);
    const div = colors.gray(" │ ");
    const arr = colors.gray(" ▸ ");
    const tag = prefix !== undefined
        ? colors.hex("#6699cc")(pad(String(prefix).toUpperCase(), PREFIX_WIDTH)) + arr
        : "  ";
    process.stdout.write(`${ts} ${badge}${div}${tag}${message}\n`);
}

function printExtra(badge, prefix, ...rest) {
    const ts     = colors.gray(`[${now()}]`);
    const indent = " ".repeat(PREFIX_WIDTH + 8);
    for (const extra of rest) {
        if (extra === undefined || extra === null) continue;
        let val;
        if (typeof extra === "object" && !extra?.stack) {
            val = JSON.stringify(extra, null, 2);
        } else {
            val = extra?.stack ? extra.stack : String(extra);
        }
        for (const ln of val.split("\n")) {
            process.stdout.write(`${ts}       ${indent}${colors.gray(ln)}\n`);
        }
    }
}

function makeErr(prefix, message, ...rest) {
    if (message === undefined) { message = prefix; prefix = "ERROR"; }
    const badge = colors.bgRed(colors.white(" ERR ")) + colors.redBright(" ✗");
    printLine(badge, prefix, colors.redBright(message));
    if (rest.length) printExtra(badge, prefix, ...rest);
}

module.exports = {
    err:   makeErr,
    error: makeErr,

    warn: function(prefix, message) {
        if (message === undefined) { message = prefix; prefix = "WARN"; }
        const badge = colors.bgYellow(colors.black(" WRN ")) + colors.yellowBright(" ⚠");
        printLine(badge, prefix, colors.yellowBright(message));
    },

    info: function(prefix, message) {
        if (message === undefined) { message = prefix; prefix = "INFO"; }
        const badge = colors.bgCyan(colors.black(" INF ")) + colors.cyanBright(" ◈");
        printLine(badge, prefix, colors.white(message));
    },

    success: function(prefix, message) {
        if (message === undefined) { message = prefix; prefix = "SUCCESS"; }
        const badge = colors.bgGreen(colors.black(" SCS ")) + colors.greenBright(" ✔");
        printLine(badge, prefix, colors.greenBright(message));
    },

    master: function(prefix, message) {
        if (message === undefined) { message = prefix; prefix = "MASTER"; }
        const badge = colors.bgHex("#eb6734")(colors.black(" MST ")) + colors.hex("#eb6734")(" ⚡");
        printLine(badge, prefix, colors.hex("#eb6734")(message));
    },

    dev: (...args) => {
        if (!["development", "production"].includes(process.env.NODE_ENV)) return;
        try {
            throw new Error();
        } catch (err) {
            const at = err.stack.split("\n")[2];
            let position = at.slice(at.indexOf(process.cwd()) + process.cwd().length + 1);
            if (position.endsWith(")")) position = position.slice(0, -1);
            console.log(`\x1b[36m${position} =>\x1b[0m`, ...args);
        }
    }
};
