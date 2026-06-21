const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");

const CFG_FILE = path.join(process.cwd(), "config.json");

function readCfg() {
    try { return fs.readJsonSync(CFG_FILE); } catch { return {}; }
}

function saveCfg(cfg) {
    try { fs.writeJsonSync(CFG_FILE, cfg, { spaces: 2 }); } catch {}
}

function getGhCfg() {
    return readCfg().github || {};
}

function getAutopush(module) {
    return !!(getGhCfg().autopush?.[module]);
}

function setAutopush(module, value) {
    const cfg = readCfg();
    if (!cfg.github) cfg.github = {};
    if (!cfg.github.autopush) cfg.github.autopush = { cmd: false, event: false };
    cfg.github.autopush[module] = !!value;
    saveCfg(cfg);
}

function getAllAutopush() {
    return getGhCfg().autopush || { cmd: false, event: false };
}

async function pushFileToGitHub(filePath, module) {
    if (module && !getAutopush(module))
        return { skipped: true, reason: `autopush disabled for ${module}` };

    const cfg         = getGhCfg();
    const token       = cfg.token || process.env.GITHUB_TOKEN;
    if (!token) return { skipped: true, reason: "config.json > github.token খালি আছে!" };

    const repoUrl = cfg.repo || "";
    const match   = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (!match) return { skipped: true, reason: "invalid repo url in config" };

    const owner       = match[1];
    const repo        = match[2];
    const branch      = cfg.branch      || "main";
    const authorName  = cfg.authorName  || "GoatBot";
    const authorEmail = cfg.authorEmail || "goatbot@users.noreply.github.com";

    const rootDir     = process.cwd();
    const absPath     = path.normalize(filePath);
    const repoRelPath = absPath.replace(rootDir + path.sep, "").replace(/\\/g, "/");

    const fileContent = fs.readFileSync(absPath, "utf-8");
    const encoded     = Buffer.from(fileContent).toString("base64");

    const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${repoRelPath}`;
    const headers = {
        Authorization:          `token ${token}`,
        Accept:                 "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    };

    let sha;
    try {
        const existing = await axios.get(`${apiBase}?ref=${branch}`, { headers });
        sha = existing.data.sha;
    } catch (e) {
        if (e?.response?.status !== 404) throw e;
    }

    const fileName = path.basename(absPath);
    const payload  = {
        message:   sha ? `update: ${fileName}` : `add: ${fileName}`,
        content:   encoded,
        branch,
        committer: { name: authorName, email: authorEmail },
        author:    { name: authorName, email: authorEmail }
    };
    if (sha) payload.sha = sha;

    await axios.put(apiBase, payload, { headers });
    return { success: true, path: repoRelPath, action: sha ? "updated" : "created" };
}

module.exports = { pushFileToGitHub, getAutopush, setAutopush, getAllAutopush };
