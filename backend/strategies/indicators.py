"""
indicators.py — All SMC indicator calculations.
Each function accepts a pandas DataFrame (OHLCV) and returns
structured results that the strategy layer can combine.

DataFrame columns expected: open, high, low, close, volume
"""

import numpy as np
import pandas as pd
from datetime import datetime, timezone
from typing import Optional

from core.config import (
    FVG_MIN_BODY_MULT, OB_LOOKBACK,
    LIQ_SWEEP_PCT, FIBONACCI_ZONES, KILL_ZONES
)


# ─────────────────────────────────────────────────────────────────
# 1. MARKET STRUCTURE  —  BOS & CHOCH
# ─────────────────────────────────────────────────────────────────

def detect_swing_points(df: pd.DataFrame, lookback: int = 5) -> pd.DataFrame:
    """
    Mark swing highs and swing lows.
    A swing high is a candle whose high is the highest in ±lookback candles.
    """
    df = df.copy()
    df["swing_high"] = False
    df["swing_low"]  = False

    for i in range(lookback, len(df) - lookback):
        window_h = df["high"].iloc[i - lookback: i + lookback + 1]
        window_l = df["low"].iloc[i  - lookback: i + lookback + 1]
        if df["high"].iloc[i] == window_h.max():
            df.at[df.index[i], "swing_high"] = True
        if df["low"].iloc[i] == window_l.min():
            df.at[df.index[i], "swing_low"]  = True
    return df


def detect_bos(df: pd.DataFrame) -> dict:
    """
    Break of Structure detection.
    Returns the most recent BOS: direction, level, index.
    Rule: candle CLOSE above last swing high = Bullish BOS
          candle CLOSE below last swing low  = Bearish BOS
    """
    df = detect_swing_points(df)
    result = {"bullish": False, "bearish": False, "level": None, "index": None}

    swing_highs = df[df["swing_high"]]["high"]
    swing_lows  = df[df["swing_low"]]["low"]

    if swing_highs.empty or swing_lows.empty:
        return result

    last_sh = swing_highs.iloc[-1]
    last_sl = swing_lows.iloc[-1]
    last_close = df["close"].iloc[-1]

    if last_close > last_sh:
        result.update({"bullish": True, "level": last_sh, "index": len(df) - 1})
    elif last_close < last_sl:
        result.update({"bearish": True, "level": last_sl, "index": len(df) - 1})

    return result


def detect_choch(df: pd.DataFrame) -> dict:
    """
    Change of Character: BOS in the OPPOSITE direction of the prevailing trend.
    Simple implementation: check if recent BOS breaks 2+ swing points.
    Returns direction of the character change.
    """
    df = detect_swing_points(df)
    result = {"bullish": False, "bearish": False, "level": None}

    highs = df[df["swing_high"]]["high"].values
    lows  = df[df["swing_low"]]["low"].values

    if len(highs) < 3 or len(lows) < 3:
        return result

    # Downtrend → bullish CHOCH: close breaks above 2nd-to-last swing high
    last_close = df["close"].iloc[-1]
    trend_is_down = highs[-1] < highs[-2]       # lower highs
    trend_is_up   = lows[-1] > lows[-2]         # higher lows

    if trend_is_down and last_close > highs[-2]:
        result.update({"bullish": True, "level": highs[-2]})
    elif trend_is_up and last_close < lows[-2]:
        result.update({"bearish": True, "level": lows[-2]})

    return result


# ─────────────────────────────────────────────────────────────────
# 2. ORDER BLOCKS
# ─────────────────────────────────────────────────────────────────

