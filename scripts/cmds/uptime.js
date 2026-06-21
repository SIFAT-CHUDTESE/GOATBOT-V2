const { createCanvas } = require("canvas");
const os   = require("os");
const fs   = require("fs-extra");
const path = require("path");

const DEVELOPER   = "SIFAT";
const BOT_VERSION = "v1.0";

const CYAN    = "#00e5ff";
const MAGENTA = "#ff00cc";
const GREEN   = "#39ff14";
const YELLOW  = "#ffe600";
const WHITE   = "#e8f8ff";
const DIM     = "#5a8fa8";
const BG      = "#030e16";
const BG2     = "#071520";
const ARCBG   = "#0a1e2a";
const PURPLE  = "#7c3aed";
const LIME    = "#aaff00";

function fmt(s) {
  s = Math.floor(s);
  const d   = Math.floor(s / 86400);
  const h   = Math.floor((s % 86400) / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p   = [];
  if (d > 0) p.push(`${d}d`);
  p.push(`${h}h`, `${m}m`, `${sec}s`);
  return p.join(" ");
}

function cpuUsage() {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  for (const c of cpus) {
    for (const v of Object.values(c.times)) total += v;
    idle += c.times.idle;
  }
  return Math.max(0, Math.min(100, 100 - (idle / total) * 100));
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x, y + h - r,     r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x,     y,     x + r, y,          r);
  ctx.closePath();
}

function glow(ctx, c, b) { ctx.shadowColor = c; ctx.shadowBlur = b; }
function noGl(ctx)        { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; }

function hbar(ctx, x, y, w, h, pct, ca, cb) {
  ctx.save();
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = ARCBG;
  ctx.fill();
  const fw = Math.max(h, w * Math.min(pct, 1));
  const g  = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, ca);
  g.addColorStop(1, cb);
  rr(ctx, x, y, fw, h, h / 2);
  glow(ctx, ca, 8);
  ctx.fillStyle = g;
  ctx.fill();
  noGl(ctx);
  ctx.restore();
}

function gauge(ctx, cx, cy, R, pct, ca, cb, lbl, val) {
  const AW    = 13;
  const start = -Math.PI / 2;
  const end   = start + Math.PI * 2 * Math.min(pct, 1);

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = ARCBG;
  ctx.lineWidth   = AW + 6;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R - AW / 2 - 3, 0, Math.PI * 2);
  ctx.fillStyle = "#020c10"; ctx.fill();
  ctx.restore();

  if (pct > 0.005) {
    const ag = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
    ag.addColorStop(0,   ca);
    ag.addColorStop(0.5, PURPLE);
    ag.addColorStop(1,   cb);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, start, end);
    glow(ctx, ca, 18);
    ctx.strokeStyle = ag;
    ctx.lineWidth   = AW;
    ctx.lineCap     = "round";
    ctx.stroke();
    noGl(ctx);
    ctx.restore();
  }

  ctx.save();
  glow(ctx, WHITE, 4);
  ctx.fillStyle  = WHITE;
  ctx.font       = "bold 21px monospace";
  ctx.textAlign  = "center";
  ctx.fillText(val, cx, cy + 7);
  noGl(ctx); ctx.restore();

  ctx.save();
  ctx.fillStyle = DIM;
  ctx.font      = "11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(lbl, cx, cy + 24);
  ctx.restore();
}

