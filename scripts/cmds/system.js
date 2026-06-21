"use strict";

const os         = require("os");
const GIFEncoder = require("gifencoder");
const { createCanvas } = require("canvas");
const fs         = require("fs-extra");
const path       = require("path");
const si         = require("systeminformation");

const TMP = path.join(process.cwd(), "core/database/cache/hexsys");
fs.ensureDirSync(TMP);

function fmtUptime(s) {
    s = Math.floor(s);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
          m = Math.floor((s % 3600) / 60), sc = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sc}s`;
    return `${sc}s`;
}

function fmtGB(b) { return (b / 1073741824).toFixed(1) + "G"; }
function fmtMB(b) { return (b / 1048576).toFixed(0) + "MB"; }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function hsl(h, s, l, a = 1) { return `hsla(${h % 360},${s}%,${l}%,${a})`; }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

async function getCPU() {
    return new Promise(res => {
        const s = os.cpus();
        setTimeout(() => {
            const e = os.cpus();
            let idle = 0, total = 0;
            for (let i = 0; i < e.length; i++) {
                for (const k of Object.keys(e[i].times)) total += e[i].times[k] - s[i].times[k];
                idle += e[i].times.idle - s[i].times.idle;
            }
            res(total > 0 ? clamp(((total - idle) / total) * 100, 0, 100) : 0);
        }, 150);
    });
}

async function getDisk() {
    try {
        const data = await si.fsSize();
        const d = data.find(x => x.mount === "/" || x.fs?.toLowerCase().startsWith("c:")) || data[0];
        if (d) return { pct: clamp(d.use || 0, 0, 100), total: fmtGB(d.size || 0), used: fmtGB(d.used || 0) };
    } catch {}
    return { pct: 0, total: "N/A", used: "N/A" };
}

async function getNet() {
    try {
        const [a] = await si.networkStats();
        if (a) return { rx: ((a.rx_sec || 0) / 1024).toFixed(1) + "KB/s", tx: ((a.tx_sec || 0) / 1024).toFixed(1) + "KB/s" };
    } catch {}
    return { rx: "0KB/s", tx: "0KB/s" };
}

function hexPoints(cx, cy, r, rot = 0) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6 + rot;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
}

function hexPath(ctx, cx, cy, r, rot = 0) {
    const pts = hexPoints(cx, cy, r, rot);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
}

function drawHex(ctx, cx, cy, r, fill, stroke, lw = 2, glowColor = null, glowBlur = 0, rot = 0) {
    if (glowColor && glowBlur > 0) { ctx.shadowColor = glowColor; ctx.shadowBlur = glowBlur; }
    hexPath(ctx, cx, cy, r, rot);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
    ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
}

function progressArc(ctx, cx, cy, r, pct, color, bgColor, lw) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = bgColor; ctx.lineWidth = lw; ctx.stroke();
    if (pct > 0) {
        const end = -Math.PI / 2 + 2 * Math.PI * (pct / 100);
        ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, end);
        ctx.strokeStyle = color; ctx.lineWidth = lw;
        ctx.shadowColor = color; ctx.shadowBlur = 16;
        ctx.lineCap = "round"; ctx.stroke();
        ctx.shadowBlur = 0; ctx.lineCap = "butt";
    }
}

function drawConnector(ctx, cx, cy, tx, ty, r1, r2, dotFrac, color, alpha) {
    const dx = tx - cx, dy = ty - cy, dist = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / dist, uy = dy / dist;
    const x1 = cx + ux * r1, y1 = cy + uy * r1;
    const x2 = tx - ux * r2, y2 = ty - uy * r2;
    ctx.save();
    ctx.globalAlpha = alpha * 0.28;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = alpha;
    for (let d = 0; d < 4; d++) {
        const t  = (dotFrac + d / 4) % 1;
        const et = easeInOut(t);
        const px = lerp(x1, x2, et), py = lerp(y1, y2, et);
        const sz = 1.8 + 2.2 * Math.sin(t * Math.PI);
        ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = sz * 7;
        ctx.fill(); ctx.shadowBlur = 0;
    }
    ctx.restore();
}

function drawHexGrid(ctx, W, H, alpha) {
    const s = 34;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(0,170,255,1)"; ctx.lineWidth = 0.22;
    for (let row = -1; row < H / (s * 1.5) + 2; row++) {
        for (let col = -1; col < W / (s * 1.73) + 2; col++) {
            const ox = row % 2 === 0 ? 0 : s * 0.866;
            hexPath(ctx, col * s * 1.73 + ox, row * s * 1.5, s * 0.9);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function drawScanLine(ctx, W, H, f, frames) {
    const y = ((f / frames) * (H + 80)) - 40;
    ctx.save();
    const g = ctx.createLinearGradient(0, y - 50, 0, y + 50);
    g.addColorStop(0,   "rgba(0,210,255,0)");
    g.addColorStop(0.5, "rgba(0,210,255,0.028)");
    g.addColorStop(1,   "rgba(0,210,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, y - 50, W, 100);
    ctx.restore();
}

function drawOrbitRing(ctx, cx, cy, r, ticks, color, alpha, f, speed, frames) {
    const rot = (f / frames) * Math.PI * 2 * speed;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = color; ctx.lineWidth = 0.5; ctx.stroke();
    for (let i = 0; i < ticks; i++) {
        const a   = (Math.PI * 2 / ticks) * i + rot;
        const ix  = cx + r * Math.cos(a), iy = cy + r * Math.sin(a);
        const len = i % 6 === 0 ? 8 : i % 3 === 0 ? 4 : 2;
        ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix + Math.cos(a) * len, iy + Math.sin(a) * len);
        ctx.strokeStyle = color;
        ctx.lineWidth = i % 6 === 0 ? 1.6 : 0.5; ctx.stroke();
    }
    ctx.restore();
}

function drawCornerBrackets(ctx, x, y, w, h, sz, color, lw = 1.5) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw;
    const sets = [
        [[x, y+sz],[x, y],[x+sz, y]],
        [[x+w-sz, y],[x+w, y],[x+w, y+sz]],
        [[x+w, y+h-sz],[x+w, y+h],[x+w-sz, y+h]],
        [[x+sz, y+h],[x, y+h],[x, y+h-sz]],
    ];
    for (const [[ax,ay],[bx,by],[cx2,cy2]] of sets) {
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx2, cy2); ctx.stroke();
    }
    ctx.restore();
}

function drawSignalBars(ctx, x, y, pct, color, w = 20, h = 12, bars = 5) {
    for (let i = 0; i < bars; i++) {
        const bh = (h / bars) * (i + 1);
        const bx = x + i * (w / bars + 1.2);
        const by = y + h - bh;
        const active = (i / bars) < (pct / 100);
        ctx.beginPath(); ctx.rect(bx, by, w / bars - 0.5, bh);
        ctx.fillStyle = active ? color : "rgba(255,255,255,0.06)";
        if (active) { ctx.shadowColor = color; ctx.shadowBlur = 5; }
        ctx.fill(); ctx.shadowBlur = 0;
    }
}

module.exports = {
    config: {
        name:        "system",
        aliases:     ["sysinfo", "sys"],
        version:     "1.0.0",
        author:      "SIFAT",
        countDown:   20,
        role:        0,
        description: { en: "ᴀᴅᴠᴀɴᴄᴇᴅ ᴀɴɪᴍᴀᴛᴇᴅ ʜᴇxᴀɢᴏɴᴀʟ ꜱʏꜱᴛᴇᴍ ᴅᴀꜱʜʙᴏᴀʀᴅ ɢɪꜰ" },
        category:    "info",
        guide:       { en: "   {pn}" },
    },

    onStart: async function ({ message, event, api }) {
        const { messageID, threadID } = event;
        try { api.setMessageReaction("⏳", messageID, () => {}, true); } catch {}

        const [cpuPct, disk, net] = await Promise.all([getCPU(), getDisk(), getNet()]);

        const ramTotal = os.totalmem();
        const ramUsed  = ramTotal - os.freemem();
        const ramPct   = (ramUsed / ramTotal) * 100;
        const cores    = os.cpus().length;
        const cpuModel = (os.cpus()[0]?.model || "Unknown CPU").trim();
        const cpuShort = cpuModel.replace(/\(R\)|\(TM\)|CPU|@.*/gi, "").trim().slice(0, 20);
        const botUpSec = process.uptime();
        const sysUpSec = os.uptime();
        const botUpStr = fmtUptime(botUpSec);
        const sysUpStr = fmtUptime(sysUpSec);
        const totalRam = fmtGB(ramTotal);
        const usedRam  = fmtGB(ramUsed);
        const heapMB   = fmtMB(process.memoryUsage().heapUsed);
        const nodeVer  = process.version;
        const pid      = process.pid;
        const cmds     = global.GoatBot?.commands?.size || 0;
        const threads  = global.db?.allThreadData?.length || global.GoatBot?.data?.threadInfo?.size || 0;
        const users    = global.db?.allUserData?.length || 0;
        const prefix   = global.GoatBot?.config?.prefix || ".";

        const W = 960, H = 580;
        const CX = W / 2, CY = Math.floor(H / 2) - 5;
        const MAIN_R  = 86;
        const SAT_DIST = 186;
        const SAT_R   = 68;
        const FRAMES  = 30;
        const FNT     = "monospace";

        const satellites = [
            { angle:   0, label: "DISK",   value: `${disk.pct.toFixed(1)}%`, pct: disk.pct, h: 145, sub: `${disk.used} / ${disk.total}` },
            { angle:  60, label: "RAM",    value: `${ramPct.toFixed(1)}%`,   pct: ramPct,   h: 195, sub: `${usedRam} / ${totalRam}` },
            { angle: 120, label: "SYS UP", value: sysUpStr,                  pct: null,     h: 320, sub: `${os.platform()} / ${os.arch()}` },
            { angle: 180, label: "CPU",    value: `${cpuPct.toFixed(1)}%`,   pct: cpuPct,   h: 0,   sub: `${cores} cores` },
            { angle: 240, label: "BOT UP", value: botUpStr,                  pct: null,     h: 45,  sub: `PID ${pid}` },
            { angle: 300, label: "CORES",  value: `×${cores}`,              pct: clamp((cores / 16) * 100, 0, 100), h: 270, sub: nodeVer },
        ];

        const canvas  = createCanvas(W, H);
        const c       = canvas.getContext("2d");
        const encoder = new GIFEncoder(W, H);
        encoder.start();
        encoder.setRepeat(0);
        encoder.setDelay(80);
        encoder.setQuality(5);

        for (let f = 0; f < FRAMES; f++) {
            const phase = f / FRAMES;
            const dotF  = phase;
            const pulse = 0.5 + 0.5 * Math.sin(f * 0.62);
            const spin  = (f / FRAMES) * Math.PI * 2;


            const bg = c.createRadialGradient(CX, CY - 20, 20, CX, CY, 560);
            bg.addColorStop(0,   "#050f1c");
            bg.addColorStop(0.4, "#020a14");
            bg.addColorStop(1,   "#010408");
            c.fillStyle = bg; c.fillRect(0, 0, W, H);

            drawHexGrid(c, W, H, 0.013);
            drawScanLine(c, W, H, f, FRAMES);

            const vgn = c.createRadialGradient(CX, CY, 140, CX, CY, 510);
            vgn.addColorStop(0, "transparent");
            vgn.addColorStop(1, "rgba(0,0,0,0.72)");
            c.fillStyle = vgn; c.fillRect(0, 0, W, H);


            drawOrbitRing(c, CX, CY, 148, 60, "rgba(0,180,255,0.55)", 0.55, f,  0.07, FRAMES);
            drawOrbitRing(c, CX, CY, 272, 96, "rgba(160,70,255,0.42)", 0.38, f, -0.04, FRAMES);


            for (const sat of satellites) {
                const rad = (sat.angle * Math.PI) / 180;
                const sx  = CX + SAT_DIST * Math.cos(rad);
                const sy  = CY + SAT_DIST * Math.sin(rad);
                drawConnector(c, CX, CY, sx, sy, MAIN_R + 8, SAT_R + 6, dotF, hsl(sat.h, 90, 65), 0.8);
            }


            for (const sat of satellites) {
                const rad    = (sat.angle * Math.PI) / 180;
                const sx     = CX + SAT_DIST * Math.cos(rad);
                const sy     = CY + SAT_DIST * Math.sin(rad);
                const glow   = hsl(sat.h, 100, 62);
                const glowDm = hsl(sat.h, 60, 25, 0.55);
                const hexRot = spin * (sat.angle % 120 === 0 ? 0.09 : -0.07);


                if (sat.pct !== null) {
                    progressArc(c, sx, sy, SAT_R + 13, sat.pct, glow, "rgba(255,255,255,0.035)", 3.5);
                    progressArc(c, sx, sy, SAT_R + 7,  sat.pct, hsl(sat.h, 100, 82, 0.5), "transparent", 1.5);
                }


                const hexFill = c.createRadialGradient(sx, sy - 12, 4, sx, sy, SAT_R);
                hexFill.addColorStop(0, hsl(sat.h, 35, 13));
                hexFill.addColorStop(1, hsl(sat.h, 18, 5));
                drawHex(c, sx, sy, SAT_R, null, glow, 2.2, glow, 24, hexRot);
                hexPath(c, sx, sy, SAT_R, hexRot); c.fillStyle = hexFill; c.fill();
                drawHex(c, sx, sy, SAT_R - 12, "transparent", glowDm, 0.7, null, 0, -hexRot);


                c.textAlign = "center"; c.textBaseline = "middle";
                const valSz = sat.value.length > 7 ? "bold 15px" : sat.value.length > 5 ? "bold 18px" : "bold 23px";
                c.font = `${valSz} ${FNT}`;
                c.shadowColor = glow; c.shadowBlur = 18;
                c.fillStyle = "#ffffff";
                c.fillText(sat.value, sx, sy - 12);
                c.shadowBlur = 0;


                c.font = `bold 8px ${FNT}`;
                c.fillStyle = hsl(sat.h, 85, 72, 0.92);
                c.fillText(sat.label, sx, sy + 8);


                c.font = `7px ${FNT}`;
                c.fillStyle = "rgba(255,255,255,0.33)";
                c.fillText(sat.sub, sx, sy + 22);


                if (sat.pct !== null) {
                    drawSignalBars(c, sx - 16, sy + 34, sat.pct, glow, 18, 11);
                }
            }



            for (let ring = 0; ring < 3; ring++) {
                const rr = MAIN_R + 18 + ring * 13 + 5 * Math.sin(spin * 1.5 + ring * 1.1);
                c.beginPath(); c.arc(CX, CY, rr, 0, Math.PI * 2);
                c.strokeStyle = hsl(200 + ring * 40, 100, 65, (0.06 + 0.05 * pulse) * (1 - ring * 0.25));
                c.lineWidth = ring === 0 ? 3 : 1.2; c.stroke();
            }


            c.save(); c.translate(CX, CY);
            c.rotate(spin * 0.11);
            hexPath(c, 0, 0, MAIN_R + 6);
            c.strokeStyle = "rgba(0,200,255,0.22)"; c.lineWidth = 1; c.stroke();
            c.rotate(-spin * 0.22);
            hexPath(c, 0, 0, MAIN_R - 5);
            c.strokeStyle = "rgba(160,80,255,0.15)"; c.lineWidth = 0.8; c.stroke();
            c.restore();


            const cFill = c.createRadialGradient(CX, CY - 18, 6, CX, CY, MAIN_R);
            cFill.addColorStop(0, "rgba(0,40,85,0.97)");
            cFill.addColorStop(1, "rgba(0,8,22,0.99)");
            drawHex(c, CX, CY, MAIN_R, null, "rgba(0,210,255,0.88)", 2.5, "rgba(0,210,255,0.9)", 34);
            hexPath(c, CX, CY, MAIN_R); c.fillStyle = cFill; c.fill();
            drawHex(c, CX, CY, MAIN_R - 15, "transparent", "rgba(0,180,255,0.18)", 0.8);


            c.textAlign = "center"; c.textBaseline = "middle";
            c.shadowColor = "#00D8FF"; c.shadowBlur = 28;
            c.fillStyle = "#00D8FF"; c.font = `bold 18px ${FNT}`;
            c.fillText("GOAT BOT", CX, CY - 22);
            c.shadowBlur = 0;
            c.fillStyle = "rgba(255,255,255,0.82)"; c.font = `bold 10px ${FNT}`;
            c.fillText("SYS DASHBOARD", CX, CY - 4);
            c.fillStyle = "rgba(255,255,255,0.42)"; c.font = `7.5px ${FNT}`;
            c.fillText(`${cmds} CMD  ·  ${threads} GRP`, CX, CY + 12);
            c.fillText(`${users} USR  ·  PFX: "${prefix}"`, CX, CY + 23);


            const blinkOn = f % 6 < 3;
            c.beginPath(); c.arc(CX - 28, CY + 38, 4, 0, Math.PI * 2);
            c.fillStyle   = blinkOn ? "#00FF88" : "#002a14";
            c.shadowColor = blinkOn ? "#00FF88" : "transparent";
            c.shadowBlur  = blinkOn ? 14 : 0;
            c.fill(); c.shadowBlur = 0;
            c.fillStyle = blinkOn ? "rgba(0,255,136,0.85)" : "rgba(0,255,136,0.28)";
            c.font = `bold 7px ${FNT}`;
            c.fillText("ONLINE", CX - 8, CY + 40);


            const hdrG = c.createLinearGradient(0, 0, W, 0);
            hdrG.addColorStop(0,    "rgba(0,15,40,0)");
            hdrG.addColorStop(0.1,  "rgba(0,15,40,0.94)");
            hdrG.addColorStop(0.9,  "rgba(0,15,40,0.94)");
            hdrG.addColorStop(1,    "rgba(0,15,40,0)");
            c.fillStyle = hdrG; c.fillRect(0, 0, W, 36);
            c.strokeStyle = "rgba(0,200,255,0.22)"; c.lineWidth = 0.6;
            c.beginPath(); c.moveTo(0, 36); c.lineTo(W, 36); c.stroke();

            c.textAlign = "left"; c.textBaseline = "middle";
            c.shadowColor = "#00BBFF"; c.shadowBlur = 9;
            c.fillStyle = "rgba(0,210,255,0.95)"; c.font = `bold 12px ${FNT}`;
            c.fillText("◈  GOAT BOT  —  SYSTEM DASHBOARD", 18, 18);
            c.shadowBlur = 0;

            const now = new Date();
            const ts  = now.toLocaleTimeString("en-US", { hour12: false });
            const ds  = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
            c.textAlign = "right"; c.fillStyle = "rgba(255,255,255,0.28)"; c.font = `9px ${FNT}`;
            c.fillText(`${ds}  ${ts}`, W - 16, 18);


            const panY = H - 40;
            const panG = c.createLinearGradient(0, panY, W, panY);
            panG.addColorStop(0,   "rgba(0,8,22,0)");
            panG.addColorStop(0.08,"rgba(0,8,22,0.92)");
            panG.addColorStop(0.92,"rgba(0,8,22,0.92)");
            panG.addColorStop(1,   "rgba(0,8,22,0)");
            c.fillStyle = panG; c.fillRect(0, panY, W, 40);
            c.strokeStyle = "rgba(0,180,255,0.16)"; c.lineWidth = 0.6;
            c.beginPath(); c.moveTo(0, panY); c.lineTo(W, panY); c.stroke();

            const infoItems = [
                { label: "HEAP", value: heapMB,   h: 195 },
                { label: "NODE", value: nodeVer,   h: 145 },
                { label: "CPU",  value: cpuShort,  h: 0   },
                { label: "NET↓", value: net.rx,    h: 120 },
                { label: "NET↑", value: net.tx,    h: 270 },
                { label: "SIFAT",value: "v3.0",    h: 320 },
            ];
            const iw = (W - 40) / infoItems.length;
            for (let i = 0; i < infoItems.length; i++) {
                const item = infoItems[i];
                const ix   = 20 + i * iw;
                c.textAlign = "left"; c.textBaseline = "middle";
                c.fillStyle = hsl(item.h, 80, 65, 0.55); c.font = `7px ${FNT}`;
                c.fillText(item.label, ix, panY + 11);
                c.fillStyle = "rgba(255,255,255,0.82)"; c.font = `bold 9px ${FNT}`;
                c.fillText(item.value, ix, panY + 26);
            }


            drawCornerBrackets(c, 8, 8, W - 16, H - 16, 26, hsl(200, 100, 65, 0.42), 1.5);

            encoder.addFrame(c);
        }

        encoder.finish();
        const buf     = encoder.out.getData();
        const outPath = path.join(TMP, `hexsys_${threadID}_${Date.now()}.gif`);
        await fs.writeFile(outPath, buf);

        try { api.setMessageReaction("✅", messageID, () => {}, true); } catch {}

        await message.reply({
            body:       "",
            attachment: fs.createReadStream(outPath),
        });

        setTimeout(() => fs.remove(outPath).catch(() => {}), 90_000);
    },
};