def detect_order_blocks(df: pd.DataFrame, lookback: int = OB_LOOKBACK) -> list[dict]:
    """
    Bullish OB  = last RED candle before a strong bullish impulse (BOS up)
    Bearish OB  = last GREEN candle before a strong bearish impulse (BOS down)
    Returns a list of OB dicts with type, top, bottom, index, fresh (bool).
    """
    obs = []
    if len(df) < lookback + 3:
        return obs

    closes = df["close"].values
    opens  = df["open"].values
    highs  = df["high"].values
    lows   = df["low"].values

    for i in range(lookback, len(df) - 2):
        # measure impulse strength: next candle body relative to ATR
        body   = abs(closes[i + 1] - opens[i + 1])
        avg_body = np.mean(np.abs(closes[max(0, i-10):i] - opens[max(0, i-10):i]))
        if avg_body == 0:
            continue
        impulse_ratio = body / avg_body

        if impulse_ratio < 1.5:      # must be a strong impulse candle
            continue

        # Bullish OB: last red candle before bullish impulse
        if closes[i] < opens[i] and closes[i + 1] > opens[i + 1]:
            # check price hasn't traded through OB more than once
            ob_high = opens[i]
            ob_low  = lows[i]
            retest_count = sum(1 for j in range(i + 2, len(df))
                               if lows[j] <= ob_high and highs[j] >= ob_low)
            obs.append({
                "type":   "bullish",
                "top":    ob_high,
                "bottom": ob_low,
                "index":  i,
                "fresh":  retest_count <= 1,
            })

        # Bearish OB: last green candle before bearish impulse
        elif closes[i] > opens[i] and closes[i + 1] < opens[i + 1]:
            ob_high = highs[i]
            ob_low  = opens[i]
            retest_count = sum(1 for j in range(i + 2, len(df))
                               if lows[j] <= ob_high and highs[j] >= ob_low)
            obs.append({
                "type":   "bearish",
                "top":    ob_high,
                "bottom": ob_low,
                "index":  i,
                "fresh":  retest_count <= 1,
            })

    return obs


def price_in_ob(price: float, obs: list[dict], ob_type: str) -> Optional[dict]:
    """Return the most recent fresh OB of given type that price is touching."""
    relevant = [o for o in obs if o["type"] == ob_type and o["fresh"]]
    relevant.sort(key=lambda x: x["index"], reverse=True)
    for ob in relevant:
        if ob["bottom"] <= price <= ob["top"]:
            return ob
    return None


# ─────────────────────────────────────────────────────────────────
# 3. FAIR VALUE GAPS (FVG)
# ─────────────────────────────────────────────────────────────────

def detect_fvg(df: pd.DataFrame) -> list[dict]:
    """
    Bullish FVG: top of candle[i] < bottom of candle[i+2]  (gap up)
    Bearish FVG: bottom of candle[i] > top of candle[i+2]  (gap down)
    """
    fvgs = []
    if len(df) < 4:
        return fvgs

    avg_body = np.mean(np.abs(df["close"].values - df["open"].values))

    for i in range(len(df) - 2):
        c1_high = df["high"].iloc[i]
        c1_low  = df["low"].iloc[i]
        c3_high = df["high"].iloc[i + 2]
        c3_low  = df["low"].iloc[i + 2]
        mid_body = abs(df["close"].iloc[i + 1] - df["open"].iloc[i + 1])

        if mid_body < avg_body * FVG_MIN_BODY_MULT:
            continue

        # Bullish FVG
        if c1_high < c3_low:
            fvgs.append({
                "type":   "bullish",
                "top":    c3_low,
                "bottom": c1_high,
                "index":  i + 1,
                "filled": False,
            })

        # Bearish FVG
        elif c1_low > c3_high:
            fvgs.append({
                "type":   "bearish",
                "top":    c1_low,
                "bottom": c3_high,
                "index":  i + 1,
                "filled": False,
            })

    return fvgs


def price_in_fvg(price: float, fvgs: list[dict], fvg_type: str) -> Optional[dict]:
    """Return the most recent unfilled FVG that price is inside."""
    relevant = [f for f in fvgs if f["type"] == fvg_type and not f["filled"]]
    relevant.sort(key=lambda x: x["index"], reverse=True)
    for fvg in relevant:
        if fvg["bottom"] <= price <= fvg["top"]:
            return fvg
    return None