async function drawCard(d) {
  const W = 920;

  const ROWS      = 11;
  const ROW_H      = 44;
  const ROW_Y0    = 76;
  const STATS_END = ROW_Y0 + ROWS * ROW_H;

  const HB_Y    = STATS_END + 18;
  const HB_H    = 10;

  const BOT_SEP = HB_Y + HB_H + 28;
  const BOT_TXT = BOT_SEP + 28;
  const TS_Y    = BOT_TXT + 18;

  const H = TS_Y + 18;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, BG);
  bg.addColorStop(1, BG2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(0,229,255,0.022)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  const rg1 = ctx.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, 400);
  rg1.addColorStop(0, "rgba(124,58,237,0.09)"); rg1.addColorStop(1, "transparent");
  ctx.fillStyle = rg1; ctx.fillRect(0, 0, W, H);

  const rg2 = ctx.createRadialGradient(0, H, 0, 0, H, 350);
  rg2.addColorStop(0, "rgba(0,229,255,0.07)"); rg2.addColorStop(1, "transparent");
  ctx.fillStyle = rg2; ctx.fillRect(0, 0, W, H);

  for (let y = 0; y < H; y += 4) {
    ctx.save(); ctx.globalAlpha = 0.018;
    ctx.fillStyle = "#000"; ctx.fillRect(0, y, W, 2);
    ctx.restore();
  }

  ctx.save();
  glow(ctx, CYAN, 20);
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 2;
  rr(ctx, 6, 6, W - 12, H - 12, 12);
  ctx.stroke();
  noGl(ctx);
  ctx.strokeStyle = "rgba(0,229,255,0.12)";
  ctx.lineWidth = 1;
  rr(ctx, 11, 11, W - 22, H - 22, 9);
  ctx.stroke();
  ctx.restore();

  const HDR_Y = 48;

  ctx.save();
  glow(ctx, CYAN, 14);
  ctx.fillStyle  = CYAN;
  ctx.font       = "bold 24px monospace";
  ctx.textAlign  = "left";
  ctx.fillText("◈", 26, HDR_Y);
  noGl(ctx);
  ctx.fillStyle = WHITE;
  ctx.font      = "bold 24px monospace";
  ctx.fillText("SYSTEM  //  STATUS", 60, HDR_Y);
  ctx.restore();

  const PW = 156, PH = 28, PX = W - 24 - PW, PY = HDR_Y - 21;
  ctx.save();
  glow(ctx, GREEN, 12);
  rr(ctx, PX, PY, PW, PH, PH / 2);
  ctx.fillStyle = "rgba(30,60,20,0.7)";
  ctx.fill();
  ctx.strokeStyle = GREEN; ctx.lineWidth = 1.6;
  ctx.stroke();
  noGl(ctx);
  ctx.fillStyle  = GREEN;
  ctx.font       = "bold 12px monospace";
  ctx.textAlign  = "center";
  ctx.fillText(`${BOT_VERSION}  ●  ONLINE`, PX + PW / 2, PY + 18);
  ctx.restore();

  ctx.save();
  glow(ctx, CYAN, 6);
  ctx.strokeStyle = "rgba(0,229,255,0.5)";
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(20, 64); ctx.lineTo(W - 20, 64); ctx.stroke();
  noGl(ctx); ctx.restore();

  const stats = [
    { label: "BOT UPTIME",  value: d.botUptime,   color: CYAN    },
    { label: "SYS UPTIME",  value: d.sysUptime,   color: MAGENTA },
    { label: "CPU MODEL",   value: d.cpuModel,    color: CYAN    },
    { label: "RAM USAGE",   value: d.ramUsage,    color: MAGENTA },
    { label: "PLATFORM",    value: d.platform,    color: CYAN    },
    { label: "NODE.JS",     value: d.nodeVersion, color: LIME    },
    { label: "HOSTNAME",    value: d.hostname,    color: LIME    },
    { label: "PING",        value: d.ping,        color: MAGENTA },
    { label: "BOT MEMORY",  value: d.botMemory,   color: CYAN    },
    { label: "COMMANDS",    value: `${d.cmdCount} loaded`, color: CYAN },
    { label: "DEVELOPER",   value: d.developer,   color: WHITE, bold: true },
  ];

  const BUL_X  = 30;
  const LBL_X  = 48;
  const LBL_W  = 124;
  const ARR_X  = LBL_X + LBL_W + 8;
  const VAL_X  = ARR_X + 18;
  const VAL_MAX = 550 - VAL_X;

  for (let i = 0; i < stats.length; i++) {
    const row  = stats[i];
    const ry   = ROW_Y0 + i * ROW_H;
    const midY = ry + ROW_H / 2;

    if (i % 2 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.035;
      ctx.fillStyle   = row.color;
      ctx.fillRect(22, ry, 534, ROW_H);
      ctx.restore();
    }

    ctx.save();
    glow(ctx, row.color, 7);
    ctx.strokeStyle = row.color;
    ctx.lineWidth   = 1.6;
    ctx.beginPath();
    ctx.arc(BUL_X, midY, 5, 0, Math.PI * 2);
    ctx.stroke();
    noGl(ctx); ctx.restore();

    ctx.save();
    glow(ctx, row.color, 5);
    ctx.fillStyle  = row.color;
    ctx.font       = "bold 13px monospace";
    ctx.textAlign  = "left";
    ctx.fillText(row.label, LBL_X, midY + 5);
    noGl(ctx); ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(80,130,155,0.55)";
    ctx.font      = "11px monospace";
    ctx.fillText("▶", ARR_X, midY + 4);
    ctx.restore();

    ctx.save();
    if (row.bold) {
      glow(ctx, WHITE, 5);
      ctx.fillStyle = "#ffffff";
      ctx.font      = "bold 13px monospace";
    } else {
      ctx.fillStyle = "#7ab8d0";
      ctx.font      = "13px monospace";
    }
    ctx.fillText(String(row.value), VAL_X, midY + 5, VAL_MAX);
    noGl(ctx); ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = "rgba(0,229,255,0.2)";
  ctx.lineWidth   = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(564, 70); ctx.lineTo(564, H - 70);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  const RP   = 574;
  const RPW  = W - RP - 20;
  const G1X  = RP + 78;
  const G2X  = RP + 78 + 170;
  const GY   = 210;
  const GR   = 68;

  ctx.save();
  ctx.fillStyle  = DIM;
  ctx.font       = "bold 11px monospace";
  ctx.textAlign  = "center";
  ctx.fillText("RAM USAGE", G1X, GY - GR - 14);
  ctx.fillText("CPU USAGE", G2X, GY - GR - 14);
  ctx.restore();

  gauge(ctx, G1X, GY, GR, d.ramPct / 100, CYAN,  MAGENTA, "RAM", `${d.ramPct.toFixed(0)}%`);
  gauge(ctx, G2X, GY, GR, d.cpuPct / 100, GREEN, YELLOW,  "CPU", `${d.cpuPct.toFixed(0)}%`);

  const SBW = 134, SBH = 8, SBY = GY + GR + 22;

  ctx.save();
  ctx.fillStyle = DIM;
  ctx.font      = "10px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`${d.ramGB} / ${d.ramTotalGB} GB`, G1X - SBW / 2, SBY - 9);
  ctx.restore();
  hbar(ctx, G1X - SBW / 2, SBY, SBW, SBH, d.ramPct / 100, CYAN, MAGENTA);

  ctx.save();
  ctx.fillStyle = DIM;
  ctx.font      = "10px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`${d.cpuCores} cores  •  ${d.cpuPct.toFixed(1)}%`, G2X - SBW / 2, SBY - 9);
  ctx.restore();
  hbar(ctx, G2X - SBW / 2, SBY, SBW, SBH, d.cpuPct / 100, GREEN, YELLOW);

  const BDLIST = [
    { val: String(d.cmdCount), sub: "CMDS",    bdr: CYAN,    bg: "rgba(0,229,255,0.08)"    },
    { val: d.uptimePct + "%",  sub: "UPTIME",  bdr: MAGENTA, bg: "rgba(255,0,204,0.08)"    },
    { val: String(d.threads),  sub: "THREADS", bdr: GREEN,   bg: "rgba(57,255,20,0.08)"    },
  ];
  const BDW  = 96, BDH = 54, BDG = 10;
  const bdTW = BDLIST.length * BDW + (BDLIST.length - 1) * BDG;
  let   bdx  = RP + (RPW - bdTW) / 2;
  const BDY  = SBY + 30;

  for (const b of BDLIST) {
    ctx.save();
    rr(ctx, bdx, BDY, BDW, BDH, 7);
    ctx.fillStyle = b.bg;
    ctx.fill();
    glow(ctx, b.bdr, 10);
    ctx.strokeStyle = b.bdr;
    ctx.lineWidth   = 1.6;
    ctx.stroke();
    noGl(ctx);
    glow(ctx, WHITE, 3);
    ctx.fillStyle  = "#ffffff";
    ctx.font       = "bold 18px monospace";
    ctx.textAlign  = "center";
    ctx.fillText(b.val, bdx + BDW / 2, BDY + 26);
    noGl(ctx);
    ctx.fillStyle = b.bdr;
    ctx.font      = "10px monospace";
    ctx.fillText(b.sub, bdx + BDW / 2, BDY + 43);
    ctx.restore();

    bdx += BDW + BDG;
  }

  ctx.save();
  ctx.fillStyle  = DIM;
  ctx.font       = "10px monospace";
  ctx.textAlign  = "left";
  ctx.fillText("BOT UPTIME HEALTH", 22, HB_Y - 8);
  ctx.textAlign  = "right";
  ctx.fillText(`${d.uptimePct}%  healthy`, W - 22, HB_Y - 8);
  ctx.restore();
  hbar(ctx, 22, HB_Y, W - 44, HB_H, d.uptimePct / 100, CYAN, MAGENTA);

  ctx.save();
  glow(ctx, MAGENTA, 8);
  ctx.strokeStyle = "rgba(255,0,204,0.6)";
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(20, BOT_SEP - 4); ctx.lineTo(W - 20, BOT_SEP - 4);
  ctx.stroke();
  noGl(ctx); ctx.restore();

  ctx.save();
  glow(ctx, GREEN, 14);
  ctx.fillStyle  = GREEN;
  ctx.font       = "bold 14px monospace";
  ctx.textAlign  = "center";
  ctx.fillText("⚡  ALL SYSTEMS NOMINAL  —  BOT IS ALIVE & RUNNING  ⚡", W / 2, BOT_TXT);
  noGl(ctx); ctx.restore();

  const now = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka", hour12: false });
  ctx.save();
  ctx.fillStyle  = "rgba(90,143,168,0.65)";
  ctx.font       = "10px monospace";
  ctx.textAlign  = "right";
  ctx.fillText(`⏲ ${now} (BD)`, W - 22, TS_Y);
  ctx.restore();

  return canvas;
}

