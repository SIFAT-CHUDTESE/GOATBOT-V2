const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

const TZ = "Asia/Dhaka";
const BANK_NAME = "MARIN BANK";
const BANK_TAG = "M·A·R·I·N";
const CURRENCY = "$";
const INTEREST_RATE_DAILY = 0.02;
const LOAN_INTEREST_RATE = 0.10;
const DAILY_WITHDRAW_LIMIT = 100000;
const DAILY_TRANSFER_LIMIT = 200000;
const MIN_DEPOSIT = 100;
const MIN_WITHDRAW = 100;
const MIN_TRANSFER = 50;
const MIN_LOAN = 500;
const MAX_LOAN_MULTIPLIER = 3;
const LOAN_HARD_CAP = 5000000;
const DAILY_BONUS_BASE = 500;
const BONUS_STREAK_MULTIPLIER = 50;
const MAX_HISTORY_PER_PAGE = 8;
const MAX_TRANSACTIONS_STORED = 100;
const ROB_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const ROB_SUCCESS_CHANCE = 0.45;
const ROB_MIN_BALANCE = 500;
const ROB_MAX_PCT = 0.25;
const FLIP_MAX_BET = 500000;
const GAMBLE_MAX_BET = 1000000;
const WHEEL_COST = 200;
const GIFT_DAILY_LIMIT = 500000;
const REFERRAL_BONUS = 2000;
const CASHBACK_RATE = 0.01;
const CASHBACK_MIN_DEP = 10000;
const PIN_REQUIRED_AMOUNT = 50000;
const MISSION_RESET_DAYS = 1;

const INVEST_PLANS = {
    safe:     { label: "SAFE",     roi: 0.08, days: 1,  color: "#00ff88", minAmount: 500 },
    moderate: { label: "MODERATE", roi: 0.25, days: 3,  color: "#ffd700", minAmount: 2000 },
    high:     { label: "HIGH",     roi: 0.60, days: 7,  color: "#ff6b35", minAmount: 5000 },
    extreme:  { label: "EXTREME",  roi: 1.50, days: 14, color: "#ff3d5a", minAmount: 20000 },
    legend:   { label: "LEGEND",   roi: 3.00, days: 30, color: "#ff00ff", minAmount: 100000 }
};

const ACCOUNT_TIERS = [
    { label: "BRONZE",    minDep: 0,          color: "#cd7f32", glow: "#cd7f32", perks: "Basic banking" },
    { label: "SILVER",    minDep: 50000,       color: "#c0c0c0", glow: "#c0c0c0", perks: "+5% interest" },
    { label: "GOLD",      minDep: 250000,      color: "#ffd700", glow: "#ffd700", perks: "+10% interest, +cashback" },
    { label: "PLATINUM",  minDep: 1000000,     color: "#e5e4e2", glow: "#00e5ff", perks: "+15% interest, priority" },
    { label: "DIAMOND",   minDep: 5000000,     color: "#b9f2ff", glow: "#7c4dff", perks: "+20% interest, VIP" },
    { label: "ELITE",     minDep: 25000000,    color: "#ff00ff", glow: "#ff00ff", perks: "Max perks, exclusive" }
];

const WHEEL_SEGMENTS = [
    { label: "100",    value: 100,    color: "#c0c0c0", chance: 0.30 },
    { label: "300",    value: 300,    color: "#00e887", chance: 0.22 },
    { label: "500",    value: 500,    color: "#00b4d8", chance: 0.18 },
    { label: "1,000",  value: 1000,   color: "#ffd700", chance: 0.12 },
    { label: "2,500",  value: 2500,   color: "#ff6b35", chance: 0.08 },
    { label: "5,000",  value: 5000,   color: "#ff3d5a", chance: 0.05 },
    { label: "JACKPOT",value: 25000,  color: "#ff00ff", chance: 0.03 },
    { label: "LOSE",   value: -200,   color: "#333",    chance: 0.02 }
];

const MISSIONS = [
    { id: "deposit_once",   label: "Make a deposit",            type: "deposit",   target: 1,     reward: 500 },
    { id: "deposit_10k",    label: "Deposit $10,000",           type: "dep_amt",   target: 10000, reward: 1000 },
    { id: "transfer_once",  label: "Transfer to someone",       type: "transfer",  target: 1,     reward: 600 },
    { id: "savings_dep",    label: "Deposit to savings",        type: "savings",   target: 1,     reward: 400 },
    { id: "play_game",      label: "Play a game (flip/gamble)", type: "game",      target: 1,     reward: 300 },
    { id: "claim_bonus",    label: "Claim daily bonus",         type: "bonus",     target: 1,     reward: 250 },
    { id: "invest_once",    label: "Start an investment",       type: "invest",    target: 1,     reward: 800 },
    { id: "transactions_5", label: "Complete 5 transactions",   type: "txn_count", target: 5,     reward: 700 }
];

const SLOTS_SYMBOLS = [
    { id: "CHR", label: "CHERRY", color: "#ff4466" },
    { id: "LMN", label: "LEMON",  color: "#ffdd00" },
    { id: "ORN", label: "ORANGE", color: "#ff8800" },
    { id: "GRP", label: "GRAPE",  color: "#aa44ff" },
    { id: "DIA", label: "DIAMON", color: "#00e5ff" },
    { id: "STR", label: "STAR",   color: "#ffd700" },
    { id: "BAR", label: "BAR",    color: "#ff69b4" },
    { id: "777", label: "SEVEN",  color: "#00ff88" }
];
const SLOTS_PAYOUTS = {
    "CHR-CHR-CHR": 2,  "LMN-LMN-LMN": 3,  "ORN-ORN-ORN": 4,
    "GRP-GRP-GRP": 5,  "STR-STR-STR": 8,   "DIA-DIA-DIA": 15,
    "BAR-BAR-BAR": 25, "777-777-777": 50
};

const SETTINGS_FILE = path.join(process.cwd(), "sifu_database", "bank_settings.json");
const LOTTERY_FILE = path.join(process.cwd(), "sifu_database", "bank_lottery.json");

const VAULT_INTEREST_DAILY = 0.035;
const VAULT_MIN_LOCK_DAYS = 7;
const VAULT_MIN_AMOUNT = 5000;
const VAULT_MAX_AMOUNT = 10000000;
const LOTTERY_TICKET_PRICE = 500;
const LOTTERY_MAX_TICKETS = 10;
const DICE_MAX_BET = 200000;
const SCRATCH_COST = 300;
const TAX_RATE = 0.03;
const GOAL_MAX_AMOUNT = 50000000;

const ACHIEVEMENTS = [
    { id: "first_deposit",   label: "First Deposit",     desc: "Make your first deposit",              icon: "[DEP]", reward: 500 },
    { id: "millionaire",     label: "Millionaire",        desc: "Reach $1,000,000 net worth",           icon: "[$$$]", reward: 5000 },
    { id: "streak_7",        label: "Week Warrior",       desc: "Maintain 7-day bonus streak",          icon: "[HOT]", reward: 1000 },
    { id: "streak_30",       label: "Month Devotee",      desc: "Maintain 30-day bonus streak",         icon: "[CAL]", reward: 5000 },
    { id: "games_10",        label: "Gambler",            desc: "Play 10 games total",                  icon: "[GAM]", reward: 800 },
    { id: "win_rate_60",     label: "Lucky Star",         desc: "60%+ win rate (min 10 games)",         icon: "[STR]", reward: 2000 },
    { id: "investor",        label: "Investor",           desc: "Complete your first investment",       icon: "[INV]", reward: 1000 },
    { id: "legend_plan",     label: "Legend Investor",    desc: "Complete LEGEND investment plan",      icon: "[VIP]", reward: 10000 },
    { id: "generous",        label: "The Generous",       desc: "Gift total $100,000 to others",        icon: "[GEN]", reward: 2000 },
    { id: "loan_free",       label: "Debt Free",          desc: "Repay a loan in full",                 icon: "[OK!]", reward: 750 },
    { id: "elite_tier",      label: "Elite Member",       desc: "Reach ELITE account tier",             icon: "[ELT]", reward: 20000 },
    { id: "txn_100",         label: "Txn Master",         desc: "Complete 100 transactions",            icon: "[TXN]", reward: 1500 },
    { id: "rob_5",           label: "Street Thief",       desc: "Successfully rob 5 times",             icon: "[ROB]", reward: 1200 },
    { id: "vault_open",      label: "Vault Owner",        desc: "Open your first vault",                icon: "[VLT]", reward: 600 },
    { id: "goal_complete",   label: "Goal Achiever",      desc: "Complete a savings goal",              icon: "[AIM]", reward: 1500 },
    { id: "big_whale",       label: "Big Whale",          desc: "Deposit $10,000,000 total",            icon: "[WHL]", reward: 50000 }
];

const DICE_PAYOUTS = { 1: 5.5, 2: 2.0, 3: 1.3, 4: 1.3, 5: 2.0, 6: 5.5 };
const SCRATCH_PRIZES = [
    { label: "[ NOTHING ]",  value: 0,     chance: 0.38 },
    { label: "[ $200 ]",     value: 200,   chance: 0.24 },
    { label: "[ $500 ]",     value: 500,   chance: 0.16 },
    { label: "[ $1,000 ]",   value: 1000,  chance: 0.11 },
    { label: "[ $5,000 ]",   value: 5000,  chance: 0.06 },
    { label: "[ $15,000 ]",  value: 15000, chance: 0.03 },
    { label: "[ $50,000 ]",  value: 50000, chance: 0.02 }
];

const TIER_PERKS_DETAIL = {
    BRONZE:   { loanMult: 3,  interestMult: 1.0, transferFee: 0,    giftMax: 500000,   vaultAccess: false },
    SILVER:   { loanMult: 4,  interestMult: 1.05, transferFee: 0,   giftMax: 750000,   vaultAccess: true  },
    GOLD:     { loanMult: 5,  interestMult: 1.10, transferFee: 0,   giftMax: 1000000,  vaultAccess: true  },
    PLATINUM: { loanMult: 7,  interestMult: 1.15, transferFee: 0,   giftMax: 2000000,  vaultAccess: true  },
    DIAMOND:  { loanMult: 10, interestMult: 1.20, transferFee: 0,   giftMax: 5000000,  vaultAccess: true  },
    ELITE:    { loanMult: 15, interestMult: 1.25, transferFee: 0,   giftMax: 99999999, vaultAccess: true  }
};

const C = {
    BG: "#020b18", BG2: "#04111f", BG3: "#061525",
    CARD: "#071a2d", CARD2: "#0a2040",
    BORDER: "#0e3054", BORDER2: "#0a2545",
    CYAN: "#00e5ff", CYAN2: "#00b8d4",
    PURPLE: "#7c4dff", GREEN: "#00ff88",
    RED: "#ff3d5a", ORANGE: "#ff6b35",
    GOLD: "#ffd700", WHITE: "#e8f4ff",
    GRAY: "#5a7fa0", DIMGRAY: "#2a4a65",
    DIM: "#0f2a40", PINK: "#ff4da6",
    TEAL: "#00bfa5"
};

function fmt(n) { return Number(n || 0).toLocaleString("en-US"); }
function fmtShort(n) {
    n = Number(n || 0);
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toFixed(0);
}
function fmtAccNum(num) {
    const raw = (num || "").replace(/\D/g, "").slice(-12).padStart(12, "0");
    return raw.match(/.{1,4}/g)?.join("  ") || num;
}
function now() { return moment().tz(TZ).format("DD/MM/YYYY HH:mm:ss"); }
function today() { return moment().tz(TZ).format("DD/MM/YYYY"); }
function genAccNum() { return "MB" + Date.now().toString().slice(-8) + Math.floor(Math.random() * 9000 + 1000); }
function genTxnId() { return "TXN" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 7).toUpperCase(); }
function getTier(totalDep) {
    let tier = ACCOUNT_TIERS[0];
    for (const t of ACCOUNT_TIERS) { if (totalDep >= t.minDep) tier = t; }
    return tier;
}
function getTierProgress(totalDep) {
    let idx = 0;
    for (let i = 0; i < ACCOUNT_TIERS.length; i++) { if (totalDep >= ACCOUNT_TIERS[i].minDep) idx = i; }
    if (idx >= ACCOUNT_TIERS.length - 1) return { pct: 1, next: null, toNext: 0 };
    const cur = ACCOUNT_TIERS[idx].minDep, next = ACCOUNT_TIERS[idx + 1].minDep;
    return { pct: Math.min((totalDep - cur) / (next - cur), 1), next: ACCOUNT_TIERS[idx + 1], toNext: next - totalDep };
}
function bar(pct, len = 12, fill = "█", empty = "░") {
    const f = Math.round(pct * len);
    return fill.repeat(Math.max(0, f)) + empty.repeat(Math.max(0, len - f));
}
function tierEmoji(label) {
    const m = { BRONZE: "[BR]", SILVER: "[SL]", GOLD: "[GL]", PLATINUM: "[PT]", DIAMOND: "[DM]", ELITE: "[EL]" };
    return m[label] || "[BK]";
}
function txnEmoji(type) {
    const m = {
        deposit: "[+]", withdraw: "[-]", transfer_out: "[>>]", transfer_in: "[<<]",
        savings_dep: "[S+]", savings_wd: "[S-]", loan_taken: "[LN]", loan_repaid: "[OK]",
        interest: "[%]", invest: "[INV]", collect: "[COL]", bonus: "[BON]", gift_out: "[GFT]",
        gift_in: "[GFT]", cashback: "[CB]", rob_out: "[ROB]", rob_in: "[ROB]", wheel: "[WHL]",
        gamble_win: "[WIN]", gamble_loss: "[LOS]", flip_win: "[WIN]", flip_loss: "[LOS]",
        mission: "[MIS]", referral: "[REF]", account_opened: "[NEW]"
    };
    return m[type] || "[TXN]";
}

function loadSettings() {
    try {
        fs.ensureDirSync(path.dirname(SETTINGS_FILE));
        if (!fs.existsSync(SETTINGS_FILE)) {
            fs.writeJsonSync(SETTINGS_FILE, { mode: "image", pinnedNotices: [] });
        }
        return fs.readJsonSync(SETTINGS_FILE);
    } catch { return { mode: "image" }; }
}
function saveSettings(s) {
    try { fs.ensureDirSync(path.dirname(SETTINGS_FILE)); fs.writeJsonSync(SETTINGS_FILE, s); } catch {}
}
function getMode() { return loadSettings().mode || "image"; }
function setMode(m) { const s = loadSettings(); s.mode = m; saveSettings(s); }

function ensureData(ud) {
    if (!ud.data) ud.data = {};
    if (!ud.data.bank) ud.data.bank = null;
    return ud;
}
function isReg(ud) { return !!(ud?.data?.bank?.isRegistered); }
function isFrozen(ud) { return !!(ud?.data?.bank?.frozen); }

function createAccount(ud, name) {
    ud.data.bank = {
        isRegistered: true,
        accountNumber: genAccNum(),
        holderName: name || "User",
        balance: 0,
        savings: 0,
        loan: null,
        investment: null,
        transactions: [],
        dailyWithdraw: { date: null, amount: 0 },
        dailyTransfer: { date: null, amount: 0 },
        dailyGift: { date: null, amount: 0 },
        lastInterestClaim: null,
        lastBonusDate: null,
        lastRobTime: 0,
        lastWheelDate: null,
        bonusStreak: 0,
        frozen: false,
        pin: null,
        pinLocked: false,
        pinAttempts: 0,
        referredBy: null,
        referralCount: 0,
        cashbackEarned: 0,
        monthlyDeposited: 0,
        monthlyDepMonth: null,
        missions: {},
        missionDate: null,
        notifications: true,
        createdAt: now(),
        totalDeposited: 0,
        totalWithdrawn: 0,
        totalTransferred: 0,
        totalTransactions: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        netWorth: 0,
        vault: null,
        achievements: {},
        goal: null,
        lotteryTickets: 0
    };
    return ud;
}

function pushTxn(bank, txn) {
    bank.transactions.unshift(txn);
    if (bank.transactions.length > MAX_TRANSACTIONS_STORED)
        bank.transactions = bank.transactions.slice(0, MAX_TRANSACTIONS_STORED);
    bank.totalTransactions = (bank.totalTransactions || 0) + 1;
}

function checkDailyLimit(limit, record, amount) {
    const t = today();
    if (record.date !== t) return { ok: true, remaining: limit };
    const remaining = limit - (record.amount || 0);
    return { ok: remaining >= amount, remaining };
}
function updateDailyRecord(bank, field, amount) {
    const t = today();
    if (bank[field].date !== t) bank[field] = { date: t, amount };
    else bank[field].amount = (bank[field].amount || 0) + amount;
}

function getNetWorth(bank) {
    return (bank.balance || 0) + (bank.savings || 0) +
        (bank.investment && !bank.investment.collected ? bank.investment.amount : 0);
}

function getTierInterestMultiplier(totalDep) {
    const t = getTier(totalDep);
    const m = { BRONZE: 1.0, SILVER: 1.05, GOLD: 1.10, PLATINUM: 1.15, DIAMOND: 1.20, ELITE: 1.25 };
    return m[t.label] || 1.0;
}

function getDailyMissions(bank) {
    const t = today();
    if (bank.missionDate !== t) {
        bank.missionDate = t;
        bank.missions = {};
        const shuffled = [...MISSIONS].sort(() => Math.random() - 0.5).slice(0, 4);
        for (const m of shuffled) bank.missions[m.id] = { done: false, progress: 0 };
    }
    return bank.missions;
}

function updateMission(bank, type, amount = 1) {
    if (!bank.missions) return 0;
    let earned = 0;
    for (const m of MISSIONS) {
        const ms = bank.missions[m.id];
        if (!ms || ms.done) continue;
        let hit = false;
        if (m.type === type) { ms.progress = (ms.progress || 0) + 1; hit = ms.progress >= m.target; }
        if (m.type === "dep_amt" && type === "deposit") { ms.progress = (ms.progress || 0) + amount; hit = ms.progress >= m.target; }
        if (m.type === "txn_count" && type === "txn") { ms.progress = (ms.progress || 0) + 1; hit = ms.progress >= m.target; }
        if (hit) { ms.done = true; earned += m.reward; }
    }
    return earned;
}

function verifyPin(bank, inputPin) {
    if (!bank.pin) return true;
    if (bank.pinLocked) return false;
    if (String(bank.pin) === String(inputPin)) {
        bank.pinAttempts = 0;
        return true;
    }
    bank.pinAttempts = (bank.pinAttempts || 0) + 1;
    if (bank.pinAttempts >= 3) bank.pinLocked = true;
    return false;
}

function spinWheel() {
    let r = Math.random(), cumulative = 0;
    for (const seg of WHEEL_SEGMENTS) {
        cumulative += seg.chance;
        if (r <= cumulative) return seg;
    }
    return WHEEL_SEGMENTS[0];
}

function playSlots(bet) {
    const spin = () => SLOTS_SYMBOLS[Math.floor(Math.random() * SLOTS_SYMBOLS.length)];
    const reels = [spin(), spin(), spin()];
    const key = reels.map(r => r.id).join("-");
    const mult = SLOTS_PAYOUTS[key] || (reels[0].id === reels[1].id ? 1.5 : reels[1].id === reels[2].id ? 1.2 : 0);
    const win = Math.floor(bet * mult);
    return { reels, mult, win, isWin: mult > 0, profit: win - bet };
}

function getCashbackAmount(bank) {
    const m = moment().tz(TZ).format("MM/YYYY");
    if (bank.monthlyDepMonth !== m) { bank.monthlyDeposited = 0; bank.monthlyDepMonth = m; }
    const tier = getTier(bank.totalDeposited || 0);
    const mult = { BRONZE: 1, SILVER: 1.2, GOLD: 1.5, PLATINUM: 2, DIAMOND: 2.5, ELITE: 3 }[tier.label] || 1;
    return bank.monthlyDeposited >= CASHBACK_MIN_DEP
        ? Math.floor(bank.monthlyDeposited * CASHBACK_RATE * mult) : 0;
}

function roundRect(ctx, x, y, w, h, r = 12) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}
function setGlow(ctx, color, blur = 12) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
function clearGlow(ctx) { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; }
function buildCanvas(W, H) { const canvas = createCanvas(W, H); return { canvas, ctx: canvas.getContext("2d") }; }

function drawHexPattern(ctx, W, H, color = "rgba(0,229,255,0.025)") {
    const size = 20, h3 = size * Math.sqrt(3);
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1;
    for (let row = -1; row < H / h3 + 1; row++) {
        for (let col = -1; col < W / (size * 1.5) + 1; col++) {
            const cx = col * size * 1.5;
            const cy = (col % 2 === 0) ? row * h3 : row * h3 + h3 / 2;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                const px = cx + size * Math.cos(angle), py = cy + size * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.stroke();
        }
    }
    ctx.restore();
}

function drawScanlines(ctx, W, H) {
    ctx.save(); ctx.fillStyle = "rgba(0,229,255,0.018)";
    for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
    ctx.restore();
}

function drawCornerAccents(ctx, W, H, size = 22, color = C.CYAN) {
    ctx.save(); setGlow(ctx, color, 8);
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    const corners = [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]];
    for (const [cx, cy, dx, dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx + dx * size, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * size);
        ctx.stroke();
    }
    clearGlow(ctx); ctx.restore();
}

function drawPageBackground(ctx, W, H, accent = C.CYAN) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, C.BG); g.addColorStop(0.5, C.BG2); g.addColorStop(1, C.BG);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.6);
    rg.addColorStop(0, accent + "12"); rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    drawHexPattern(ctx, W, H); drawScanlines(ctx, W, H);
    drawCornerAccents(ctx, W, H, 25, accent);
}

function drawBankHeader(ctx, W, y0, accent = C.CYAN, subtitle = "") {
    const barH = 56;
    const grad = ctx.createLinearGradient(0, y0, W, y0 + barH);
    grad.addColorStop(0, accent + "18"); grad.addColorStop(0.5, accent + "10"); grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad; ctx.fillRect(0, y0, W, barH);
    setGlow(ctx, accent, 8); ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
    clearGlow(ctx);
    drawText(ctx, BANK_TAG, 30, y0 + 37, { font: "bold 26px monospace", color: accent, glow: accent, glowBlur: 14 });
    if (subtitle) drawText(ctx, subtitle, W - 30, y0 + 37, { font: "bold 13px Arial", color: accent + "aa", align: "right" });
    ctx.globalAlpha = 0.4; ctx.strokeStyle = accent; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y0 + barH); ctx.lineTo(W, y0 + barH); ctx.stroke();
    ctx.globalAlpha = 1;
    return y0 + barH;
}

function drawPageFooter(ctx, W, H, txnId = "", ts = "") {
    const y = H - 36;
    ctx.globalAlpha = 0.45; ctx.strokeStyle = C.BORDER; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(W - 20, y); ctx.stroke();
    ctx.globalAlpha = 1;
    drawText(ctx, txnId ? `TXN: ${txnId}` : BANK_NAME, 30, H - 14, { font: "11px monospace", color: C.GRAY });
    drawText(ctx, ts || now(), W - 30, H - 14, { font: "11px monospace", color: C.GRAY, align: "right" });
}

function drawFilledCard(ctx, x, y, w, h, r, fillColor, borderColor, glowColor) {
    ctx.save(); roundRect(ctx, x, y, w, h, r); ctx.fillStyle = fillColor; ctx.fill();
    if (borderColor) {
        setGlow(ctx, glowColor || borderColor, 10);
        ctx.strokeStyle = borderColor; ctx.lineWidth = 1.5; ctx.stroke(); clearGlow(ctx);
    }
    ctx.restore();
}

function drawProgressBar(ctx, x, y, w, h, pct, color, bgColor = C.DIM, r = h / 2) {
    ctx.save();
    roundRect(ctx, x, y, w, h, r); ctx.fillStyle = bgColor; ctx.fill();
    if (pct > 0) {
        const fw = Math.max((w * Math.min(pct, 1)), r * 2);
        roundRect(ctx, x, y, fw, h, r);
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, color); g.addColorStop(1, color + "cc");
        ctx.fillStyle = g; setGlow(ctx, color, 6); ctx.fill(); clearGlow(ctx);
    }
    ctx.restore();
}

function drawText(ctx, txt, x, y, opts = {}) {
    const { font = "16px Arial", color = C.WHITE, align = "left", glow = null, glowBlur = 10, alpha = 1, maxWidth = null } = opts;
    ctx.save(); ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.globalAlpha = alpha;
    if (glow) setGlow(ctx, glow, glowBlur);
    if (maxWidth) ctx.fillText(String(txt), x, y, maxWidth); else ctx.fillText(String(txt), x, y);
    if (glow) clearGlow(ctx); ctx.restore();
}

function drawCircle(ctx, x, y, r, fill, stroke, glowColor) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) {
        if (glowColor) setGlow(ctx, glowColor, 10);
        ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
        if (glowColor) clearGlow(ctx);
    }
    ctx.restore();
}

function drawStatusBadge(ctx, x, y, label, color) {
    const pad = 10, h = 22;
    ctx.save(); ctx.font = "bold 11px Arial";
    const tw = ctx.measureText(label).width, w = tw + pad * 2;
    drawFilledCard(ctx, x, y, w, h, h / 2, color + "22", color, color);
    setGlow(ctx, color, 6);
    drawText(ctx, label, x + w / 2, y + h / 2 + 4.5, { font: "bold 11px Arial", color, align: "center" });
    clearGlow(ctx); ctx.restore(); return w;
}

function drawDivider(ctx, x, y, w, color = C.BORDER) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); ctx.restore();
}

function drawXIcon(ctx, x, y, r, color) {
    ctx.save(); setGlow(ctx, color, 12); ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.5); ctx.lineTo(x + r * 0.5, y + r * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.5, y - r * 0.5); ctx.lineTo(x - r * 0.5, y + r * 0.5); ctx.stroke();
    clearGlow(ctx); ctx.restore();
}

function drawDiceFace(ctx, cx, cy, size, value, color) {
    const r = size * 0.42;
    ctx.save();
    roundRect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.18);
    ctx.fillStyle = color + "18"; ctx.fill();
    setGlow(ctx, color, 8); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); clearGlow(ctx);
    const dotR = size * 0.085;
    const dotColor = color;
    const positions = {
        1: [[0, 0]],
        2: [[-r * 0.55, -r * 0.55], [r * 0.55, r * 0.55]],
        3: [[-r * 0.55, -r * 0.55], [0, 0], [r * 0.55, r * 0.55]],
        4: [[-r * 0.55, -r * 0.55], [r * 0.55, -r * 0.55], [-r * 0.55, r * 0.55], [r * 0.55, r * 0.55]],
        5: [[-r * 0.55, -r * 0.55], [r * 0.55, -r * 0.55], [0, 0], [-r * 0.55, r * 0.55], [r * 0.55, r * 0.55]],
        6: [[-r * 0.55, -r * 0.6], [r * 0.55, -r * 0.6], [-r * 0.55, 0], [r * 0.55, 0], [-r * 0.55, r * 0.6], [r * 0.55, r * 0.6]]
    };
    for (const [dx, dy] of (positions[value] || [])) {
        ctx.beginPath(); ctx.arc(cx + dx, cy + dy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = dotColor; setGlow(ctx, dotColor, 6); ctx.fill(); clearGlow(ctx);
    }
    ctx.restore();
}

function drawSlotReels(ctx, reels, centerX, topY, cellW = 110, cellH = 54) {
    const totalW = reels.length * cellW + (reels.length - 1) * 8;
    let startX = centerX - totalW / 2;
    for (const reel of reels) {
        roundRect(ctx, startX, topY, cellW, cellH, 10);
        ctx.fillStyle = reel.color + "18"; ctx.fill();
        setGlow(ctx, reel.color, 10); ctx.strokeStyle = reel.color; ctx.lineWidth = 2; ctx.stroke(); clearGlow(ctx);
        drawText(ctx, reel.id, startX + cellW / 2, topY + 20, { font: "bold 12px monospace", color: reel.color, align: "center" });
        drawText(ctx, reel.label, startX + cellW / 2, topY + 40, { font: "bold 14px monospace", color: "#ffffff", align: "center" });
        startX += cellW + 8;
    }
}

