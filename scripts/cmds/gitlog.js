const axios  = require("axios");
const fs     = require("fs-extra");
const path   = require("path");
const moment = require("moment-timezone");

const CFG_FILE = path.join(process.cwd(), "config.json");

function getGhCfg() {
    try { return fs.readJsonSync(CFG_FILE).github || {}; } catch { return {}; }
}

function parseRepo(repoUrl) {
    const cleaned = repoUrl.replace(/^https?:\/\/github\.com\//, "");
    const [owner, repo] = cleaned.split("/");
    return { owner, repo };
}

function ghHeaders(token) {
    return {
        Authorization:          `token ${token}`,
        Accept:                 "application/vnd.github+json",
        "User-Agent":           "GoatBot-GitLog/1.0",
        "X-GitHub-Api-Version": "2022-11-28"
    };
}

function fmtDate(iso) {
    return moment(iso).tz("Asia/Dhaka").format("DD MMM YYYY · HH:mm");
}

function shortSha(sha) {
    return sha?.slice(0, 7) || "───────";
}

function typeIcon(msg) {
    const m = msg.toLowerCase();
    if (m.startsWith("add"))    return "✦";
    if (m.startsWith("update")) return "◈";
    if (m.startsWith("fix"))    return "⚑";
    if (m.startsWith("remove") || m.startsWith("delete")) return "✗";
    if (m.startsWith("feat"))   return "★";
    if (m.startsWith("merge"))  return "⇌";
    return "◆";
}

function truncate(str, len) {
    return str.length > len ? str.slice(0, len - 1) + "…" : str;
}

function buildCommitList(commits, branch, repo) {
    const lines = [
        `╔══════════════════════════════════════╗`,
        `║  ɢɪᴛʟᴏɢ  ·  ${truncate(repo, 18).padEnd(18)}  ║`,
        `║  ʙʀᴀɴᴄʜ: ${truncate(branch, 20).padEnd(20)}  ║`,
        `╠══════════════════════════════════════╣`
    ];

    for (const c of commits) {
        const sha     = shortSha(c.sha);
        const msg     = truncate(c.commit.message.split("\n")[0], 34);
        const author  = truncate(c.commit.author?.name || "unknown", 16);
        const date    = fmtDate(c.commit.author?.date);
        const icon    = typeIcon(msg);

        lines.push(`║  ${icon} [${sha}]`);
        lines.push(`║    ${truncate(msg, 36)}`);
        lines.push(`║    ◉ ${author}  ·  ${date}`);
        lines.push(`╟──────────────────────────────────────╢`);
    }

    lines.pop();
    lines.push(`╚══════════════════════════════════════╝`);
    lines.push(`  ᴛᴏᴛᴀʟ: ${commits.length} ᴄᴏᴍᴍɪᴛ(ꜱ)`);
    return lines.join("\n");
}

function buildCommitDetail(data, repo) {
    const sha    = shortSha(data.sha);
    const msg    = data.commit.message.split("\n")[0];
    const body   = data.commit.message.split("\n").slice(1).join("\n").trim();
    const author = data.commit.author?.name || "unknown";
    const date   = fmtDate(data.commit.author?.date);
    const files  = data.files || [];
    const stats  = data.stats || {};

    const lines = [
        `╔══════════════════════════════════════╗`,
        `║  ᴄᴏᴍᴍɪᴛ  ·  ${repo.padEnd(20)}  ║`,
        `╠══════════════════════════════════════╣`,
        `║  ◆ SHA    : ${sha}`,
        `║  ◆ ᴍꜱɢ    : ${truncate(msg, 28)}`,
        `║  ◆ ᴀᴜᴛʜᴏʀ : ${truncate(author, 28)}`,
        `║  ◆ ᴅᴀᴛᴇ   : ${date}`,
        `╟──────────────────────────────────────╢`,
        `║  ꜱᴛᴀᴛꜱ: +${stats.additions || 0} / -${stats.deletions || 0} · ${stats.total || 0} ᴄʜᴀɴɢᴇᴅ`,
        `╟──────────────────────────────────────╢`
    ];

    if (body) {
        lines.push(`║  📝 ${truncate(body, 34)}`);
        lines.push(`╟──────────────────────────────────────╢`);
    }

    lines.push(`║  📁 ꜰɪʟᴇꜱ (${files.length}):`);
    for (const f of files.slice(0, 15)) {
        const statusIcon = { added: "✦", modified: "◈", removed: "✗", renamed: "⇌" }[f.status] || "◆";
        const changes    = `+${f.additions}/-${f.deletions}`;
        lines.push(`║   ${statusIcon} ${truncate(f.filename, 26).padEnd(26)} ${changes}`);
    }
    if (files.length > 15) lines.push(`║   … ᴀʀᴏ ${files.length - 15}টি ꜰɪʟᴇ`);

    lines.push(`╚══════════════════════════════════════╝`);
    return lines.join("\n");
}

function buildFileLog(commits, filePath, repo) {
    const lines = [
        `╔══════════════════════════════════════╗`,
        `║  ꜰɪʟᴇ ʟᴏɢ  ·  ${truncate(repo, 16).padEnd(16)}  ║`,
        `║  📁 ${truncate(filePath, 34).padEnd(34)}  ║`,
        `╠══════════════════════════════════════╣`
    ];

    for (const c of commits) {
        const sha    = shortSha(c.sha);
        const msg    = truncate(c.commit.message.split("\n")[0], 34);
        const author = truncate(c.commit.author?.name || "unknown", 16);
        const date   = fmtDate(c.commit.author?.date);
        const icon   = typeIcon(msg);

        lines.push(`║  ${icon} [${sha}]  ${date}`);
        lines.push(`║    ${msg}`);
        lines.push(`║    ◉ ${author}`);
        lines.push(`╟──────────────────────────────────────╢`);
    }

    if (commits.length === 0) {
        lines.push(`║  ⌀ কোনো commit পাওয়া যায়নি`);
        lines.push(`╟──────────────────────────────────────╢`);
    }

    lines.pop();
    lines.push(`╚══════════════════════════════════════╝`);
    return lines.join("\n");
}

function buildBranchList(branches, repo) {
    const lines = [
        `╔══════════════════════════════════════╗`,
        `║  ʙʀᴀɴᴄʜᴇꜱ  ·  ${truncate(repo, 16).padEnd(16)}  ║`,
        `╠══════════════════════════════════════╣`
    ];
    for (const b of branches) {
        const name    = truncate(b.name, 28);
        const sha     = shortSha(b.commit?.sha);
        const protect = b.protected ? " 🔒" : "";
        lines.push(`║  ◆ ${name.padEnd(28)} [${sha}]${protect}`);
    }
    lines.push(`╚══════════════════════════════════════╝`);
    lines.push(`  ᴛᴏᴛᴀʟ: ${branches.length} ʙʀᴀɴᴄʜ(ᴇꜱ)`);
    return lines.join("\n");
}

module.exports = {
    config: {
        name:        "gitlog",
        aliases:     ["gl", "glog"],
        version:     "1.0.0",
        author:      "SIFAT",
        countDown:   5,
        role:        2,
        description: { en: "ɢɪᴛʜᴜʙ ᴄᴏᴍᴍɪᴛ ʟᴏɢ ᴅᴇᴄʜᴏ" },
        category:    "owner",
        guide:       { en: "{pn} [n]                  — ʟᴀꜱᴛ N ᴄᴏᴍᴍɪᴛ (ᴅᴇꜰ: 10)\n"
                         + "{pn} show <sha>           — ᴄᴏᴍᴍɪᴛ ᴅᴇᴛᴀɪʟ\n"
                         + "{pn} file <path>          — ꜰɪʟᴇ ᴇʀ ʟᴏɢ\n"
                         + "{pn} branch [name] [n]    — ꜱᴘᴇꜱɪꜰɪᴋ ʙʀᴀɴᴄʜ ᴇʀ ʟᴏɢ\n"
                         + "{pn} branches             — ꜱᴏʙ ʙʀᴀɴᴄʜ ᴅᴇᴄʜᴏ\n"
                         + "{pn} search <keyword>     — ᴄᴏᴍᴍɪᴛ ᴍᴇꜱꜱᴇᴊ ꜱᴀʀᴄʜ" }
    },

    langs: {
        en: {
            noConfig:  "⌀ config.json ᴇ github.repo ꜱᴇᴛ ɴᴀɪ!",
            noToken:   "⌀ config.json ᴇ github.token ꜱᴇᴛ ɴᴀɪ!",
            noSha:     "⌀ commit SHA ᴅᴀᴏ! ᴜꜱᴀɢᴇ: {pn} show <sha>",
            noFile:    "⌀ ꜰɪʟᴇ ᴘᴀᴛʜ ᴅᴀᴏ! ᴜꜱᴀɢᴇ: {pn} file <path>",
            noKeyword: "⌀ keyword ᴅᴀᴏ! ᴜꜱᴀɢᴇ: {pn} search <keyword>",
            notFound:  "⌀ ᴋɪᴄʜᴜ ᴘᴀᴏᴡᴀ ɢᴇʟᴏ ɴᴀ!",
            apiErr:    "⌀ GitHub API ᴇʀʀᴏʀ [%1]: %2",
            fetching:  "⏳ ɢɪᴛʜᴜʙ ᴛʜᴇᴋᴇ ᴅᴀᴛᴀ ᴀɴᴄʜɪ..."
        }
    },

    onStart: async function ({ args, message, getLang, prefix, commandName }) {
        const cfg     = getGhCfg();
        const token   = cfg.token || process.env.GITHUB_TOKEN || "";
        const repoUrl = cfg.repo || "";

        if (!repoUrl) return message.reply(getLang("noConfig"));
        if (!token)   return message.reply(getLang("noToken"));

        const { owner, repo } = parseRepo(repoUrl);
        const branch          = cfg.branch || "main";
        const headers         = ghHeaders(token);
        const base            = `https://api.github.com/repos/${owner}/${repo}`;
        const sub             = (args[0] || "").toLowerCase();

        const pn = prefix + commandName;

        try {
            if (sub === "show") {
                const sha = args[1];
                if (!sha) return message.reply(getLang("noSha").replace("{pn}", pn));
                message.reply(getLang("fetching"));
                const { data } = await axios.get(`${base}/commits/${sha}`, { headers });
                return message.reply(buildCommitDetail(data, repo));
            }

            if (sub === "file") {
                const filePath = args.slice(1).join(" ");
                if (!filePath) return message.reply(getLang("noFile").replace("{pn}", pn));
                message.reply(getLang("fetching"));
                const { data } = await axios.get(`${base}/commits`, {
                    headers,
                    params: { path: filePath, sha: branch, per_page: 15 }
                });
                if (!data.length) return message.reply(getLang("notFound"));
                return message.reply(buildFileLog(data, filePath, repo));
            }

            if (sub === "branches") {
                message.reply(getLang("fetching"));
                const { data } = await axios.get(`${base}/branches`, {
                    headers,
                    params: { per_page: 30 }
                });
                return message.reply(buildBranchList(data, repo));
            }

            if (sub === "branch") {
                const targetBranch = args[1] || branch;
                const count        = Math.min(Math.max(parseInt(args[2]) || 10, 1), 30);
                message.reply(getLang("fetching"));
                const { data } = await axios.get(`${base}/commits`, {
                    headers,
                    params: { sha: targetBranch, per_page: count }
                });
                if (!data.length) return message.reply(getLang("notFound"));
                return message.reply(buildCommitList(data, targetBranch, repo));
            }

            if (sub === "search") {
                const keyword = args.slice(1).join(" ");
                if (!keyword) return message.reply(getLang("noKeyword").replace("{pn}", pn));
                message.reply(getLang("fetching"));
                const { data } = await axios.get(`${base}/commits`, {
                    headers,
                    params: { sha: branch, per_page: 100 }
                });
                const filtered = data.filter(c =>
                    c.commit.message.toLowerCase().includes(keyword.toLowerCase())
                ).slice(0, 15);
                if (!filtered.length) return message.reply(getLang("notFound"));
                return message.reply(buildCommitList(filtered, branch + ` [search: ${keyword}]`, repo));
            }

            const count = Math.min(Math.max(parseInt(args[0]) || 10, 1), 30);
            message.reply(getLang("fetching"));
            const { data } = await axios.get(`${base}/commits`, {
                headers,
                params: { sha: branch, per_page: count }
            });
            if (!data.length) return message.reply(getLang("notFound"));
            return message.reply(buildCommitList(data, branch, repo));

        } catch (err) {
            const status = err?.response?.status || "?";
            const msg    = err?.response?.data?.message || err.message || "unknown error";
            return message.reply(getLang("apiErr", status, msg));
        }
    }
};
