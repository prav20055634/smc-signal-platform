# 🚀 SMC Signal Platform — Complete Setup Guide
## For Windows · Python 3.11+ · Node.js 20+

---

## ⏱️ REALISTIC TIME ESTIMATE (1 Person)

| Phase | Task | Time |
|-------|------|------|
| Day 1 Morning | Install tools, run setup script, start the app | 2–3 hours |
| Day 1 Afternoon | Understand the signals, watch them live | 2 hours |
| Day 2 | Tweak thresholds, test on different pairs | 2–3 hours |
| Day 3+ | Add remote access (ngrok/VPS) | 2–4 hours |

**Total: 1–3 days for a single person with basic PC knowledge.**
If you hit errors, each fix is usually 5–15 minutes using the Error Guide below.

---

## 📁 FOLDER STRUCTURE

```
crypto-signal-platform/
├── backend/
│   ├── core/
│   │   ├── config.py          ← All settings (pairs, thresholds, timeframes)
│   │   └── models.py          ← Signal & snapshot data shapes
│   ├── data/
│   │   ├── fetcher.py         ← Binance REST + WebSocket data
│   │   └── store.py           ← In-memory data store
│   ├── strategies/
│   │   ├── indicators.py      ← BOS, CHOCH, OB, FVG, Liquidity, Fib
│   │   └── smc_strategy.py    ← Main SMC signal engine
│   ├── scanner/
│   │   └── scanner.py         ← Async multi-pair scanner loop
│   ├── main.py                ← FastAPI app (REST + WebSocket)
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── public/index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.js
│   │   │   ├── MarketRow.js
│   │   │   ├── SignalCard.js
│   │   │   └── KillZoneBar.js
│   │   ├── dashboard/
│   │   │   └── Dashboard.js
│   │   ├── hooks/
│   │   │   └── useWebSocket.js
│   │   └── index.js
│   └── package.json
├── setup_windows.bat          ← Run this first!
├── start_backend.bat
├── start_frontend.bat
└── README.md
```

---

## 🛠️ STEP-BY-STEP SETUP

### STEP 1 — Install Prerequisites

**Python 3.11** (recommended — stable with all deps):
1. Go to https://python.org/downloads
2. Download Python 3.11.x
3. ✅ IMPORTANT: Check "Add Python to PATH" during install
4. Verify: Open CMD → `python --version`

**Node.js 20.x**:
1. Go to https://nodejs.org
2. Download LTS (20.x)
3. Install with defaults
4. Verify: Open CMD → `node --version`

**VS Code** (recommended editor):
1. Download from https://code.visualstudio.com
2. Install these extensions:
   - Python (Microsoft)
   - ES7 React/Redux/React-Native snippets
   - Prettier

---

### STEP 2 — Extract and Open the Project

1. Unzip `crypto-signal-platform.zip` to a folder, e.g. `C:\Projects\crypto-signal-platform`
2. Open VS Code → File → Open Folder → select `crypto-signal-platform`

---

### STEP 3 — Run Setup Script