function drawCheckIcon(ctx, x, y, r, color) {
    ctx.save(); setGlow(ctx, color, 12); ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y); ctx.lineTo(x - r * 0.1, y + r * 0.45); ctx.lineTo(x + r * 0.6, y - r * 0.45);
    ctx.stroke(); clearGlow(ctx); ctx.restore();
}

function drawArrowIcon(ctx, x, y, dir, size, color) {
    ctx.save(); setGlow(ctx, color, 8); ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
    if (dir === "up") {
        ctx.moveTo(x, y + size / 2); ctx.lineTo(x, y - size / 2);
        ctx.moveTo(x - size / 3, y - size / 6); ctx.lineTo(x, y - size / 2); ctx.lineTo(x + size / 3, y - size / 6);
    } else {
        ctx.moveTo(x, y - size / 2); ctx.lineTo(x, y + size / 2);
        ctx.moveTo(x - size / 3, y + size / 6); ctx.lineTo(x, y + size / 2); ctx.lineTo(x + size / 3, y + size / 6);
    }
    ctx.stroke(); clearGlow(ctx); ctx.restore();
}

async function genMenuImage() {
    const sections = [
        {
            title: "💳 ACCOUNT", color: C.CYAN,
            cmds: [
                { cmd: "register",       desc: "Open bank account",       icon: "⬡" },
                { cmd: "balance",        desc: "Check balance & stats",   icon: "◈" },
                { cmd: "profile",        desc: "Profile card & rank",     icon: "▣" },
                { cmd: "card",           desc: "Virtual bank card",       icon: "▬" },
                { cmd: "statement",      desc: "Full account statement",  icon: "≡" },
            ]
        },
        {
            title: "💰 MONEY", color: C.GREEN,
            cmds: [
                { cmd: "deposit <amt>",  desc: "Wallet → Bank",           icon: "↑" },
                { cmd: "withdraw <amt>", desc: "Bank → Wallet",           icon: "↓" },
                { cmd: "transfer @u <n>",desc: "Send to user",            icon: "→" },
                { cmd: "gift @u <n>",    desc: "Gift money (free)",       icon: "♡" },
                { cmd: "history [page]", desc: "Transaction history",     icon: "≡" },
            ]
        },
        {
            title: "🏦 SAVINGS & LOANS", color: C.GOLD,
            cmds: [
                { cmd: "savings dep/wd", desc: "Savings account ops",    icon: "◎" },
                { cmd: "interest",       desc: "Claim daily interest",    icon: "%" },
                { cmd: "loan <amt>",     desc: "Take a loan",            icon: "⬢" },
                { cmd: "repay [amt]",    desc: "Repay your loan",        icon: "✓" },
                { cmd: "vault open/col", desc: "Time-locked vault",      icon: "🔒" },
            ]
        },
        {
            title: "📈 INVEST & GROW", color: C.PURPLE,
            cmds: [
                { cmd: "invest <a> <p>", desc: "safe/moderate/high…",    icon: "▲" },
                { cmd: "collect",        desc: "Collect returns",         icon: "★" },
                { cmd: "portfolio",      desc: "Investment history",      icon: "≡" },
                { cmd: "plans",          desc: "All plans & ROI",         icon: "≡" },
            ]
        },
        {
            title: "🎁 BONUSES", color: C.PINK,
            cmds: [
                { cmd: "bonus",          desc: "Daily bonus (streak)",    icon: "♦" },
                { cmd: "wheel",          desc: `Lucky wheel ($${WHEEL_COST})`, icon: "⊕" },
                { cmd: "cashback",       desc: "Monthly cashback",        icon: "$" },
                { cmd: "missions",       desc: "Daily quests",            icon: "◎" },
                { cmd: "referral",       desc: "Refer & earn",            icon: "→" },
            ]
        },
        {
            title: "🎮 GAMES", color: C.RED,
            cmds: [
                { cmd: "blackjack <amt>",desc: "Blackjack vs dealer",    icon: "🃏" },
                { cmd: "roulette <a> <b>",desc: "Spin the wheel",        icon: "🎡" },
                { cmd: "slots <amt>",    desc: "Slot machine",            icon: "▣" },
                { cmd: "flip <amt> h/t", desc: "Coin flip",              icon: "◎" },
                { cmd: "gamble <amt>",   desc: "Casino gamble",           icon: "◆" },
                { cmd: "dice <amt>",     desc: "Dice vs house",           icon: "◈" },
                { cmd: "scratch",        desc: `Scratch card ($${SCRATCH_COST})`, icon: "★" },
                { cmd: "rob @user",      desc: "Rob someone",             icon: "✕" },
            ]
        },
        {
            title: "📊 INFO", color: C.TEAL,
            cmds: [
                { cmd: "leaderboard [w/m]", desc: "Rich list (weekly/monthly)", icon: "◆" },
                { cmd: "stats",          desc: "Global stats",            icon: "~" },
                { cmd: "tiers",          desc: "Tier benefits",           icon: "◈" },
                { cmd: "achievements",   desc: "Unlock & earn",           icon: "★" },
                { cmd: "networth",       desc: "Your net worth & rank",   icon: "💎" },
                { cmd: "daily",          desc: "Today's checklist",       icon: "📅" },
                { cmd: "limits",         desc: "Daily limits",            icon: "%" },
            ]
        },
        {
            title: "🔐 SECURITY", color: C.CYAN2,
            cmds: [
                { cmd: "pin set <4dig>", desc: "Set security PIN",        icon: "⬡" },
                { cmd: "freeze",         desc: "Freeze / Unfreeze",       icon: "❄" },
                { cmd: "goal set/claim", desc: "Savings goal",            icon: "◎" },
                { cmd: "lottery buy <n>",desc: "Buy lottery tickets",     icon: "♦" },
            ]
        },
    ];

    const colW = 420, colGap = 10, padX = 12;
    const rowH = 34, sectionHeadH = 28, sectionPadB = 6;


    let totalH = 80;
    for (const sec of sections) totalH += sectionHeadH + sec.cmds.length * rowH + sectionPadB + 6;
    totalH += 40;


    const W = colW * 2 + colGap + padX * 2;
    let leftH = 80, rightH = 80;
    const leftSecs = [], rightSecs = [];
    for (const sec of sections) {
        const secH = sectionHeadH + sec.cmds.length * rowH + sectionPadB + 10;
        if (leftH <= rightH) { leftSecs.push(sec); leftH += secH; }
        else { rightSecs.push(sec); rightH += secH; }
    }
    const H = Math.max(leftH, rightH) + 50;

    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.CYAN);
    let cy = drawBankHeader(ctx, W, 0, C.CYAN, `${BANK_NAME}  ·  FULL MENU`);
    cy += 10;

    function drawSection(sec, x, y) {
        const sw = colW;

        const shG = ctx.createLinearGradient(x, y, x + sw, y + sectionHeadH);
        shG.addColorStop(0, sec.color + "2a"); shG.addColorStop(1, sec.color + "08");
        ctx.fillStyle = shG; roundRect(ctx, x, y, sw, sectionHeadH, 8); ctx.fill();
        setGlow(ctx, sec.color, 8);
        drawText(ctx, sec.title, x + 14, y + 19, { font: "bold 13px Arial", color: sec.color });
        clearGlow(ctx);
        y += sectionHeadH + 4;
        for (const cmd of sec.cmds) {
            drawFilledCard(ctx, x, y, sw, rowH - 3, 6, cmd.icon === "🃏" || cmd.icon === "🎡" ? sec.color + "18" : C.CARD, sec.color + "1a");
            drawText(ctx, cmd.icon, x + 14, y + 21, { font: "14px Arial", color: sec.color });
            drawText(ctx, cmd.cmd, x + 30, y + 14, { font: "bold 11px monospace", color: sec.color });
            drawText(ctx, cmd.desc, x + 30, y + 26, { font: "10px Arial", color: C.GRAY });
            y += rowH;
        }
        return y + sectionPadB;
    }

    let lY = cy, rY = cy;
    const lX = padX, rX = padX + colW + colGap;
    for (const sec of leftSecs) lY = drawSection(sec, lX, lY);
    for (const sec of rightSecs) rY = drawSection(sec, rX, rY);

    drawPageFooter(ctx, W, H);
    return canvas;
}

async function genReceiptImage(type, data) {
    const typeColors = {
        deposit: C.GREEN, withdraw: C.ORANGE, transfer_out: C.PURPLE, transfer_in: C.PURPLE,
        gift_out: C.PINK, gift_in: C.PINK, cashback: C.GREEN, default: C.CYAN
    };
    const accent = typeColors[type] || typeColors.default;
    const rows = data.rows || [];
    const H = 140 + rows.length * 32 + 80;
    const W = 820;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, accent);
    let cy = drawBankHeader(ctx, W, 0, accent, type.replace(/_/g, " ").toUpperCase());
    cy += 20;

    drawCircle(ctx, W / 2, cy + 40, 36, accent + "18", accent, accent);
    const iconMap = { deposit: "↑", withdraw: "↓", transfer_out: "→", transfer_in: "←", gift_out: "♡", gift_in: "♡", cashback: "$" };
    drawText(ctx, iconMap[type] || "✓", W / 2, cy + 50, { font: "bold 28px monospace", color: accent, align: "center" });
    cy += 98;

    drawText(ctx, "SUCCESS", W / 2, cy, { font: "bold 22px monospace", color: accent, align: "center", glow: accent, glowBlur: 14 });
    cy += 36;

    const bx = 40, bw = W - 80;
    const bh = rows.length * 32 + 24;
    drawFilledCard(ctx, bx, cy, bw, bh, 12, C.CARD, accent + "44", accent);
    let ry = cy + 24;
    for (const [lbl, val, vc] of rows) {
        drawText(ctx, lbl, bx + 24, ry, { font: "13px monospace", color: C.GRAY });
        drawText(ctx, val, bx + bw - 24, ry, { font: "bold 13px monospace", color: vc || C.WHITE, align: "right" });
        ry += 32;
    }

    drawPageFooter(ctx, W, H, data.txnId, data.timestamp);
    return canvas;
}

async function genBalanceCard(ud, walletBal) {
    const bank = ud.data.bank;
    const tier = getTier(bank.totalDeposited || 0);
    const tierProg = getTierProgress(bank.totalDeposited || 0);
    const nw = getNetWorth(bank);
    const ac = tier.glow;
    const W = 920, H = 610;
    const { canvas, ctx } = buildCanvas(W, H);

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#000c16"); bg.addColorStop(0.5, "#010e1c"); bg.addColorStop(1, "#000c16");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const rg1 = ctx.createRadialGradient(W / 2, 210, 0, W / 2, 210, 340);
    rg1.addColorStop(0, ac + "1e"); rg1.addColorStop(1, "transparent");
    ctx.fillStyle = rg1; ctx.fillRect(0, 0, W, H);

    const rg2 = ctx.createRadialGradient(W, H, 0, W, H, 400);
    rg2.addColorStop(0, ac + "0c"); rg2.addColorStop(1, "transparent");
    ctx.fillStyle = rg2; ctx.fillRect(0, 0, W, H);

    drawHexPattern(ctx, W, H, ac + "1e");
    drawScanlines(ctx, W, H);

    ctx.save();
    setGlow(ctx, ac, 20);
    ctx.strokeStyle = ac + "55"; ctx.lineWidth = 1.5;
    roundRect(ctx, 5, 5, W - 10, H - 10, 18); ctx.stroke();
    ctx.strokeStyle = ac + "18"; ctx.lineWidth = 1;
    roundRect(ctx, 10, 10, W - 20, H - 20, 16); ctx.stroke();
    clearGlow(ctx); ctx.restore();

    drawCornerAccents(ctx, W, H, 32, ac);

    const headH = 58;
    const hg = ctx.createLinearGradient(0, 0, W, headH);
    hg.addColorStop(0, ac + "2a"); hg.addColorStop(0.65, ac + "10"); hg.addColorStop(1, "transparent");
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, headH);
    ctx.save(); ctx.strokeStyle = ac + "44"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, headH); ctx.lineTo(W, headH); ctx.stroke(); ctx.restore();

    setGlow(ctx, ac, 16);
    drawText(ctx, BANK_TAG, 28, 38, { font: "bold 26px monospace", color: ac, glow: ac, glowBlur: 16 });
    clearGlow(ctx);
    drawText(ctx, `[ ${tier.label} ACCOUNT ]`, W / 2, 38, { font: "bold 13px monospace", color: ac + "cc", align: "center" });
    drawText(ctx, now(), W - 28, 38, { font: "11px monospace", color: C.GRAY, align: "right" });

    const accY = 70;
    roundRect(ctx, W / 2 - 162, accY, 324, 30, 15);
    ctx.fillStyle = ac + "14"; ctx.fill();
    ctx.save(); setGlow(ctx, ac, 10); ctx.strokeStyle = ac + "44"; ctx.lineWidth = 1;
    roundRect(ctx, W / 2 - 162, accY, 324, 30, 15); ctx.stroke(); clearGlow(ctx); ctx.restore();
    drawText(ctx, fmtAccNum(bank.accountNumber), W / 2, accY + 20, { font: "bold 15px monospace", color: ac, align: "center" });

    drawText(ctx, (bank.holderName || ud.name || "USER").toUpperCase().slice(0, 30), W / 2, 126, { font: "bold 26px Arial", color: C.WHITE, align: "center" });

    const balY = 200;
    ctx.save(); setGlow(ctx, ac, 6); ctx.strokeStyle = ac + "44"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2 - 270, balY - 16); ctx.lineTo(W / 2 - 148, balY - 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 + 148, balY - 16); ctx.lineTo(W / 2 + 270, balY - 16); ctx.stroke();
    clearGlow(ctx); ctx.restore();

    setGlow(ctx, ac, 36);
    drawText(ctx, `${CURRENCY}${fmt(bank.balance)}`, W / 2, balY, { font: "bold 72px monospace", color: C.WHITE, align: "center", glow: ac, glowBlur: 34 });
    clearGlow(ctx);
    drawText(ctx, "AVAILABLE  BALANCE", W / 2, balY + 24, { font: "11px monospace", color: ac + "99", align: "center" });

    const divY = balY + 50;
    ctx.save(); ctx.globalAlpha = 0.3; ctx.strokeStyle = ac; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(28, divY); ctx.lineTo(W - 28, divY); ctx.stroke(); ctx.globalAlpha = 1; ctx.restore();

    const sgY = divY + 18;
    const sgCW = (W - 52) / 3;
    const sgCH = 80;
    const stats = [
        { label: "WALLET",       value: `${CURRENCY}${fmtShort(walletBal)}`,                                                                                  color: C.CYAN   },
        { label: "SAVINGS",      value: `${CURRENCY}${fmtShort(bank.savings || 0)}`,                                                                           color: C.GOLD   },
        { label: "NET WORTH",    value: `${CURRENCY}${fmtShort(nw)}`,                                                                                          color: ac       },
        { label: "INVESTMENT",   value: bank.investment && !bank.investment.collected ? `${CURRENCY}${fmtShort(bank.investment.amount)}` : "—",                 color: bank.investment && !bank.investment.collected ? C.GOLD   : C.DIMGRAY },
        { label: "LOAN DUE",     value: bank.loan && !bank.loan.repaid ? `${CURRENCY}${fmtShort(bank.loan.remaining)}` : "CLEAR",                              color: bank.loan && !bank.loan.repaid ? C.RED : C.GREEN         },
        { label: "TRANSACTIONS", value: fmt(bank.totalTransactions || 0),                                                                                       color: C.TEAL   }
    ];

    for (let i = 0; i < stats.length; i++) {
        const col = i % 3, row = Math.floor(i / 3);
        const sx = 18 + col * (sgCW + 8), sy = sgY + row * (sgCH + 8);
        const sc = stats[i].color;
        ctx.save();
        roundRect(ctx, sx, sy, sgCW, sgCH, 12);
        const cg2 = ctx.createLinearGradient(sx, sy, sx, sy + sgCH);
        cg2.addColorStop(0, sc + "14"); cg2.addColorStop(1, sc + "04");
        ctx.fillStyle = cg2; ctx.fill();
        setGlow(ctx, sc, 7); ctx.strokeStyle = sc + "35"; ctx.lineWidth = 1;
        roundRect(ctx, sx, sy, sgCW, sgCH, 12); ctx.stroke(); clearGlow(ctx);
        ctx.strokeStyle = sc; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sx + 2, sy + 18); ctx.lineTo(sx + 2, sy + sgCH - 18); ctx.stroke();
        clearGlow(ctx); ctx.restore();
        drawText(ctx, stats[i].label, sx + 20, sy + 26, { font: "10px monospace", color: C.GRAY });
        setGlow(ctx, sc, 10);
        drawText(ctx, stats[i].value, sx + 20, sy + 62, { font: "bold 22px monospace", color: sc, glow: sc, glowBlur: 10 });
        clearGlow(ctx);
    }

    const tpY = sgY + 2 * (sgCH + 8) + 14;
    drawText(ctx, "TIER  PROGRESS", 28, tpY + 14, { font: "bold 11px monospace", color: ac });
    drawText(ctx, `${tier.label}  →  ${tierProg.next ? tierProg.next.label : "MAX TIER"}`, W - 28, tpY + 14, { font: "11px monospace", color: C.GRAY, align: "right" });
    if (tierProg.next) { setGlow(ctx, ac, 6); drawText(ctx, `${CURRENCY}${fmtShort(tierProg.toNext)} to next`, W - 28, tpY + 30, { font: "bold 10px monospace", color: ac, align: "right" }); clearGlow(ctx); }
    drawProgressBar(ctx, 28, tpY + 22, W - 56, 14, tierProg.pct, ac, C.DIM, 7);
    const pctX = 28 + (W - 56) * Math.min(tierProg.pct, 0.97);
    drawText(ctx, `${Math.round(tierProg.pct * 100)}%`, pctX, tpY + 52, { font: "bold 10px monospace", color: ac, align: "center" });

    const bdgY = tpY + 66;
    const badges = [];
    if (bank.frozen) badges.push({ label: "FROZEN", color: C.RED });
    if (bank.bonusStreak > 0) badges.push({ label: `${bank.bonusStreak}d STREAK`, color: C.ORANGE });
    if (bank.investment && !bank.investment.collected) badges.push({ label: "INVESTING", color: C.GOLD });
    if (bank.loan && !bank.loan.repaid) badges.push({ label: "LOAN ACTIVE", color: C.RED });
    if (bank.pin) badges.push({ label: "PIN ON", color: C.GREEN });
    if ((bank.savings || 0) > 0) badges.push({ label: "SAVING", color: C.CYAN });
    let bx3 = 28;
    for (const b of badges) { const bw3 = drawStatusBadge(ctx, bx3, bdgY, b.label, b.color); bx3 += bw3 + 8; }

    drawPageFooter(ctx, W, H, bank.accountNumber);
    return canvas;
}

async function genVirtualCard(ud) {
    const bank = ud.data.bank;
    const tier = getTier(bank.totalDeposited || 0);
    const W = 780, H = 440;
    const { canvas, ctx } = buildCanvas(W, H);


    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#020b18"); g.addColorStop(0.4, tier.glow + "33"); g.addColorStop(1, "#020b18");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);


    setGlow(ctx, tier.glow, 30);
    ctx.strokeStyle = tier.glow; ctx.lineWidth = 2;
    roundRect(ctx, 10, 10, W - 20, H - 20, 24); ctx.stroke();
    clearGlow(ctx);


    const chipX = 60, chipY = 140;
    const chipG = ctx.createLinearGradient(chipX, chipY, chipX + 60, chipY + 44);
    chipG.addColorStop(0, "#ffd700"); chipG.addColorStop(1, "#b8860b");
    ctx.fillStyle = chipG;
    roundRect(ctx, chipX, chipY, 60, 44, 7); ctx.fill();
    ctx.strokeStyle = "#b8860b88"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(chipX + 30, chipY); ctx.lineTo(chipX + 30, chipY + 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(chipX, chipY + 22); ctx.lineTo(chipX + 60, chipY + 22); ctx.stroke();


    for (let i = 0; i < 3; i++) {
        const r = 18 + i * 12;
        ctx.beginPath(); ctx.arc(chipX + 100 + i * 4, chipY + 22, r, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.strokeStyle = tier.glow + "88"; ctx.lineWidth = 2; ctx.stroke();
    }


    setGlow(ctx, tier.glow, 12);
    drawText(ctx, BANK_TAG, W - 50, 60, { font: "bold 28px monospace", color: tier.glow, align: "right" });
    clearGlow(ctx);
    drawText(ctx, "DIGITAL CARD", W - 50, 82, { font: "12px monospace", color: C.GRAY, align: "right" });


    const digits = (bank.accountNumber || "").replace(/\D/g, "").padStart(16, "0");
    const groups = digits.match(/.{1,4}/g) || [];
    drawText(ctx, groups.join("   "), 60, 260, { font: "bold 28px monospace", color: C.WHITE, glow: tier.glow, glowBlur: 8 });


    drawText(ctx, "CARD HOLDER", 60, 310, { font: "11px monospace", color: C.GRAY });
    drawText(ctx, (bank.holderName || ud.name || "USER").toUpperCase(), 60, 340, { font: "bold 20px Arial", color: C.WHITE });


    setGlow(ctx, tier.glow, 10);
    drawText(ctx, tierEmoji(tier.label) + " " + tier.label, W - 50, 340, { font: "bold 18px Arial", color: tier.color, align: "right" });
    clearGlow(ctx);


    const created = moment(bank.createdAt, "DD/MM/YYYY HH:mm:ss");
    const expiry = created.isValid() ? created.add(5, "years").format("MM/YY") : "N/A";
    drawText(ctx, "VALID THRU", 60, 390, { font: "10px monospace", color: C.GRAY });
    drawText(ctx, expiry, 60, 412, { font: "bold 16px monospace", color: C.WHITE });


    drawText(ctx, `${CURRENCY}${fmt(bank.balance)}`, W - 50, 412, { font: "bold 20px monospace", color: tier.glow, align: "right", glow: tier.glow, glowBlur: 8 });
    drawText(ctx, "AVAILABLE BALANCE", W - 50, 390, { font: "10px monospace", color: C.GRAY, align: "right" });


    drawCircle(ctx, W - 90, 38, 22, tier.glow + "15", tier.glow + "55");
    drawCircle(ctx, W - 60, 38, 22, tier.glow + "10", tier.glow + "33");

    drawPageFooter(ctx, W, H, bank.accountNumber);
    return canvas;
}

async function genProfileCard(ud, rank) {
    const bank = ud.data.bank;
    const tier = getTier(bank.totalDeposited || 0);
    const tierProg = getTierProgress(bank.totalDeposited || 0);
    const nw = getNetWorth(bank);
    const W = 820, H = 580;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, tier.glow);
    let cy = drawBankHeader(ctx, W, 0, tier.glow, "BANK PROFILE");
    cy += 22;


    const av = (ud.name || "?")[0].toUpperCase();
    drawCircle(ctx, 80, cy + 44, 44, tier.glow + "25", tier.glow, tier.glow);
    drawText(ctx, av, 80, cy + 56, { font: "bold 36px Arial", color: tier.glow, align: "center", glow: tier.glow, glowBlur: 14 });


    drawText(ctx, (ud.name || "Unknown").slice(0, 28), 140, cy + 30, { font: "bold 20px Arial", color: C.WHITE });
    drawStatusBadge(ctx, 140, cy + 36, `${tierEmoji(tier.label)} ${tier.label}`, tier.glow);
    drawText(ctx, bank.accountNumber, 140, cy + 80, { font: "13px monospace", color: C.GRAY });
    if (rank) drawText(ctx, `#${rank} on leaderboard`, W - 30, cy + 24, { font: "bold 14px monospace", color: tier.glow, align: "right" });
    cy += 106;
    drawDivider(ctx, 20, cy, W - 40);
    cy += 14;


    const stats = [
        { label: "BANK BALANCE",    value: `${CURRENCY}${fmtShort(bank.balance)}`,          color: tier.glow },
        { label: "SAVINGS",         value: `${CURRENCY}${fmtShort(bank.savings || 0)}`,     color: C.GOLD },
        { label: "NET WORTH",       value: `${CURRENCY}${fmtShort(nw)}`,                    color: C.WHITE },
        { label: "TOTAL DEPOSITED", value: `${CURRENCY}${fmtShort(bank.totalDeposited)}`,   color: C.GREEN },
        { label: "TOTAL WITHDRAWN", value: `${CURRENCY}${fmtShort(bank.totalWithdrawn)}`,   color: C.ORANGE },
        { label: "TOTAL TRANSFERS", value: `${CURRENCY}${fmtShort(bank.totalTransferred || 0)}`, color: C.PURPLE },
        { label: "TRANSACTIONS",    value: fmt(bank.totalTransactions || 0),                 color: C.CYAN },
        { label: "BONUS STREAK",    value: `${bank.bonusStreak || 0} days`,                  color: C.PURPLE },
        { label: "GAMES PLAYED",    value: fmt(bank.gamesPlayed || 0),                       color: C.TEAL },
        { label: "WIN RATE",        value: bank.gamesPlayed > 0 ? `${Math.round((bank.gamesWon || 0) / bank.gamesPlayed * 100)}%` : "N/A", color: C.GREEN },
        { label: "CASHBACK EARNED", value: `${CURRENCY}${fmtShort(bank.cashbackEarned || 0)}`, color: C.GREEN },
        { label: "MEMBER SINCE",    value: (bank.createdAt || "").split(" ")[0],             color: C.GRAY }
    ];
    const sw = (W - 50) / 3;
    for (let i = 0; i < stats.length; i++) {
        const col = i % 3, row = Math.floor(i / 3);
        const sx = 20 + col * (sw + 5), sy = cy + row * 70;
        drawFilledCard(ctx, sx, sy, sw, 62, 9, stats[i].color + "0e", C.BORDER);
        drawText(ctx, stats[i].label, sx + sw / 2, sy + 16, { font: "9px monospace", color: C.GRAY, align: "center" });
        setGlow(ctx, stats[i].color, 6);
        drawText(ctx, stats[i].value, sx + sw / 2, sy + 46, { font: "bold 15px monospace", color: stats[i].color, align: "center" });
        clearGlow(ctx);
    }
    cy += Math.ceil(stats.length / 3) * 70 + 12;
    drawProgressBar(ctx, 30, cy, W - 60, 10, tierProg.pct, tier.glow);
    drawText(ctx, `TIER PROGRESS: ${Math.round(tierProg.pct * 100)}%`, 30, cy - 6, { font: "10px monospace", color: C.GRAY });
    if (tierProg.next) drawText(ctx, `Next: ${tier.label} → ${tierProg.next.label} (${CURRENCY}${fmtShort(tierProg.toNext)} to go)`, W - 30, cy - 6, { font: "10px monospace", color: tier.glow, align: "right" });

    drawPageFooter(ctx, W, H, bank.accountNumber);
    return canvas;
}

async function genHistoryImage(transactions, name, page) {
    const start = (page - 1) * MAX_HISTORY_PER_PAGE;
    const slice = transactions.slice(start, start + MAX_HISTORY_PER_PAGE);
    const totalPages = Math.ceil(transactions.length / MAX_HISTORY_PER_PAGE);
    const W = 820, H = 100 + slice.length * 60 + 80;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.CYAN);
    let cy = drawBankHeader(ctx, W, 0, C.CYAN, `HISTORY — PAGE ${page}/${totalPages}`);
    cy += 14;

    const txnColors = { deposit: C.GREEN, withdraw: C.ORANGE, transfer_out: C.PURPLE, transfer_in: C.PURPLE, savings_dep: C.GOLD, savings_wd: C.GOLD, loan_taken: C.RED, loan_repaid: C.GREEN, interest: C.GOLD, invest: C.ORANGE, collect: C.GREEN, bonus: C.PURPLE, gift_out: C.PINK, gift_in: C.PINK, cashback: C.GREEN, rob_out: C.RED, rob_in: C.RED, gamble_win: C.GREEN, gamble_loss: C.RED, flip_win: C.GREEN, flip_loss: C.RED, wheel: C.GOLD };

    for (let i = 0; i < slice.length; i++) {
        const tx = slice[i];
        const rowY = cy + i * 60;
        const color = txnColors[tx.type] || C.CYAN;
        drawFilledCard(ctx, 16, rowY, W - 32, 52, 10, color + "0e", color + "28");
        drawText(ctx, txnEmoji(tx.type), 44, rowY + 33, { font: "22px Arial", align: "center" });
        drawText(ctx, (tx.type || "").replace(/_/g, " ").toUpperCase(), 70, rowY + 20, { font: "bold 13px monospace", color });
        drawText(ctx, tx.counterpart || tx.transactionId || "", 70, rowY + 38, { font: "11px monospace", color: C.GRAY });
        setGlow(ctx, color, 6);
        const sign = ["deposit", "transfer_in", "savings_wd", "loan_taken", "interest", "collect", "bonus", "gift_in", "cashback", "gamble_win", "flip_win", "wheel", "rob_in"].includes(tx.type) ? "+" : "-";
        drawText(ctx, `${sign}${CURRENCY}${fmt(tx.amount)}`, W - 30, rowY + 22, { font: "bold 16px monospace", color, align: "right" });
        clearGlow(ctx);
        drawText(ctx, `BAL: ${CURRENCY}${fmt(tx.newBalance)}`, W - 30, rowY + 40, { font: "11px monospace", color: C.GRAY, align: "right" });
        drawText(ctx, tx.timestamp || "", 570, rowY + 38, { font: "10px monospace", color: C.DIMGRAY });
    }

    drawPageFooter(ctx, W, H, `Page ${page} of ${totalPages} · ${transactions.length} total`);
    return canvas;
}

