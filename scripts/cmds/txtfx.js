"use strict";

const axios        = require("axios");
const { Readable } = require("stream");

const SIFAT_CHUDTESE = "https://raw.githubusercontent.com/MYB-SIFU/SIFATChudtese/refs/heads/main/sifatapichudtese.json";
const SIFU_FALLBACK  = "";
const MAX_CHARS      = 60;
const MAX_MULTI      = 4;

let _S1FU_BASE = null;

async function S1FU_resolveBase() {
    if (_S1FU_BASE) return _S1FU_BASE;
    try {
        const res     = await axios.get(SIFAT_CHUDTESE, { timeout: 10000 });
        const raw     = (typeof res.data === "string" ? res.data : JSON.stringify(res.data)).replace(/,\s*([}\]])/g, "$1");
        _S1FU_BASE    = (JSON.parse(raw).txtfx || "").replace(/\/+$/, "");
        if (!_S1FU_BASE) throw new Error("empty");
    } catch (_) { _S1FU_BASE = SIFU_FALLBACK; }
    return _S1FU_BASE;
}

const SIFU_EFFECTS = {
  1:{n:"Sunset Light",c:"Neon"},2:{n:"Naruto Style",c:"Neon"},3:{n:"Eroded Metal",c:"Metal"},
  4:{n:"Bronze Glitter",c:"Glitter"},5:{n:"Silver Glitter",c:"Glitter"},6:{n:"Purple Glitter",c:"Glitter"},
  7:{n:"Blue Glitter",c:"Glitter"},8:{n:"Hexa Golden",c:"Metal"},9:{n:"Hot Metal",c:"Metal"},
  10:{n:"Purple Gem",c:"Glass"},11:{n:"Metal Rainbow",c:"Metal"},12:{n:"Sci-Fi",c:"Sci-Fi"},
  13:{n:"Wood",c:"Nature"},14:{n:"Bagel",c:"Food"},15:{n:"Biscuit",c:"Food"},
  16:{n:"Abstra Gold",c:"Metal"},17:{n:"Rusty Metal",c:"Metal"},18:{n:"Fruit Juice",c:"Food"},
  19:{n:"Ice Cold",c:"Nature"},20:{n:"Marble",c:"Nature"},21:{n:"Horror Gift",c:"Horror"},
  22:{n:"Plastic Bag",c:"Horror"},23:{n:"Honey",c:"Food"},24:{n:"Christmas Gift",c:"Seasonal"},
  25:{n:"Break Wall",c:"3D"},26:{n:"Drop Water",c:"Nature"},27:{n:"Advanced Glow",c:"Neon"},
  28:{n:"Green Neon",c:"Neon"},29:{n:"Bokeh",c:"Neon"},30:{n:"Deluxe Silver",c:"Metal"},
  31:{n:"Road Warning",c:"Horror"},32:{n:"Neon",c:"Neon"},33:{n:"3D Box",c:"3D"},
  34:{n:"Thunder",c:"Neon"},35:{n:"Neon Light",c:"Neon"},36:{n:"Blood Text",c:"Horror"},
  37:{n:"Matrix Hack",c:"Sci-Fi"},38:{n:"Bread",c:"Food"},39:{n:"Koi Fish",c:"Nature"},
  40:{n:"Strawberry",c:"Food"},41:{n:"Chocolate Cake",c:"Food"},42:{n:"Colour Glass",c:"Glass"},
  43:{n:"Purple Glass",c:"Glass"},44:{n:"Cyan Jewelry",c:"Glass"},45:{n:"Red Jewelry",c:"Glass"},
  46:{n:"Toxic",c:"Horror"},47:{n:"Rainbow EQ",c:"Neon"},48:{n:"Robot R2-D2",c:"Sci-Fi"},
  49:{n:"Captain America",c:"3D"},50:{n:"Purple Shiny Glass",c:"Glass"},51:{n:"Blue Glass",c:"Glass"},
  52:{n:"Orange Glass",c:"Glass"},53:{n:"Yellow Glass",c:"Glass"},54:{n:"Lava",c:"Horror"},
  55:{n:"Rock",c:"Nature"},56:{n:"Peridot Stone",c:"Nature"},57:{n:"Decorate Purple",c:"Glass"},
  58:{n:"Denim",c:"Nature"},59:{n:"Steel",c:"Metal"},60:{n:"Gold Foil Balloon",c:"3D"},
  61:{n:"Green Foil Balloon",c:"3D"},62:{n:"Purple Foil Balloon",c:"3D"},63:{n:"Skeleton",c:"Horror"},
  64:{n:"Fireworks Sparkle",c:"Neon"},65:{n:"Natural Leaves",c:"Nature"},66:{n:"Wicker",c:"Nature"},
  67:{n:"Joker Logo",c:"Horror"},68:{n:"Wolf Logo Galaxy",c:"Sci-Fi"},69:{n:"Lion Logo",c:"3D"},
  70:{n:"Metal Dark Gold",c:"Metal"},71:{n:"Halloween Fire",c:"Horror"},72:{n:"Frosted Blood",c:"Horror"},
  73:{n:"Christmas 3D",c:"Seasonal"},74:{n:"3D Metal Galaxy",c:"3D"},75:{n:"3D Metal Gold",c:"3D"},
  76:{n:"3D Metal Rose Gold",c:"3D"},77:{n:"3D Metal Silver",c:"3D"},78:{n:"New Year Firework",c:"Seasonal"},
  79:{n:"New Year 3D",c:"Seasonal"},80:{n:"Neon Glow",c:"Neon"},81:{n:"Deluxe Gold",c:"Metal"},
  82:{n:"Glossy Carbon",c:"Metal"},83:{n:"3D Holographic",c:"3D"},84:{n:"Minion 3D",c:"3D"},
  85:{n:"Retro 1917",c:"Metal"},86:{n:"Neon Galaxy",c:"Neon"},87:{n:"Dark Gold Metal",c:"Metal"},
  88:{n:"3D Glue",c:"3D"},89:{n:"Summer Sand",c:"Nature"},90:{n:"Sand Engraved",c:"Nature"},
  91:{n:"Sand Writing",c:"Nature"},92:{n:"Sand Beach",c:"Nature"},93:{n:"Cloud Sky",c:"Nature"},
  94:{n:"Christmas Snow",c:"Seasonal"},95:{n:"Graffiti Art",c:"Neon"},96:{n:"Underwater 3D",c:"Nature"},
  97:{n:"Watercolor",c:"Nature"},98:{n:"Multicolor Paper",c:"3D"},99:{n:"3D Glossy Metal",c:"3D"},
  100:{n:"3D Gradient",c:"3D"},101:{n:"Art Paper Cut",c:"3D"},102:{n:"Broken Glass",c:"Glass"},
  103:{n:"Cracked Surface",c:"3D"},104:{n:"Harry Potter",c:"3D"},105:{n:"Glitch Glass",c:"Glass"},
  106:{n:"3D Neon Light",c:"Neon"},107:{n:"3D Stone Cracked",c:"3D"},108:{n:"Thunderstorm",c:"Neon"},
  109:{n:"Berry",c:"Food"},110:{n:"Transformer",c:"Sci-Fi"},111:{n:"Green Horror",c:"Horror"},
  112:{n:"Advance Glow",c:"Neon"},113:{n:"Neon Pink",c:"Neon"},114:{n:"Christmas Holiday",c:"Seasonal"},
  115:{n:"3D Christmas",c:"Seasonal"},116:{n:"Candy Cane",c:"Seasonal"},117:{n:"Christmas Tree",c:"Seasonal"},
  118:{n:"Christmas Gift",c:"Seasonal"},119:{n:"Road Warning 2",c:"Horror"},120:{n:"Horror Blood",c:"Horror"},
  121:{n:"3D Sci-Fi",c:"Sci-Fi"},122:{n:"3D Sci-Fi 2",c:"Sci-Fi"},123:{n:"3D Gradient 2",c:"3D"},
  124:{n:"Plastic Bag 2",c:"Horror"},125:{n:"Space Text",c:"Sci-Fi"},126:{n:"Robot",c:"Sci-Fi"},
  127:{n:"Peridot",c:"Nature"},128:{n:"Gold Foil Balloon 2",c:"3D"},129:{n:"Green Foil Balloon 2",c:"3D"},
  130:{n:"Koi Fish 2",c:"Nature"},131:{n:"Neon Light 2",c:"Neon"},132:{n:"Wolf Galaxy",c:"Sci-Fi"},
  133:{n:"3D Metal",c:"3D"},134:{n:"Summery Sand",c:"Nature"},135:{n:"Sand 3D",c:"Nature"},
  136:{n:"Blue Gem",c:"Glass"},137:{n:"Biscuit 2",c:"Food"},138:{n:"Chocolate",c:"Food"},
  139:{n:"Pink Candy",c:"Food"},140:{n:"Honey 2",c:"Food"},141:{n:"Bagel 2",c:"Food"},
  142:{n:"Strawberry 2",c:"Food"},143:{n:"Bread 2",c:"Food"},144:{n:"Orange Juice 3D",c:"Food"},
  145:{n:"Berry 2",c:"Food"},146:{n:"Eroded Metal 2",c:"Metal"},147:{n:"Bronze",c:"Metal"},
  148:{n:"Marble 2",c:"Nature"},149:{n:"Hexa Gold",c:"Metal"},150:{n:"Purple Glitter 2",c:"Glitter"},
  151:{n:"Cyan Jewelry",c:"Glass"},152:{n:"Orange Jewelry",c:"Glass"},153:{n:"Red Jewelry 2",c:"Glass"},
  154:{n:"Abstra Gold 2",c:"Metal"},155:{n:"Silver Glitter 2",c:"Glitter"},156:{n:"Gold Glitter",c:"Glitter"},
  157:{n:"Blue Glitter 2",c:"Glitter"},158:{n:"Purple Gem 2",c:"Glass"},159:{n:"Sci-Fi Classic",c:"Sci-Fi"},
  160:{n:"3D Sci-Fi Classic",c:"Sci-Fi"},161:{n:"Science Fiction",c:"Sci-Fi"},162:{n:"Fruit Juice 2",c:"Food"},
  163:{n:"3D Steel",c:"Metal"},164:{n:"3D Box 2",c:"3D"},165:{n:"3D Gradient Alt",c:"3D"},
  166:{n:"3D Rainbow",c:"3D"},167:{n:"Matrix",c:"Sci-Fi"},168:{n:"Neon Blackpink",c:"Neon"},
  169:{n:"Green Neon 2",c:"Neon"},170:{n:"Glitch",c:"Sci-Fi"},171:{n:"Thunder 2",c:"Neon"},
  172:{n:"Glitch 2",c:"Sci-Fi"},173:{n:"Metal Galaxy",c:"Metal"},174:{n:"Rusted Metal",c:"Metal"},
  175:{n:"3D Golden",c:"3D"},176:{n:"3D Luxury Metallic",c:"3D"},177:{n:"Deluxe Gold 2",c:"Metal"},
  178:{n:"3D Silver Metal",c:"3D"},179:{n:"Metal Rainbow 2",c:"Metal"},180:{n:"Rose Gold",c:"Metal"},
  181:{n:"Night Party",c:"Neon"},182:{n:"Night Party 2",c:"Neon"},
};

