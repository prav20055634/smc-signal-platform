"""
config.py — Central configuration for the SMC Signal Platform
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── Pairs to scan ───────────────────────────────────────────────
PAIRS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
    "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "MATICUSDT"
]

# ── Binance WebSocket ─────────────────────────────────────────────
BINANCE_WS_BASE   = "wss://stream.binance.com:9443/stream"
BINANCE_REST_BASE = "https://api.binance.com/api/v3"

# ── Timeframes for multi-TF analysis ────────────────────────────
# Kline intervals used for HTF bias and entry
TIMEFRAMES = {
    "weekly":  "1w",
    "daily":   "1d",
    "h4":      "4h",
    "h1":      "1h",
    "m15":     "15m",
    "m5":      "5m",
}

# Number of candles to load per timeframe
CANDLE_LIMIT = 200

# ── Scanning ─────────────────────────────────────────────────────
SCAN_INTERVAL_MS   = 200  # how often the scanner loops (ms)
SIGNAL_COOLDOWN_S  =600 # seconds before re-signalling same pair/dir

# ── Risk settings ────────────────────────────────────────────────
MIN_RR             = 1.0   # minimum Risk:Reward to emit signal
RISK_PCT           = 1.5   # default account risk % shown in signals
SL_ATR_MULT        = 1.5   # SL = entry ± ATR * multiplier

# ── SMC thresholds ───────────────────────────────────────────────
FVG_MIN_BODY_MULT  = 1.5   # FVG body must be N× average body
OB_LOOKBACK        = 5     # candles to look back for Order Block
LIQ_SWEEP_PCT      = 0.003 # 0.3 % above/below equal hi/lo counts as sweep
FIBONACCI_ZONES    = [0.382, 0.50, 0.618, 0.705, 0.79]

# ── ICT Kill Zones (UTC hours) ───────────────────────────────────
KILL_ZONES = {
    "london":  (7,  9),
    "ny":      (13, 15),
    "late_ny": (20, 22),
}

# ── API / CORS ────────────────────────────────────────────────────
FRONTEND_ORIGINS = ["*"]          # lock down in production
API_HOST         = "0.0.0.0"
API_PORT         = 8000