async function genStatementImage(bank, name) {
    const W = 820, H = 80 + Math.min(bank.transactions.length, 20) * 34 + 120;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.TEAL);
    let cy = drawBankHeader(ctx, W, 0, C.TEAL, "ACCOUNT STATEMENT");
    cy += 14;
    drawText(ctx, `Holder: ${name}  |  Account: ${bank.accountNumber}  |  Generated: ${now()}`, 30, cy + 18, { font: "12px monospace", color: C.GRAY });
    cy += 36;
    const headers = ["DATE", "TYPE", "AMOUNT", "BALANCE"];
    const colX = [30, 160, 420, 630];
    for (let i = 0; i < headers.length; i++) drawText(ctx, headers[i], colX[i], cy, { font: "bold 11px monospace", color: C.TEAL });
    cy += 6; drawDivider(ctx, 20, cy, W - 40, C.TEAL + "66"); cy += 8;

    const txns = bank.transactions.slice(0, 20);
    for (const tx of txns) {
        const color = ["deposit","transfer_in","collect","bonus","gift_in","cashback","interest"].includes(tx.type) ? C.GREEN : C.ORANGE;
        drawText(ctx, (tx.timestamp || "").split(" ")[0], colX[0], cy + 12, { font: "10px monospace", color: C.GRAY });
        drawText(ctx, (tx.type || "").replace(/_/g, " ").slice(0, 18), colX[1], cy + 12, { font: "11px monospace", color: C.WHITE });
        drawText(ctx, `${CURRENCY}${fmt(tx.amount)}`, colX[2], cy + 12, { font: "bold 11px monospace", color });
        drawText(ctx, `${CURRENCY}${fmt(tx.newBalance)}`, colX[3], cy + 12, { font: "11px monospace", color: C.CYAN });
        cy += 34;
    }

    cy += 14;
    const totals = [
        ["Opening Balance", `${CURRENCY}0`, C.GRAY],
        ["Total Deposits", `${CURRENCY}${fmt(bank.totalDeposited || 0)}`, C.GREEN],
        ["Total Withdrawals", `${CURRENCY}${fmt(bank.totalWithdrawn || 0)}`, C.ORANGE],
        ["Current Balance", `${CURRENCY}${fmt(bank.balance)}`, C.CYAN]
    ];
    drawFilledCard(ctx, 20, cy, W - 40, 12 + totals.length * 26, 10, C.CARD, C.TEAL + "44");
    let ry = cy + 16;
    for (const [l, v, c] of totals) {
        drawText(ctx, l, 40, ry, { font: "12px monospace", color: C.GRAY });
        drawText(ctx, v, W - 40, ry, { font: "bold 12px monospace", color: c, align: "right" });
        ry += 26;
    }
    drawPageFooter(ctx, W, H, bank.accountNumber); return canvas;
}

async function genLeaderboardImage(users, filter = "all") {
    const top = users.slice(0, 10);
    const filterLabel = filter === "w" ? "WEEKLY TOP" : filter === "m" ? "MONTHLY TOP" : "ALL-TIME RICH LIST";
    const W = 860, H = 130 + top.length * 62 + 60;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.GOLD);
    let cy = drawBankHeader(ctx, W, 0, C.GOLD, filterLabel);
    cy += 10;


    const tabs = [["ALL", "all"], ["WEEKLY", "w"], ["MONTHLY", "m"]];
    let tx = 20;
    for (const [label, key] of tabs) {
        const isActive = filter === key;
        const tw = 90;
        drawFilledCard(ctx, tx, cy, tw, 26, 13, isActive ? C.GOLD + "33" : C.CARD, isActive ? C.GOLD : C.BORDER);
        drawText(ctx, label, tx + tw / 2, cy + 17, { font: `${isActive ? "bold " : ""}11px monospace`, color: isActive ? C.GOLD : C.GRAY, align: "center" });
        tx += tw + 8;
    }
    cy += 38;

    const rankColors = [C.GOLD, "#c0c0c0", "#cd7f32"];
    const rankLabels = ["🥇", "🥈", "🥉"];
    for (let i = 0; i < top.length; i++) {
        const u = top[i];
        const rColor = rankColors[i] || C.DIMGRAY;
        const rowY = cy + i * 62;
        const isTop3 = i < 3;


        drawFilledCard(ctx, 12, rowY, W - 24, 54, 12,
            isTop3 ? rColor + "12" : C.CARD + "cc",
            rColor + (isTop3 ? "55" : "22"), isTop3 ? rColor : null);


        if (isTop3) {
            setGlow(ctx, rColor, 14);
            drawText(ctx, rankLabels[i], 38, rowY + 34, { font: "bold 24px Arial", color: rColor, align: "center" });
            clearGlow(ctx);
        } else {
            drawText(ctx, `#${i + 1}`, 38, rowY + 34, { font: "bold 18px monospace", color: C.DIMGRAY, align: "center" });
        }


        drawCircle(ctx, 76, rowY + 27, 20, rColor + "1a", rColor, rColor);
        drawText(ctx, (u.name || "?")[0].toUpperCase(), 76, rowY + 33, { font: "bold 17px Arial", color: rColor, align: "center" });


        drawText(ctx, (u.name || "Unknown").slice(0, 24), 106, rowY + 20, { font: "bold 15px Arial", color: C.WHITE });
        const tier = getTier(u.bank.totalDeposited || 0);
        drawStatusBadge(ctx, 106, rowY + 26, `${tierEmoji(tier.label)} ${tier.label}`, tier.glow);


        const nw = getNetWorth(u.bank);
        setGlow(ctx, rColor, 10);
        drawText(ctx, `${CURRENCY}${fmt(nw)}`, W - 20, rowY + 22, { font: "bold 19px monospace", color: rColor, align: "right" });
        clearGlow(ctx);
        drawText(ctx, `Dep ${CURRENCY}${fmtShort(u.bank.totalDeposited || 0)}  ·  TXN ${u.bank.totalTransactions || 0}`, W - 20, rowY + 42, { font: "10px monospace", color: C.GRAY, align: "right" });
    }


    const totalNw = users.reduce((s, u) => s + getNetWorth(u.bank), 0);
    cy = cy + top.length * 62 + 10;
    drawFilledCard(ctx, 12, cy, W - 24, 36, 10, C.GOLD + "0e", C.GOLD + "33");
    drawText(ctx, `${users.length} bankers  ·  Total wealth ${CURRENCY}${fmtShort(totalNw)}`, W / 2, cy + 22, { font: "12px monospace", color: C.GOLD, align: "center" });

    drawPageFooter(ctx, W, H); return canvas;
}

const BJ_SUITS = ["♠", "♥", "♦", "♣"];
const BJ_VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
function bjDeck() {
    const d = [];
    for (const s of BJ_SUITS) for (const v of BJ_VALUES) d.push({ s, v });
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    return d;
}
function bjCardVal(card) {
    if (["J", "Q", "K"].includes(card.v)) return 10;
    if (card.v === "A") return 11;
    return parseInt(card.v);
}
function bjHandVal(hand) {
    let total = hand.reduce((s, c) => s + bjCardVal(c), 0);
    let aces = hand.filter(c => c.v === "A").length;
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}
function bjHandStr(hand) { return hand.map(c => `${c.v}${c.s}`).join(" "); }

async function genBlackjackCard(data) {
    const { playerHand, dealerHand, playerVal, dealerVal, result, bet, profit, newBal, txnId, hideDealer } = data;
    const color = result === "win" ? C.GREEN : result === "push" ? C.GOLD : result === "blackjack" ? C.PURPLE : C.RED;
    const W = 860, H = 480;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, color);
    let cy = drawBankHeader(ctx, W, 0, color, "BLACKJACK");
    cy += 18;


    drawText(ctx, "DEALER", 40, cy + 14, { font: "bold 11px monospace", color: C.GRAY });
    drawText(ctx, hideDealer ? `${dealerHand[0].v}${dealerHand[0].s} + ?` : bjHandStr(dealerHand), 130, cy + 14, { font: "bold 18px monospace", color: C.WHITE });
    const dvLabel = hideDealer ? `${bjCardVal(dealerHand[0])}+` : `${dealerVal}`;
    drawText(ctx, dvLabel, W - 40, cy + 14, { font: "bold 18px monospace", color: dealerVal > 21 ? C.RED : C.CYAN, align: "right" });

    drawDivider(ctx, 20, cy + 28, W - 40, C.DIMGRAY);


    drawText(ctx, "YOU", 40, cy + 52, { font: "bold 11px monospace", color: C.GRAY });
    drawText(ctx, bjHandStr(playerHand), 130, cy + 52, { font: "bold 20px monospace", color: C.WHITE });
    drawText(ctx, `${playerVal}`, W - 40, cy + 52, { font: "bold 20px monospace", color: playerVal > 21 ? C.RED : C.GREEN, align: "right" });
    cy += 80;


    if (result) {
        const resultText = result === "blackjack" ? "🃏 BLACKJACK!" : result === "win" ? "✅ YOU WIN!" : result === "push" ? "🤝 PUSH" : result === "bust" ? "💥 BUST!" : "❌ DEALER WINS";
        setGlow(ctx, color, 20);
        drawText(ctx, resultText, W / 2, cy + 28, { font: "bold 36px monospace", color: C.WHITE, align: "center" });
        clearGlow(ctx);
        cy += 64;
    }

    const bx = 60, bw = W - 120, bh = 116;
    drawFilledCard(ctx, bx, cy, bw, bh, 14, C.CARD, color + "44", color);
    const rows = [
        ["BET",      `${CURRENCY}${fmt(bet)}`,                                      C.GRAY],
        ["RESULT",   profit >= 0 ? `+${CURRENCY}${fmt(profit)}` : `-${CURRENCY}${fmt(Math.abs(profit))}`, profit >= 0 ? C.GREEN : C.RED],
        ["BALANCE",  `${CURRENCY}${fmt(newBal)}`,                                   C.CYAN],
        ["TXN ID",   txnId,                                                          C.DIMGRAY]
    ];
    let ry = cy + 22;
    for (const [l, v, c] of rows) {
        drawText(ctx, l, bx + 24, ry, { font: "12px monospace", color: C.GRAY });
        drawText(ctx, v, bx + bw - 24, ry, { font: "bold 13px monospace", color: c, align: "right" });
        ry += 26;
    }
    if (!result) {
        cy += bh + 16;
        drawText(ctx, "Hit: .bank bj hit  ·  Stand: .bank bj stand  ·  Double: .bank bj double", W / 2, cy, { font: "12px monospace", color: C.GRAY, align: "center" });
    }
    drawPageFooter(ctx, W, H, txnId); return canvas;
}

const ROULETTE_BETS = {
    red:   { label: "RED",    payout: 2,  check: n => [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n) },
    black: { label: "BLACK",  payout: 2,  check: n => n > 0 && ![1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n) },
    even:  { label: "EVEN",   payout: 2,  check: n => n > 0 && n % 2 === 0 },
    odd:   { label: "ODD",    payout: 2,  check: n => n > 0 && n % 2 !== 0 },
    low:   { label: "1-18",   payout: 2,  check: n => n >= 1 && n <= 18 },
    high:  { label: "19-36",  payout: 2,  check: n => n >= 19 && n <= 36 },
    first: { label: "1ST 12", payout: 3,  check: n => n >= 1 && n <= 12 },
    second:{ label: "2ND 12", payout: 3,  check: n => n >= 13 && n <= 24 },
    third: { label: "3RD 12", payout: 3,  check: n => n >= 25 && n <= 36 },
};

async function genRouletteCard(data) {
    const { spin, betType, bet, isWin, profit, newBal, txnId } = data;
    const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(spin);
    const numColor = spin === 0 ? C.GREEN : isRed ? C.RED : C.DIMGRAY;
    const color = isWin ? C.GREEN : C.RED;
    const W = 860, H = 400;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, color);
    let cy = drawBankHeader(ctx, W, 0, color, "ROULETTE");
    cy += 24;


    drawCircle(ctx, W / 2, cy + 50, 54, numColor + "22", numColor, numColor);
    setGlow(ctx, numColor, 20);
    drawText(ctx, spin === 0 ? "0" : `${spin}`, W / 2, cy + 58, { font: "bold 44px monospace", color: C.WHITE, align: "center" });
    clearGlow(ctx);
    drawText(ctx, spin === 0 ? "GREEN" : isRed ? "RED" : "BLACK", W / 2, cy + 82, { font: "bold 12px monospace", color: numColor, align: "center" });
    cy += 120;

    setGlow(ctx, color, 16);
    drawText(ctx, isWin ? `WIN! +${CURRENCY}${fmt(profit)}` : `LOSE! -${CURRENCY}${fmt(bet)}`, W / 2, cy, { font: "bold 32px monospace", color: C.WHITE, align: "center" });
    clearGlow(ctx);
    cy += 50;

    const bx = 80, bw = W - 160, bh = 100;
    drawFilledCard(ctx, bx, cy, bw, bh, 12, C.CARD, color + "44", color);
    const rows = [
        ["BET TYPE", (ROULETTE_BETS[betType]?.label || betType).toUpperCase(), C.WHITE],
        ["BET",      `${CURRENCY}${fmt(bet)}`,                                  C.GRAY],
        ["RESULT",   isWin ? `+${CURRENCY}${fmt(profit)}` : `-${CURRENCY}${fmt(bet)}`, isWin ? C.GREEN : C.RED],
        ["BALANCE",  `${CURRENCY}${fmt(newBal)}`,                               C.CYAN],
    ];
    let ry = cy + 18;
    for (const [l, v, c] of rows) {
        drawText(ctx, l, bx + 24, ry, { font: "12px monospace", color: C.GRAY });
        drawText(ctx, v, bx + bw - 24, ry, { font: "bold 13px monospace", color: c, align: "right" });
        ry += 22;
    }
    drawPageFooter(ctx, W, H, txnId); return canvas;
}

async function genLoanCard(bank, name, isRepay = false) {
    const loan = bank.loan;
    const W = 820, H = 440;
    const { canvas, ctx } = buildCanvas(W, H);
    const color = isRepay ? C.GREEN : C.RED;
    drawPageBackground(ctx, W, H, color);
    let cy = drawBankHeader(ctx, W, 0, color, isRepay ? "LOAN REPAYMENT" : "LOAN ISSUED");
    cy += 20;
    drawCircle(ctx, W / 2, cy + 46, 40, color + "18", color, color);
    if (isRepay) drawCheckIcon(ctx, W / 2, cy + 46, 22, color);
    else drawArrowIcon(ctx, W / 2, cy + 46, "up", 28, color);
    cy += 108;
    drawText(ctx, isRepay ? "LOAN REPAID" : "LOAN DISBURSED", W / 2, cy, { font: "bold 20px monospace", color, align: "center", glow: color, glowBlur: 12 });
    cy += 42;
    const bx = 50, bw = W - 100;
    const rows = [
        ["HOLDER",    name.toUpperCase(),                                 C.WHITE],
        ["PRINCIPAL", `${CURRENCY}${fmt(loan.amount)}`,                   C.GOLD],
        ["INTEREST",  `${CURRENCY}${fmt(loan.interest)} (${(LOAN_INTEREST_RATE * 100).toFixed(0)}%)`, C.ORANGE],
        ["TOTAL DUE", `${CURRENCY}${fmt(loan.totalDue)}`,                 C.RED],
        ["REMAINING", `${CURRENCY}${fmt(isRepay ? loan.remaining : loan.totalDue)}`, isRepay ? C.GREEN : C.RED],
        ["ACCOUNT",   bank.accountNumber,                                  C.GRAY],
        ["DATE",      loan.takenAt,                                        C.GRAY]
    ];
    const bh = rows.length * 32 + 24;
    drawFilledCard(ctx, bx, cy, bw, bh, 12, C.CARD, color + "44", color);
    let ry = cy + 24;
    for (const [lbl, val, vc] of rows) {
        drawText(ctx, lbl, bx + 24, ry, { font: "13px monospace", color: C.GRAY });
        drawText(ctx, val, bx + bw - 24, ry, { font: "bold 13px monospace", color: vc || C.WHITE, align: "right" });
        ry += 32;
    }
    drawPageFooter(ctx, W, H, bank.accountNumber); return canvas;
}

async function genSavingsCard(bank, name, type, amount, interest = 0) {
    const W = 820, H = 420;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.GOLD);
    let cy = drawBankHeader(ctx, W, 0, C.GOLD, "SAVINGS ACCOUNT");
    cy += 20;
    drawCircle(ctx, W / 2, cy + 46, 40, C.GOLD + "18", C.GOLD, C.GOLD);
    drawText(ctx, type === "deposit" ? "↑" : "↓", W / 2, cy + 54, { font: "bold 26px monospace", color: C.GOLD, align: "center" });
    cy += 106;
    drawText(ctx, type === "deposit" ? "SAVINGS DEPOSIT" : "SAVINGS WITHDRAWAL", W / 2, cy, { font: "bold 20px monospace", color: C.GOLD, align: "center", glow: C.GOLD, glowBlur: 12 });
    cy += 44;
    const bx = 50, bw = W - 100;
    const rows = type === "deposit"
        ? [["DEPOSITED", `${CURRENCY}${fmt(amount)}`, C.GREEN], ["NEW SAVINGS", `${CURRENCY}${fmt(bank.savings)}`, C.GOLD], ["INTEREST RATE", `${(INTEREST_RATE_DAILY * 100).toFixed(0)}% / day`, C.CYAN], ["ACCOUNT", bank.accountNumber, C.GRAY]]
        : [["WITHDRAWN", `${CURRENCY}${fmt(amount)}`, C.GOLD], ["INTEREST EARNED", `+${CURRENCY}${fmt(interest)}`, C.GREEN], ["TOTAL RECEIVED", `${CURRENCY}${fmt(amount + interest)}`, C.GREEN], ["NEW BANK BAL", `${CURRENCY}${fmt(bank.balance)}`, C.CYAN], ["ACCOUNT", bank.accountNumber, C.GRAY]];
    const bh = rows.length * 32 + 24;
    drawFilledCard(ctx, bx, cy, bw, bh, 12, C.CARD, C.GOLD + "44", C.GOLD);
    let ry = cy + 24;
    for (const [lbl, val, vc] of rows) {
        drawText(ctx, lbl, bx + 24, ry, { font: "13px monospace", color: C.GRAY });
        drawText(ctx, val, bx + bw - 24, ry, { font: "bold 13px monospace", color: vc || C.WHITE, align: "right" });
        ry += 32;
    }
    drawPageFooter(ctx, W, H, bank.accountNumber); return canvas;
}

async function genInvestCard(bank, name, plan, amount, isCollect = false) {
    const planInfo = INVEST_PLANS[plan];
    const W = 820, H = 460;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, planInfo.color);
    let cy = drawBankHeader(ctx, W, 0, planInfo.color, isCollect ? "INVESTMENT COLLECTED" : "INVESTMENT OPENED");
    cy += 20;
    drawCircle(ctx, W / 2, cy + 46, 40, planInfo.color + "18", planInfo.color, planInfo.color);
    drawArrowIcon(ctx, W / 2, cy + 46, isCollect ? "up" : "down", 28, planInfo.color);
    cy += 110;
    drawText(ctx, isCollect ? "RETURNS COLLECTED" : `${planInfo.label} PLAN ACTIVATED`, W / 2, cy, { font: "bold 20px monospace", color: planInfo.color, align: "center", glow: planInfo.color, glowBlur: 12 });
    cy += 44;
    const bx = 50, bw = W - 100;
    const profit = Math.floor(amount * planInfo.roi);
    const rows = isCollect
        ? [["PRINCIPAL", `${CURRENCY}${fmt(amount)}`, C.WHITE], ["PROFIT", `+${CURRENCY}${fmt(profit)} (+${(planInfo.roi * 100).toFixed(0)}%)`, C.GREEN], ["TOTAL RECEIVED", `${CURRENCY}${fmt(amount + profit)}`, planInfo.color], ["PLAN", planInfo.label, planInfo.color], ["ACCOUNT", bank.accountNumber, C.GRAY]]
        : [["PLAN", planInfo.label, planInfo.color], ["AMOUNT INVESTED", `${CURRENCY}${fmt(amount)}`, C.WHITE], ["EXPECTED RETURN", `+${CURRENCY}${fmt(profit)} (+${(planInfo.roi * 100).toFixed(0)}%)`, C.GREEN], ["LOCK PERIOD", `${planInfo.days} day${planInfo.days > 1 ? "s" : ""}`, C.ORANGE], ["DUE DATE", moment().add(planInfo.days, "days").format("DD/MM/YYYY HH:mm"), C.CYAN], ["ACCOUNT", bank.accountNumber, C.GRAY]];
    const bh = rows.length * 32 + 24;
    drawFilledCard(ctx, bx, cy, bw, bh, 12, C.CARD, planInfo.color + "44", planInfo.color);
    let ry = cy + 24;
    for (const [lbl, val, vc] of rows) {
        drawText(ctx, lbl, bx + 24, ry, { font: "13px monospace", color: C.GRAY });
        drawText(ctx, val, bx + bw - 24, ry, { font: "bold 13px monospace", color: vc || C.WHITE, align: "right" });
        ry += 32;
    }
    drawPageFooter(ctx, W, H, bank.accountNumber); return canvas;
}

async function genBonusCard(bank, name, bonusAmt, streak) {
    const W = 820, H = 400;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.PURPLE);
    let cy = drawBankHeader(ctx, W, 0, C.PURPLE, "DAILY BONUS");
    cy += 20;
    drawCircle(ctx, W / 2, cy + 46, 40, C.PURPLE + "22", C.PURPLE, C.PURPLE);
    drawText(ctx, "♦", W / 2, cy + 54, { font: "bold 32px Arial", color: C.PURPLE, align: "center", glow: C.PURPLE, glowBlur: 14 });
    cy += 110;
    setGlow(ctx, C.PURPLE, 16);
    drawText(ctx, `+${CURRENCY}${fmt(bonusAmt)}`, W / 2, cy, { font: "bold 52px monospace", color: C.WHITE, align: "center" });
    clearGlow(ctx);
    drawText(ctx, "BONUS CLAIMED!", W / 2, cy + 22, { font: "bold 14px monospace", color: C.PURPLE, align: "center" });
    cy += 56;
    const bx = 80, bw = W - 160;
    drawFilledCard(ctx, bx, cy, bw, 88, 12, C.CARD, C.PURPLE + "44", C.PURPLE);
    drawText(ctx, "STREAK", bx + 28, cy + 28, { font: "12px monospace", color: C.GRAY });
    setGlow(ctx, C.PURPLE, 8);
    drawText(ctx, `${streak} DAYS STREAK`, bx + 28, cy + 56, { font: "bold 22px monospace", color: C.PURPLE });
    clearGlow(ctx);
    drawText(ctx, "NEXT BONUS", bx + bw - 28, cy + 28, { font: "12px monospace", color: C.GRAY, align: "right" });
    drawText(ctx, `${CURRENCY}${fmt(DAILY_BONUS_BASE + (streak + 1) * BONUS_STREAK_MULTIPLIER)}`, bx + bw - 28, cy + 56, { font: "bold 22px monospace", color: C.GREEN, align: "right" });
    drawPageFooter(ctx, W, H, bank.accountNumber); return canvas;
}

async function genInterestCard(bank, name, amount, newSavings) {
    const W = 820, H = 380;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.GOLD);
    let cy = drawBankHeader(ctx, W, 0, C.GOLD, "SAVINGS INTEREST");
    cy += 28;
    drawText(ctx, `+${CURRENCY}${fmt(amount)}`, W / 2, cy + 28, { font: "bold 52px monospace", color: C.GOLD, align: "center", glow: C.GOLD, glowBlur: 20 });
    cy += 58;
    drawText(ctx, "DAILY INTEREST CLAIMED", W / 2, cy, { font: "bold 16px monospace", color: C.GOLD, align: "center" });
    cy += 44;
    const bx = 80, bw = W - 160;
    const rows = [["SAVINGS BALANCE", `${CURRENCY}${fmt(newSavings)}`, C.GOLD], ["INTEREST RATE", `${(INTEREST_RATE_DAILY * 100).toFixed(0)}% per day`, C.CYAN], ["INTEREST EARNED", `+${CURRENCY}${fmt(amount)}`, C.GREEN], ["ACCOUNT", bank.accountNumber, C.GRAY]];
    const bh = rows.length * 30 + 20;
    drawFilledCard(ctx, bx, cy, bw, bh, 12, C.CARD, C.GOLD + "44", C.GOLD);
    let ry = cy + 22;
    for (const [lbl, val, vc] of rows) {
        drawText(ctx, lbl, bx + 24, ry, { font: "13px monospace", color: C.GRAY });
        drawText(ctx, val, bx + bw - 24, ry, { font: "bold 13px monospace", color: vc || C.WHITE, align: "right" });
        ry += 30;
    }
    drawPageFooter(ctx, W, H, bank.accountNumber); return canvas;
}

async function genFreezeCard(bank, name, frozen) {
    const W = 820, H = 330;
    const { canvas, ctx } = buildCanvas(W, H);
    const col = frozen ? C.RED : C.GREEN;
    drawPageBackground(ctx, W, H, col);
    let cy = drawBankHeader(ctx, W, 0, col, frozen ? "ACCOUNT FROZEN" : "ACCOUNT ACTIVE");
    cy += 20;
    drawCircle(ctx, W / 2, cy + 46, 40, col + "18", col, col);
    if (frozen) { drawXIcon(ctx, W / 2, cy + 54, 18, col); } else drawCheckIcon(ctx, W / 2, cy + 54, 18, col);
    cy += 106;
    drawText(ctx, frozen ? "YOUR ACCOUNT HAS BEEN FROZEN" : "YOUR ACCOUNT IS NOW ACTIVE", W / 2, cy, { font: "bold 18px monospace", color: col, align: "center", glow: col, glowBlur: 10 });
    cy += 40;
    drawText(ctx, frozen ? "All transactions disabled." : "All transactions enabled.", W / 2, cy, { font: "14px Arial", color: C.GRAY, align: "center" });
    cy += 36;
    drawFilledCard(ctx, 100, cy, W - 200, 48, 8, col + "15", col + "44");
    drawText(ctx, bank.accountNumber, W / 2, cy + 30, { font: "bold 16px monospace", color: col, align: "center" });
    drawPageFooter(ctx, W, H, bank.accountNumber); return canvas;
}