const SIFU_CAT_EMOJI = { Neon:"💠",Metal:"⚙️","3D":"🎯",Glass:"🔷",Glitter:"✨",Nature:"🌿",Horror:"💀","Sci-Fi":"🚀",Food:"🍓",Seasonal:"🎄" };

const SIFAT_CAT_ALIAS = {
  scifi:"Sci-Fi","sci-fi":"Sci-Fi","3d":"3D","3":"3D",
  glitter:"Glitter",metal:"Metal",glass:"Glass",nature:"Nature",
  horror:"Horror",neon:"Neon",food:"Food",seasonal:"Seasonal",xmas:"Seasonal",christmas:"Seasonal"
};

const sc = s => String(s).toLowerCase().split("").map(c=>{ const i=c.charCodeAt(0)-97; return(i>=0&&i<26)?"ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ"[i]:c; }).join("");

const S1FU_byCat   = cat => Object.entries(SIFU_EFFECTS).filter(([,v])=>v.c===cat);
const S1FU_resCat  = raw => { if(!raw) return null; const l=raw.toLowerCase(); return SIFAT_CAT_ALIAS[l]||(raw[0].toUpperCase()+raw.slice(1)); };
const S1FU_randCat = cat => { const e=S1FU_byCat(cat); return e.length?parseInt(e[Math.floor(Math.random()*e.length)][0]):null; };
const S1FU_randAny = ()  => { const k=Object.keys(SIFU_EFFECTS); return parseInt(k[Math.floor(Math.random()*k.length)]); };
const S1FU_search  = q   => Object.entries(SIFU_EFFECTS).filter(([,v])=>v.n.toLowerCase().includes(q.toLowerCase())||v.c.toLowerCase().includes(q.toLowerCase())).slice(0,15);