async function sendCard(message, canvas) {
  const tmp = path.join(__dirname, "tmp");
  await fs.ensureDir(tmp);
  const p = path.join(tmp, `uptime_${Date.now()}.png`);
  await fs.writeFile(p, canvas.toBuffer("image/png"));
  try {
    await message.reply({ attachment: fs.createReadStream(p) });
  } finally {
    setTimeout(() => fs.remove(p).catch(() => {}), 60000);
  }
}

module.exports = {
  config: {
    name: "uptime",
    aliases: ["ut", "status", "ping", "alive"],
    version: "1.0.0",
    author: "SIFAT",
    countDown: 5,
    role: 0,
    description: { en: "Advanced system & bot status card" },
    category: "info",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message, event }) {
    const ping = Math.max(0, Date.now() - (event.timestamp || Date.now()));

    const mem   = process.memoryUsage();
    const heap  = (mem.heapUsed / 1024 / 1024).toFixed(1);

    const total  = os.totalmem();
    const free   = os.freemem();
    const used   = total - free;
    const ramPct = (used / total) * 100;
    const usedMB = Math.round(used / 1024 / 1024);
    const totMB  = Math.round(total / 1024 / 1024);
    const ramGB  = (used   / 1073741824).toFixed(2);
    const totGB  = (total / 1073741824).toFixed(2);

    const cpus   = os.cpus();
    const cpuMod = `${(cpus[0]?.model || "Unknown").trim()} ×${cpus.length}`;
    const cpuPct = cpuUsage();

    const botSec    = process.uptime();
    const sysSec    = os.uptime();
    const uptimePct = Math.min(100, (botSec / sysSec) * 100).toFixed(1);

    const cmdCount = global.GoatBot?.commands?.size || 0;
    const threads  = global.db?.allThreadData?.length
                  || global.GoatBot?.data?.threadInfo?.size
                  || 0;

    const hn = os.hostname();

    await sendCard(message, await drawCard({
      botUptime:    fmt(botSec),
      sysUptime:    fmt(sysSec),
      cpuModel:     cpuMod.length > 36 ? cpuMod.slice(0, 34) + "…" : cpuMod,
      ramUsage:     `${usedMB} / ${totMB} MB`,
      ramPct:       parseFloat(ramPct.toFixed(1)),
      ramGB,
      ramTotalGB:   totGB,
      platform:     `${os.platform()} (${os.arch()})`,
      nodeVersion:  process.version,
      hostname:     hn.length > 30 ? hn.slice(0, 28) + "…" : hn,
      ping:         `${ping} ms`,
      botMemory:    `${heap} MB`,
      developer:    DEVELOPER,
      cmdCount,
      cpuPct:       parseFloat(cpuPct.toFixed(1)),
      cpuCores:     cpus.length,
      uptimePct:    parseFloat(uptimePct),
      threads,
    }));
  }
};