async function genGameCard(type, data) {
    const isWin = data.isWin;
    const color = isWin ? C.GREEN : C.RED;
    const isSlots = type === "slots";
    const W = 820, H = isSlots ? 420 : 380;
    const { canvas, ctx } = buildCanvas(W, H);
    const labels = { flip: "COIN FLIP", gamble: "CASINO GAMBLE", slots: "SLOT MACHINE", rob: "STREET ROB", wheel: "LUCKY WHEEL" };
    drawPageBackground(ctx, W, H, color);
    let cy = drawBankHeader(ctx, W, 0, color, labels[type] || "GAME");
    cy += 20;
    drawCircle(ctx, W / 2, cy + 44, 40, color + "18", color, color);
    if (isWin) drawCheckIcon(ctx, W / 2, cy + 44, 22, color);
    else drawXIcon(ctx, W / 2, cy + 44, 22, color);
    cy += 106;
    setGlow(ctx, color, 16);
    drawText(ctx, isWin ? "YOU WIN!" : "YOU LOSE!", W / 2, cy, { font: "bold 36px monospace", color: C.WHITE, align: "center" });
    clearGlow(ctx);
    cy += 46;
    if (isSlots && data.reels) {
        drawSlotReels(ctx, data.reels, W / 2, cy, 116, 58);
        cy += 72;
    } else if (data.display) {
        drawText(ctx, data.display, W / 2, cy, { font: "bold 22px monospace", color: C.WHITE, align: "center" });
        cy += 40;
    }
    const bx = 50, bw = W - 100;
    const bh = (data.rows || []).length * 30 + 20;
    drawFilledCard(ctx, bx, cy, bw, bh, 12, C.CARD, color + "44", color);
    let ry = cy + 22;
    for (const [lbl, val, vc] of (data.rows || [])) {
        drawText(ctx, lbl, bx + 24, ry, { font: "13px monospace", color: C.GRAY });
        drawText(ctx, val, bx + bw - 24, ry, { font: "bold 13px monospace", color: vc || C.WHITE, align: "right" });
        ry += 30;
    }
    drawPageFooter(ctx, W, H, data.txnId); return canvas;
}

async function genMissionsCard(bank, name) {
    const missions = getDailyMissions(bank);
    const activeMissions = MISSIONS.filter(m => missions[m.id] !== undefined);
    const W = 820, H = 100 + activeMissions.length * 68 + 80;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.TEAL);
    let cy = drawBankHeader(ctx, W, 0, C.TEAL, "DAILY MISSIONS");
    cy += 14;
    drawText(ctx, `${name} — ${today()} — Resets daily`, W / 2, cy + 18, { font: "13px monospace", color: C.GRAY, align: "center" });
    cy += 38;
    for (const m of activeMissions) {
        const ms = missions[m.id];
        const done = ms?.done || false;
        const progress = ms?.progress || 0;
        const pct = Math.min(progress / m.target, 1);
        const color = done ? C.GREEN : C.TEAL;
        drawFilledCard(ctx, 20, cy, W - 40, 58, 10, done ? C.GREEN + "12" : C.CARD, color + "33");
        if (done) drawCheckIcon(ctx, 44, cy + 30, 10, C.GREEN);
        else { ctx.save(); ctx.strokeStyle = C.GRAY; ctx.lineWidth = 1.5; ctx.strokeRect(38, cy + 22, 12, 15); ctx.restore(); }
        drawText(ctx, m.label, 70, cy + 20, { font: "bold 14px Arial", color: done ? C.GREEN : C.WHITE });
        drawText(ctx, `Progress: ${Math.min(progress, m.target)}/${m.target}`, 70, cy + 38, { font: "12px monospace", color: C.GRAY });
        drawProgressBar(ctx, 260, cy + 20, 260, 8, pct, color);
        setGlow(ctx, C.GOLD, 6);
        drawText(ctx, `+${CURRENCY}${fmt(m.reward)}`, W - 30, cy + 30, { font: "bold 16px monospace", color: C.GOLD, align: "right" });
        clearGlow(ctx);
        cy += 68;
    }
    const totalReward = activeMissions.filter(m => missions[m.id]?.done).reduce((s, m) => s + m.reward, 0);
    const totalPossible = activeMissions.reduce((s, m) => s + m.reward, 0);
    drawText(ctx, `Earned today: ${CURRENCY}${fmt(totalReward)} / ${CURRENCY}${fmt(totalPossible)}`, W / 2, cy + 20, { font: "bold 13px monospace", color: C.TEAL, align: "center" });
    drawPageFooter(ctx, W, H); return canvas;
}

async function genStatsCard(allUsers) {
    const bankUsers = allUsers.filter(u => u.data?.bank?.isRegistered);
    const totalBalance = bankUsers.reduce((s, u) => s + (u.data.bank.balance || 0), 0);
    const totalSavings = bankUsers.reduce((s, u) => s + (u.data.bank.savings || 0), 0);
    const totalDeposited = bankUsers.reduce((s, u) => s + (u.data.bank.totalDeposited || 0), 0);
    const totalWithdrawn = bankUsers.reduce((s, u) => s + (u.data.bank.totalWithdrawn || 0), 0);
    const totalTxns = bankUsers.reduce((s, u) => s + (u.data.bank.totalTransactions || 0), 0);
    const loansActive = bankUsers.filter(u => u.data.bank.loan && !u.data.bank.loan.repaid).length;
    const invActive = bankUsers.filter(u => u.data.bank.investment && !u.data.bank.investment.collected).length;
    const frozenCount = bankUsers.filter(u => u.data.bank.frozen).length;
    const totalGamesPlayed = bankUsers.reduce((s, u) => s + (u.data.bank.gamesPlayed || 0), 0);
    const tierCounts = ACCOUNT_TIERS.map(t => ({ label: t.label, color: t.glow, count: bankUsers.filter(u => getTier(u.data.bank.totalDeposited || 0).label === t.label).length }));
    const W = 820, H = 600;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.CYAN);
    let cy = drawBankHeader(ctx, W, 0, C.CYAN, "GLOBAL BANK STATISTICS");
    cy += 18;
    drawText(ctx, BANK_NAME, W / 2, cy + 26, { font: "bold 28px monospace", color: C.CYAN, align: "center", glow: C.CYAN, glowBlur: 14 });
    cy += 56;
    const mainStats = [
        { label: "REGISTERED", value: fmt(bankUsers.length), color: C.CYAN },
        { label: "TOTAL BALANCE", value: `${CURRENCY}${fmtShort(totalBalance)}`, color: C.GREEN },
        { label: "TOTAL SAVINGS", value: `${CURRENCY}${fmtShort(totalSavings)}`, color: C.GOLD },
        { label: "TOTAL DEPOSITED", value: `${CURRENCY}${fmtShort(totalDeposited)}`, color: C.CYAN },
        { label: "TOTAL WITHDRAWN", value: `${CURRENCY}${fmtShort(totalWithdrawn)}`, color: C.ORANGE },
        { label: "GAMES PLAYED", value: fmt(totalGamesPlayed), color: C.TEAL }
    ];
    const sw = (W - 70) / 3;
    for (let i = 0; i < mainStats.length; i++) {
        const col = i % 3, row = Math.floor(i / 3);
        const sx = 20 + col * (sw + 5), sy = cy + row * 80;
        drawFilledCard(ctx, sx, sy, sw, 72, 10, C.CARD, C.BORDER);
        drawText(ctx, mainStats[i].label, sx + sw / 2, sy + 18, { font: "10px monospace", color: C.GRAY, align: "center" });
        setGlow(ctx, mainStats[i].color, 8);
        drawText(ctx, mainStats[i].value, sx + sw / 2, sy + 52, { font: "bold 18px monospace", color: mainStats[i].color, align: "center" });
        clearGlow(ctx);
    }
    cy += 80 * 2 + 16;
    const statusRow = [{ label: "ACTIVE LOANS", value: fmt(loansActive), color: C.RED }, { label: "INVESTMENTS", value: fmt(invActive), color: C.GOLD }, { label: "FROZEN ACCS", value: fmt(frozenCount), color: C.CYAN2 }, { label: "TOTAL TXN", value: fmt(totalTxns), color: C.GRAY }];
    const ssw = (W - 60) / 4;
    for (let i = 0; i < statusRow.length; i++) {
        const sx = 20 + i * (ssw + 5);
        drawFilledCard(ctx, sx, cy, ssw - 5, 48, 8, statusRow[i].color + "15", statusRow[i].color + "44");
        drawText(ctx, statusRow[i].label, sx + (ssw - 5) / 2, cy + 16, { font: "10px monospace", color: C.GRAY, align: "center" });
        setGlow(ctx, statusRow[i].color, 8);
        drawText(ctx, statusRow[i].value, sx + (ssw - 5) / 2, cy + 38, { font: "bold 18px monospace", color: statusRow[i].color, align: "center" });
        clearGlow(ctx);
    }
    cy += 66;
    drawText(ctx, "TIER DISTRIBUTION", 20, cy, { font: "11px monospace", color: C.GRAY });
    cy += 14;
    const totalUsers = bankUsers.length || 1;
    let bx = 20;
    for (const t of tierCounts) {
        if (t.count === 0) continue;
        const barW = (W - 40) * (t.count / totalUsers);
        ctx.save(); setGlow(ctx, t.color, 6); ctx.fillStyle = t.color + "88"; ctx.fillRect(bx, cy, barW, 22); clearGlow(ctx); ctx.restore();
        if (barW > 40) drawText(ctx, t.label, bx + barW / 2, cy + 15, { font: "bold 9px monospace", color: C.WHITE, align: "center" });
        bx += barW;
    }
    cy += 34;
    let lx = 20;
    for (const t of tierCounts) {
        drawCircle(ctx, lx + 5, cy + 5, 5, t.color, null);
        drawText(ctx, `${t.label}(${t.count})`, lx + 14, cy + 10, { font: "10px Arial", color: C.GRAY });
        lx += ctx.measureText(`${t.label}(${t.count})`).width + 30;
    }
    drawPageFooter(ctx, W, H); return canvas;
}

async function genRegisterCard(bank, name) {
    const W = 820, H = 440;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.GREEN);
    let cy = drawBankHeader(ctx, W, 0, C.GREEN, "ACCOUNT OPENED");
    cy += 20;
    drawCircle(ctx, W / 2, cy + 50, 44, C.GREEN + "18", C.GREEN, C.GREEN);
    drawCheckIcon(ctx, W / 2, cy + 50, 26, C.GREEN);
    cy += 116;
    setGlow(ctx, C.GREEN, 16);
    drawText(ctx, "WELCOME TO " + BANK_NAME, W / 2, cy, { font: "bold 22px monospace", color: C.GREEN, align: "center" });
    clearGlow(ctx);
    cy += 44;
    const bx = 50, bw = W - 100;
    const rows = [
        ["HOLDER NAME",   name.toUpperCase(),              C.WHITE],
        ["ACCOUNT NO",    bank.accountNumber,               C.CYAN],
        ["INITIAL BAL",   `${CURRENCY}0`,                  C.GRAY],
        ["DAILY LIMIT",   `${CURRENCY}${fmt(DAILY_WITHDRAW_LIMIT)}`, C.GREEN],
        ["OPENED AT",     bank.createdAt,                  C.GRAY],
        ["STATUS",        "ACTIVE & VERIFIED",             C.GREEN]
    ];
    const bh = rows.length * 32 + 24;
    drawFilledCard(ctx, bx, cy, bw, bh, 12, C.CARD, C.GREEN + "44", C.GREEN);
    let ry = cy + 24;
    for (const [lbl, val, vc] of rows) {
        drawText(ctx, lbl, bx + 24, ry, { font: "13px monospace", color: C.GRAY });
        drawText(ctx, val, bx + bw - 24, ry, { font: "bold 13px monospace", color: vc || C.WHITE, align: "right" });
        ry += 32;
    }
    drawPageFooter(ctx, W, H, bank.accountNumber); return canvas;
}

async function genLimitsCard(bank, name) {
    const wLim = checkDailyLimit(DAILY_WITHDRAW_LIMIT, bank.dailyWithdraw, 0);
    const tLim = checkDailyLimit(DAILY_TRANSFER_LIMIT, bank.dailyTransfer, 0);
    const gLim = checkDailyLimit(GIFT_DAILY_LIMIT, bank.dailyGift || { date: null, amount: 0 }, 0);
    const wUsed = DAILY_WITHDRAW_LIMIT - wLim.remaining;
    const tUsed = DAILY_TRANSFER_LIMIT - tLim.remaining;
    const gUsed = GIFT_DAILY_LIMIT - gLim.remaining;
    const W = 820, H = 440;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.CYAN);
    let cy = drawBankHeader(ctx, W, 0, C.CYAN, "DAILY LIMITS");
    cy += 24;
    drawText(ctx, name.toUpperCase(), W / 2, cy + 18, { font: "bold 18px Arial", color: C.WHITE, align: "center" });
    cy += 50;
    const limits = [
        { label: "WITHDRAW LIMIT", used: wUsed, total: DAILY_WITHDRAW_LIMIT, color: C.ORANGE },
        { label: "TRANSFER LIMIT", used: tUsed, total: DAILY_TRANSFER_LIMIT, color: C.PURPLE },
        { label: "GIFT LIMIT",     used: gUsed, total: GIFT_DAILY_LIMIT,     color: C.PINK }
    ];
    for (const lm of limits) {
        const pct = lm.total > 0 ? lm.used / lm.total : 0;
        drawFilledCard(ctx, 20, cy, W - 40, 88, 10, C.CARD, lm.color + "33");
        drawText(ctx, lm.label, 40, cy + 22, { font: "bold 13px monospace", color: lm.color });
        drawText(ctx, `${CURRENCY}${fmt(lm.used)} used`, 40, cy + 42, { font: "12px monospace", color: C.GRAY });
        drawText(ctx, `${CURRENCY}${fmt(lm.total - lm.used)} remaining`, W - 40, cy + 42, { font: "bold 12px monospace", color: lm.color, align: "right" });
        drawProgressBar(ctx, 40, cy + 54, W - 80, 12, pct, lm.color);
        cy += 100;
    }
    drawText(ctx, `Limits reset at midnight (${TZ})`, W / 2, cy + 16, { font: "11px monospace", color: C.GRAY, align: "center" });
    drawPageFooter(ctx, W, H, bank.accountNumber); return canvas;
}

async function genVaultCard(bank, name, type, amount) {
    const vault = bank.vault || {};
    const color = type === "open" ? C.TEAL : type === "collect" ? C.GREEN : C.PURPLE;
    const labels = { open: "VAULT OPENED", collect: "VAULT COLLECTED", info: "VAULT ACCOUNT" };
    const W = 820, H = 460;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, color);
    let cy = drawBankHeader(ctx, W, 0, color, labels[type] || "VAULT");
    cy += 20;
    drawCircle(ctx, W / 2, cy + 46, 44, color + "18", color, color);
    if (type === "collect") drawCheckIcon(ctx, W / 2, cy + 54, 18, color);
    else { ctx.save(); setGlow(ctx, color, 10); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(W / 2, cy + 44, 10, Math.PI, 0); ctx.stroke(); ctx.strokeRect(W / 2 - 12, cy + 44, 24, 18); clearGlow(ctx); ctx.restore(); }
    cy += 112;
    setGlow(ctx, color, 14);
    drawText(ctx, `${CURRENCY}${fmt(amount || vault.amount || 0)}`, W / 2, cy, { font: "bold 48px monospace", color: C.WHITE, align: "center" });
    clearGlow(ctx);
    cy += 50;
    const bx = 50, bw = W - 100;
    const lockUntil = vault.lockUntil ? moment(vault.lockUntil).format("DD/MM/YYYY HH:mm") : "N/A";
    const daysLeft = vault.lockUntil ? Math.max(0, Math.ceil((vault.lockUntil - Date.now()) / 86400000)) : 0;
    const rows = type === "open"
        ? [["DEPOSITED",    `${CURRENCY}${fmt(amount)}`,            C.TEAL], ["DAILY RATE",    `${(VAULT_INTEREST_DAILY * 100).toFixed(1)}% (${VAULT_MIN_LOCK_DAYS}d lock)`, C.CYAN], ["UNLOCKS",       lockUntil,                             C.ORANGE], ["EXPECTED GAIN", `${CURRENCY}${fmt(Math.floor((amount || 0) * VAULT_INTEREST_DAILY * VAULT_MIN_LOCK_DAYS))}`, C.GREEN], ["ACCOUNT",       bank.accountNumber,                    C.GRAY]]
        : type === "collect"
        ? [["PRINCIPAL",    `${CURRENCY}${fmt(vault.amount || 0)}`, C.WHITE], ["INTEREST",      `+${CURRENCY}${fmt(amount - (vault.amount || 0))}`, C.GREEN], ["TOTAL",         `${CURRENCY}${fmt(amount)}`,            color], ["LOCKED DAYS",   `${VAULT_MIN_LOCK_DAYS}d`,               C.ORANGE], ["ACCOUNT",       bank.accountNumber,                    C.GRAY]]
        : [["VAULT BAL",    `${CURRENCY}${fmt(vault.amount || 0)}`, color], ["LOCKED UNTIL",  lockUntil,                             C.ORANGE], ["DAYS LEFT",     `${daysLeft} day(s)`,                  C.CYAN], ["DAILY RATE",    `${(VAULT_INTEREST_DAILY * 100).toFixed(1)}%`, C.TEAL], ["ACCOUNT",       bank.accountNumber,                    C.GRAY]];
    const bh = rows.length * 32 + 24;
    drawFilledCard(ctx, bx, cy, bw, bh, 12, C.CARD, color + "44", color);
    let ry = cy + 24;
    for (const [lbl, val, vc] of rows) {
        drawText(ctx, lbl, bx + 24, ry, { font: "13px monospace", color: C.GRAY });
        drawText(ctx, val, bx + bw - 24, ry, { font: "bold 13px monospace", color: vc || C.WHITE, align: "right" });
        ry += 32;
    }
    drawPageFooter(ctx, W, H, bank.accountNumber); return canvas;
}

async function genAchievementsCard(bank, name) {
    const unlocked = bank.achievements || {};
    const total = ACHIEVEMENTS.length;
    const doneCount = Object.keys(unlocked).length;
    const W = 820, H = 100 + Math.ceil(total / 2) * 54 + 100;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.GOLD);
    let cy = drawBankHeader(ctx, W, 0, C.GOLD, `ACHIEVEMENTS — ${doneCount}/${total}`);
    cy += 12;
    drawText(ctx, `${name} — ${doneCount} unlocked / ${ACHIEVEMENTS.reduce((s, a) => s + a.reward, 0)} total rewards`, W / 2, cy + 16, { font: "12px monospace", color: C.GRAY, align: "center" });
    cy += 36;
    const colW = (W - 50) / 2;
    for (let i = 0; i < ACHIEVEMENTS.length; i++) {
        const a = ACHIEVEMENTS[i];
        const done = !!unlocked[a.id];
        const col = i % 2, row = Math.floor(i / 2);
        const x = 20 + col * (colW + 10), y = cy + row * 54;
        const aColor = done ? C.GOLD : C.DIMGRAY;
        drawFilledCard(ctx, x, y, colW, 46, 9, done ? C.GOLD + "12" : C.CARD, aColor + "33");
        drawText(ctx, a.icon, x + 26, y + 30, { font: "22px Arial", align: "center", alpha: done ? 1 : 0.4 });
        drawText(ctx, a.label, x + 44, y + 18, { font: "bold 12px Arial", color: done ? C.WHITE : C.GRAY });
        drawText(ctx, a.desc, x + 44, y + 32, { font: "9px Arial", color: C.DIMGRAY });
        if (done) {
            setGlow(ctx, C.GOLD, 6);
            drawText(ctx, `+${CURRENCY}${fmt(a.reward)}`, x + colW - 10, y + 18, { font: "bold 11px monospace", color: C.GOLD, align: "right" });
            clearGlow(ctx);
        } else {
            drawText(ctx, `+${CURRENCY}${fmt(a.reward)}`, x + colW - 10, y + 18, { font: "11px monospace", color: C.DIMGRAY, align: "right" });
        }
    }
    const finalY = cy + Math.ceil(total / 2) * 54 + 8;
    const totalEarned = ACHIEVEMENTS.filter(a => unlocked[a.id]).reduce((s, a) => s + a.reward, 0);
    drawText(ctx, `Total Earned: ${CURRENCY}${fmt(totalEarned)}`, W / 2, finalY, { font: "bold 13px monospace", color: C.GOLD, align: "center" });
    drawPageFooter(ctx, W, H); return canvas;
}

async function genGoalCard(bank, name) {
    const goal = bank.goal || null;
    const W = 820, H = 400;
    const { canvas, ctx } = buildCanvas(W, H);
    const color = goal ? (bank.balance >= goal.target ? C.GREEN : C.CYAN) : C.GRAY;
    drawPageBackground(ctx, W, H, color);
    let cy = drawBankHeader(ctx, W, 0, color, "SAVINGS GOAL");
    cy += 20;
    if (!goal) {
        drawText(ctx, "NO ACTIVE GOAL", W / 2, cy + 60, { font: "bold 22px monospace", color: C.GRAY, align: "center" });
        drawText(ctx, "Set a goal: .bank goal set <amount> <name>", W / 2, cy + 100, { font: "14px Arial", color: C.DIMGRAY, align: "center" });
        drawPageFooter(ctx, W, H); return canvas;
    }
    const pct = Math.min((bank.balance + (bank.savings || 0)) / goal.target, 1);
    const reached = pct >= 1;
    drawCircle(ctx, W / 2, cy + 44, 40, color + "18", color, color);
    if (reached) drawCheckIcon(ctx, W / 2, cy + 46, 20, color);
    else { drawText(ctx, "...", W / 2, cy + 54, { font: "bold 22px monospace", color, align: "center" }); }
    cy += 106;
    setGlow(ctx, color, 12);
    drawText(ctx, `"${(goal.name || "MY GOAL").toUpperCase()}"`, W / 2, cy, { font: "bold 20px monospace", color, align: "center" });
    clearGlow(ctx);
    cy += 36;
    drawText(ctx, `Target: ${CURRENCY}${fmt(goal.target)}`, W / 2, cy, { font: "bold 16px monospace", color: C.WHITE, align: "center" });
    cy += 28;
    drawProgressBar(ctx, 80, cy, W - 160, 18, pct, color, C.DIM, 9);
    cy += 28;
    drawText(ctx, `${CURRENCY}${fmt(Math.min(bank.balance + (bank.savings || 0), goal.target))} / ${CURRENCY}${fmt(goal.target)}  (${Math.round(pct * 100)}%)`, W / 2, cy, { font: "bold 13px monospace", color: color, align: "center" });
    cy += 28;
    if (reached) { setGlow(ctx, C.GREEN, 14); drawText(ctx, ">> GOAL REACHED! Claim with .bank goal claim <<", W / 2, cy, { font: "bold 14px monospace", color: C.GREEN, align: "center" }); clearGlow(ctx); }
    else { drawText(ctx, `Still need: ${CURRENCY}${fmt(goal.target - bank.balance - (bank.savings || 0))}`, W / 2, cy, { font: "13px Arial", color: C.GRAY, align: "center" }); }
    drawPageFooter(ctx, W, H); return canvas;
}

async function genDiceCard(data) {
    const { isWin, playerRoll, houseRoll, bet, profit, newBal, txnId } = data;
    const color = isWin ? C.GREEN : C.RED;
    const W = 820, H = 400;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, color);
    let cy = drawBankHeader(ctx, W, 0, color, "DICE ROLL");
    cy += 20;
    drawDiceFace(ctx, W / 3, cy + 54, 80, playerRoll, color);
    drawText(ctx, "YOU", W / 3, cy + 106, { font: "bold 12px monospace", color: C.GRAY, align: "center" });
    drawDiceFace(ctx, (W * 2) / 3, cy + 54, 80, houseRoll, C.RED);
    drawText(ctx, "HOUSE", (W * 2) / 3, cy + 106, { font: "bold 12px monospace", color: C.GRAY, align: "center" });
    drawText(ctx, "VS", W / 2, cy + 58, { font: "bold 24px monospace", color: C.DIMGRAY, align: "center" });
    cy += 120;
    setGlow(ctx, color, 16);
    drawText(ctx, isWin ? `YOU WIN! +${CURRENCY}${fmt(Math.abs(profit))}` : `HOUSE WINS! -${CURRENCY}${fmt(bet)}`, W / 2, cy, { font: "bold 26px monospace", color: C.WHITE, align: "center" });
    clearGlow(ctx);
    cy += 46;
    const bx = 80, bw = W - 160, bh = 96;
    drawFilledCard(ctx, bx, cy, bw, bh, 12, C.CARD, color + "44", color);
    const rows2 = [["YOUR ROLL", `${playerRoll}  (Payout: ${DICE_PAYOUTS[playerRoll]}x)`, color], ["BET", `${CURRENCY}${fmt(bet)}`, C.GRAY], ["RESULT", isWin ? `+${CURRENCY}${fmt(profit)}` : `-${CURRENCY}${fmt(bet)}`, color], ["NEW BAL", `${CURRENCY}${fmt(newBal)}`, C.CYAN]];
    let ry2 = cy + 20;
    for (const [l, v, c] of rows2) {
        drawText(ctx, l, bx + 22, ry2, { font: "12px monospace", color: C.GRAY });
        drawText(ctx, v, bx + bw - 22, ry2, { font: "bold 13px monospace", color: c, align: "right" });
        ry2 += 24;
    }
    drawPageFooter(ctx, W, H, txnId); return canvas;
}

async function genScratchCard(data) {
    const { prize, isWin, bet, newBal, txnId, reveals } = data;
    const color = isWin ? C.GOLD : C.RED;
    const W = 820, H = 420;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, color);
    let cy = drawBankHeader(ctx, W, 0, color, "SCRATCH CARD");
    cy += 20;
    drawText(ctx, isWin ? "[ WINNER! ]" : "[ NO WIN ]", W / 2, cy + 28, { font: "bold 32px monospace", color: C.WHITE, align: "center", glow: color, glowBlur: 16 });
    cy += 60;
    const cellW = (W - 60) / 3, cellH = 64;
    for (let i = 0; i < 3; i++) {
        const cx2 = 20 + i * (cellW + 10), cy2 = cy;
        const rev = reveals[i];
        drawFilledCard(ctx, cx2, cy2, cellW, cellH, 10, rev.value > 0 ? C.GOLD + "18" : C.CARD, rev.value > 0 ? C.GOLD : C.BORDER, rev.value > 0 ? C.GOLD : null);
        drawText(ctx, rev.label, cx2 + cellW / 2, cy2 + 38, { font: "bold 16px Arial", color: rev.value > 0 ? C.GOLD : C.GRAY, align: "center" });
    }
    cy += cellH + 20;
    setGlow(ctx, color, 12);
    drawText(ctx, prize.label, W / 2, cy, { font: "bold 28px monospace", color: isWin ? C.GOLD : C.RED, align: "center" });
    clearGlow(ctx);
    cy += 44;
    const bx = 100, bw = W - 200, bh = 76;
    drawFilledCard(ctx, bx, cy, bw, bh, 12, C.CARD, color + "44", color);
    let ry3 = cy + 20;
    const r3 = [["TICKET COST", `-${CURRENCY}${fmt(bet)}`, C.GRAY], ["PRIZE", isWin ? `+${CURRENCY}${fmt(prize.value)}` : "NOTHING", isWin ? C.GOLD : C.RED], ["NET", isWin ? `+${CURRENCY}${fmt(prize.value - bet)}` : `-${CURRENCY}${fmt(bet)}`, isWin ? C.GREEN : C.RED]];
    for (const [l, v, c] of r3) {
        drawText(ctx, l, bx + 24, ry3, { font: "13px monospace", color: C.GRAY });
        drawText(ctx, v, bx + bw - 24, ry3, { font: "bold 13px monospace", color: c, align: "right" });
        ry3 += 26;
    }
    drawPageFooter(ctx, W, H, txnId); return canvas;
}

