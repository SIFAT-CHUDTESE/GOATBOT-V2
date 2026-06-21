<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=220&section=header&text=GoatBot%20V2&fontSize=70&fontColor=fff&animation=twinkling&fontAlignY=35&desc=Complete%20Hosting%20Guide%20%E2%80%94%20All%20Platforms%20A%20to%20Z&descAlignY=60&descSize=20" width="100%"/>

<br/>


![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=0d1117)


</div>

---

## 📋 Table of Contents

| # | Platform | Type | Cost |
|:---:|:---:|:---:|:---:|
| 1 | [🚂 Railway](#-1-railway) | Cloud PaaS | Free / Paid |
| 2 | [🎨 Render](#-2-render) | Cloud PaaS | Free / Paid |
| 3 | [☁️ Heroku](#️-3-heroku) | Cloud PaaS | Paid |
| 4 | [🌊 DigitalOcean VPS](#-4-digitalocean-vps) | VPS | Paid |
| 5 | [🖥️ Contabo VPS](#️-5-contabo-vps) | VPS | Paid (Cheap) |
| 6 | [🟢 Koyeb](#-6-koyeb) | Cloud PaaS | Free / Paid |
| 7 | [🔵 Replit](#-7-replit) | Cloud IDE | Free / Paid |
| 8 | [📱 Termux (Android)](#-8-termux-android) | Local (Mobile) | Free |

---

## ⚡ Quick Comparison

```
╔══════════════╦══════════╦═══════════╦══════════════╦══════════════╗
║  Platform    ║  Free?   ║  24/7?    ║  Difficulty  ║  Best For    ║
╠══════════════╬══════════╬═══════════╬══════════════╬══════════════╣
║  Railway     ║  ✅ Yes  ║  ✅ Yes   ║  ⭐ Easy     ║  Beginners   ║
║  Render      ║  ✅ Yes  ║  ⚠️ Sleep ║  ⭐ Easy     ║  Testing     ║
║  Heroku      ║  ❌ No   ║  ✅ Yes   ║  ⭐⭐ Medium  ║  Stable      ║
║  DigitalOcean║  ❌ No   ║  ✅ Yes   ║  ⭐⭐⭐ Hard  ║  Production  ║
║  Contabo VPS ║  ❌ No   ║  ✅ Yes   ║  ⭐⭐⭐ Hard  ║  Budget VPS  ║
║  Koyeb       ║  ✅ Yes  ║  ✅ Yes   ║  ⭐ Easy     ║  Beginners   ║
║  Replit      ║  ✅ Yes  ║  ⚠️ Sleep ║  ⭐ Easy     ║  Quick Test  ║
║  Termux      ║  ✅ Yes  ║  ⚠️ Phone ║  ⭐⭐ Medium  ║  Mobile Test ║
╚══════════════╩══════════╩═══════════╩══════════════╩══════════════╝
```

---

<br/>

## 🚂 #1 Railway

<div align="center">
<img src="https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white"/>
&nbsp;
<img src="https://img.shields.io/badge/Free%20Plan-Available-brightgreen?style=for-the-badge"/>
&nbsp;
<img src="https://img.shields.io/badge/Difficulty-Easy-00D9FF?style=for-the-badge"/>
</div>

<br/>

> Railway is the **#1 recommended** platform for GoatBot V2. It is simple, reliable, and offers a generous free plan with no sleep/idle issues.

### 💰 Pricing
| Plan | Price | Resources |
|------|-------|-----------|
| Free (Trial) | $0 — $5 one-time credit | 512MB RAM, Shared CPU |
| Hobby | $5/month | 8GB RAM, Shared CPU |
| Pro | $20/month | More resources + priority |

### 📋 Prerequisites
- [ ] A [Railway](https://railway.app) account (sign up with GitHub)
- [ ] Your bot files ready (GoatBot V2)
- [ ] A GitHub repository with your bot code
- [ ] Facebook App Token

### 🛠️ Step-by-Step Setup

**Step 1 — Push your bot to GitHub**
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/your-bot.git
git push -u origin main
```

**Step 2 — Create Railway project**
```
1. Go to https://railway.app
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Choose your bot repository
5. Railway will auto-detect Node.js
```

**Step 3 — Set Environment Variables**
```
In Railway Dashboard:
→ Click your project
→ Go to "Variables" tab
→ Add the following:
```
```env
NODE_ENV=production
TZ=Asia/Dhaka
```

**Step 4 — Configure Start Command**
```
→ Go to Settings → Deploy
→ Set Start Command:
   node index.js
```

**Step 5 — Deploy**
```
→ Railway will auto-deploy from your GitHub main branch
→ Every git push = auto redeploy ✅
```

**Step 6 — Check Logs**
```
→ Click on your service
→ Go to "Logs" tab
→ Watch for: "Bot started successfully ✅"
```

### ✅ Pros & ❌ Cons
```
✅ No sleep on free plan
✅ GitHub auto-deploy
✅ Easy environment variables
✅ Good free tier
❌ Free credit runs out (~1 month)
❌ Need credit card for Hobby plan
```

---

<br/>

## 🎨 #2 Render

<div align="center">
<img src="https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black"/>
&nbsp;
<img src="https://img.shields.io/badge/Free%20Plan-Available-brightgreen?style=for-the-badge"/>
&nbsp;
<img src="https://img.shields.io/badge/Difficulty-Easy-00D9FF?style=for-the-badge"/>
</div>

<br/>

> Render is a user-friendly cloud platform. The **free plan sleeps after 15 minutes of inactivity**, but is great for testing and development.

### 💰 Pricing
| Plan | Price | Notes |
|------|-------|-------|
| Free | $0 | Sleeps after 15 min idle |
| Starter | $7/month | No sleep, 512MB RAM |
| Standard | $25/month | 2GB RAM |

### 📋 Prerequisites
- [ ] A [Render](https://render.com) account
- [ ] GitHub repository with bot code
- [ ] `package.json` with correct start script

### 🛠️ Step-by-Step Setup

**Step 1 — Prepare package.json**
```json
{
  "name": "goatbot-v2",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js"
  },
  "engines": {
    "node": "18.x"
  }
}
```

**Step 2 — Create a Web Service on Render**
```
1. Go to https://render.com → Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub account
4. Select your bot repository
```

**Step 3 — Configure the Service**
```
Name:          goatbot-v2
Environment:   Node
Region:        Singapore (closest to BD)
Branch:        main
Build Command: npm install
Start Command: npm start
```

**Step 4 — Add Environment Variables**
```
→ Scroll down to "Environment Variables"
→ Add:
   NODE_ENV = production
   TZ = Asia/Dhaka
```

**Step 5 — Deploy**
```
→ Click "Create Web Service"
→ Wait for build to finish (~2-3 min)
→ Check logs for success message
```

**Step 6 — Prevent Sleep (Free Plan)**
> Use a free uptime service to ping your Render URL every 10 minutes:
```
→ Go to https://uptimerobot.com (free)
→ Add a monitor → HTTP(S)
→ Enter your Render URL
→ Set interval: 10 minutes
→ This prevents the 15-min sleep ✅
```

### ✅ Pros & ❌ Cons
```
✅ Truly free forever
✅ GitHub auto-deploy
✅ Easy to use
❌ Sleeps on free plan (fixable with UptimeRobot)
❌ Slow cold start after sleep
```

---

<br/>

## ☁️ #3 Heroku

<div align="center">
<img src="https://img.shields.io/badge/Heroku-430098?style=for-the-badge&logo=heroku&logoColor=white"/>
&nbsp;
<img src="https://img.shields.io/badge/Free%20Plan-Removed-red?style=for-the-badge"/>
&nbsp;
<img src="https://img.shields.io/badge/Difficulty-Medium-orange?style=for-the-badge"/>
</div>

<br/>

> Heroku is a well-known cloud platform. **Free plan was removed in 2022.** Minimum cost is $5/month. Very stable and developer-friendly.

### 💰 Pricing
| Plan | Price | Resources |
|------|-------|-----------|
| Basic | $5/month | 512MB RAM, 1 Dyno |
| Standard-1X | $25/month | 512MB RAM |
| Standard-2X | $50/month | 1GB RAM |

### 📋 Prerequisites
- [ ] [Heroku](https://heroku.com) account
- [ ] [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- [ ] Git installed
- [ ] Credit card added to Heroku

### 🛠️ Step-by-Step Setup

**Step 1 — Install Heroku CLI**
```bash
# Windows
winget install --id=Heroku.HerokuCLI

# macOS
brew tap heroku/brew && brew install heroku

# Linux
curl https://cli-assets.heroku.com/install.sh | sh
```

**Step 2 — Login and Create App**
```bash
heroku login
heroku create your-goatbot-app
```

**Step 3 — Create Procfile**
> Create a file named `Procfile` (no extension) in your bot folder:
```
worker: node index.js
```

**Step 4 — Set Node.js Version**
```json
// In package.json, add:
"engines": {
  "node": "18.x"
}
```

**Step 5 — Deploy**
```bash
git add .
git commit -m "deploy to heroku"
git push heroku main
```

**Step 6 — Start Worker Dyno**
```bash
heroku ps:scale worker=1
heroku logs --tail
```

**Step 7 — Set Environment Variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set TZ=Asia/Dhaka
```

### ✅ Pros & ❌ Cons
```
✅ Very stable and reliable
✅ Easy GitHub integration
✅ Good logging system
❌ No free plan anymore
❌ Expensive compared to VPS
```

---

<br/>

## 🌊 #4 DigitalOcean VPS

<div align="center">
<img src="https://img.shields.io/badge/DigitalOcean-0080FF?style=for-the-badge&logo=digitalocean&logoColor=white"/>
&nbsp;
<img src="https://img.shields.io/badge/Free%20Plan-No-red?style=for-the-badge"/>
&nbsp;
<img src="https://img.shields.io/badge/Difficulty-Advanced-red?style=for-the-badge"/>
</div>

<br/>

> DigitalOcean Droplets (VPS) give you **full control** over your server. Best for **production bots** that need to run 24/7 reliably. No sleep, no downtime.

### 💰 Pricing
| Plan | Price | Resources |
|------|-------|-----------|
| Basic Droplet | $4/month | 512MB RAM, 1 vCPU, 10GB SSD |
| Regular | $6/month | 1GB RAM, 1 vCPU, 25GB SSD |
| Regular | $12/month | 2GB RAM, 2 vCPU, 50GB SSD |

### 📋 Prerequisites
- [ ] [DigitalOcean](https://digitalocean.com) account + credit card
- [ ] Basic Linux terminal knowledge
- [ ] SSH client (built-in on Mac/Linux, PuTTY on Windows)

### 🛠️ Step-by-Step Setup

**Step 1 — Create a Droplet**
```
1. Log in to DigitalOcean
2. Click "Create" → "Droplets"
3. Choose:
   - Image: Ubuntu 22.04 LTS
   - Plan: Basic → $6/month (1GB RAM)
   - Region: Singapore (closest to BD)
   - Authentication: SSH Key or Password
4. Click "Create Droplet"
```

**Step 2 — Connect via SSH**
```bash
# Replace with your Droplet IP
ssh root@YOUR_DROPLET_IP

# First time, accept fingerprint with: yes
```

**Step 3 — Update Server & Install Node.js**
```bash
# Update packages
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node -v   # Should show v18.x.x
npm -v    # Should show version
```

**Step 4 — Install Git & Clone Bot**
```bash
apt install -y git

git clone https://github.com/YOUR_USERNAME/your-bot.git
cd your-bot
npm install
```

**Step 5 — Install PM2 (Process Manager)**
```bash
npm install -g pm2

# Start the bot
pm2 start index.js --name "goatbot"

# Auto-start on server reboot
pm2 startup
pm2 save
```

**Step 6 — Useful PM2 Commands**
```bash
pm2 list              # See all running processes
pm2 logs goatbot      # View live logs
pm2 restart goatbot   # Restart bot
pm2 stop goatbot      # Stop bot
pm2 delete goatbot    # Remove from PM2
```

**Step 7 — Update Bot (Pull from GitHub)**
```bash
cd your-bot
git pull origin main
pm2 restart goatbot
```

**Step 8 — Setup Firewall (Security)**
```bash
ufw allow OpenSSH
ufw enable
```

### ✅ Pros & ❌ Cons
```
✅ Full root control
✅ 24/7 no sleep ever
✅ Best performance
✅ Can host multiple bots
❌ Need Linux knowledge
❌ Paid only (from $4/month)
❌ You manage everything yourself
```

---

<br/>

## 🖥️ #5 Contabo VPS

<div align="center">
<img src="https://img.shields.io/badge/Contabo-003366?style=for-the-badge&logo=server&logoColor=white"/>
&nbsp;
<img src="https://img.shields.io/badge/Free%20Plan-No-red?style=for-the-badge"/>
&nbsp;
<img src="https://img.shields.io/badge/Difficulty-Advanced-red?style=for-the-badge"/>
&nbsp;
<img src="https://img.shields.io/badge/Best%20Value-💰 Cheapest VPS-FFD700?style=for-the-badge"/>
</div>

<br/>

> Contabo is the **most affordable VPS provider** on the market. You get **4GB RAM for just ~$5/month** — far more powerful than DigitalOcean's $12 plan. Perfect for running multiple bots.

### 💰 Pricing
| Plan | Price | Resources |
|------|-------|-----------|
| VPS S | ~$5.50/month | 4 vCPU, 6GB RAM, 100GB SSD |
| VPS M | ~$11/month | 6 vCPU, 16GB RAM, 200GB SSD |
| VPS L | ~$17/month | 8 vCPU, 30GB RAM, 400GB SSD |

> ⚠️ **Note:** Contabo charges a one-time setup fee of ~$5 for the first order.

### 🛠️ Step-by-Step Setup

**Step 1 — Order a VPS**
```
1. Go to https://contabo.com
2. Choose "VPS S" (best value for bot hosting)
3. Select:
   - Location: Europe or USA (closest latency)
   - OS: Ubuntu 22.04
4. Complete payment
5. You'll receive an email with IP + root password
```

**Step 2 — Connect & Setup**
```bash
# Connect via SSH
ssh root@YOUR_VPS_IP

# Enter the password from your email
# Then change default password:
passwd
```

**Step 3 — Install Node.js, Git & PM2**
```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs git

npm install -g pm2
```

**Step 4 — Deploy Bot**
```bash
git clone https://github.com/YOUR_USERNAME/your-bot.git
cd your-bot
npm install

pm2 start index.js --name "goatbot"
pm2 startup && pm2 save
```

> 💡 **Tip:** Since Contabo gives 4-6GB RAM, you can run **3-5 bots** simultaneously on the same VPS!

### ✅ Pros & ❌ Cons
```
✅ Cheapest VPS with huge resources
✅ 24/7 uptime, no sleep
✅ Run multiple bots on one server
✅ Full root access
❌ One-time setup fee
❌ Support can be slow
❌ Need Linux knowledge
```

---

<br/>

## 🟢 #6 Koyeb

<div align="center">
<img src="https://img.shields.io/badge/Koyeb-121212?style=for-the-badge&logo=koyeb&logoColor=white"/>
&nbsp;
<img src="https://img.shields.io/badge/Free%20Plan-Available-brightgreen?style=for-the-badge"/>
&nbsp;
<img src="https://img.shields.io/badge/Difficulty-Easy-00D9FF?style=for-the-badge"/>
</div>

<br/>

> Koyeb is a newer cloud platform with a **permanent free tier** that does NOT sleep. Great alternative to Railway.

### 💰 Pricing
| Plan | Price | Resources |
|------|-------|-----------|
| Free | $0 | 512MB RAM, 0.1 vCPU, 2GB storage |
| Starter | $5.50/month | More resources |

### 🛠️ Step-by-Step Setup

**Step 1 — Sign Up**
```
1. Go to https://app.koyeb.com
2. Sign up with GitHub
3. Verify your email
```

**Step 2 — Create a Service**
```
1. Click "Create Service"
2. Choose "GitHub" as source
3. Select your bot repository
4. Branch: main
```

**Step 3 — Configure Build & Run**
```
Builder:       Buildpack (auto-detected)
Run Command:   node index.js
Instance Type: Free
Region:        Washington DC / Frankfurt
```

**Step 4 — Add Environment Variables**
```
→ Scroll to "Environment Variables"
→ Add:
   NODE_ENV = production
   TZ = Asia/Dhaka
```

**Step 5 — Deploy**
```
→ Click "Deploy"
→ Wait 2-3 minutes for build
→ Check "Runtime logs" for success
```

### ✅ Pros & ❌ Cons
```
✅ Free plan doesn't sleep
✅ No credit card required
✅ GitHub auto-deploy
✅ Good for long-term free hosting
❌ Limited resources on free plan
❌ Smaller community/support
```

---

<br/>

## 🔵 #7 Replit

<div align="center">
<img src="https://img.shields.io/badge/Replit-F26207?style=for-the-badge&logo=replit&logoColor=white"/>
&nbsp;
<img src="https://img.shields.io/badge/Free%20Plan-Available-brightgreen?style=for-the-badge"/>
&nbsp;
<img src="https://img.shields.io/badge/Difficulty-Easy-00D9FF?style=for-the-badge"/>
</div>

<br/>

> Replit is a browser-based IDE + hosting platform. Great for **quick testing**. Free repls sleep when inactive, but can be kept alive with UptimeRobot.

### 💰 Pricing
| Plan | Price | Notes |
|------|-------|-------|
| Free | $0 | Sleeps when inactive |
| Core | $20/month | Always-on, no sleep |

### 🛠️ Step-by-Step Setup

**Step 1 — Create a Repl**
```
1. Go to https://replit.com
2. Click "+ Create Repl"
3. Choose "Node.js" template
4. Name it: goatbot-v2
```

**Step 2 — Upload Bot Files**
```
Option A — Import from GitHub:
→ Create Repl → "Import from GitHub"
→ Paste your repo URL

Option B — Upload manually:
→ Drag and drop your bot files into Replit's file panel
```

**Step 3 — Set Run Command**
```
→ Click the "Run" button config (⚙️)
→ Set command: node index.js
```

**Step 4 — Add Secrets (Environment Variables)**
```
→ Click the 🔒 "Secrets" tab (left sidebar)
→ Add your bot token and config values
→ Never put tokens in code files!
```

**Step 5 — Keep Alive (Free Plan)**
```bash
# Install express in your bot
npm install express

# Add this to index.js top:
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000);
```
```
→ Then use UptimeRobot to ping your Replit URL every 5 minutes
→ URL format: https://YOUR-REPL-NAME.YOUR-USERNAME.repl.co
```

**Step 6 — Run the Bot**
```
→ Press the green "Run" button
→ Watch console for bot startup logs
```

### ✅ Pros & ❌ Cons
```
✅ Completely browser-based — no setup
✅ Easy file editing
✅ GitHub import supported
❌ Sleeps on free plan
❌ Slow performance on free
❌ Not suitable for production
```

---

<br/>

## 📱 #8 Termux (Android)

<div align="center">
<img src="https://img.shields.io/badge/Termux-000000?style=for-the-badge&logo=android&logoColor=3DDC84"/>
&nbsp;
<img src="https://img.shields.io/badge/Free%20Plan-100%25 Free-brightgreen?style=for-the-badge"/>
&nbsp;
<img src="https://img.shields.io/badge/Difficulty-Medium-orange?style=for-the-badge"/>
</div>

<br/>

> Run GoatBot V2 directly on your **Android phone** using Termux — completely free. Best for testing and learning. **Not recommended for production** due to phone battery drain and instability.

### 📋 Requirements
- Android phone with **minimum 3GB RAM** (4GB+ recommended)
- Termux app installed from **F-Droid** (NOT Google Play — outdated version)
- Stable internet connection

### 🛠️ Step-by-Step Setup

**Step 1 — Install Termux**
```
1. Download F-Droid from: https://f-droid.org
2. Install F-Droid on your phone
3. Open F-Droid → Search "Termux"
4. Install Termux from F-Droid ✅

⚠️ Do NOT use Google Play Store Termux — it's outdated and broken!
```

**Step 2 — Setup Termux**
```bash
# Update package list
pkg update && pkg upgrade -y

# Install required packages
pkg install nodejs git -y

# Verify
node -v
npm -v
git --version
```

**Step 3 — Clone Your Bot**
```bash
# Clone the bot repository
git clone https://github.com/YOUR_USERNAME/your-bot.git

# Enter bot folder
cd your-bot

# Install dependencies
npm install
```

**Step 4 — Run the Bot**
```bash
# Simple run (stops when you close Termux)
node index.js

# Background run (continues in background)
nohup node index.js > bot.log 2>&1 &

# Check if bot is running
ps aux | grep node

# View logs
tail -f bot.log
```

**Step 5 — Keep Bot Running (Auto-Start)**
```bash
# Install Termux:Boot from F-Droid
# Then create startup script:

mkdir -p ~/.termux/boot
nano ~/.termux/boot/start-bot.sh
```
```bash
# Paste this inside start-bot.sh:
#!/data/data/com.termux/files/usr/bin/sh
cd /data/data/com.termux/files/home/your-bot
nohup node index.js > bot.log 2>&1 &
```
```bash
# Save file: Ctrl+X → Y → Enter
# Make it executable:
chmod +x ~/.termux/boot/start-bot.sh
```
> Now the bot will **auto-start** every time you reboot your phone! ✅

**Step 6 — Prevent Phone from Sleeping**
```
→ Go to Android Settings
→ Battery → Battery Optimization
→ Find "Termux" → Set to "Not Optimized"
→ Also enable "Acquire Wakelock" inside Termux (notification bar)
```

**Step 7 — Useful Commands**
```bash
# Stop bot
pkill -f "node index.js"

# Check RAM usage
free -h

# Check storage
df -h

# Update bot from GitHub
cd your-bot && git pull origin main
```

### ✅ Pros & ❌ Cons
```
✅ 100% free — no money needed
✅ Good for learning and testing
✅ Works on any Android phone
❌ Phone must stay ON and charged
❌ Battery drains fast
❌ Phone gets hot
❌ Not reliable for 24/7 production
❌ Breaks if phone restarts unexpectedly
```

---

## 🔐 Security Best Practices (All Platforms)

```bash
# ✅ NEVER put your bot token in code files
# ✅ Always use environment variables for secrets
# ✅ Add .env to .gitignore before pushing to GitHub
# ✅ Use a separate Facebook account for the bot
# ✅ Regularly update your bot: git pull && npm install
# ✅ Keep backups of your config files
```

**Create `.gitignore` to protect secrets:**
```gitignore
.env
config.json
node_modules/
*.log
appstate.json
```

---

## 🚨 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module` | Missing packages | Run `npm install` |
| `EACCES permission denied` | File permissions | Run `chmod 755 index.js` |
| `Bot keeps disconnecting` | Bad appstate | Refresh Facebook login |
| `Out of memory` | RAM too low | Upgrade plan or use VPS |
| `Port already in use` | Another process | Run `pkill node` then restart |
| `git push rejected` | Branch conflict | Run `git pull` first |

---

## 💡 Pro Tips

```
🔥 Tip 1: Use Railway for FREE 24/7 hosting — best free option overall

🔥 Tip 2: Always use pm2 on VPS — it auto-restarts if the bot crashes

🔥 Tip 3: Store your appstate.json securely — losing it = bot gets logged out

🔥 Tip 4: Set up UptimeRobot (free) to monitor your bot's health 24/7

🔥 Tip 5: Keep your bot repo PRIVATE on GitHub — never expose your token

🔥 Tip 6: Use Contabo VPS if you want the best value for money

🔥 Tip 7: On Termux, always run: wakelock — to prevent Android killing the process
```

---

<div align="center">

<br/>

## 👥 Credits

<table>
  <tr>
    <td align="center" width="50%">
      <a href="https://github.com/ntkhang03">
        <img src="https://avatars.githubusercontent.com/u/81167726?v=4" width="120" style="border-radius:50%;"/><br/><br/>
        <b>NTKhang</b><br/>
        <sub>🏆 Original Owner — GoatBot V2</sub>
      </a>
      <br/><br/>
      <a href="https://github.com/ntkhang03">
        <img src="https://img.shields.io/badge/GitHub-ntkhang03-FFD700?style=for-the-badge&logo=github&logoColor=black"/>
      </a>
    </td>
    <td align="center" width="50%">
      <a href="https://github.com/MYB-SIFU">
        <img src="https://avatars.githubusercontent.com/u/244322298?v=4" width="120" style="border-radius:50%;"/><br/><br/>
        <b>SIFAT</b><br/>
        <sub>⚡ Developer — Advanced & Improved</sub>
      </a>
      <br/><br/>
      <a href="https://github.com/MYB-SIFU">
        <img src="https://img.shields.io/badge/GitHub-MYB--SIFU-00D9FF?style=for-the-badge&logo=github&logoColor=black"/>
      </a>
    </td>
  </tr>
</table>

<br/>

[![Star](https://img.shields.io/badge/⭐_Star_This_Project-FFD700?style=for-the-badge&logo=github&logoColor=black)](https://github.com/MYB-SIFU/GOATBOT-V2)

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer&animation=twinkling" width="100%"/>

**Made with ❤️ by [SIFAT](https://github.com/MYB-SIFU) | Based on [GoatBot V2](https://github.com/ntkhang03/Goat-Bot-V2) by [NTKhang](https://github.com/ntkhang03)**

</div>
