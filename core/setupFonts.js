/**
 * Please don't change anything from here 🦆
 * Font registration for canvas — runs at startup.
 * Registers fonts from core/fonts/ so canvas commands render text correctly
 * on every host after a fresh GitHub clone + npm install.
 *
 * Fonts covered:
 *  - Liberation Sans/Mono/Serif  → "Arial", "monospace", "sans-serif", "serif"
 *  - Noto Sans Bengali           → "NotoSansBengali"  (Bangla ✓)
 *  - Noto Sans JP                → "NotoSansJP"       (Japanese ✓)
 *  - Noto Sans SC                → "NotoSansSC"       (Chinese Simplified ✓)
 *  - Noto Sans KR                → "NotoSansKR"       (Korean ✓)
 *  - Noto Emoji                  → "NotoEmoji"        (Emoji ✓)
 *  - Noto Sans                   → "NotoSans"
 *  - BeVietnamPro, Kanit, Rounded (project-bundled)
 */

const path = require("path");
const fs   = require("fs");

const FONTS_DIR = path.join(__dirname, "fonts");

function tryRegister(Canvas, file, family, opts = {}) {
    const full = path.join(FONTS_DIR, file);
    if (!fs.existsSync(full)) return;
    try {
        Canvas.registerFont(full, { family, ...opts });
    } catch (_) {}
}

module.exports = function setupFonts() {
    let Canvas;
    try {
        Canvas = require("canvas");
    } catch (_) {
        return;
    }

    // ── Liberation Sans  →  "Arial" + "sans-serif" aliases ─────────────────
    tryRegister(Canvas, "LiberationSans-Regular.ttf",    "Arial",      { weight: "normal", style: "normal" });
    tryRegister(Canvas, "LiberationSans-Bold.ttf",       "Arial",      { weight: "bold",   style: "normal" });
    tryRegister(Canvas, "LiberationSans-Italic.ttf",     "Arial",      { weight: "normal", style: "italic" });
    tryRegister(Canvas, "LiberationSans-BoldItalic.ttf", "Arial",      { weight: "bold",   style: "italic" });

    tryRegister(Canvas, "LiberationSans-Regular.ttf",    "sans-serif", { weight: "normal", style: "normal" });
    tryRegister(Canvas, "LiberationSans-Bold.ttf",       "sans-serif", { weight: "bold",   style: "normal" });
    tryRegister(Canvas, "LiberationSans-Italic.ttf",     "sans-serif", { weight: "normal", style: "italic" });
    tryRegister(Canvas, "LiberationSans-BoldItalic.ttf", "sans-serif", { weight: "bold",   style: "italic" });

    // ── Liberation Mono  →  "monospace" alias ──────────────────────────────
    tryRegister(Canvas, "LiberationMono-Regular.ttf",    "monospace",  { weight: "normal", style: "normal" });
    tryRegister(Canvas, "LiberationMono-Bold.ttf",       "monospace",  { weight: "bold",   style: "normal" });
    tryRegister(Canvas, "LiberationMono-Italic.ttf",     "monospace",  { weight: "normal", style: "italic" });
    tryRegister(Canvas, "LiberationMono-BoldItalic.ttf", "monospace",  { weight: "bold",   style: "italic" });

    // ── Liberation Serif  →  "serif" alias ─────────────────────────────────
    tryRegister(Canvas, "LiberationSerif-Regular.ttf",   "serif",      { weight: "normal", style: "normal" });
    tryRegister(Canvas, "LiberationSerif-Bold.ttf",      "serif",      { weight: "bold",   style: "normal" });

    // ── Noto Sans Bengali  →  বাংলা ✓ ──────────────────────────────────────
    tryRegister(Canvas, "NotoSansBengali-Regular.ttf",   "NotoSansBengali", { weight: "normal", style: "normal" });
    tryRegister(Canvas, "NotoSansBengali-Bold.ttf",      "NotoSansBengali", { weight: "bold",   style: "normal" });

    // ── Noto Sans JP  →  日本語 ✓ ───────────────────────────────────────────
    tryRegister(Canvas, "NotoSansJP-Regular.otf",        "NotoSansJP",      { weight: "normal", style: "normal" });
    tryRegister(Canvas, "NotoSansJP-Bold.otf",           "NotoSansJP",      { weight: "bold",   style: "normal" });

    // ── Noto Sans SC  →  中文 ✓ ─────────────────────────────────────────────
    tryRegister(Canvas, "NotoSansSC-Regular.otf",        "NotoSansSC",      { weight: "normal", style: "normal" });
    tryRegister(Canvas, "NotoSansSC-Bold.otf",           "NotoSansSC",      { weight: "bold",   style: "normal" });

    // ── Noto Sans KR  →  한국어 ✓ ───────────────────────────────────────────
    tryRegister(Canvas, "NotoSansKR-Regular.otf",        "NotoSansKR",      { weight: "normal", style: "normal" });

    // ── Noto Emoji  →  Emoji ✓ ──────────────────────────────────────────────
    tryRegister(Canvas, "NotoEmoji-Regular.ttf",         "NotoEmoji",       { weight: "normal", style: "normal" });

    // ── Noto Sans (general Unicode) ─────────────────────────────────────────
    tryRegister(Canvas, "NotoSans-Regular.ttf",          "NotoSans",        { weight: "normal", style: "normal" });
    tryRegister(Canvas, "NotoSans-Bold.ttf",             "NotoSans",        { weight: "bold",   style: "normal" });
    tryRegister(Canvas, "NotoSans-SemiBold.ttf",         "NotoSans",        { weight: "600",    style: "normal" });

    // ── BeVietnamPro ────────────────────────────────────────────────────────
    tryRegister(Canvas, "BeVietnamPro-Regular.ttf",      "BeVietnamPro",    { weight: "normal", style: "normal" });
    tryRegister(Canvas, "BeVietnamPro-SemiBold.ttf",     "BeVietnamPro",    { weight: "600",    style: "normal" });
    tryRegister(Canvas, "BeVietnamPro-Bold.ttf",         "BeVietnamPro",    { weight: "bold",   style: "normal" });

    // ── Kanit ───────────────────────────────────────────────────────────────
    tryRegister(Canvas, "Kanit-SemiBoldItalic.ttf",      "Kanit",           { weight: "600",    style: "italic" });

    // ── Rounded (OTF) ───────────────────────────────────────────────────────
    tryRegister(Canvas, "Rounded.otf",                   "Rounded",         { weight: "normal", style: "normal" });
};