async function genLotteryCard(bank, name, type, data) {
    const color = type === "win" ? C.GOLD : type === "buy" ? C.PURPLE : C.CYAN;
    const W = 820, H = 440;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, color);
    let cy = drawBankHeader(ctx, W, 0, color, type === "win" ? "LOTTERY WIN!" : type === "buy" ? "TICKET BOUGHT" : "LOTTERY INFO");
    cy += 20;
    drawCircle(ctx, W / 2, cy + 46, 44, color + "18", color, color);
    if (type === "win") drawCheckIcon(ctx, W / 2, cy + 54, 22, color);
    else { drawText(ctx, "TKT", W / 2, cy + 60, { font: "bold 16px monospace", color, align: "center", glow: color, glowBlur: 8 }); }
    cy += 112;
    if (type === "win") {
        setGlow(ctx, C.GOLD, 20);
        drawText(ctx, `JACKPOT: ${CURRENCY}${fmt(data.prize)}`, W / 2, cy, { font: "bold 38px monospace", color: C.GOLD, align: "center" });
        clearGlow(ctx);
    } else if (type === "buy") {
        drawText(ctx, `${data.tickets} TICKET(S) PURCHASED`, W / 2, cy, { font: "bold 20px monospace", color, align: "center", glow: color, glowBlur: 10 });
    } else {
        drawText(ctx, "WEEKLY LOTTERY", W / 2, cy, { font: "bold 22px monospace", color, align: "center", glow: color, glowBlur: 10 });
    }
    cy += 46;
    const bx = 50, bw = W - 100;
    const rows = type === "buy"
        ? [["TICKETS BOUGHT", fmt(data.tickets), color], ["COST PAID", `${CURRENCY}${fmt(data.cost)}`, C.ORANGE], ["YOUR TOTAL TICKETS", fmt(data.total), C.CYAN], ["DRAW DATE", data.drawDate || "Next Sunday", C.GRAY], ["ACCOUNT", bank.accountNumber, C.GRAY]]
        : type === "win"
        ? [["PRIZE WON", `${CURRENCY}${fmt(data.prize)}`, C.GOLD], ["TICKETS HELD", fmt(data.tickets), color], ["WINNER", name.toUpperCase(), C.WHITE], ["DRAW DATE", data.drawDate || today(), C.GRAY]]
        : [["TICKET PRICE", `${CURRENCY}${fmt(LOTTERY_TICKET_PRICE)}`, color], ["MAX TICKETS", fmt(LOTTERY_MAX_TICKETS), C.GRAY], ["YOUR TICKETS", fmt(data.tickets || 0), C.CYAN], ["DRAW", "Every Sunday midnight", C.GRAY]];
    const bh = rows.length * 32 + 24;
    drawFilledCard(ctx, bx, cy, bw, bh, 12, C.CARD, color + "44", color);
    let ry = cy + 24;
    for (const [lbl, val, vc] of rows) {
        drawText(ctx, lbl, bx + 24, ry, { font: "13px monospace", color: C.GRAY });
        drawText(ctx, val, bx + bw - 24, ry, { font: "bold 13px monospace", color: vc || C.WHITE, align: "right" });
        ry += 32;
    }
    drawPageFooter(ctx, W, H, bank.accountNumber); return canvas;
}

async function genTierInfoCard() {
    const W = 820, H = 120 + ACCOUNT_TIERS.length * 80 + 40;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.GOLD);
    let cy = drawBankHeader(ctx, W, 0, C.GOLD, "TIER BENEFITS");
    cy += 16;
    drawText(ctx, "Account Tier System — Benefits & Requirements", W / 2, cy + 16, { font: "13px monospace", color: C.GRAY, align: "center" });
    cy += 38;
    for (const t of ACCOUNT_TIERS) {
        const perks = TIER_PERKS_DETAIL[t.label];
        drawFilledCard(ctx, 20, cy, W - 40, 70, 12, t.glow + "0e", t.glow + "44", t.glow);
        setGlow(ctx, t.glow, 8);
        drawText(ctx, `${tierEmoji(t.label)} ${t.label}`, 44, cy + 26, { font: "bold 17px Arial", color: t.glow });
        clearGlow(ctx);
        drawText(ctx, `Min Deposit: ${CURRENCY}${fmtShort(t.minDep)}`, 44, cy + 48, { font: "12px monospace", color: C.GRAY });
        const benefitStr = `Loan: ${perks.loanMult}x  |  Interest: ${((perks.interestMult - 1) * 100).toFixed(0)}% bonus  |  ${perks.vaultAccess ? "Vault ✓" : "No Vault"}  |  ${t.perks}`;
        drawText(ctx, benefitStr, W / 2 + 60, cy + 36, { font: "11px Arial", color: C.WHITE, align: "center" });
        cy += 80;
    }
    drawPageFooter(ctx, W, H); return canvas;
}

async function genPortfolioCard(bank, name) {
    const invHistory = (bank.transactions || []).filter(t => ["invest", "collect"].includes(t.type));
    const W = 820, H = 100 + Math.min(invHistory.length + 1, 12) * 46 + 80;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.GOLD);
    let cy = drawBankHeader(ctx, W, 0, C.GOLD, "INVESTMENT PORTFOLIO");
    cy += 14;
    drawText(ctx, `${name} — Current: ${bank.investment && !bank.investment.collected ? `${INVEST_PLANS[bank.investment.plan].label} ${CURRENCY}${fmt(bank.investment.amount)}` : "No active investment"}`, W / 2, cy + 16, { font: "12px monospace", color: C.GRAY, align: "center" });
    cy += 38;
    if (bank.investment && !bank.investment.collected) {
        const plan = INVEST_PLANS[bank.investment.plan];
        const dueMs = bank.investment.startTime + plan.days * 86400000;
        const hoursLeft = Math.max(0, Math.ceil((dueMs - Date.now()) / 3600000));
        const pct = Math.min(1, 1 - hoursLeft / (plan.days * 24));
        drawFilledCard(ctx, 20, cy, W - 40, 56, 10, plan.color + "14", plan.color + "44", plan.color);
        drawText(ctx, `[ACTIVE] ${plan.label} — ${CURRENCY}${fmt(bank.investment.amount)}`, 40, cy + 20, { font: "bold 13px monospace", color: plan.color });
        drawText(ctx, hoursLeft > 0 ? `${hoursLeft}h remaining` : "READY TO COLLECT!", 40, cy + 38, { font: "12px monospace", color: hoursLeft > 0 ? C.ORANGE : C.GREEN });
        drawProgressBar(ctx, W - 260, cy + 14, 220, 10, pct, plan.color);
        drawText(ctx, `${Math.round(pct * 100)}%`, W - 30, cy + 22, { font: "bold 10px monospace", color: plan.color, align: "right" });
        cy += 66;
    }
    const headers = ["DATE", "TYPE", "PLAN", "AMOUNT"];
    const colX = [30, 140, 310, 530];
    for (let i = 0; i < headers.length; i++) drawText(ctx, headers[i], colX[i], cy, { font: "bold 11px monospace", color: C.GOLD });
    cy += 6; drawDivider(ctx, 20, cy, W - 40, C.GOLD + "66"); cy += 8;
    const slice = invHistory.slice(0, 10);
    for (const tx of slice) {
        const isCollect = tx.type === "collect";
        const c = isCollect ? C.GREEN : C.ORANGE;
        drawText(ctx, (tx.timestamp || "").split(" ")[0], colX[0], cy + 12, { font: "10px monospace", color: C.GRAY });
        drawText(ctx, isCollect ? "COLLECT" : "INVEST", colX[1], cy + 12, { font: "bold 11px monospace", color: c });
        drawText(ctx, "—", colX[2], cy + 12, { font: "11px monospace", color: C.DIMGRAY });
        drawText(ctx, `${isCollect ? "+" : "-"}${CURRENCY}${fmt(tx.amount)}`, colX[3], cy + 12, { font: "bold 12px monospace", color: c });
        cy += 46;
    }
    if (invHistory.length === 0) drawText(ctx, "No investment history yet", W / 2, cy + 20, { font: "13px monospace", color: C.DIMGRAY, align: "center" });
    drawPageFooter(ctx, W, H); return canvas;
}

function textMenu(prefix) {
    const p = prefix;
    return `
╔══════════════════════════════════════╗
║   🏦  ${BANK_NAME}  ·  MENU   ║
╠══════════════════════════════════════╣
║  💳 ACCOUNT                          ║
║  ${p}bank register    — Open account  ║
║  ${p}bank balance     — Check balance ║
║  ${p}bank profile     — Profile card  ║
║  ${p}bank card        — Virtual card  ║
║  ${p}bank statement   — Full history  ║
║  ${p}bank rename <name>              ║
╠══════════════════════════════════════╣
║  💰 TRANSACTIONS                      ║
║  ${p}bank deposit <amt>              ║
║  ${p}bank withdraw <amt>             ║
║  ${p}bank transfer @user <amt>       ║
║  ${p}bank gift @user <amt>           ║
║  ${p}bank history [page]             ║
╠══════════════════════════════════════╣
║  🏦 SAVINGS & LOANS                  ║
║  ${p}bank savings dep/wd <amt>       ║
║  ${p}bank interest                   ║
║  ${p}bank loan <amt>                 ║
║  ${p}bank repay [amt]                ║
╠══════════════════════════════════════╣
║  📈 INVESTMENTS                       ║
║  ${p}bank invest <amt> <plan>        ║
║  ${p}bank collect                    ║
║  ${p}bank portfolio                  ║
║  ${p}bank plans    — see all plans   ║
╠══════════════════════════════════════╣
║  🎁 BONUSES & REWARDS                 ║
║  ${p}bank bonus      — Daily bonus   ║
║  ${p}bank wheel      — Lucky wheel   ║
║  ${p}bank cashback   — Monthly cb    ║
║  ${p}bank missions   — Daily quests  ║
║  ${p}bank referral   — Refer & earn  ║
╠══════════════════════════════════════╣
║  🎮 GAMES                             ║
║  ${p}bank flip <amt> h/t             ║
║  ${p}bank gamble <amt>               ║
║  ${p}bank slots <amt>                ║
║  ${p}bank blackjack <amt>  ← NEW     ║
║  ${p}bank roulette <amt> <bet>← NEW  ║
║  ${p}bank dice <amt>                 ║
║  ${p}bank scratch                    ║
║  ${p}bank rob @user                  ║
╠══════════════════════════════════════╣
║  🔒 VAULT & GOALS                     ║
║  ${p}bank vault open <amt>           ║
║  ${p}bank vault collect              ║
║  ${p}bank goal set <amt> <name>      ║
║  ${p}bank goal claim                 ║
║  ${p}bank lottery buy <n>            ║
╠══════════════════════════════════════╣
║  🔐 SECURITY                          ║
║  ${p}bank pin set <4digits>          ║
║  ${p}bank pin remove <pin>           ║
║  ${p}bank pin unlock (admin)         ║
║  ${p}bank freeze/unfreeze            ║
╠══════════════════════════════════════╣
║  📊 INFO                              ║
║  ${p}bank leaderboard [w/m/all]      ║
║  ${p}bank stats                      ║
║  ${p}bank limits                     ║
║  ${p}bank tiers                      ║
║  ${p}bank achievements               ║
║  ${p}bank networth                   ║
║  ${p}bank daily     — check today    ║
╚══════════════════════════════════════╝
  💡 ${p}bank mode image/text (admin)`.trim();
}

function textBalance(ud, walletBal) {
    const bank = ud.data.bank;
    const tier = getTier(bank.totalDeposited || 0);
    const nw = getNetWorth(bank);
    const tierProg = getTierProgress(bank.totalDeposited || 0);
    return `🏦 ${BANK_NAME} — BALANCE
━━━━━━━━━━━━━━━━━━━━━━━━
👤 ${(bank.holderName || ud.name || "User").toUpperCase()}
🪪 ${bank.accountNumber}
${tierEmoji(tier.label)} Tier: ${tier.label}
━━━━━━━━━━━━━━━━━━━━━━━━
💰 Bank Balance  : ${CURRENCY}${fmt(bank.balance)}
👛 Wallet        : ${CURRENCY}${fmt(walletBal)}
🏦 Savings       : ${CURRENCY}${fmt(bank.savings || 0)}
💎 Net Worth     : ${CURRENCY}${fmt(nw)}
${bank.loan && !bank.loan.repaid ? `💳 Loan Due      : ${CURRENCY}${fmt(bank.loan.remaining)}` : "✅ No Active Loan"}
━━━━━━━━━━━━━━━━━━━━━━━━
${tierProg.next ? `📊 Tier Progress: [${bar(tierProg.pct)}] ${Math.round(tierProg.pct * 100)}%\n   → ${CURRENCY}${fmt(tierProg.toNext)} to ${tierProg.next.label}` : "👑 MAX TIER REACHED"}
${bank.frozen ? "❄️ ACCOUNT FROZEN" : "✅ Account Active"}${bank.bonusStreak > 0 ? `\n🔥 Bonus Streak: ${bank.bonusStreak} days` : ""}`;
}

function textProfile(ud, rank) {
    const bank = ud.data.bank;
    const tier = getTier(bank.totalDeposited || 0);
    const nw = getNetWorth(bank);
    const wr = bank.gamesPlayed > 0 ? Math.round((bank.gamesWon || 0) / bank.gamesPlayed * 100) : 0;
    return `🏦 ${BANK_NAME} — PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━
👤 ${(ud.name || "Unknown").slice(0, 28)}
🪪 ${bank.accountNumber}
${tierEmoji(tier.label)} Tier    : ${tier.label}  (${tier.perks})
📅 Joined   : ${(bank.createdAt || "").split(" ")[0]}
${rank ? `🏆 Rank     : #${rank}` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━
💰 Balance  : ${CURRENCY}${fmt(bank.balance)}
🏦 Savings  : ${CURRENCY}${fmt(bank.savings || 0)}
💎 Worth    : ${CURRENCY}${fmt(nw)}
━━━━━━━━━━━━━━━━━━━━━━━━
📥 Deposited   : ${CURRENCY}${fmtShort(bank.totalDeposited || 0)}
📤 Withdrawn   : ${CURRENCY}${fmtShort(bank.totalWithdrawn || 0)}
📨 Transferred : ${CURRENCY}${fmtShort(bank.totalTransferred || 0)}
🔁 Transactions: ${fmt(bank.totalTransactions || 0)}
━━━━━━━━━━━━━━━━━━━━━━━━
🎮 Games Played : ${fmt(bank.gamesPlayed || 0)}
🏆 Win Rate     : ${wr}%
💵 Cashback     : ${CURRENCY}${fmtShort(bank.cashbackEarned || 0)}
🔥 Streak       : ${bank.bonusStreak || 0} days
${bank.frozen ? "❄️ ACCOUNT FROZEN" : "✅ Active"}${bank.pin ? " 🔐 PIN Secured" : ""}`;
}

function textHistory(transactions, name, page) {
    const start = (page - 1) * MAX_HISTORY_PER_PAGE;
    const slice = transactions.slice(start, start + MAX_HISTORY_PER_PAGE);
    const totalPages = Math.ceil(transactions.length / MAX_HISTORY_PER_PAGE);
    const inTypes = ["deposit", "transfer_in", "savings_wd", "loan_taken", "interest", "collect", "bonus", "gift_in", "cashback", "gamble_win", "flip_win", "wheel", "rob_in"];
    let out = `📋 TRANSACTION HISTORY — ${name}\nPage ${page}/${totalPages} · ${transactions.length} total\n${"─".repeat(38)}\n`;
    for (const tx of slice) {
        const sign = inTypes.includes(tx.type) ? "+" : "-";
        out += `${txnEmoji(tx.type)} ${(tx.type || "").replace(/_/g, " ").padEnd(14)} ${sign}${CURRENCY}${fmt(tx.amount)}\n`;
        out += `   Bal: ${CURRENCY}${fmt(tx.newBalance)}  ${(tx.timestamp || "").split(" ")[0]}\n`;
    }
    if (transactions.length > start + MAX_HISTORY_PER_PAGE) out += `\n➡️ Next: .bank history ${page + 1}`;
    return out;
}

function textLeaderboard(users, filter = "all") {
    const top = users.slice(0, 10);
    const medals = ["🥇", "🥈", "🥉"];
    const filterLabel = filter === "w" ? "WEEKLY" : filter === "m" ? "MONTHLY" : "ALL TIME";
    let out = `🏆 ${BANK_NAME} — ${filterLabel} RICH LIST\n${"─".repeat(38)}\n`;
    for (let i = 0; i < top.length; i++) {
        const u = top[i];
        const nw = getNetWorth(u.bank);
        const tier = getTier(u.bank.totalDeposited || 0);
        out += `${medals[i] || `${i + 1}.`} ${(u.name || "Unknown").slice(0, 18).padEnd(18)} ${tierEmoji(tier.label)}\n`;
        out += `   💰 ${CURRENCY}${fmt(nw)}  Dep: ${CURRENCY}${fmtShort(u.bank.totalDeposited || 0)}  TXN: ${u.bank.totalTransactions || 0}\n`;
    }
    out += `${"─".repeat(38)}\n💡 Filters: .bank lb weekly | monthly | all`;
    return out;
}

function textStats(allUsers) {
    const bu = allUsers.filter(u => u.data?.bank?.isRegistered);
    const totalBalance = bu.reduce((s, u) => s + (u.data.bank.balance || 0), 0);
    const totalSavings = bu.reduce((s, u) => s + (u.data.bank.savings || 0), 0);
    const totalTxns = bu.reduce((s, u) => s + (u.data.bank.totalTransactions || 0), 0);
    const loansActive = bu.filter(u => u.data.bank.loan && !u.data.bank.loan.repaid).length;
    const totalGames = bu.reduce((s, u) => s + (u.data.bank.gamesPlayed || 0), 0);
    return `📊 ${BANK_NAME} — GLOBAL STATS
${"─".repeat(36)}
👥 Registered : ${fmt(bu.length)} users
💰 Total Bal  : ${CURRENCY}${fmtShort(totalBalance)}
🏦 Total Sav  : ${CURRENCY}${fmtShort(totalSavings)}
🔁 Total TXN  : ${fmt(totalTxns)}
💳 Active Loans: ${loansActive}
🎮 Games Played: ${fmt(totalGames)}
${"─".repeat(36)}
Tier Distribution:
${ACCOUNT_TIERS.map(t => { const c = bu.filter(u => getTier(u.data.bank.totalDeposited || 0).label === t.label).length; return `${tierEmoji(t.label)} ${t.label.padEnd(9)}: ${c}`; }).join("\n")}`;
}

function textMissions(bank, name) {
    const missions = getDailyMissions(bank);
    const active = MISSIONS.filter(m => missions[m.id] !== undefined);
    let out = `📋 DAILY MISSIONS — ${name}\n${today()}\n${"─".repeat(36)}\n`;
    for (const m of active) {
        const ms = missions[m.id];
        const done = ms?.done;
        const progress = ms?.progress || 0;
        const pct = Math.min(progress / m.target, 1);
        out += `${done ? "✅" : "⬜"} ${m.label}\n`;
        out += `   [${bar(pct, 10)}] ${Math.min(progress, m.target)}/${m.target}  +${CURRENCY}${fmt(m.reward)}\n`;
    }
    const earned = active.filter(m => missions[m.id]?.done).reduce((s, m) => s + m.reward, 0);
    const total = active.reduce((s, m) => s + m.reward, 0);
    out += `${"─".repeat(36)}\nEarned: ${CURRENCY}${fmt(earned)} / ${CURRENCY}${fmt(total)}`;
    return out;
}

function textLimits(bank, name) {
    const wLim = checkDailyLimit(DAILY_WITHDRAW_LIMIT, bank.dailyWithdraw, 0);
    const tLim = checkDailyLimit(DAILY_TRANSFER_LIMIT, bank.dailyTransfer, 0);
    const gLim = checkDailyLimit(GIFT_DAILY_LIMIT, bank.dailyGift || { date: null, amount: 0 }, 0);
    const wUsed = DAILY_WITHDRAW_LIMIT - wLim.remaining, tUsed = DAILY_TRANSFER_LIMIT - tLim.remaining, gUsed = GIFT_DAILY_LIMIT - gLim.remaining;
    return `📊 DAILY LIMITS — ${name}
${"─".repeat(36)}
⬇️ Withdraw  : [${bar(wUsed / DAILY_WITHDRAW_LIMIT)}]
   Used: ${CURRENCY}${fmt(wUsed)} / Remaining: ${CURRENCY}${fmt(wLim.remaining)}

📤 Transfer  : [${bar(tUsed / DAILY_TRANSFER_LIMIT)}]
   Used: ${CURRENCY}${fmt(tUsed)} / Remaining: ${CURRENCY}${fmt(tLim.remaining)}

🎀 Gift      : [${bar(gUsed / GIFT_DAILY_LIMIT)}]
   Used: ${CURRENCY}${fmt(gUsed)} / Remaining: ${CURRENCY}${fmt(gLim.remaining)}
${"─".repeat(36)}
Resets midnight (${TZ})`;
}

function textVault(bank, name) {
    const vault = bank.vault;
    if (!vault || vault.collected) return `🔒 VAULT — ${name}\n${"─".repeat(30)}\nNo active vault.\nUse: .bank vault open <amount>`;
    const daysLeft = Math.max(0, Math.ceil((vault.lockUntil - Date.now()) / 86400000));
    const pct = Math.min(1, 1 - daysLeft / VAULT_MIN_LOCK_DAYS);
    const earned = Math.floor(vault.amount * VAULT_INTEREST_DAILY * (VAULT_MIN_LOCK_DAYS - daysLeft));
    return `🔒 VAULT — ${name}
${"─".repeat(36)}
💰 Locked     : ${CURRENCY}${fmt(vault.amount)}
📈 Daily Rate : ${(VAULT_INTEREST_DAILY * 100).toFixed(1)}%
⏳ Days Left  : ${daysLeft} day(s)
📅 Unlocks    : ${moment(vault.lockUntil).format("DD/MM/YYYY HH:mm")}
💵 Est. Gain  : ${CURRENCY}${fmt(Math.floor(vault.amount * VAULT_INTEREST_DAILY * VAULT_MIN_LOCK_DAYS))}
📊 Progress   : [${bar(pct)}] ${Math.round(pct * 100)}%
${daysLeft === 0 ? "✅ READY! Use: .bank vault collect" : `🔒 Locked for ${daysLeft} more day(s)`}`;
}

function textAchievements(bank, name) {
    const unlocked = bank.achievements || {};
    const doneCount = Object.keys(unlocked).length;
    const totalReward = ACHIEVEMENTS.filter(a => unlocked[a.id]).reduce((s, a) => s + a.reward, 0);
    let out = `🏆 ACHIEVEMENTS — ${name}\n${doneCount}/${ACHIEVEMENTS.length} unlocked\n${"─".repeat(36)}\n`;
    for (const a of ACHIEVEMENTS) {
        const done = !!unlocked[a.id];
        out += `${done ? "✅" : "⬜"} ${a.icon} ${a.label.padEnd(18)} +${CURRENCY}${fmt(a.reward)}\n`;
        if (!done) out += `   ${a.desc}\n`;
    }
    out += `${"─".repeat(36)}\nTotal Earned: ${CURRENCY}${fmt(totalReward)}`;
    return out;
}

function textGoal(bank, name) {
    const goal = bank.goal;
    if (!goal) return `🎯 SAVINGS GOAL — ${name}\nNo active goal.\nSet one: .bank goal set <amount> <name>`;
    const current = (bank.balance || 0) + (bank.savings || 0);
    const pct = Math.min(current / goal.target, 1);
    const reached = pct >= 1;
    return `🎯 SAVINGS GOAL — ${name}
${"─".repeat(36)}
📌 Goal     : "${goal.name || "My Goal"}"
💰 Target   : ${CURRENCY}${fmt(goal.target)}
📊 Current  : ${CURRENCY}${fmt(Math.min(current, goal.target))}
[${bar(pct)}] ${Math.round(pct * 100)}%
${reached ? "🎉 GOAL REACHED! Use: .bank goal claim" : `⏳ Need ${CURRENCY}${fmt(goal.target - current)} more`}
📅 Created  : ${goal.createdAt || "Unknown"}`;
}

function textPortfolio(bank, name) {
    const invHistory = (bank.transactions || []).filter(t => ["invest", "collect"].includes(t.type)).slice(0, 10);
    let out = `📊 INVESTMENT PORTFOLIO — ${name}\n${"─".repeat(36)}\n`;
    if (bank.investment && !bank.investment.collected) {
        const plan = INVEST_PLANS[bank.investment.plan];
        const dueMs = bank.investment.startTime + plan.days * 86400000;
        const hoursLeft = Math.max(0, Math.ceil((dueMs - Date.now()) / 3600000));
        out += `🟢 ACTIVE: ${plan.label} — ${CURRENCY}${fmt(bank.investment.amount)}\n`;
        out += `   ${hoursLeft > 0 ? `${hoursLeft}h remaining` : "✅ READY TO COLLECT!"}\n${"─".repeat(36)}\n`;
    }
    out += "DATE        TYPE     AMOUNT\n";
    for (const tx of invHistory) {
        const sign = tx.type === "collect" ? "+" : "-";
        out += `${(tx.timestamp || "").split(" ")[0]}  ${tx.type.padEnd(8)} ${sign}${CURRENCY}${fmt(tx.amount)}\n`;
    }
    if (invHistory.length === 0) out += "No investment history yet.\n";
    return out;
}

function textTierInfo() {
    let out = `🏦 ${BANK_NAME} — TIER SYSTEM\n${"─".repeat(36)}\n`;
    for (const t of ACCOUNT_TIERS) {
        const p = TIER_PERKS_DETAIL[t.label];
        out += `${tierEmoji(t.label)} ${t.label.padEnd(10)} Min: ${CURRENCY}${fmtShort(t.minDep)}\n`;
        out += `   Loan: ${p.loanMult}x | Interest: +${((p.interestMult - 1) * 100).toFixed(0)}% | ${p.vaultAccess ? "Vault ✓" : "No Vault"}\n`;
    }
    return out;
}

function textInvestPlans() {
    let out = `📊 INVESTMENT PLANS — ${BANK_NAME}\n${"─".repeat(36)}\n`;
    for (const [key, plan] of Object.entries(INVEST_PLANS)) {
        out += `▸ ${plan.label.padEnd(10)} ROI: +${(plan.roi * 100).toFixed(0)}% | ${plan.days}d lock | Min: ${CURRENCY}${fmtShort(plan.minAmount)}\n`;
    }
    out += `${"─".repeat(36)}\nUsage: .bank invest <amount> <plan>`;
    return out;
}

async function sendCanvas(message, canvas, body = "") {
    const tmpDir = path.join(__dirname, "tmp");
    await fs.ensureDir(tmpDir);
    const tmpPath = path.join(tmpDir, `bank_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const buf = canvas.toBuffer("image/png");
    await fs.writeFile(tmpPath, buf);
    try {
        await message.reply({ body, attachment: fs.createReadStream(tmpPath) });
    } finally {
        setTimeout(() => fs.remove(tmpPath).catch(() => {}), 60000);
    }
}

async function sendReceipt(message, type, data) {
    const canvas = await genReceiptImage(type, data);
    await sendCanvas(message, canvas);
}

async function replyImage(message, canvas) { await sendCanvas(message, canvas); }

async function replyText(message, text) { await message.reply(text); }

async function reply(message, imageCanvas, textStr) {
    if (getMode() === "text") return replyText(message, textStr);
    return replyImage(message, imageCanvas);
}

async function sendError(message, errText, detail = "") {
    if (getMode() === "text") return message.reply(`❌ ${errText}${detail ? `\n${detail}` : ""}`);
    const W = 620, H = 200;
    const { canvas, ctx } = buildCanvas(W, H);
    drawPageBackground(ctx, W, H, C.RED);
    drawBankHeader(ctx, W, 0, C.RED, "ERROR");
    drawText(ctx, errText, W / 2, 110, { font: "bold 18px Arial", color: C.RED, align: "center", glow: C.RED, glowBlur: 10 });
    if (detail) drawText(ctx, detail, W / 2, 140, { font: "13px Arial", color: C.GRAY, align: "center" });
    drawPageFooter(ctx, W, H);
    await sendCanvas(message, canvas);
}

async function sendReceiptOrText(message, type, data, textStr) {
    if (getMode() === "text") return message.reply(textStr);
    return sendReceipt(message, type, data);
}