In VS Code, open a **New Terminal** (Ctrl + `) and run:

```cmd
setup_windows.bat
```

This will:
- Create Python virtual environment
- Install all Python packages
- Install all Node packages
- Create the `.env` file

---

### STEP 4 — Start the Backend

Open Terminal 1 in VS Code:

```cmd
cd backend
venv\Scripts\activate
python main.py
```

You should see:
```
INFO  Bootstrapping historical candles from Binance REST …
INFO  Loaded 200 candles BTCUSDT/daily
...
INFO  Bootstrap complete.
INFO  WebSocket connected.
INFO  Scanner started — interval 200ms
INFO  Uvicorn running on http://0.0.0.0:8000
```

✅ Backend is running! Test it: open http://localhost:8000/api/health

---

### STEP 5 — Start the Frontend

Open Terminal 2 in VS Code (click the + button):

```cmd
cd frontend
npm start
```

Browser will auto-open at **http://localhost:3000**

You'll see the dashboard with:
- 10 pair cards with live prices
- ICT Kill Zone status bar
- Signal feed (updates in real-time)
- Stats panel

---

## 🌍 REMOTE ACCESS (Access from ANYWHERE)

### Option A — ngrok (Free, Easiest, No VPS needed)

1. Create free account at https://ngrok.com
2. Download ngrok
3. Run in a new terminal:
   ```cmd
   ngrok http 8000
   ```
4. You get a URL like: `https://abc123.ngrok.io`
5. In `frontend/src/hooks/useWebSocket.js` change:
   ```js
   const WS_URL = 'wss://abc123.ngrok.io/ws';
   ```
6. Build frontend:
   ```cmd
   cd frontend
   npm run build
   ```
   Then serve the `build/` folder.

**Note**: Free ngrok URLs change every restart. Use paid plan ($8/mo) for permanent URL.

---

### Option B — VPS / Cloud Server (Best for permanent access)

**Recommended: DigitalOcean $6/mo droplet or any Ubuntu VPS**

On your VPS:
```bash
# Install dependencies
sudo apt update
sudo apt install python3.11 python3.11-venv nodejs npm nginx -y

# Copy project
git clone <your-repo> /opt/smc-platform
cd /opt/smc-platform

# Backend
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
npm run build

# Start backend as service
nohup python main.py > backend.log 2>&1 &

# Serve frontend with nginx
sudo cp -r build/* /var/www/html/
```

Nginx config for WebSocket + API:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api { proxy_pass http://127.0.0.1:8000; }
    location /ws  {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
    location / { root /var/www/html; try_files $uri /index.html; }
}
```

---

## 🐛 ERROR TROUBLESHOOTING GUIDE

### Error: `ModuleNotFoundError: No module named 'fastapi'`
**Fix:**
```cmd
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

---

### Error: `python is not recognized`
**Fix:** Reinstall Python with "Add to PATH" checked, OR:
```cmd
py -3.11 -m venv venv
```

---

### Error: `npm: command not found` or `npm is not recognized`
**Fix:** Reinstall Node.js from nodejs.org. Restart terminal after install.

---

### Error: `ConnectionRefusedError` or WebSocket won't connect
**Fix:** Make sure backend is running first:
```cmd
cd backend && venv\Scripts\activate && python main.py
```
Check http://localhost:8000/api/health — should return `{"status":"ok"}`

---

### Error: `websockets.exceptions.ConnectionClosedError`
**Fix:** This is a Binance stream timeout. The app auto-reconnects. Wait 3–5 seconds.

---

### Error: Frontend shows "Connecting…" forever
**Causes & Fixes:**
1. Backend not running → start it first
2. Wrong port → check `main.py` API_PORT = 8000
3. Firewall blocking → allow port 8000 in Windows Firewall

---

### Error: `pip install` fails on Windows with SSL error
**Fix:**
```cmd
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt
```

---

### Error: `ETIMEDOUT` or Binance connection fails
**Cause:** Binance is blocked in some regions (USA, some countries).
**Fix:** Use a VPN or set up on a VPS in an unrestricted region.

---

### Error: `Address already in use` (port 8000)
**Fix:**
```cmd
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F
```

---

### No signals appearing?
**Normal!** Signals only appear when ALL conditions align:
- HTF bias must be clear (not RANGING)
- Must be during London (07:00–09:00 UTC) or NY (13:00–15:00 UTC) session
- Price must be at an Order Block or FVG
- BOS/CHOCH must be confirmed

**To test immediately**, temporarily lower the threshold in `backend/core/config.py`:
```python
MIN_RR = 1.5          # lower from 2.0
SIGNAL_COOLDOWN_S = 10  # lower from 60
```

---

## ⚙️ CONFIGURATION GUIDE

Edit `backend/core/config.py` to tune the system:

```python
# Scan speed (200ms is fast enough, don't go below 100ms)
SCAN_INTERVAL_MS = 200

# Minimum R:R ratio to generate a signal
MIN_RR = 2.0    # raise to 3.0 for fewer, higher quality signals

# Signal cooldown (seconds between same pair/direction)  
SIGNAL_COOLDOWN_S = 60

# ATR multiplier for Stop Loss
SL_ATR_MULT = 1.5   # increase for wider stops

# FVG sensitivity (higher = fewer FVGs detected)
FVG_MIN_BODY_MULT = 1.5

# Fibonacci OTE zone
FIBONACCI_ZONES = [0.382, 0.50, 0.618, 0.705, 0.79]
```

---

## 📊 UNDERSTANDING SIGNALS

Each signal shows:

| Field | Meaning |
|-------|---------|
| **Pair** | Which crypto (BTCUSDT etc.) |
| **Direction** | BUY (green) or SELL (red) |
| **Entry** | Price to enter the trade |
| **Stop Loss** | Place stop here (max loss point) |
| **Take Profit** | Target price (minimum 1:2 R:R) |
| **R:R Ratio** | Risk:Reward (1:2.5 means win 2.5× what you risk) |
| **Confluence** | Why the signal fired (BOS, OB, FVG, KZ etc.) |
| **Timeframe** | Primary analysis timeframe |

**Signal validity rules from PDF:**
- BOS must be a candle CLOSE (not just wick)
- OB must be fresh (first touch = highest probability)
- Trade only during London or NY Kill Zones
- Minimum 3 confluence factors required
- Stop loss placed below/above Order Block

---

## ⚠️ DISCLAIMER

This platform is for **educational purposes and personal research only**.
It does **not** constitute financial advice. Crypto trading involves
substantial risk of loss. Never risk money you cannot afford to lose.
Always use proper risk management (1-2% per trade maximum).

---

*Built on Smart Money Concepts from the PDF course materials.*
*Strategy logic based on: BOS, CHOCH, Order Blocks, Liquidity Sweeps,*
*Fair Value Gaps, Fibonacci OTE, ICT Kill Zones, Multi-TF Analysis.*