# ─────────────────────────────────────────────────────────────────
# 4. LIQUIDITY SWEEPS
# ─────────────────────────────────────────────────────────────────

def detect_liquidity_zones(df: pd.DataFrame, tolerance: float = LIQ_SWEEP_PCT) -> dict:
    """
    Equal Highs / Equal Lows within a tolerance band = liquidity pool.
    Returns recent EQH / EQL levels.
    """
    result = {"eqh": [], "eql": [], "pdh": None, "pdl": None}
    if len(df) < 10:
        return result

    highs = df["high"].values
    lows  = df["low"].values

    # Equal Highs
    for i in range(len(highs) - 1):
        for j in range(i + 1, min(i + 20, len(highs))):
            if abs(highs[i] - highs[j]) / highs[i] <= tolerance:
                result["eqh"].append(max(highs[i], highs[j]))

    # Equal Lows
    for i in range(len(lows) - 1):
        for j in range(i + 1, min(i + 20, len(lows))):
            if abs(lows[i] - lows[j]) / lows[i] <= tolerance:
                result["eql"].append(min(lows[i], lows[j]))

    # Previous Day High / Low (last 2 complete daily candles)
    if len(df) >= 2:
        result["pdh"] = df["high"].iloc[-2]
        result["pdl"] = df["low"].iloc[-2]

    return result


def detect_sweep(df: pd.DataFrame, liquidity: dict) -> dict:
    """
    Detect if the most recent candle swept above EQH (bearish setup)
    or below EQL (bullish setup), then rejected (long wick).
    """
    if len(df) < 2:
        return {"bullish_sweep": False, "bearish_sweep": False}

    last = df.iloc[-1]
    body_size  = abs(last["close"] - last["open"])
    upper_wick = last["high"] - max(last["close"], last["open"])
    lower_wick = min(last["close"], last["open"]) - last["low"]

    # Bullish sweep: wick below EQL, close back above (long lower wick)
    bullish = False
    for level in liquidity.get("eql", []):
        if last["low"] < level and last["close"] > level and lower_wick > body_size:
            bullish = True
            break

    # Bearish sweep: wick above EQH, close back below (long upper wick)
    bearish = False
    for level in liquidity.get("eqh", []):
        if last["high"] > level and last["close"] < level and upper_wick > body_size:
            bearish = True
            break

    return {"bullish_sweep": bullish, "bearish_sweep": bearish}


# ─────────────────────────────────────────────────────────────────
# 5. FIBONACCI RETRACEMENT
# ─────────────────────────────────────────────────────────────────

def calculate_fibonacci(swing_low: float, swing_high: float) -> dict:
    """Return fib retracement levels between swing_low and swing_high."""
    diff = swing_high - swing_low
    levels = {}
    for f in FIBONACCI_ZONES:
        levels[f] = swing_high - diff * f
    return levels


def price_in_fib_zone(price: float, fib_levels: dict,
                       zone_start: float = 0.618,
                       zone_end: float   = 0.79) -> bool:
    """Check if price is inside the OTE zone (61.8% – 79%)."""
    low_level  = fib_levels.get(zone_end,   None)
    high_level = fib_levels.get(zone_start, None)
    if low_level is None or high_level is None:
        return False
    return low_level <= price <= high_level


# ─────────────────────────────────────────────────────────────────
# 6. ICT KILL ZONES
# ─────────────────────────────────────────────────────────────────

def get_active_kill_zone() -> Optional[str]:
    """Return the name of the active ICT kill zone, or None."""
    hour = datetime.now(timezone.utc).hour
    for name, (start, end) in KILL_ZONES.items():
        if start <= hour < end:
            return name
    return None


# ─────────────────────────────────────────────────────────────────
# 7. ATR  (for SL sizing)
# ─────────────────────────────────────────────────────────────────