module.exports = {
    config: {
        name: "bank",
        aliases: ["atm", "banking", "mb"],
        version: "4.0.0",
        author: "SIFAT",
        countDown: 5,
        role: 0,
        description: { en: "ᴍᴀʀɪɴ ʙᴀɴᴋ — ᴜʟᴛʀᴀ ᴀᴅᴠᴀɴᴄᴇᴅ ᴅᴜᴀʟ-ᴍᴏᴅᴇ ʙᴀɴᴋɪɴɢ ꜱʏꜱᴛᴇᴍ" },
        category: "economy",
        guide: {
            en: "{pn} — menu\n{pn} register | balance | profile | card | statement\n"
                + "{pn} deposit/withdraw/transfer/gift <amt>\n"
                + "{pn} savings dep/wd <amt> | interest\n"
                + "{pn} loan/repay | invest <amt> <plan> | collect\n"
                + "{pn} bonus | cashback | missions | wheel\n"
                + "{pn} flip <amt> h/t | gamble <amt> | slots <amt> | rob @user\n"
                + "{pn} history | leaderboard | stats | limits\n"
                + "{pn} pin set <4dig> | pin unlock | freeze\n"
                + "{pn} mode image | mode text  (admin only)\n"
                + "Plans: safe | moderate | high | extreme | legend"
        }
    },

    onStart: async function ({ args, message, event, usersData, getLang, role }) {
        const { senderID } = event;
        let ud = ensureData(await usersData.get(senderID));
        const action = (args[0] || "").toLowerCase();
        const mode = getMode();
        const prefix = global.GoatBot?.config?.prefix || ".";


        if (!action) {
            if (mode === "text") return message.reply(textMenu(prefix));
            const canvas = await genMenuImage();
            return replyImage(message, canvas);
        }


        if (action === "mode") {
            if (role < 1) return sendError(message, "ADMIN ONLY", "Only admins can change output mode.");
            const m = (args[1] || "").toLowerCase();
            if (m === "image" || m === "img") {
                setMode("image");
                return message.reply("✅ Bank output mode set to: IMAGE");
            }
            if (m === "text" || m === "txt") {
                setMode("text");
                return message.reply("✅ Bank output mode set to: TEXT");
            }
            return message.reply(`Current mode: ${getMode().toUpperCase()}\nUsage: .bank mode image | .bank mode text`);
        }


        if (action === "register") {
            if (isReg(ud)) return sendError(message, "ACCOUNT EXISTS", "You already have a MARIN BANK account.");
            const refCode = args[1];
            ud = createAccount(ud, ud.name);
            const bank = ud.data.bank;
            pushTxn(bank, { transactionId: genTxnId(), type: "account_opened", amount: 0, newBalance: 0, timestamp: now() });
            if (refCode) {
                const allUsers = global.db.allUserData || [];
                const refUser = allUsers.find(u => u.data?.bank?.accountNumber === refCode && u.userID !== senderID);
                if (refUser) {
                    bank.referredBy = refUser.userID;
                    bank.balance += REFERRAL_BONUS;
                    refUser.data.bank.referralCount = (refUser.data.bank.referralCount || 0) + 1;
                    refUser.data.bank.balance += REFERRAL_BONUS;
                    pushTxn(bank, { transactionId: genTxnId(), type: "referral", amount: REFERRAL_BONUS, newBalance: bank.balance, timestamp: now() });
                    pushTxn(refUser.data.bank, { transactionId: genTxnId(), type: "referral", amount: REFERRAL_BONUS, newBalance: refUser.data.bank.balance, timestamp: now() });
                    await usersData.set(refUser.userID, { data: refUser.data });
                }
            }
            await usersData.set(senderID, { data: ud.data });
            if (mode === "text") return message.reply(`✅ Welcome to ${BANK_NAME}!\n🪪 Account: ${bank.accountNumber}\n💰 Balance: ${CURRENCY}0\nRegistered at: ${bank.createdAt}`);
            const canvas = await genRegisterCard(bank, ud.name || "User");
            return replyImage(message, canvas);
        }


        if (action === "balance" || action === "bal") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT", "Use: .bank register");
            if (mode === "text") return message.reply(textBalance(ud, ud.money || 0));
            const canvas = await genBalanceCard(ud, ud.money || 0);
            return replyImage(message, canvas);
        }


        if (action === "card") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT", "Use: .bank register");
            if (mode === "text") {
                const bank = ud.data.bank; const tier = getTier(bank.totalDeposited || 0);
                return message.reply(`🪪 VIRTUAL BANK CARD\n━━━━━━━━━━━━━━━━━━━━━\n${bank.accountNumber}\n${(bank.holderName || ud.name || "USER").toUpperCase()}\n${tierEmoji(tier.label)} ${tier.label}\n💰 ${CURRENCY}${fmt(bank.balance)}`);
            }
            const canvas = await genVirtualCard(ud);
            return replyImage(message, canvas);
        }


        if (action === "profile" || action === "prof") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT", "Use: .bank register");
            const allUsers = global.db.allUserData || [];
            const sorted = allUsers.filter(u => u.data?.bank?.isRegistered).sort((a, b) => getNetWorth(b.data.bank) - getNetWorth(a.data.bank));
            const rank = sorted.findIndex(u => u.userID === senderID) + 1;
            if (mode === "text") return message.reply(textProfile(ud, rank));
            const canvas = await genProfileCard(ud, rank || null);
            return replyImage(message, canvas);
        }


        if (action === "statement" || action === "stmt") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const bank = ud.data.bank;
            if (!bank.transactions.length) return sendError(message, "NO TRANSACTIONS YET");
            if (mode === "text") return message.reply(textHistory(bank.transactions, ud.name || "User", 1));
            const canvas = await genStatementImage(bank, ud.name || "User");
            return replyImage(message, canvas);
        }


        if (action === "deposit" || action === "dep") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT", "Use: .bank register");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN", "Unfreeze first.");
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount <= 0) return sendError(message, "INVALID AMOUNT");
            if (amount < MIN_DEPOSIT) return sendError(message, `MIN DEPOSIT: ${CURRENCY}${fmt(MIN_DEPOSIT)}`);
            if ((ud.money || 0) < amount) return sendError(message, "INSUFFICIENT WALLET", `Wallet: ${CURRENCY}${fmt(ud.money || 0)}`);
            const bank = ud.data.bank;
            const txnId = genTxnId(), ts = now();
            bank.balance += amount;
            bank.totalDeposited = (bank.totalDeposited || 0) + amount;
            bank.monthlyDeposited = (bank.monthlyDeposited || 0) + amount;
            pushTxn(bank, { transactionId: txnId, type: "deposit", amount, newBalance: bank.balance, timestamp: ts });
            const missionReward = updateMission(bank, "deposit", amount);
            if (missionReward > 0) { bank.balance += missionReward; pushTxn(bank, { transactionId: genTxnId(), type: "mission", amount: missionReward, newBalance: bank.balance, timestamp: ts }); }
            await usersData.set(senderID, { money: (ud.money || 0) - amount, data: ud.data });
            const mNote = missionReward > 0 ? `\n📋 Mission reward: +${CURRENCY}${fmt(missionReward)}` : "";
            return sendReceiptOrText(message, "deposit", {
                amount, txnId, timestamp: ts,
                rows: [["AMOUNT", `${CURRENCY}${fmt(amount)}`, C.GREEN], ["NEW BALANCE", `${CURRENCY}${fmt(bank.balance)}`, C.CYAN], ["WALLET", `${CURRENCY}${fmt((ud.money || 0) - amount)}`, C.GRAY], ["ACCOUNT", bank.accountNumber, C.GRAY], ["TXN ID", txnId, C.DIMGRAY]]
            }, `✅ DEPOSIT SUCCESS\n━━━━━━━━━━━━━━━\n💚 Deposited : ${CURRENCY}${fmt(amount)}\n💰 New Balance: ${CURRENCY}${fmt(bank.balance)}\n👛 Wallet    : ${CURRENCY}${fmt((ud.money || 0) - amount)}\n🪪 ${bank.accountNumber}${mNote}`);
        }


        if (action === "withdraw" || action === "wd") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount <= 0) return sendError(message, "INVALID AMOUNT");
            if (amount < MIN_WITHDRAW) return sendError(message, `MIN WITHDRAW: ${CURRENCY}${fmt(MIN_WITHDRAW)}`);
            const bank = ud.data.bank;
            if (bank.balance < amount) return sendError(message, "INSUFFICIENT BALANCE", `Balance: ${CURRENCY}${fmt(bank.balance)}`);
            const lim = checkDailyLimit(DAILY_WITHDRAW_LIMIT, bank.dailyWithdraw, amount);
            if (!lim.ok) return sendError(message, "DAILY LIMIT REACHED", `Remaining: ${CURRENCY}${fmt(lim.remaining)}`);
            if (bank.pin && amount >= PIN_REQUIRED_AMOUNT) {
                const inputPin = args[2];
                if (!inputPin) return sendError(message, "PIN REQUIRED", `Large withdrawal needs PIN. Use: .bank withdraw ${amount} <pin>`);
                if (!verifyPin(bank, inputPin)) return sendError(message, bank.pinLocked ? "PIN LOCKED — contact admin" : "WRONG PIN");
            }
            const txnId = genTxnId(), ts = now();
            updateDailyRecord(bank, "dailyWithdraw", amount);
            bank.balance -= amount; bank.totalWithdrawn = (bank.totalWithdrawn || 0) + amount;
            const newWallet = (ud.money || 0) + amount;
            pushTxn(bank, { transactionId: txnId, type: "withdraw", amount, newBalance: bank.balance, timestamp: ts });
            await usersData.set(senderID, { money: newWallet, data: ud.data });
            return sendReceiptOrText(message, "withdraw", {
                amount, txnId, timestamp: ts,
                rows: [["AMOUNT", `${CURRENCY}${fmt(amount)}`, C.ORANGE], ["BANK BAL", `${CURRENCY}${fmt(bank.balance)}`, C.CYAN], ["WALLET", `${CURRENCY}${fmt(newWallet)}`, C.GREEN], ["LIMIT LEFT", `${CURRENCY}${fmt(lim.remaining - amount)}`, C.GRAY], ["TXN ID", txnId, C.DIMGRAY]]
            }, `✅ WITHDRAW SUCCESS\n━━━━━━━━━━━━━━━\n💸 Withdrawn : ${CURRENCY}${fmt(amount)}\n💰 Bank Bal  : ${CURRENCY}${fmt(bank.balance)}\n👛 Wallet    : ${CURRENCY}${fmt(newWallet)}\n🪪 ${bank.accountNumber}`);
        }


        if (action === "transfer" || action === "tf" || action === "send") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            let targetID, amount;
            if (Object.keys(event.mentions).length > 0) { targetID = Object.keys(event.mentions)[0]; amount = parseInt(args[args.length - 1]); }
            else if (args[1] && !isNaN(args[1]) && args[2]) { targetID = args[1]; amount = parseInt(args[2]); }
            else return sendError(message, "INVALID SYNTAX", ".bank transfer @user 500");
            if (targetID === senderID) return sendError(message, "CANNOT TRANSFER TO SELF");
            if (isNaN(amount) || amount < MIN_TRANSFER) return sendError(message, `MIN TRANSFER: ${CURRENCY}${fmt(MIN_TRANSFER)}`);
            const bank = ud.data.bank;
            if (bank.balance < amount) return sendError(message, "INSUFFICIENT BALANCE");
            const lim = checkDailyLimit(DAILY_TRANSFER_LIMIT, bank.dailyTransfer, amount);
            if (!lim.ok) return sendError(message, "DAILY TRANSFER LIMIT REACHED", `Remaining: ${CURRENCY}${fmt(lim.remaining)}`);
            let td = ensureData(await usersData.get(targetID));
            if (!isReg(td)) return sendError(message, "TARGET HAS NO BANK ACCOUNT");
            const txnId = genTxnId(), ts = now();
            updateDailyRecord(bank, "dailyTransfer", amount);
            bank.balance -= amount; bank.totalTransferred = (bank.totalTransferred || 0) + amount;
            td.data.bank.balance += amount;
            pushTxn(bank, { transactionId: txnId, type: "transfer_out", amount, newBalance: bank.balance, timestamp: ts, counterpart: `→ ${td.name || targetID}` });
            pushTxn(td.data.bank, { transactionId: txnId, type: "transfer_in", amount, newBalance: td.data.bank.balance, timestamp: ts, counterpart: `← ${ud.name || senderID}` });
            const missionReward = updateMission(bank, "transfer");
            if (missionReward > 0) { bank.balance += missionReward; pushTxn(bank, { transactionId: genTxnId(), type: "mission", amount: missionReward, newBalance: bank.balance, timestamp: ts }); }
            await usersData.set(senderID, { data: ud.data });
            await usersData.set(targetID, { data: td.data });
            return sendReceiptOrText(message, "transfer_out", {
                amount, txnId, timestamp: ts,
                rows: [["FROM", (ud.name || senderID).slice(0, 22), C.WHITE], ["TO", (td.name || targetID).slice(0, 22), C.PURPLE], ["AMOUNT", `${CURRENCY}${fmt(amount)}`, C.PURPLE], ["NEW BAL", `${CURRENCY}${fmt(bank.balance)}`, C.CYAN], ["TXN ID", txnId, C.DIMGRAY]]
            }, `✅ TRANSFER SUCCESS\n━━━━━━━━━━━━━━━\n📤 To      : ${td.name || targetID}\n💸 Amount  : ${CURRENCY}${fmt(amount)}\n💰 New Bal : ${CURRENCY}${fmt(bank.balance)}\n🪪 ${bank.accountNumber}`);
        }


        if (action === "gift") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            let targetID, amount;
            if (Object.keys(event.mentions).length > 0) { targetID = Object.keys(event.mentions)[0]; amount = parseInt(args[args.length - 1]); }
            else return sendError(message, "TAG A USER", ".bank gift @user 500");
            if (targetID === senderID) return sendError(message, "CANNOT GIFT TO SELF");
            if (isNaN(amount) || amount < 100) return sendError(message, "MIN GIFT: $100");
            const bank = ud.data.bank;
            if (bank.balance < amount) return sendError(message, "INSUFFICIENT BALANCE");
            if (!bank.dailyGift) bank.dailyGift = { date: null, amount: 0 };
            const gLim = checkDailyLimit(GIFT_DAILY_LIMIT, bank.dailyGift, amount);
            if (!gLim.ok) return sendError(message, "DAILY GIFT LIMIT REACHED", `Remaining: ${CURRENCY}${fmt(gLim.remaining)}`);
            let td = ensureData(await usersData.get(targetID));
            if (!isReg(td)) return sendError(message, "TARGET HAS NO BANK ACCOUNT");
            const txnId = genTxnId(), ts = now();
            updateDailyRecord(bank, "dailyGift", amount);
            bank.balance -= amount; td.data.bank.balance += amount;
            pushTxn(bank, { transactionId: txnId, type: "gift_out", amount, newBalance: bank.balance, timestamp: ts, counterpart: `→ ${td.name || targetID}` });
            pushTxn(td.data.bank, { transactionId: txnId, type: "gift_in", amount, newBalance: td.data.bank.balance, timestamp: ts, counterpart: `← ${ud.name || senderID}` });
            await usersData.set(senderID, { data: ud.data });
            await usersData.set(targetID, { data: td.data });
            return sendReceiptOrText(message, "gift_out", {
                amount, txnId, timestamp: ts,
                rows: [["FROM", (ud.name || "You").slice(0, 22), C.WHITE], ["TO", (td.name || targetID).slice(0, 22), C.PINK], ["GIFTED", `${CURRENCY}${fmt(amount)}`, C.PINK], ["YOUR BAL", `${CURRENCY}${fmt(bank.balance)}`, C.CYAN]]
            }, `🎀 GIFT SENT!\n━━━━━━━━━━━━━━━\n🎀 To     : ${td.name || targetID}\n💸 Amount : ${CURRENCY}${fmt(amount)}\n💰 Bal    : ${CURRENCY}${fmt(bank.balance)}`);
        }


        if (action === "history" || action === "txn" || action === "hist") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const bank = ud.data.bank;
            if (!bank.transactions.length) return sendError(message, "NO TRANSACTIONS YET");
            const page = Math.max(1, parseInt(args[1]) || 1);
            if (mode === "text") return message.reply(textHistory(bank.transactions, ud.name || "User", page));
            const canvas = await genHistoryImage(bank.transactions, ud.name || "User", page);
            return replyImage(message, canvas);
        }


        if (action === "savings" || action === "sav") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            const bank = ud.data.bank;
            const sub = (args[1] || "").toLowerCase();
            if (sub === "deposit" || sub === "dep") {
                const amount = parseInt(args[2]);
                if (isNaN(amount) || amount <= 0) return sendError(message, "INVALID AMOUNT");
                if (bank.balance < amount) return sendError(message, "INSUFFICIENT BALANCE");
                const txnId = genTxnId(), ts = now();
                bank.balance -= amount; bank.savings = (bank.savings || 0) + amount;
                pushTxn(bank, { transactionId: txnId, type: "savings_dep", amount, newBalance: bank.balance, timestamp: ts });
                const mr = updateMission(bank, "savings");
                if (mr > 0) { bank.balance += mr; pushTxn(bank, { transactionId: genTxnId(), type: "mission", amount: mr, newBalance: bank.balance, timestamp: ts }); }
                await usersData.set(senderID, { data: ud.data });
                if (mode === "text") return message.reply(`🏦 SAVINGS DEPOSIT\n━━━━━━━━━━━━━\n💚 +${CURRENCY}${fmt(amount)}\n🏦 New Savings: ${CURRENCY}${fmt(bank.savings)}\n💰 Bank Bal: ${CURRENCY}${fmt(bank.balance)}`);
                const canvas = await genSavingsCard(bank, ud.name, "deposit", amount);
                return replyImage(message, canvas);
            }
            if (sub === "withdraw" || sub === "wd") {
                const savings = bank.savings || 0;
                if (savings <= 0) return sendError(message, "NO SAVINGS");
                const mult = getTierInterestMultiplier(bank.totalDeposited || 0);
                const interest = Math.floor(savings * INTEREST_RATE_DAILY * mult);
                const total = savings + interest;
                const txnId = genTxnId(), ts = now();
                bank.savings = 0; bank.balance += total; bank.lastInterestClaim = today();
                pushTxn(bank, { transactionId: txnId, type: "savings_wd", amount: total, newBalance: bank.balance, timestamp: ts });
                await usersData.set(senderID, { data: ud.data });
                if (mode === "text") return message.reply(`💰 SAVINGS WITHDRAWAL\n━━━━━━━━━━━━━\n💵 Savings: ${CURRENCY}${fmt(savings)}\n📈 Interest: +${CURRENCY}${fmt(interest)}\n✅ Total: ${CURRENCY}${fmt(total)}\n💰 Bank Bal: ${CURRENCY}${fmt(bank.balance)}`);
                const canvas = await genSavingsCard(bank, ud.name, "withdraw", savings, interest);
                return replyImage(message, canvas);
            }
            if (mode === "text") return message.reply(`🏦 SAVINGS INFO\n━━━━━━━━━━━━━\n💰 Savings: ${CURRENCY}${fmt(ud.data.bank.savings || 0)}\n📈 Rate: ${(INTEREST_RATE_DAILY * 100).toFixed(0)}%/day\nUse: .bank savings dep/wd <amt>`);
            const canvas = await genSavingsCard(ud.data.bank, ud.name, "deposit", 0, 0);
            return replyImage(message, canvas);
        }


        if (action === "interest" || action === "int") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const bank = ud.data.bank;
            if ((bank.savings || 0) <= 0) return sendError(message, "NO SAVINGS");
            if (bank.lastInterestClaim === today()) return sendError(message, "ALREADY CLAIMED TODAY");
            const mult = getTierInterestMultiplier(bank.totalDeposited || 0);
            const interest = Math.floor(bank.savings * INTEREST_RATE_DAILY * mult);
            if (interest <= 0) return sendError(message, "INTEREST TOO LOW");
            const txnId = genTxnId(), ts = now();
            bank.savings += interest; bank.lastInterestClaim = today();
            pushTxn(bank, { transactionId: txnId, type: "interest", amount: interest, newBalance: bank.balance, timestamp: ts });
            await usersData.set(senderID, { data: ud.data });
            if (mode === "text") return message.reply(`📈 INTEREST CLAIMED\n━━━━━━━━━━━━━\n+${CURRENCY}${fmt(interest)}\n🏦 New Savings: ${CURRENCY}${fmt(bank.savings)}`);
            const canvas = await genInterestCard(bank, ud.name, interest, bank.savings);
            return replyImage(message, canvas);
        }


        if (action === "loan") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            const bank = ud.data.bank;
            if (bank.loan && !bank.loan.repaid) return sendError(message, "ACTIVE LOAN EXISTS", `Remaining: ${CURRENCY}${fmt(bank.loan.remaining)}`);
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount < MIN_LOAN) return sendError(message, `MIN LOAN: ${CURRENCY}${fmt(MIN_LOAN)}`);
            const maxLoan = Math.min(Math.max((bank.totalDeposited || 0) * MAX_LOAN_MULTIPLIER, 5000), LOAN_HARD_CAP);
            if (amount > maxLoan) return sendError(message, `MAX LOAN: ${CURRENCY}${fmt(maxLoan)}`);
            const interest = Math.floor(amount * LOAN_INTEREST_RATE);
            const totalDue = amount + interest;
            const txnId = genTxnId(), ts = now();
            bank.loan = { amount, interest, totalDue, remaining: totalDue, repaid: false, takenAt: ts, txnId };
            bank.balance += amount;
            pushTxn(bank, { transactionId: txnId, type: "loan_taken", amount, newBalance: bank.balance, timestamp: ts });
            await usersData.set(senderID, { data: ud.data });
            if (mode === "text") return message.reply(`💳 LOAN DISBURSED\n━━━━━━━━━━━━━\n💰 Amount : ${CURRENCY}${fmt(amount)}\n💸 Interest: ${CURRENCY}${fmt(interest)} (10%)\n🔴 Total Due: ${CURRENCY}${fmt(totalDue)}\n🪪 ${bank.accountNumber}`);
            const canvas = await genLoanCard(bank, ud.name, false);
            return replyImage(message, canvas);
        }


        if (action === "repay") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const bank = ud.data.bank;
            if (!bank.loan || bank.loan.repaid) return sendError(message, "NO ACTIVE LOAN");
            const inputAmt = parseInt(args[1]);
            const amount = isNaN(inputAmt) ? bank.loan.remaining : Math.min(inputAmt, bank.loan.remaining);
            if (amount <= 0 || bank.balance < amount) return sendError(message, "INSUFFICIENT BALANCE");
            const txnId = genTxnId(), ts = now();
            bank.balance -= amount; bank.loan.remaining -= amount;
            if (bank.loan.remaining <= 0) { bank.loan.remaining = 0; bank.loan.repaid = true; }
            pushTxn(bank, { transactionId: txnId, type: "loan_repaid", amount, newBalance: bank.balance, timestamp: ts });
            await usersData.set(senderID, { data: ud.data });
            if (mode === "text") return message.reply(`✅ LOAN REPAID\n━━━━━━━━━━━━━\n💸 Paid    : ${CURRENCY}${fmt(amount)}\n${bank.loan.repaid ? "✅ Fully Repaid!" : `🔴 Remaining: ${CURRENCY}${fmt(bank.loan.remaining)}`}`);
            const canvas = await genLoanCard(bank, ud.name, true);
            return replyImage(message, canvas);
        }


        if (action === "invest" || action === "inv") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            const bank = ud.data.bank;
            if (bank.investment && !bank.investment.collected) return sendError(message, "ACTIVE INVESTMENT", "Use: .bank collect");
            const amount = parseInt(args[1]);
            const planKey = (args[2] || "").toLowerCase();
            if (isNaN(amount) || amount <= 0 || !INVEST_PLANS[planKey]) return sendError(message, "USAGE: .bank invest <amt> safe/moderate/high/extreme/legend");
            const plan = INVEST_PLANS[planKey];
            if (amount < plan.minAmount) return sendError(message, `MIN FOR ${plan.label}: ${CURRENCY}${fmt(plan.minAmount)}`);
            if (bank.balance < amount) return sendError(message, "INSUFFICIENT BALANCE");
            const txnId = genTxnId(), ts = now();
            bank.balance -= amount;
            bank.investment = { plan: planKey, amount, startTime: Date.now(), collected: false, txnId };
            pushTxn(bank, { transactionId: txnId, type: "invest", amount, newBalance: bank.balance, timestamp: ts });
            const mr = updateMission(bank, "invest");
            if (mr > 0) { bank.balance += mr; pushTxn(bank, { transactionId: genTxnId(), type: "mission", amount: mr, newBalance: bank.balance, timestamp: ts }); }
            await usersData.set(senderID, { data: ud.data });
            const profit = Math.floor(amount * plan.roi);
            const due = moment().add(plan.days, "days").format("DD/MM/YYYY HH:mm");
            if (mode === "text") return message.reply(`📊 ${plan.label} PLAN ACTIVATED\n━━━━━━━━━━━━━\n💰 Invested : ${CURRENCY}${fmt(amount)}\n📈 Return   : +${CURRENCY}${fmt(profit)} (+${(plan.roi * 100).toFixed(0)}%)\n⏳ Lock     : ${plan.days} day(s)\n📅 Due      : ${due}`);
            const canvas = await genInvestCard(bank, ud.name, planKey, amount, false);
            return replyImage(message, canvas);
        }


        if (action === "collect" || action === "col") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const bank = ud.data.bank;
            if (!bank.investment || bank.investment.collected) return sendError(message, "NO ACTIVE INVESTMENT");
            const plan = INVEST_PLANS[bank.investment.plan];
            const dueMs = bank.investment.startTime + plan.days * 86400000;
            if (Date.now() < dueMs) {
                const remaining = moment(dueMs).diff(moment(), "hours");
                return sendError(message, "NOT YET MATURED", `${remaining}h remaining`);
            }
            const principal = bank.investment.amount, profit = Math.floor(principal * plan.roi), total = principal + profit;
            const txnId = genTxnId(), ts = now();
            bank.balance += total; bank.investment.collected = true;
            pushTxn(bank, { transactionId: txnId, type: "collect", amount: total, newBalance: bank.balance, timestamp: ts });
            await usersData.set(senderID, { data: ud.data });
            if (mode === "text") return message.reply(`💹 INVESTMENT COLLECTED\n━━━━━━━━━━━━━\n💰 Principal: ${CURRENCY}${fmt(principal)}\n📈 Profit   : +${CURRENCY}${fmt(profit)}\n✅ Total    : ${CURRENCY}${fmt(total)}\n💰 New Bal  : ${CURRENCY}${fmt(bank.balance)}`);
            const canvas = await genInvestCard(bank, ud.name, bank.investment.plan, principal, true);
            return replyImage(message, canvas);
        }


        if (action === "bonus") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const bank = ud.data.bank;
            if (bank.lastBonusDate === today()) return sendError(message, "ALREADY CLAIMED TODAY", "Come back tomorrow!");
            const yesterdayDate = moment().tz(TZ).subtract(1, "day").format("DD/MM/YYYY");
            const streak = bank.lastBonusDate === yesterdayDate ? (bank.bonusStreak || 0) + 1 : 1;
            bank.bonusStreak = streak;
            const bonusAmt = DAILY_BONUS_BASE + streak * BONUS_STREAK_MULTIPLIER;
            const txnId = genTxnId(), ts = now();
            bank.balance += bonusAmt; bank.lastBonusDate = today();
            pushTxn(bank, { transactionId: txnId, type: "bonus", amount: bonusAmt, newBalance: bank.balance, timestamp: ts });
            const mr = updateMission(bank, "bonus");
            if (mr > 0) { bank.balance += mr; pushTxn(bank, { transactionId: genTxnId(), type: "mission", amount: mr, newBalance: bank.balance, timestamp: ts }); }
            await usersData.set(senderID, { data: ud.data });
            if (mode === "text") return message.reply(`🎁 BONUS CLAIMED!\n━━━━━━━━━━━━━\n💰 +${CURRENCY}${fmt(bonusAmt)}\n🔥 Streak: ${streak} days\n💰 Balance: ${CURRENCY}${fmt(bank.balance)}\n⏭ Tomorrow: +${CURRENCY}${fmt(DAILY_BONUS_BASE + (streak + 1) * BONUS_STREAK_MULTIPLIER)}`);
            const canvas = await genBonusCard(bank, ud.name, bonusAmt, streak);
            return replyImage(message, canvas);
        }


        if (action === "cashback" || action === "cb") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const bank = ud.data.bank;
            const cbAmt = getCashbackAmount(bank);
            if (cbAmt <= 0) return sendError(message, "NO CASHBACK AVAILABLE", `Deposit ${CURRENCY}${fmt(CASHBACK_MIN_DEP)} this month to qualify.`);
            const txnId = genTxnId(), ts = now();
            bank.balance += cbAmt; bank.cashbackEarned = (bank.cashbackEarned || 0) + cbAmt;
            bank.monthlyDeposited = 0;
            pushTxn(bank, { transactionId: txnId, type: "cashback", amount: cbAmt, newBalance: bank.balance, timestamp: ts });
            await usersData.set(senderID, { data: ud.data });
            return sendReceiptOrText(message, "cashback", {
                amount: cbAmt, txnId, timestamp: ts,
                rows: [["CASHBACK", `+${CURRENCY}${fmt(cbAmt)}`, C.GREEN], ["NEW BALANCE", `${CURRENCY}${fmt(bank.balance)}`, C.CYAN], ["TOTAL EARNED", `${CURRENCY}${fmt(bank.cashbackEarned)}`, C.GOLD]]
            }, `💵 CASHBACK CLAIMED!\n+${CURRENCY}${fmt(cbAmt)}\n💰 New Bal: ${CURRENCY}${fmt(bank.balance)}`);
        }


        if (action === "missions" || action === "mission" || action === "quest") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const bank = ud.data.bank;
            getDailyMissions(bank);
            await usersData.set(senderID, { data: ud.data });
            if (mode === "text") return message.reply(textMissions(bank, ud.name || "User"));
            const canvas = await genMissionsCard(bank, ud.name || "User");
            return replyImage(message, canvas);
        }


        if (action === "wheel" || action === "spin") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            const bank = ud.data.bank;
            if (bank.lastWheelDate === today()) return sendError(message, "WHEEL ALREADY SPUN TODAY", "Come back tomorrow!");
            if (bank.balance < WHEEL_COST) return sendError(message, `NEED ${CURRENCY}${fmt(WHEEL_COST)} TO SPIN`);
            bank.balance -= WHEEL_COST;
            const seg = spinWheel();
            const txnId = genTxnId(), ts = now();
            bank.lastWheelDate = today();
            bank.gamesPlayed = (bank.gamesPlayed || 0) + 1;
            const mr = updateMission(bank, "game");
            const isWin = seg.value > 0;
            if (isWin) {
                bank.balance += seg.value;
                bank.gamesWon = (bank.gamesWon || 0) + 1;
                pushTxn(bank, { transactionId: txnId, type: "wheel", amount: seg.value, newBalance: bank.balance, timestamp: ts });
            } else {
                pushTxn(bank, { transactionId: txnId, type: "wheel", amount: WHEEL_COST, newBalance: bank.balance, timestamp: ts });
            }
            if (mr > 0) { bank.balance += mr; pushTxn(bank, { transactionId: genTxnId(), type: "mission", amount: mr, newBalance: bank.balance, timestamp: ts }); }
            await usersData.set(senderID, { data: ud.data });
            const resultText = isWin ? `🎉 WIN! +${CURRENCY}${fmt(seg.value)}` : `💀 LOSE! -${CURRENCY}${fmt(WHEEL_COST)}`;
            if (mode === "text") return message.reply(`🎡 LUCKY WHEEL\n━━━━━━━━━━━━━\n${resultText}\n💰 New Bal: ${CURRENCY}${fmt(bank.balance)}`);
            const canvas = await genGameCard("wheel", { isWin, display: resultText, txnId, rows: [["RESULT", seg.label, isWin ? C.GREEN : C.RED], ["AMOUNT", isWin ? `+${CURRENCY}${fmt(seg.value)}` : `-${CURRENCY}${fmt(WHEEL_COST)}`, isWin ? C.GREEN : C.RED], ["NEW BAL", `${CURRENCY}${fmt(bank.balance)}`, C.CYAN]] });
            return replyImage(message, canvas);
        }


        if (action === "flip") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            const amount = parseInt(args[1]);
            const pick = (args[2] || "").toLowerCase();
            if (isNaN(amount) || amount <= 0) return sendError(message, "USAGE: .bank flip <amt> heads/tails");
            if (!["h", "t", "heads", "tails"].includes(pick)) return sendError(message, "CHOOSE: heads (h) or tails (t)");
            if (amount > FLIP_MAX_BET) return sendError(message, `MAX BET: ${CURRENCY}${fmt(FLIP_MAX_BET)}`);
            const bank = ud.data.bank;
            if (bank.balance < amount) return sendError(message, "INSUFFICIENT BALANCE");
            const result = Math.random() < 0.5 ? "heads" : "tails";
            const playerPick = pick.startsWith("h") ? "heads" : "tails";
            const isWin = result === playerPick;
            const txnId = genTxnId(), ts = now();
            bank.gamesPlayed = (bank.gamesPlayed || 0) + 1;
            const mr = updateMission(bank, "game");
            if (isWin) { bank.balance += amount; bank.gamesWon = (bank.gamesWon || 0) + 1; pushTxn(bank, { transactionId: txnId, type: "flip_win", amount, newBalance: bank.balance, timestamp: ts }); }
            else { bank.balance -= amount; pushTxn(bank, { transactionId: txnId, type: "flip_loss", amount, newBalance: bank.balance, timestamp: ts }); }
            if (mr > 0) { bank.balance += mr; pushTxn(bank, { transactionId: genTxnId(), type: "mission", amount: mr, newBalance: bank.balance, timestamp: ts }); }
            await usersData.set(senderID, { data: ud.data });
            const coinDisp = result === "heads" ? "🟡 HEADS" : "⚪ TAILS";
            if (mode === "text") return message.reply(`🪙 COIN FLIP\n━━━━━━━━━━━━━\nResult: ${coinDisp}\nYou picked: ${playerPick.toUpperCase()}\n${isWin ? `✅ WIN! +${CURRENCY}${fmt(amount)}` : `❌ LOSE! -${CURRENCY}${fmt(amount)}`}\n💰 Balance: ${CURRENCY}${fmt(bank.balance)}`);
            const canvas = await genGameCard("flip", { isWin, display: `${coinDisp}  ·  YOU: ${playerPick.toUpperCase()}`, txnId, rows: [["BET", `${CURRENCY}${fmt(amount)}`, C.GRAY], ["RESULT", isWin ? `+${CURRENCY}${fmt(amount)}` : `-${CURRENCY}${fmt(amount)}`, isWin ? C.GREEN : C.RED], ["NEW BAL", `${CURRENCY}${fmt(bank.balance)}`, C.CYAN]] });
            return replyImage(message, canvas);
        }


        if (action === "gamble" || action === "bet") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount <= 0) return sendError(message, "USAGE: .bank gamble <amount>");
            if (amount > GAMBLE_MAX_BET) return sendError(message, `MAX BET: ${CURRENCY}${fmt(GAMBLE_MAX_BET)}`);
            const bank = ud.data.bank;
            if (bank.balance < amount) return sendError(message, "INSUFFICIENT BALANCE");
            const roll = Math.random();
            const isWin = roll > 0.48;
            const mult = isWin ? (roll > 0.97 ? 3 : roll > 0.88 ? 2 : 1.5) : 0;
            const profit = isWin ? Math.floor(amount * mult) - amount : -amount;
            const txnId = genTxnId(), ts = now();
            bank.gamesPlayed = (bank.gamesPlayed || 0) + 1;
            const mr = updateMission(bank, "game");
            if (isWin) { bank.balance += profit; bank.gamesWon = (bank.gamesWon || 0) + 1; pushTxn(bank, { transactionId: txnId, type: "gamble_win", amount: Math.abs(profit), newBalance: bank.balance, timestamp: ts }); }
            else { bank.balance -= amount; pushTxn(bank, { transactionId: txnId, type: "gamble_loss", amount, newBalance: bank.balance, timestamp: ts }); }
            if (mr > 0) { bank.balance += mr; pushTxn(bank, { transactionId: genTxnId(), type: "mission", amount: mr, newBalance: bank.balance, timestamp: ts }); }
            await usersData.set(senderID, { data: ud.data });
            const multLabel = mult >= 3 ? "3x JACKPOT!" : mult >= 2 ? "2x WIN!" : "1.5x WIN!";
            if (mode === "text") return message.reply(`🎲 CASINO GAMBLE\n━━━━━━━━━━━━━\n${isWin ? `✅ ${multLabel}` : "❌ LOSE!"}\n${isWin ? `+${CURRENCY}${fmt(profit)}` : `-${CURRENCY}${fmt(amount)}`}\n💰 Balance: ${CURRENCY}${fmt(bank.balance)}`);
            const canvas = await genGameCard("gamble", { isWin, display: isWin ? multLabel : "HOUSE WINS", txnId, rows: [["BET", `${CURRENCY}${fmt(amount)}`, C.GRAY], ["RESULT", isWin ? `+${CURRENCY}${fmt(profit)}` : `-${CURRENCY}${fmt(amount)}`, isWin ? C.GREEN : C.RED], ["MULTIPLIER", isWin ? `${mult}x` : "0x", isWin ? C.GOLD : C.RED], ["NEW BAL", `${CURRENCY}${fmt(bank.balance)}`, C.CYAN]] });
            return replyImage(message, canvas);
        }


        if (action === "slots" || action === "slot") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount < 100) return sendError(message, "MIN BET: $100");
            if (amount > GAMBLE_MAX_BET) return sendError(message, `MAX BET: ${CURRENCY}${fmt(GAMBLE_MAX_BET)}`);
            const bank = ud.data.bank;
            if (bank.balance < amount) return sendError(message, "INSUFFICIENT BALANCE");
            const result = playSlots(amount);
            const txnId = genTxnId(), ts = now();
            bank.gamesPlayed = (bank.gamesPlayed || 0) + 1;
            const mr = updateMission(bank, "game");
            if (result.isWin) { bank.balance += result.profit; bank.gamesWon = (bank.gamesWon || 0) + 1; pushTxn(bank, { transactionId: txnId, type: "gamble_win", amount: result.profit, newBalance: bank.balance, timestamp: ts }); }
            else { bank.balance -= amount; pushTxn(bank, { transactionId: txnId, type: "gamble_loss", amount, newBalance: bank.balance, timestamp: ts }); }
            if (mr > 0) { bank.balance += mr; pushTxn(bank, { transactionId: genTxnId(), type: "mission", amount: mr, newBalance: bank.balance, timestamp: ts }); }
            await usersData.set(senderID, { data: ud.data });
            const reelStr = result.reels.map(r => r.label).join(" | ");
            const reelIds = result.reels.map(r => r.id).join(" | ");
            if (mode === "text") return message.reply(`[SLOT MACHINE]\n━━━━━━━━━━━━━\n[ ${reelStr} ]\n${result.isWin ? `WIN! x${result.mult}  +${CURRENCY}${fmt(result.win - amount)}` : "NO MATCH"}\nBalance: ${CURRENCY}${fmt(bank.balance)}`);
            const canvas = await genGameCard("slots", { isWin: result.isWin, reels: result.reels, txnId, rows: [["REELS", reelIds, C.WHITE], ["MULTIPLIER", result.isWin ? `${result.mult}x` : "0x", result.isWin ? C.GOLD : C.RED], ["PROFIT", result.isWin ? `+${CURRENCY}${fmt(result.profit)}` : `-${CURRENCY}${fmt(amount)}`, result.isWin ? C.GREEN : C.RED], ["NEW BAL", `${CURRENCY}${fmt(bank.balance)}`, C.CYAN]] });
            return replyImage(message, canvas);
        }


        if (action === "rob") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            let targetID;
            if (Object.keys(event.mentions).length > 0) targetID = Object.keys(event.mentions)[0];
            else return sendError(message, "TAG A USER", ".bank rob @user");
            if (targetID === senderID) return sendError(message, "CANNOT ROB YOURSELF");
            const bank = ud.data.bank;
            const cooldownLeft = ROB_COOLDOWN_MS - (Date.now() - (bank.lastRobTime || 0));
            if (cooldownLeft > 0) return sendError(message, "ROB COOLDOWN", `Wait ${Math.ceil(cooldownLeft / 60000)} minutes`);
            let td = ensureData(await usersData.get(targetID));
            if (!isReg(td)) return sendError(message, "TARGET HAS NO BANK ACCOUNT");
            if (isFrozen(td)) return sendError(message, "TARGET ACCOUNT FROZEN");
            if ((td.data.bank.balance || 0) < ROB_MIN_BALANCE) return sendError(message, "TARGET IS BROKE", `Min ${CURRENCY}${fmt(ROB_MIN_BALANCE)} needed`);
            bank.lastRobTime = Date.now();
            bank.gamesPlayed = (bank.gamesPlayed || 0) + 1;
            const isSuccess = Math.random() < ROB_SUCCESS_CHANCE;
            const txnId = genTxnId(), ts = now();
            if (isSuccess) {
                const stolen = Math.floor(td.data.bank.balance * ROB_MAX_PCT * Math.random());
                td.data.bank.balance -= stolen; bank.balance += stolen; bank.gamesWon = (bank.gamesWon || 0) + 1;
                pushTxn(bank, { transactionId: txnId, type: "rob_in", amount: stolen, newBalance: bank.balance, timestamp: ts, counterpart: `← ${td.name || targetID}` });
                pushTxn(td.data.bank, { transactionId: txnId, type: "rob_out", amount: stolen, newBalance: td.data.bank.balance, timestamp: ts, counterpart: `→ ${ud.name || senderID}` });
                await usersData.set(senderID, { data: ud.data });
                await usersData.set(targetID, { data: td.data });
                if (mode === "text") return message.reply(`🔫 ROB SUCCESS!\n━━━━━━━━━━━━━\n💸 Stolen from ${td.name || "them"}: ${CURRENCY}${fmt(stolen)}\n💰 Your Bal: ${CURRENCY}${fmt(bank.balance)}`);
                const canvas = await genGameCard("rob", { isWin: true, txnId, rows: [["VICTIM", (td.name || targetID).slice(0, 20), C.RED], ["STOLEN", `+${CURRENCY}${fmt(stolen)}`, C.GREEN], ["YOUR BAL", `${CURRENCY}${fmt(bank.balance)}`, C.CYAN]] });
                return replyImage(message, canvas);
            } else {
                const fine = Math.min(Math.floor(bank.balance * 0.1), 5000);
                bank.balance -= fine;
                pushTxn(bank, { transactionId: txnId, type: "rob_out", amount: fine, newBalance: bank.balance, timestamp: ts, counterpart: `POLICE FINE` });
                await usersData.set(senderID, { data: ud.data });
                if (mode === "text") return message.reply(`🚔 CAUGHT!\n━━━━━━━━━━━━━\n👮 Police fine: -${CURRENCY}${fmt(fine)}\n💰 Your Bal: ${CURRENCY}${fmt(bank.balance)}`);
                const canvas = await genGameCard("rob", { isWin: false, txnId, rows: [["TARGET", (td.name || targetID).slice(0, 20), C.GRAY], ["POLICE FINE", `-${CURRENCY}${fmt(fine)}`, C.RED], ["YOUR BAL", `${CURRENCY}${fmt(bank.balance)}`, C.CYAN]] });
                return replyImage(message, canvas);
            }
        }


        if (action === "pin") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const bank = ud.data.bank;
            const sub = (args[1] || "").toLowerCase();
            if (sub === "set") {
                const newPin = args[2];
                if (!newPin || !/^\d{4}$/.test(newPin)) return sendError(message, "PIN must be exactly 4 digits");
                bank.pin = newPin; bank.pinAttempts = 0; bank.pinLocked = false;
                await usersData.set(senderID, { data: ud.data });
                return message.reply(`🔐 PIN SET!\nYour bank is now PIN protected.\nLarge transactions (${CURRENCY}${fmt(PIN_REQUIRED_AMOUNT)}+) require PIN.`);
            }
            if (sub === "remove") {
                const inputPin = args[2];
                if (!verifyPin(bank, inputPin)) return sendError(message, bank.pinLocked ? "PIN LOCKED" : "WRONG PIN");
                bank.pin = null; bank.pinLocked = false; bank.pinAttempts = 0;
                await usersData.set(senderID, { data: ud.data });
                return message.reply("✅ PIN removed.");
            }
            if (sub === "unlock") {
                if (role < 1) return sendError(message, "ADMIN ONLY");
                const targetIDPin = args[2] || senderID;
                let tud = ensureData(await usersData.get(targetIDPin));
                if (!isReg(tud)) return sendError(message, "USER HAS NO ACCOUNT");
                tud.data.bank.pinLocked = false; tud.data.bank.pinAttempts = 0;
                await usersData.set(targetIDPin, { data: tud.data });
                return message.reply("✅ PIN unlocked.");
            }
            return sendError(message, "USAGE: .bank pin set <4digits> | pin remove <pin> | pin unlock (admin)");
        }


        if (action === "freeze" || action === "unfreeze") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const bank = ud.data.bank;
            const frozen = !bank.frozen; bank.frozen = frozen;
            await usersData.set(senderID, { data: ud.data });
            if (mode === "text") return message.reply(frozen ? "❄️ Account FROZEN. All transactions disabled." : "✅ Account UNFROZEN. Transactions enabled.");
            const canvas = await genFreezeCard(bank, ud.name, frozen);
            return replyImage(message, canvas);
        }


        if (action === "limits" || action === "limit") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (mode === "text") return message.reply(textLimits(ud.data.bank, ud.name || "User"));
            const canvas = await genLimitsCard(ud.data.bank, ud.name || "User");
            return replyImage(message, canvas);
        }


        if (action === "leaderboard" || action === "lb" || action === "top" || action === "rich") {
            const allUsers = global.db.allUserData || [];
            const filter = (args[1] || "all").toLowerCase();
            const validFilter = ["w", "weekly", "m", "monthly", "all"].includes(filter) ? filter : "all";
            const fKey = validFilter.startsWith("w") ? "w" : validFilter.startsWith("m") ? "m" : "all";

            let bankUsers = allUsers.filter(u => u.data?.bank?.isRegistered)
                .map(u => ({ userID: u.userID, name: u.name, bank: u.data.bank }));

            if (fKey === "w") {

                const weekAgo = moment().tz(TZ).subtract(7, "days").valueOf();
                bankUsers = bankUsers.map(u => {
                    const weeklyTxns = (u.bank.transactions || []).filter(t => {
                        try { return moment(t.timestamp, "DD/MM/YYYY HH:mm:ss").valueOf() >= weekAgo; } catch { return false; }
                    });
                    const weeklyDeposits = weeklyTxns.filter(t => t.type === "deposit").reduce((s, t) => s + (t.amount || 0), 0);
                    return { ...u, _score: weeklyDeposits };
                }).sort((a, b) => b._score - a._score);
            } else if (fKey === "m") {
                const monthAgo = moment().tz(TZ).subtract(30, "days").valueOf();
                bankUsers = bankUsers.map(u => {
                    const monthlyTxns = (u.bank.transactions || []).filter(t => {
                        try { return moment(t.timestamp, "DD/MM/YYYY HH:mm:ss").valueOf() >= monthAgo; } catch { return false; }
                    });
                    const monthlyDeposits = monthlyTxns.filter(t => t.type === "deposit").reduce((s, t) => s + (t.amount || 0), 0);
                    return { ...u, _score: monthlyDeposits };
                }).sort((a, b) => b._score - a._score);
            } else {
                bankUsers = bankUsers.sort((a, b) => getNetWorth(b.bank) - getNetWorth(a.bank));
            }

            if (bankUsers.length === 0) return sendError(message, "NO BANK USERS YET");
            if (mode === "text") return message.reply(textLeaderboard(bankUsers, fKey));
            const canvas = await genLeaderboardImage(bankUsers, fKey);
            return replyImage(message, canvas);
        }


        if (action === "stats" || action === "info") {
            const allUsers = global.db.allUserData || [];
            if (mode === "text") return message.reply(textStats(allUsers));
            const canvas = await genStatsCard(allUsers);
            return replyImage(message, canvas);
        }


        if (action === "admin") {
            if (role < 1) return sendError(message, "ADMIN ONLY");
            const sub = (args[1] || "").toLowerCase();

            if (sub === "give" || sub === "add") {
                const targetID2 = Object.keys(event.mentions)[0] || args[2];
                const giveAmt = parseInt(args[args.length - 1]);
                if (!targetID2 || isNaN(giveAmt) || giveAmt <= 0) return sendError(message, "USAGE: .bank admin give @user <amt>");
                let tud2 = ensureData(await usersData.get(targetID2));
                if (!isReg(tud2)) return sendError(message, "USER HAS NO BANK ACCOUNT");
                tud2.data.bank.balance += giveAmt;
                pushTxn(tud2.data.bank, { transactionId: genTxnId(), type: "deposit", amount: giveAmt, newBalance: tud2.data.bank.balance, timestamp: now(), counterpart: "ADMIN GRANT" });
                await usersData.set(targetID2, { data: tud2.data });
                return message.reply(`✅ ADMIN: Given ${CURRENCY}${fmt(giveAmt)} to ${tud2.name || targetID2}\nNew balance: ${CURRENCY}${fmt(tud2.data.bank.balance)}`);
            }

            if (sub === "take") {
                const targetID3 = Object.keys(event.mentions)[0] || args[2];
                const takeAmt = parseInt(args[args.length - 1]);
                if (!targetID3 || isNaN(takeAmt) || takeAmt <= 0) return sendError(message, "USAGE: .bank admin take @user <amt>");
                let tud3 = ensureData(await usersData.get(targetID3));
                if (!isReg(tud3)) return sendError(message, "USER HAS NO ACCOUNT");
                tud3.data.bank.balance = Math.max(0, tud3.data.bank.balance - takeAmt);
                pushTxn(tud3.data.bank, { transactionId: genTxnId(), type: "withdraw", amount: takeAmt, newBalance: tud3.data.bank.balance, timestamp: now(), counterpart: "ADMIN DEDUCT" });
                await usersData.set(targetID3, { data: tud3.data });
                return message.reply(`✅ ADMIN: Took ${CURRENCY}${fmt(takeAmt)} from ${tud3.name || targetID3}`);
            }

            if (sub === "freeze") {
                const targetID4 = Object.keys(event.mentions)[0] || args[2];
                if (!targetID4) return sendError(message, "TAG A USER");
                let tud4 = ensureData(await usersData.get(targetID4));
                if (!isReg(tud4)) return sendError(message, "USER HAS NO ACCOUNT");
                tud4.data.bank.frozen = true;
                await usersData.set(targetID4, { data: tud4.data });
                return message.reply(`❄️ ADMIN: Account of ${tud4.name || targetID4} FROZEN.`);
            }

            if (sub === "unfreeze") {
                const targetID5 = Object.keys(event.mentions)[0] || args[2];
                if (!targetID5) return sendError(message, "TAG A USER");
                let tud5 = ensureData(await usersData.get(targetID5));
                if (!isReg(tud5)) return sendError(message, "USER HAS NO ACCOUNT");
                tud5.data.bank.frozen = false;
                await usersData.set(targetID5, { data: tud5.data });
                return message.reply(`✅ ADMIN: Account of ${tud5.name || targetID5} UNFROZEN.`);
            }

            if (sub === "wipe") {
                const targetID6 = Object.keys(event.mentions)[0] || args[2];
                if (!targetID6) return sendError(message, "TAG A USER");
                let tud6 = ensureData(await usersData.get(targetID6));
                if (!isReg(tud6)) return sendError(message, "USER HAS NO ACCOUNT");
                tud6.data.bank = null;
                await usersData.set(targetID6, { data: tud6.data });
                return message.reply(`💀 ADMIN: Bank account of ${tud6.name || targetID6} WIPED.`);
            }

            if (sub === "setbal") {
                const targetID7 = Object.keys(event.mentions)[0] || args[2];
                const newBal = parseInt(args[args.length - 1]);
                if (!targetID7 || isNaN(newBal)) return sendError(message, "USAGE: .bank admin setbal @user <amt>");
                let tud7 = ensureData(await usersData.get(targetID7));
                if (!isReg(tud7)) return sendError(message, "USER HAS NO ACCOUNT");
                tud7.data.bank.balance = newBal;
                await usersData.set(targetID7, { data: tud7.data });
                return message.reply(`✅ ADMIN: Set balance of ${tud7.name || targetID7} to ${CURRENCY}${fmt(newBal)}`);
            }

            if (sub === "resetloan") {
                const targetID8 = Object.keys(event.mentions)[0] || args[2];
                if (!targetID8) return sendError(message, "TAG A USER");
                let tud8 = ensureData(await usersData.get(targetID8));
                if (!isReg(tud8)) return sendError(message, "USER HAS NO ACCOUNT");
                tud8.data.bank.loan = null;
                await usersData.set(targetID8, { data: tud8.data });
                return message.reply(`✅ ADMIN: Loan of ${tud8.name || targetID8} RESET.`);
            }

            return sendError(message, "ADMIN SUBCOMMANDS: give | take | freeze | unfreeze | wipe | setbal | resetloan");
        }


        if (action === "rename") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const newName = args.slice(1).join(" ").trim();
            if (!newName || newName.length < 2 || newName.length > 30) return sendError(message, "NAME must be 2-30 characters");
            ud.data.bank.holderName = newName;
            await usersData.set(senderID, { data: ud.data });
            return message.reply(`✅ Account name updated to: ${newName}`);
        }


        if (action === "close") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const bank = ud.data.bank;
            if (bank.balance > 0) return sendError(message, "WITHDRAW FIRST", `Balance: ${CURRENCY}${fmt(bank.balance)}`);
            if (bank.loan && !bank.loan.repaid) return sendError(message, "REPAY LOAN FIRST");
            if (args[1] !== "confirm") return sendError(message, "ARE YOU SURE?", "Type: .bank close confirm");
            ud.data.bank = null;
            await usersData.set(senderID, { data: ud.data });
            return message.reply("✅ Bank account closed.");
        }


        if (action === "referral" || action === "ref") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const bank = ud.data.bank;
            return message.reply(`👥 REFERRAL SYSTEM\n━━━━━━━━━━━━━\n🪪 Your code: ${bank.accountNumber}\nBonus: ${CURRENCY}${fmt(REFERRAL_BONUS)} per referral\nReferrals: ${bank.referralCount || 0}\nUsage: .bank register ${bank.accountNumber}`);
        }


        if (action === "vault") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const vbank = ud.data.bank;
            const vtier = getTier(vbank.totalDeposited || 0);
            const vperks = TIER_PERKS_DETAIL[vtier.label];
            if (!vperks.vaultAccess) return sendError(message, "VAULT REQUIRES SILVER+ TIER", `Current tier: ${vtier.label}`);
            if (!vbank.vault) vbank.vault = null;
            const vsub = (args[1] || "").toLowerCase();

            if (vsub === "open") {
                if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
                if (vbank.vault && !vbank.vault.collected) return sendError(message, "VAULT ALREADY OPEN", "Use: .bank vault collect");
                const vamt = parseInt(args[2]);
                if (isNaN(vamt) || vamt < VAULT_MIN_AMOUNT) return sendError(message, `MIN VAULT: ${CURRENCY}${fmt(VAULT_MIN_AMOUNT)}`);
                if (vamt > VAULT_MAX_AMOUNT) return sendError(message, `MAX VAULT: ${CURRENCY}${fmt(VAULT_MAX_AMOUNT)}`);
                if (vbank.balance < vamt) return sendError(message, "INSUFFICIENT BALANCE");
                vbank.balance -= vamt;
                vbank.vault = { amount: vamt, startTime: Date.now(), lockUntil: Date.now() + VAULT_MIN_LOCK_DAYS * 86400000, collected: false };
                if (!vbank.achievements) vbank.achievements = {};
                if (!vbank.achievements.vault_open) {
                    vbank.achievements.vault_open = true;
                    vbank.balance += 600;
                    pushTxn(vbank, { transactionId: genTxnId(), type: "bonus", amount: 600, newBalance: vbank.balance, timestamp: now(), counterpart: "Achievement: Vault Owner" });
                }
                await usersData.set(senderID, { data: ud.data });
                if (mode === "text") return message.reply(`🔒 VAULT OPENED\n━━━━━━━━━━━━━\n💰 Locked: ${CURRENCY}${fmt(vamt)}\n📈 Rate: ${(VAULT_INTEREST_DAILY * 100).toFixed(1)}%/day\n⏳ Lock: ${VAULT_MIN_LOCK_DAYS} days\n📅 Unlocks: ${moment(vbank.vault.lockUntil).tz(TZ).format("DD/MM/YYYY HH:mm")}`);
                const vcanvas = await genVaultCard(vbank, ud.name || "User", "open", vamt);
                return replyImage(message, vcanvas);
            }

            if (vsub === "collect") {
                if (!vbank.vault || vbank.vault.collected) return sendError(message, "NO ACTIVE VAULT", "Use: .bank vault open <amount>");
                if (Date.now() < vbank.vault.lockUntil) {
                    const vdl = Math.ceil((vbank.vault.lockUntil - Date.now()) / 86400000);
                    return sendError(message, "VAULT STILL LOCKED", `${vdl} day(s) remaining`);
                }
                const vprin = vbank.vault.amount;
                const vint = Math.floor(vprin * VAULT_INTEREST_DAILY * VAULT_MIN_LOCK_DAYS);
                const vtotal = vprin + vint;
                vbank.balance += vtotal;
                vbank.vault.collected = true;
                pushTxn(vbank, { transactionId: genTxnId(), type: "collect", amount: vtotal, newBalance: vbank.balance, timestamp: now(), counterpart: "Vault Matured" });
                await usersData.set(senderID, { data: ud.data });
                if (mode === "text") return message.reply(`✅ VAULT COLLECTED\n━━━━━━━━━━━━━\n💰 Principal: ${CURRENCY}${fmt(vprin)}\n📈 Interest: +${CURRENCY}${fmt(vint)}\n✅ Total: ${CURRENCY}${fmt(vtotal)}\n💰 Bal: ${CURRENCY}${fmt(vbank.balance)}`);
                const vcanvas2 = await genVaultCard(vbank, ud.name || "User", "collect", vtotal);
                return replyImage(message, vcanvas2);
            }

            if (mode === "text") return message.reply(textVault(vbank, ud.name || "User"));
            const vcanvas3 = await genVaultCard(vbank, ud.name || "User", "info", vbank.vault?.amount || 0);
            return replyImage(message, vcanvas3);
        }


        if (action === "dice") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            const damt = parseInt(args[1]);
            if (isNaN(damt) || damt < 100) return sendError(message, "USAGE: .bank dice <amount> (min $100)");
            if (damt > DICE_MAX_BET) return sendError(message, `MAX BET: ${CURRENCY}${fmt(DICE_MAX_BET)}`);
            const dbank = ud.data.bank;
            if (dbank.balance < damt) return sendError(message, "INSUFFICIENT BALANCE");
            const pRoll = Math.floor(Math.random() * 6) + 1;
            const hRoll = Math.floor(Math.random() * 6) + 1;
            const dIsWin = pRoll > hRoll;
            const dTxnId = genTxnId(), dTs = now();
            dbank.gamesPlayed = (dbank.gamesPlayed || 0) + 1;
            const dmr = updateMission(dbank, "game");
            let dprofit = 0;
            if (dIsWin) {
                dprofit = Math.floor(damt * DICE_PAYOUTS[pRoll]) - damt;
                dbank.balance += dprofit;
                dbank.gamesWon = (dbank.gamesWon || 0) + 1;
                pushTxn(dbank, { transactionId: dTxnId, type: "gamble_win", amount: dprofit, newBalance: dbank.balance, timestamp: dTs });
            } else {
                dbank.balance -= damt;
                pushTxn(dbank, { transactionId: dTxnId, type: "gamble_loss", amount: damt, newBalance: dbank.balance, timestamp: dTs });
            }
            if (dmr > 0) { dbank.balance += dmr; pushTxn(dbank, { transactionId: genTxnId(), type: "mission", amount: dmr, newBalance: dbank.balance, timestamp: dTs }); }
            await usersData.set(senderID, { data: ud.data });
            const dFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
            if (mode === "text") return message.reply(`🎲 DICE ROLL\n━━━━━━━━━━━━━\nYou: ${dFaces[pRoll - 1]} (${pRoll})  House: ${dFaces[hRoll - 1]} (${hRoll})\n${dIsWin ? `✅ WIN! +${CURRENCY}${fmt(dprofit)} (${DICE_PAYOUTS[pRoll]}x)` : pRoll === hRoll ? `🤝 TIE! -${CURRENCY}${fmt(damt)}` : `❌ LOSE! -${CURRENCY}${fmt(damt)}`}\n💰 Bal: ${CURRENCY}${fmt(dbank.balance)}`);
            const dcanvas = await genDiceCard({ isWin: dIsWin, playerRoll: pRoll, houseRoll: hRoll, bet: damt, profit: dIsWin ? dprofit : -damt, newBal: dbank.balance, txnId: dTxnId });
            return replyImage(message, dcanvas);
        }


        if (action === "scratch" || action === "sc") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            const scbank = ud.data.bank;
            if (scbank.balance < SCRATCH_COST) return sendError(message, `NEED ${CURRENCY}${fmt(SCRATCH_COST)} TO SCRATCH`);
            scbank.balance -= SCRATCH_COST;
            let scr = Math.random(), scc = 0, scprize = SCRATCH_PRIZES[0];
            for (const p of SCRATCH_PRIZES) { scc += p.chance; if (scr <= scc) { scprize = p; break; } }
            const scIsWin = scprize.value > 0;
            if (scIsWin) scbank.balance += scprize.value;
            const scTxnId = genTxnId(), scTs = now();
            scbank.gamesPlayed = (scbank.gamesPlayed || 0) + 1;
            if (scIsWin) scbank.gamesWon = (scbank.gamesWon || 0) + 1;
            const scmr = updateMission(scbank, "game");
            pushTxn(scbank, { transactionId: scTxnId, type: scIsWin ? "gamble_win" : "gamble_loss", amount: scIsWin ? scprize.value : SCRATCH_COST, newBalance: scbank.balance, timestamp: scTs });
            if (scmr > 0) { scbank.balance += scmr; pushTxn(scbank, { transactionId: genTxnId(), type: "mission", amount: scmr, newBalance: scbank.balance, timestamp: scTs }); }
            await usersData.set(senderID, { data: ud.data });
            const reveals = [scprize];
            for (let i = 0; i < 2; i++) {
                let rr = Math.random(), rc = 0, rp = SCRATCH_PRIZES[0];
                for (const p of SCRATCH_PRIZES) { rc += p.chance; if (rr <= rc) { rp = p; break; } }
                reveals.push(rp);
            }
            if (mode === "text") return message.reply(`🃏 SCRATCH CARD\n━━━━━━━━━━━━━\nResult: ${scprize.label}\n${scIsWin ? `✅ WIN! +${CURRENCY}${fmt(scprize.value)}` : "❌ NO WIN"}\n🎫 Cost: -${CURRENCY}${fmt(SCRATCH_COST)}\n💰 Bal: ${CURRENCY}${fmt(scbank.balance)}`);
            const sccanvas = await genScratchCard({ prize: scprize, isWin: scIsWin, bet: SCRATCH_COST, newBal: scbank.balance, txnId: scTxnId, reveals });
            return replyImage(message, sccanvas);
        }


        if (action === "lottery" || action === "lotto") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const lbank = ud.data.bank;
            if (!lbank.lotteryTickets) lbank.lotteryTickets = 0;
            const lsub = (args[1] || "").toLowerCase();
            const nextDraw = moment().tz(TZ).day(7).format("DD/MM/YYYY");

            if (lsub === "buy") {
                if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
                const lcount = Math.max(1, Math.min(parseInt(args[2]) || 1, LOTTERY_MAX_TICKETS));
                if (lbank.lotteryTickets + lcount > LOTTERY_MAX_TICKETS) return sendError(message, `MAX ${LOTTERY_MAX_TICKETS} TICKETS`, `You have ${lbank.lotteryTickets} already`);
                const lcost = lcount * LOTTERY_TICKET_PRICE;
                if (lbank.balance < lcost) return sendError(message, `NEED ${CURRENCY}${fmt(lcost)} FOR ${lcount} TICKET(S)`);
                lbank.balance -= lcost;
                lbank.lotteryTickets += lcount;
                pushTxn(lbank, { transactionId: genTxnId(), type: "withdraw", amount: lcost, newBalance: lbank.balance, timestamp: now(), counterpart: `Lottery: ${lcount} ticket(s)` });
                await usersData.set(senderID, { data: ud.data });
                if (mode === "text") return message.reply(`🎫 TICKETS BOUGHT!\n━━━━━━━━━━━━━\n🎟 ${lcount} ticket(s) — ${CURRENCY}${fmt(lcost)}\n📋 Total: ${lbank.lotteryTickets}\n📅 Draw: ${nextDraw}`);
                const lcanvas = await genLotteryCard(lbank, ud.name || "User", "buy", { tickets: lcount, cost: lcost, total: lbank.lotteryTickets, drawDate: nextDraw });
                return replyImage(message, lcanvas);
            }

            if (mode === "text") return message.reply(`🎰 LOTTERY INFO\n━━━━━━━━━━━━━\n🎫 Ticket Price: ${CURRENCY}${fmt(LOTTERY_TICKET_PRICE)}\n📋 Max Tickets: ${LOTTERY_MAX_TICKETS}\n🎟 Your Tickets: ${lbank.lotteryTickets}\n📅 Next Draw: ${nextDraw}\nBuy: .bank lottery buy <count>`);
            const lcanvas2 = await genLotteryCard(lbank, ud.name || "User", "info", { tickets: lbank.lotteryTickets, drawDate: nextDraw });
            return replyImage(message, lcanvas2);
        }


        if (action === "achievements" || action === "ach" || action === "achieve") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const abank = ud.data.bank;
            if (!abank.achievements) abank.achievements = {};
            if (mode === "text") return message.reply(textAchievements(abank, ud.name || "User"));
            const acanvas = await genAchievementsCard(abank, ud.name || "User");
            return replyImage(message, acanvas);
        }


        if (action === "goal") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const gbank = ud.data.bank;
            const gsub = (args[1] || "").toLowerCase();

            if (gsub === "set") {
                const gtarget = parseInt(args[2]);
                const gname = args.slice(3).join(" ").trim() || "My Goal";
                if (isNaN(gtarget) || gtarget < 100) return sendError(message, "MIN GOAL: $100");
                if (gtarget > GOAL_MAX_AMOUNT) return sendError(message, `MAX GOAL: ${CURRENCY}${fmt(GOAL_MAX_AMOUNT)}`);
                gbank.goal = { target: gtarget, name: gname, createdAt: today() };
                await usersData.set(senderID, { data: ud.data });
                return message.reply(`🎯 GOAL SET!\n━━━━━━━━━━━━━\n📌 "${gname}"\n💰 Target: ${CURRENCY}${fmt(gtarget)}\nTrack with: .bank goal`);
            }

            if (gsub === "claim") {
                if (!gbank.goal) return sendError(message, "NO ACTIVE GOAL");
                const gcurrent = (gbank.balance || 0) + (gbank.savings || 0);
                if (gcurrent < gbank.goal.target) return sendError(message, "GOAL NOT YET REACHED", `Need ${CURRENCY}${fmt(gbank.goal.target - gcurrent)} more`);
                const greward = Math.max(500, Math.floor(gbank.goal.target * 0.02));
                gbank.balance += greward;
                pushTxn(gbank, { transactionId: genTxnId(), type: "bonus", amount: greward, newBalance: gbank.balance, timestamp: now(), counterpart: "Goal Achievement Reward" });
                if (!gbank.achievements) gbank.achievements = {};
                if (!gbank.achievements.goal_complete) {
                    gbank.achievements.goal_complete = true;
                    gbank.balance += 1500;
                    pushTxn(gbank, { transactionId: genTxnId(), type: "bonus", amount: 1500, newBalance: gbank.balance, timestamp: now(), counterpart: "Achievement: Goal Achiever" });
                }
                gbank.goal = null;
                await usersData.set(senderID, { data: ud.data });
                return message.reply(`🎉 GOAL ACHIEVED!\n━━━━━━━━━━━━━\n🎁 Reward: +${CURRENCY}${fmt(greward)}\n💰 Balance: ${CURRENCY}${fmt(gbank.balance)}\n✨ New goal: .bank goal set <amount> <name>`);
            }

            if (gsub === "clear") {
                gbank.goal = null;
                await usersData.set(senderID, { data: ud.data });
                return message.reply("✅ Savings goal cleared.");
            }

            if (mode === "text") return message.reply(textGoal(gbank, ud.name || "User"));
            const gcanvas = await genGoalCard(gbank, ud.name || "User");
            return replyImage(message, gcanvas);
        }


        if (action === "portfolio" || action === "port") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (mode === "text") return message.reply(textPortfolio(ud.data.bank, ud.name || "User"));
            const pcanvas = await genPortfolioCard(ud.data.bank, ud.name || "User");
            return replyImage(message, pcanvas);
        }


        if (action === "tiers" || action === "tier") {
            if (mode === "text") return message.reply(textTierInfo());
            const tcanvas = await genTierInfoCard();
            return replyImage(message, tcanvas);
        }


        if (action === "plans" || action === "plan") {
            return message.reply(textInvestPlans());
        }


        if (action === "tax") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const txbank = ud.data.bank;
            const taxable = Math.floor((txbank.balance || 0) * TAX_RATE);
            return message.reply(`💸 TAX INFORMATION\n━━━━━━━━━━━━━\n💰 Balance    : ${CURRENCY}${fmt(txbank.balance)}\n📊 Tax Rate   : ${(TAX_RATE * 100).toFixed(0)}%\n💸 Est. Tax   : ${CURRENCY}${fmt(taxable)}\n⚠️ Informational only`);
        }


        if (action === "networth" || action === "nw") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const nwbank = ud.data.bank;
            const nw = getNetWorth(nwbank);
            const nwtier = getTier(nwbank.totalDeposited || 0);
            const allU = global.db.allUserData || [];
            const sorted = allU.filter(u => u.data?.bank?.isRegistered).sort((a, b) => getNetWorth(b.data.bank) - getNetWorth(a.data.bank));
            const rank = sorted.findIndex(u => u.userID === senderID) + 1;
            return message.reply(`💎 NET WORTH — ${ud.name || "User"}\n━━━━━━━━━━━━━\n💰 Balance   : ${CURRENCY}${fmt(nwbank.balance)}\n🏦 Savings   : ${CURRENCY}${fmt(nwbank.savings || 0)}\n📊 Investment: ${CURRENCY}${fmt(nwbank.investment && !nwbank.investment.collected ? nwbank.investment.amount : 0)}\n━━━━━━━━━━━━━\n💎 NET WORTH : ${CURRENCY}${fmt(nw)}\n${nwtier.label} Tier  |  Rank #${rank}`);
        }


        if (action === "daily" || action === "check") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            const dcbank = ud.data.bank;
            const bonusReady = dcbank.lastBonusDate !== today();
            const wheelReady = dcbank.lastWheelDate !== today();
            const interestReady = (dcbank.savings || 0) > 0 && dcbank.lastInterestClaim !== today();
            const investReady = dcbank.investment && !dcbank.investment.collected && Date.now() >= (dcbank.investment.startTime + (INVEST_PLANS[dcbank.investment.plan]?.days || 0) * 86400000);
            return message.reply(`📅 DAILY CHECKLIST — ${ud.name || "User"}\n━━━━━━━━━━━━━\n${bonusReady ? "✅" : "❌"} Daily Bonus   ${bonusReady ? "(READY!)" : `(claimed)`}\n${wheelReady ? "✅" : "❌"} Lucky Wheel   ${wheelReady ? "(READY!)" : "(spun today)"}\n${interestReady ? "✅" : "❌"} Savings Int.  ${interestReady ? "(READY!)" : dcbank.savings > 0 ? "(claimed)" : "(no savings)"}\n${investReady ? "✅" : "❌"} Investment    ${investReady ? "(READY TO COLLECT!)" : dcbank.investment && !dcbank.investment.collected ? "(still growing)" : "(none active)"}\n━━━━━━━━━━━━━\n💰 Balance: ${CURRENCY}${fmt(dcbank.balance)}`);
        }


        if (action === "blackjack" || action === "bj") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            const bank = ud.data.bank;
            const sub = (args[1] || "").toLowerCase();


            if (!sub || sub === "start" || (!["hit","stand","double","h","s","d"].includes(sub))) {
                const bet = parseInt(args[1]);
                if (isNaN(bet) || bet < 100) return sendError(message, "USAGE: .bank bj <bet>  (min $100)");
                if (bet > GAMBLE_MAX_BET) return sendError(message, `MAX BET: ${CURRENCY}${fmt(GAMBLE_MAX_BET)}`);
                if (bank.balance < bet) return sendError(message, "INSUFFICIENT BALANCE");

                const deck = bjDeck();
                const playerHand = [deck.pop(), deck.pop()];
                const dealerHand = [deck.pop(), deck.pop()];
                const playerVal = bjHandVal(playerHand);
                const dealerVal = bjHandVal(dealerHand);


                if (!bank.bjGame) bank.bjGame = null;
                bank.bjGame = { deck, playerHand, dealerHand, bet, startTime: Date.now() };
                bank.balance -= bet;


                if (playerVal === 21) {
                    const winAmt = Math.floor(bet * 2.5);
                    bank.balance += winAmt;
                    bank.bjGame = null;
                    bank.gamesPlayed = (bank.gamesPlayed || 0) + 1;
                    bank.gamesWon = (bank.gamesWon || 0) + 1;
                    const txnId = genTxnId(), ts = now();
                    const profit = winAmt - bet;
                    pushTxn(bank, { transactionId: txnId, type: "gamble_win", amount: profit, newBalance: bank.balance, timestamp: ts });
                    const mr = updateMission(bank, "game");
                    if (mr > 0) { bank.balance += mr; pushTxn(bank, { transactionId: genTxnId(), type: "mission", amount: mr, newBalance: bank.balance, timestamp: ts }); }
                    await usersData.set(senderID, { data: ud.data });
                    if (mode === "text") return message.reply(`🃏 BLACKJACK!\n━━━━━━━━━━━━━\nYour hand: ${bjHandStr(playerHand)} (${playerVal})\n✅ BLACKJACK! +${CURRENCY}${fmt(profit)}\n💰 Balance: ${CURRENCY}${fmt(bank.balance)}`);
                    const canvas = await genBlackjackCard({ playerHand, dealerHand, playerVal, dealerVal, result: "blackjack", bet, profit, newBal: bank.balance, txnId, hideDealer: false });
                    return replyImage(message, canvas);
                }

                await usersData.set(senderID, { data: ud.data });
                if (mode === "text") return message.reply(`🃏 BLACKJACK\n━━━━━━━━━━━━━\nYour hand: ${bjHandStr(playerHand)} (${playerVal})\nDealer shows: ${dealerHand[0].v}${dealerHand[0].s}\nBet: ${CURRENCY}${fmt(bet)}\n\n➡️ .bank bj hit | stand | double`);
                const canvas = await genBlackjackCard({ playerHand, dealerHand, playerVal, dealerVal, result: null, bet, profit: 0, newBal: bank.balance, txnId: "PENDING", hideDealer: true });
                return replyImage(message, canvas);
            }


            if (!bank.bjGame) return sendError(message, "NO ACTIVE GAME", "Start with: .bank bj <amount>");
            const game = bank.bjGame;
            const { deck: gDeck, playerHand: pH, dealerHand: dH, bet: gBet } = game;

            if (sub === "hit" || sub === "h") {
                pH.push(gDeck.pop());
                const pVal = bjHandVal(pH);
                if (pVal > 21) {

                    bank.bjGame = null;
                    bank.gamesPlayed = (bank.gamesPlayed || 0) + 1;
                    const txnId = genTxnId(), ts = now();
                    pushTxn(bank, { transactionId: txnId, type: "gamble_loss", amount: gBet, newBalance: bank.balance, timestamp: ts });
                    const mr = updateMission(bank, "game");
                    if (mr > 0) { bank.balance += mr; pushTxn(bank, { transactionId: genTxnId(), type: "mission", amount: mr, newBalance: bank.balance, timestamp: ts }); }
                    await usersData.set(senderID, { data: ud.data });
                    if (mode === "text") return message.reply(`🃏 BLACKJACK\n━━━━━━━━━━━━━\n💥 BUST! (${pVal})\nHand: ${bjHandStr(pH)}\n💰 Balance: ${CURRENCY}${fmt(bank.balance)}`);
                    const canvas = await genBlackjackCard({ playerHand: pH, dealerHand: dH, playerVal: pVal, dealerVal: bjHandVal(dH), result: "bust", bet: gBet, profit: -gBet, newBal: bank.balance, txnId, hideDealer: false });
                    return replyImage(message, canvas);
                }
                await usersData.set(senderID, { data: ud.data });
                if (mode === "text") return message.reply(`🃏 BLACKJACK\n━━━━━━━━━━━━━\nYour hand: ${bjHandStr(pH)} (${pVal})\n➡️ .bank bj hit | stand`);
                const canvas = await genBlackjackCard({ playerHand: pH, dealerHand: dH, playerVal: pVal, dealerVal: bjHandVal(dH), result: null, bet: gBet, profit: 0, newBal: bank.balance, txnId: "PENDING", hideDealer: true });
                return replyImage(message, canvas);
            }

            if (sub === "double" || sub === "d") {
                if (bank.balance < gBet) return sendError(message, "NOT ENOUGH BALANCE TO DOUBLE");
                bank.balance -= gBet;
                game.bet = gBet * 2;
                pH.push(gDeck.pop());

            }


            if (sub === "stand" || sub === "s" || sub === "double" || sub === "d") {
                const pVal = bjHandVal(pH);
                if (pVal > 21) {

                    bank.bjGame = null;
                    bank.gamesPlayed = (bank.gamesPlayed || 0) + 1;
                    const txnId = genTxnId(), ts = now();
                    pushTxn(bank, { transactionId: txnId, type: "gamble_loss", amount: game.bet, newBalance: bank.balance, timestamp: ts });
                    await usersData.set(senderID, { data: ud.data });
                    if (mode === "text") return message.reply(`🃏 BUST! (${pVal})\n-${CURRENCY}${fmt(game.bet)}\nBalance: ${CURRENCY}${fmt(bank.balance)}`);
                    const c2 = await genBlackjackCard({ playerHand: pH, dealerHand: dH, playerVal: pVal, dealerVal: bjHandVal(dH), result: "bust", bet: game.bet, profit: -game.bet, newBal: bank.balance, txnId, hideDealer: false });
                    return replyImage(message, c2);
                }

                let dVal = bjHandVal(dH);
                while (dVal < 17) { dH.push(gDeck.pop()); dVal = bjHandVal(dH); }

                let result, profit;
                if (dVal > 21 || pVal > dVal) { result = "win"; profit = game.bet; bank.balance += game.bet * 2; bank.gamesWon = (bank.gamesWon || 0) + 1; }
                else if (pVal === dVal) { result = "push"; profit = 0; bank.balance += game.bet; }
                else { result = "lose"; profit = -game.bet; }

                bank.bjGame = null;
                bank.gamesPlayed = (bank.gamesPlayed || 0) + 1;
                const txnId = genTxnId(), ts = now();
                if (result === "win") pushTxn(bank, { transactionId: txnId, type: "gamble_win", amount: profit, newBalance: bank.balance, timestamp: ts });
                else if (result === "lose") pushTxn(bank, { transactionId: txnId, type: "gamble_loss", amount: game.bet, newBalance: bank.balance, timestamp: ts });
                else pushTxn(bank, { transactionId: txnId, type: "gamble_win", amount: 0, newBalance: bank.balance, timestamp: ts });
                const mr = updateMission(bank, "game");
                if (mr > 0) { bank.balance += mr; pushTxn(bank, { transactionId: genTxnId(), type: "mission", amount: mr, newBalance: bank.balance, timestamp: ts }); }
                await usersData.set(senderID, { data: ud.data });

                const resultEmoji = result === "win" ? "✅ WIN!" : result === "push" ? "🤝 PUSH" : "❌ LOSE";
                if (mode === "text") return message.reply(`🃏 BLACKJACK\n━━━━━━━━━━━━━\nYou: ${bjHandStr(pH)} (${pVal})\nDealer: ${bjHandStr(dH)} (${dVal})\n${resultEmoji}  ${profit >= 0 ? "+" : ""}${CURRENCY}${fmt(profit)}\n💰 Balance: ${CURRENCY}${fmt(bank.balance)}`);
                const canvas = await genBlackjackCard({ playerHand: pH, dealerHand: dH, playerVal: pVal, dealerVal: dVal, result, bet: game.bet, profit, newBal: bank.balance, txnId, hideDealer: false });
                return replyImage(message, canvas);
            }

            return sendError(message, "BJ ACTIONS: hit | stand | double");
        }


        if (action === "roulette" || action === "rt") {
            if (!isReg(ud)) return sendError(message, "NO ACCOUNT");
            if (isFrozen(ud)) return sendError(message, "ACCOUNT FROZEN");
            const bank = ud.data.bank;
            const bet = parseInt(args[1]);
            const betType = (args[2] || "").toLowerCase();
            const validBets = Object.keys(ROULETTE_BETS);

            if (isNaN(bet) || bet < 100) return sendError(message, "USAGE: .bank roulette <amt> <bet>", `Bets: ${validBets.join(" | ")}`);
            if (!validBets.includes(betType)) return sendError(message, "INVALID BET TYPE", `Choose: ${validBets.join(" | ")}`);
            if (bet > GAMBLE_MAX_BET) return sendError(message, `MAX BET: ${CURRENCY}${fmt(GAMBLE_MAX_BET)}`);
            if (bank.balance < bet) return sendError(message, "INSUFFICIENT BALANCE");

            const spin = Math.floor(Math.random() * 37);
            const betInfo = ROULETTE_BETS[betType];
            const isWin = betInfo.check(spin);
            const profit = isWin ? bet * (betInfo.payout - 1) : 0;
            const txnId = genTxnId(), ts = now();
            bank.gamesPlayed = (bank.gamesPlayed || 0) + 1;
            const mr = updateMission(bank, "game");

            if (isWin) {
                bank.balance += profit;
                bank.gamesWon = (bank.gamesWon || 0) + 1;
                pushTxn(bank, { transactionId: txnId, type: "gamble_win", amount: profit, newBalance: bank.balance, timestamp: ts });
            } else {
                bank.balance -= bet;
                pushTxn(bank, { transactionId: txnId, type: "gamble_loss", amount: bet, newBalance: bank.balance, timestamp: ts });
            }
            if (mr > 0) { bank.balance += mr; pushTxn(bank, { transactionId: genTxnId(), type: "mission", amount: mr, newBalance: bank.balance, timestamp: ts }); }
            await usersData.set(senderID, { data: ud.data });

            const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(spin);
            const numStr = spin === 0 ? "🟢 0" : isRed ? `🔴 ${spin}` : `⚫ ${spin}`;
            if (mode === "text") return message.reply(`🎡 ROULETTE\n━━━━━━━━━━━━━\n🎯 Spin: ${numStr}\n📌 Bet: ${betInfo.label}\n${isWin ? `✅ WIN! +${CURRENCY}${fmt(profit)}` : `❌ LOSE! -${CURRENCY}${fmt(bet)}`}\n💰 Balance: ${CURRENCY}${fmt(bank.balance)}`);
            const canvas = await genRouletteCard({ spin, betType, bet, isWin, profit: isWin ? profit : bet, newBal: bank.balance, txnId });
            return replyImage(message, canvas);
        }

        return sendError(message, "UNKNOWN COMMAND", `Type .bank for menu`);
    }
};
