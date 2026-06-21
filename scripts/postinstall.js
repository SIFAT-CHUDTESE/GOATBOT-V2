#!/usr/bin/env node

const { execSync, spawnSync } = require("child_process");
const fs   = require("fs");
const path = require("path");
const https = require("https");

const ROOT      = path.join(__dirname, "..");
const FONTS_DIR = path.join(ROOT, "core", "fonts");

function log(msg)  { console.log(`[postinstall] ${msg}`); }
function warn(msg) { console.warn(`[postinstall] ⚠  ${msg}`); }

function download(url, dest) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(dest) && fs.statSync(dest).size > 10_000) {
            return resolve(false);
        }
        const tmp = dest + ".tmp";
        const file = fs.createWriteStream(tmp);
        const get = (u) => https.get(u, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return get(res.headers.location);
            }
            if (res.statusCode !== 200) {
                file.close();
                fs.unlink(tmp, () => {});
                return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
            }
            res.pipe(file);
            file.on("finish", () => {
                file.close(() => {
                    fs.renameSync(tmp, dest);
                    resolve(true);
                });
            });
        }).on("error", (e) => {
            file.close();
            fs.unlink(tmp, () => {});
            reject(e);
        });
        get(url);
    });
}

log("Rebuilding canvas native bindings…");
try {
    const r = spawnSync("npm", ["rebuild", "canvas", "--update-binary"], {
        cwd: ROOT, stdio: "inherit", shell: true
    });
    if (r.status === 0) {
        log("✅ canvas rebuild OK");
    } else {
        warn("canvas rebuild exited with code " + r.status + " (may still work)");
    }
} catch (e) {
    warn("canvas rebuild failed: " + e.message);
}

fs.mkdirSync(FONTS_DIR, { recursive: true });

const NIX_FONT_DIRS = [
    "/run/current-system/sw/share/fonts",
    "/nix/var/nix/profiles/default/share/fonts",
    "/home/runner/.nix-profile/share/fonts",
    "/usr/share/fonts",
];

const NIX_FONT_PATTERNS = [
    /liberation.*\.ttf$/i,
    /noto.*bengali.*\.ttf$/i,
    /noto.*emoji.*\.ttf$/i,
    /noto.*cjk.*\.otf$/i,
    /noto.*jp.*\.otf$/i,
    /noto.*sc.*\.otf$/i,
    /noto.*kr.*\.otf$/i,
    /noto.*sans.*\.ttf$/i,
    /dejavu.*\.ttf$/i,
    /freemono.*\.ttf$/i,
    /freesans.*\.ttf$/i,
];

function walkFonts(dir) {
    try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walkFonts(full);
            } else if (NIX_FONT_PATTERNS.some(p => p.test(entry.name))) {
                const dest = path.join(FONTS_DIR, entry.name);
                if (!fs.existsSync(dest)) {
                    try { fs.copyFileSync(full, dest); } catch {}
                }
            }
        }
    } catch {}
}

log("Scanning Nix font directories…");
for (const dir of NIX_FONT_DIRS) walkFonts(dir);
log("Nix font scan complete.");

const GOOGLE_RAW = "https://github.com/googlefonts";

const FONTS_TO_DOWNLOAD = [
    { file: "LiberationSans-Regular.ttf",    url: "https://github.com/liberationfonts/liberation-fonts/raw/main/src/LiberationSans-Regular.ttf" },
    { file: "LiberationSans-Bold.ttf",       url: "https://github.com/liberationfonts/liberation-fonts/raw/main/src/LiberationSans-Bold.ttf" },
    { file: "LiberationMono-Regular.ttf",    url: "https://github.com/liberationfonts/liberation-fonts/raw/main/src/LiberationMono-Regular.ttf" },
    { file: "LiberationMono-Bold.ttf",       url: "https://github.com/liberationfonts/liberation-fonts/raw/main/src/LiberationMono-Bold.ttf" },
    { file: "LiberationSans-Italic.ttf",     url: "https://github.com/liberationfonts/liberation-fonts/raw/main/src/LiberationSans-Italic.ttf" },
    { file: "LiberationSans-BoldItalic.ttf", url: "https://github.com/liberationfonts/liberation-fonts/raw/main/src/LiberationSans-BoldItalic.ttf" },
    { file: "LiberationMono-Italic.ttf",     url: "https://github.com/liberationfonts/liberation-fonts/raw/main/src/LiberationMono-Italic.ttf" },
    { file: "LiberationMono-BoldItalic.ttf", url: "https://github.com/liberationfonts/liberation-fonts/raw/main/src/LiberationMono-BoldItalic.ttf" },
    { file: "LiberationSerif-Regular.ttf",   url: "https://github.com/liberationfonts/liberation-fonts/raw/main/src/LiberationSerif-Regular.ttf" },
    { file: "LiberationSerif-Bold.ttf",      url: "https://github.com/liberationfonts/liberation-fonts/raw/main/src/LiberationSerif-Bold.ttf" },
    { file: "NotoSansBengali-Regular.ttf",   url: `${GOOGLE_RAW}/noto-fonts/raw/main/hinted/ttf/NotoSansBengali/NotoSansBengali-Regular.ttf` },
    { file: "NotoSansBengali-Bold.ttf",      url: `${GOOGLE_RAW}/noto-fonts/raw/main/hinted/ttf/NotoSansBengali/NotoSansBengali-Bold.ttf` },
    { file: "NotoSansJP-Regular.otf",        url: `${GOOGLE_RAW}/noto-cjk/raw/main/Sans/SubsetOTF/JP/NotoSansJP-Regular.otf` },
    { file: "NotoSansJP-Bold.otf",           url: `${GOOGLE_RAW}/noto-cjk/raw/main/Sans/SubsetOTF/JP/NotoSansJP-Bold.otf` },
    { file: "NotoSansSC-Regular.otf",        url: `${GOOGLE_RAW}/noto-cjk/raw/main/Sans/SubsetOTF/SC/NotoSansSC-Regular.otf` },
    { file: "NotoSansSC-Bold.otf",           url: `${GOOGLE_RAW}/noto-cjk/raw/main/Sans/SubsetOTF/SC/NotoSansSC-Bold.otf` },
    { file: "NotoSansKR-Regular.otf",        url: `${GOOGLE_RAW}/noto-cjk/raw/main/Sans/SubsetOTF/KR/NotoSansKR-Regular.otf` },
    { file: "NotoEmoji-Regular.ttf",         url: `${GOOGLE_RAW}/noto-emoji/raw/main/fonts/NotoEmoji-Regular.ttf` },
];

log("Checking / downloading missing fonts…");

(async () => {
    try {
        const results = await Promise.allSettled(
            FONTS_TO_DOWNLOAD.map(async ({ file, url }) => {
                const dest = path.join(FONTS_DIR, file);
                try {
                    const downloaded = await download(url, dest);
                    if (downloaded) log(`  ↓ Downloaded ${file}`);
                } catch (e) {
                    warn(`  ✗ Could not download ${file}: ${e.message}`);
                }
            })
        );

        const ok  = results.filter(r => r.status === "fulfilled").length;
        const bad = results.filter(r => r.status === "rejected").length;
        log(`Font download complete — ${ok} OK, ${bad} failed.`);
        log("✅ postinstall done.");


        process.exit(0);
    } catch (err) {
        warn(`postinstall error: ${err.message}`);
        process.exit(0);
    }
})();