const TOP = [32,80,113,81,75,34,47,104,95,83,86,176,168,64,36];
const RULE = "───────────────────────";

async function SIFU_fetchImg(text, id) {
    const base = await S1FU_resolveBase();
    const url  = `${base}/api/generate?text=${encodeURIComponent(text)}&number=${id}`;
    const opts = { responseType:"arraybuffer", timeout:45000, headers:{"Accept":"image/*"} };
    try {
        const res = await axios.get(url, opts);
        if (!res.headers["content-type"]?.includes("image") && res.data.byteLength < 100) throw new Error("bad");
        return Buffer.from(res.data);
    } catch (_) {
        await new Promise(r => setTimeout(r, 2000));
        const res = await axios.get(url, opts);
        return Buffer.from(res.data);
    }
}

function S1FU_toStream(buf, id) {
    const s = new Readable(); s.push(buf); s.push(null); s.path = `tf_${id}.png`; return s;
}

async function SIFU_generate(api, message, ids, text) {
    const isMulti = ids.length > 1;
    let wait;
    try { wait = await message.reply(`⏳ ${sc(isMulti ? `generating ${ids.length} effects...` : `generating #${ids[0]} — ${SIFU_EFFECTS[ids[0]].n}...`)}`); } catch(_) {}

    const results = await Promise.allSettled(ids.map(id => SIFU_fetchImg(text, id).then(buf=>({id,buf}))));
    if (wait?.messageID) try { api.unsendMessage(wait.messageID); } catch(_) {}

    const ok   = results.filter(r=>r.status==="fulfilled").map(r=>r.value);
    const fail = results.filter(r=>r.status==="rejected").length;

    if (!ok.length) return message.reply(`❌ ${sc("all effects failed — try again later")}`);

    const atts = ok.map(({id,buf})=>S1FU_toStream(buf,id));
    let body;

    if (isMulti) {
        body = [
            `╔══[ ${sc(`multi fx — ${ok.length}/${ids.length} done`)} ]`,
            RULE,
            ...ok.map(({id})=>{ const e=SIFU_EFFECTS[id]; return `  ${SIFU_CAT_EMOJI[e.c]||"🎨"} #${String(id).padStart(3,"0")} │ ${e.n} [${e.c}]`; }),
            `› ${sc("text")}: ${text}`,
            fail ? `⚠️ ${sc(`${fail} failed`)}` : null,
            RULE, sc("✦ POWDER BY 🦖 Your name"),
        ].filter(Boolean).join("\n");
    } else {
        const e = SIFU_EFFECTS[ok[0].id];
        body = [
            `╔══[ ${sc(`text fx — #${ok[0].id} ${e.n}`)} ]`,
            RULE,
            `› ${sc("style")}: ${SIFU_CAT_EMOJI[e.c]||"🎨"} ${e.c}`,
            `› ${sc("text")}: ${text}`,
            `› ${sc("chars")}: ${text.length}/${MAX_CHARS}`,
            RULE, sc("✦ POWDER BY 🐳 your name"),
        ].join("\n");
    }

    await message.reply({ body, attachment: atts });
}

module.exports = {
    config: {
        name: "textfx", aliases: ["tx","txtfx","tf"],
        version: "2.0", author: "SIFAT", countDown: 5, role: 0,
        shortDescription: { en: "182 stylish text effect images" },
        longDescription:  { en: "Generate stylish 3D/neon/metal/glitter text images." },
        category: "editor",
        guide: { en: "{pn} <1-182> <text> | {pn} random [cat] <text> | {pn} list [cat] | {pn} search <kw> | {pn} top" }
    },

    onStart: async function({ api, event, args, message, prefix }) {
        try { api.setMessageReaction("✨", event.messageID, ()=>{}, true); } catch(_) {}

        const replyText = event.messageReply?.body?.trim() || "";
        if (!args[0]) return message.reply(
            `╔══[ ${sc("textfx — help")} ]\n${RULE}\n` +
            `› tf <1-182> <text>\n› tf 1,5,32 <text>  (max ${MAX_MULTI})\n› tf random <text>\n› tf random <cat> <text>\n› tf list / tf list <cat>\n› tf search <keyword>\n› tf top\n💡 Reply any msg + tf <n>\n${RULE}\n` +
            Object.entries(SIFU_CAT_EMOJI).map(([c,e])=>`  ${e} ${sc(c).padEnd(12)} ${S1FU_byCat(c).length} effects`).join("\n")
        );

        const cmd = args[0].toLowerCase();

        if (cmd === "list") {
            const cat = S1FU_resCat(args[1]);
            if (!cat) {
                return message.reply(
                    `╔══[ ${sc("categories")} ]\n${RULE}\n` +
                    Object.entries(SIFU_CAT_EMOJI).map(([c,e])=>`  ${e} ${sc(c).padEnd(12)} ${S1FU_byCat(c).length}`).join("\n") +
                    `\n${RULE}\n${sc("use: tf list <category>")}`
                );
            }
            const list = S1FU_byCat(cat);
            if (!list.length) return message.reply(`❌ ${sc(`no category "${args[1]}" found`)}`);
            return message.reply(
                `╔══[ ${SIFU_CAT_EMOJI[cat]||"🎨"} ${sc(cat)} — ${list.length} effects ]\n${RULE}\n` +
                list.map(([id,v])=>`  #${String(id).padStart(3,"0")} │ ${v.n}`).join("\n") +
                `\n${RULE}\n${sc(`tip: tf random ${args[1]||cat} <text>`)}`
            );
        }

        if (cmd === "search") {
            const q = args.slice(1).join(" ").trim();
            if (!q) return message.reply(`⚠️ ${sc("provide a keyword")}`);
            const found = S1FU_search(q);
            if (!found.length) return message.reply(`❌ ${sc(`no results for "${q}"`)}`);
            return message.reply(
                `╔══[ ${sc(`search: "${q}" — ${found.length} found`)} ]\n${RULE}\n` +
                found.map(([id,v])=>`  ${SIFU_CAT_EMOJI[v.c]||"🎨"} #${String(id).padStart(3,"0")} │ ${v.n} [${v.c}]`).join("\n") +
                `\n${RULE}\n${sc("use: tf <number> <text>")}`
            );
        }

        if (cmd === "top" || cmd === "best") {
            return message.reply(
                `╔══[ ${sc("top picks")} ]\n${RULE}\n` +
                TOP.map(id=>{ const e=SIFU_EFFECTS[id]; return `  ${SIFU_CAT_EMOJI[e.c]||"🎨"} #${String(id).padStart(3,"0")} │ ${e.n} [${e.c}]`; }).join("\n") +
                `\n${RULE}\n${sc("use: tf <number> <text>")}`
            );
        }

        if (cmd === "help" || cmd === "h") {
            return message.reply(`${sc("tf <1-182> <text> | tf random [cat] <text> | tf list [cat] | tf search <kw> | tf top")}`);
        }

        if (["random","rand","r"].includes(cmd)) {
            const potCat = S1FU_resCat(args[1]);
            const hasCat = potCat && SIFU_CAT_EMOJI[potCat];
            const id     = hasCat ? S1FU_randCat(potCat) : S1FU_randAny();
            const text   = (hasCat ? args.slice(2) : args.slice(1)).join(" ").trim() || replyText;
            if (!id) return message.reply(`❌ ${sc(`no effects in "${args[1]}"`)}`);
            if (!text) return message.reply(`⚠️ ${sc("provide text to stylize")}`);
            if (text.length > MAX_CHARS) return message.reply(`⚠️ ${sc(`max ${MAX_CHARS} chars`)}`);
            return SIFU_generate(api, message, [id], text);
        }

        if (/^[\d,]+$/.test(args[0])) {
            const ids  = [...new Set(args[0].split(",").map(s=>parseInt(s.trim())).filter(n=>!isNaN(n)&&SIFU_EFFECTS[n]))].slice(0,MAX_MULTI);
            if (!ids.length) return message.reply(`❌ ${sc("invalid effect id(s). use 1-182")}`);
            const text = args.slice(1).join(" ").trim() || replyText;
            if (!text) return message.reply(`⚠️ ${sc("provide text to stylize")}`);
            if (text.length > MAX_CHARS) return message.reply(`⚠️ ${sc(`max ${MAX_CHARS} chars (you have ${text.length})`)}`);
            return SIFU_generate(api, message, ids, text);
        }

        const id = parseInt(args[0]);
        if (isNaN(id) || !SIFU_EFFECTS[id]) return message.reply(`❌ ${sc(`"${args[0]}" is not valid. use 1-182 or "tf help"`)}`);
        const text = args.slice(1).join(" ").trim() || replyText;
        if (!text) return message.reply(`⚠️ ${sc("provide text to stylize")}`);
        if (text.length > MAX_CHARS) return message.reply(`⚠️ ${sc(`max ${MAX_CHARS} chars`)}`);
        return SIFU_generate(api, message, [id], text);
    }
};