def atr(df: pd.DataFrame, period: int = 14) -> float:
    """Average True Range."""
    if len(df) < period + 1:
        return 0.0
    h = df["high"].values
    l = df["low"].values
    c = df["close"].values
    tr = np.maximum(h[1:] - l[1:],
         np.maximum(abs(h[1:] - c[:-1]),
                    abs(l[1:] - c[:-1])))
    return float(np.mean(tr[-period:]))


# ─────────────────────────────────────────────────────────────────
# 8. HTF BIAS
# ─────────────────────────────────────────────────────────────────

def htf_bias(df: pd.DataFrame) -> str:
    """
    Weekly/Daily level bias.
    Uses EMA200 and swing structure.
    Returns 'BULLISH', 'BEARISH', or 'RANGING'.
    """
    if len(df) < 50:
        return "RANGING"

    closes = df["close"].values
    ema200 = _ema(closes, min(200, len(closes)))
    last_close = closes[-1]

    df2 = detect_swing_points(df)
    swing_highs = df2[df2["swing_high"]]["high"].values
    swing_lows  = df2[df2["swing_low"]]["low"].values

    if len(swing_highs) < 2 or len(swing_lows) < 2:
        return "RANGING"

    hh = swing_highs[-1] > swing_highs[-2]    # higher high
    hl = swing_lows[-1]  > swing_lows[-2]     # higher low
    lh = swing_highs[-1] < swing_highs[-2]    # lower high
    ll = swing_lows[-1]  < swing_lows[-2]     # lower low

    above_ema = last_close > ema200

    if hh and hl and above_ema:
        return "BULLISH"
    elif lh and ll and not above_ema:
        return "BEARISH"
    else:
        return "RANGING"


def _ema(data: np.ndarray, period: int) -> float:
    """Lightweight EMA."""
    if len(data) == 0:
        return 0.0
    k = 2.0 / (period + 1)
    ema = data[0]
    for v in data[1:]:
        ema = v * k + ema * (1 - k)
    return ema


# ─────────────────────────────────────────────────────────────────
# 9. CANDLESTICK CONFIRMATION
# ─────────────────────────────────────────────────────────────────

def candlestick_confirm(df: pd.DataFrame, direction: str) -> str:
    """
    Returns the name of a confirming candlestick pattern, or '' if none.
    Checks last 1-3 candles.
    """
    if len(df) < 3:
        return ""

    c = df.iloc[-1]
    p = df.iloc[-2]

    body    = abs(c["close"] - c["open"])
    range_  = c["high"] - c["low"]
    if range_ == 0:
        return ""
    upper_w = c["high"] - max(c["close"], c["open"])
    lower_w = min(c["close"], c["open"]) - c["low"]

    if direction == "BUY":
        # Hammer
        if lower_w > body * 2 and upper_w < body * 0.5:
            return "Hammer"
        # Bullish Engulfing
        if (c["close"] > c["open"]
                and c["open"] < p["close"]
                and c["close"] > p["open"]):
            return "Bullish Engulfing"
        # Morning Star (3-candle)
        if len(df) >= 3:
            pp = df.iloc[-3]
            mid_body = abs(p["close"] - p["open"])
            if (pp["close"] < pp["open"]
                    and mid_body < abs(pp["close"] - pp["open"]) * 0.3
                    and c["close"] > c["open"]):
                return "Morning Star"

    elif direction == "SELL":
        # Shooting Star
        if upper_w > body * 2 and lower_w < body * 0.5:
            return "Shooting Star"
        # Bearish Engulfing
        if (c["close"] < c["open"]
                and c["open"] > p["close"]
                and c["close"] < p["open"]):
            return "Bearish Engulfing"
        # Evening Star
        if len(df) >= 3:
            pp = df.iloc[-3]
            mid_body = abs(p["close"] - p["open"])
            if (pp["close"] > pp["open"]
                    and mid_body < abs(pp["close"] - pp["open"]) * 0.3
                    and c["close"] < c["open"]):
                return "Evening Star"

    return ""
