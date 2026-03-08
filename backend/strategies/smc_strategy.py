"""
smc_strategy.py — Smart Money Concepts strategy engine.

For each pair the engine runs a multi-timeframe top-down analysis:
  1. HTF Bias   (Weekly/Daily)
  2. Swing structure + BOS/CHOCH (4H)
  3. Order Block / FVG / Liquidity zone (4H)
  4. Kill Zone timing check
  5. Entry-level confirmation (15M/5M candlestick)
  6. Position sizing → SL / TP / R:R

A signal is only emitted when:
  - HTF bias aligns with trade direction
  - BOS or CHOCH confirms direction
  - Price is at a fresh OB or inside FVG
  - Liquidity sweep detected (optional bonus confluence)
  - R:R >= MIN_RR
"""

import uuid
import logging
import pandas as pd
from datetime import datetime, timezone

from core.config import MIN_RR, SL_ATR_MULT
from core.models import Signal
from strategies.indicators import (
    htf_bias, detect_bos, detect_choch,
    detect_order_blocks, price_in_ob,
    detect_fvg, price_in_fvg,
    detect_liquidity_zones, detect_sweep,
    calculate_fibonacci, price_in_fib_zone,
    get_active_kill_zone, atr, candlestick_confirm,
)

log = logging.getLogger(__name__)


def analyse_pair(pair: str, candles: dict) -> Signal | None:
    """
    Run the full SMC analysis for one pair.

    candles: dict[tf_name → pd.DataFrame]
    Returns a Signal if conditions are met, else None.
    """

    # ── 1. Grab timeframe data ───────────────────────────────────
    df_weekly = candles.get("weekly", pd.DataFrame())
    df_daily  = candles.get("daily",  pd.DataFrame())
    df_h4     = candles.get("h4",     pd.DataFrame())
    df_h1     = candles.get("h1",     pd.DataFrame())
    df_m15    = candles.get("m15",    pd.DataFrame())

    if df_h4.empty or len(df_h4) < 30:
        return None

    # ── 2. HTF Bias (weekly first, fall back to daily) ───────────
    bias = "RANGING"
    if not df_weekly.empty and len(df_weekly) >= 20:
        bias = htf_bias(df_weekly)
    if bias == "RANGING" and not df_daily.empty and len(df_daily) >= 50:
        bias = htf_bias(df_daily)

    if bias == "RANGING":
        return None    # no trade in ranging markets

    direction = "BUY" if bias == "BULLISH" else "SELL"

    # ── 3. 4H Structure: BOS / CHOCH ────────────────────────────
    bos   = detect_bos(df_h4)
    choch = detect_choch(df_h4)

    has_bos   = bos["bullish"] if direction == "BUY" else bos["bearish"]
    has_choch = choch["bullish"] if direction == "BUY" else choch["bearish"]

    if not (has_bos or has_choch):
        return None

    # ── 4. Current price ─────────────────────────────────────────
    price = float(df_h4["close"].iloc[-1])

    # ── 5. Order Block check ─────────────────────────────────────
    obs     = detect_order_blocks(df_h4)
    ob_type = "bullish" if direction == "BUY" else "bearish"
    active_ob = price_in_ob(price, obs, ob_type)

    # ── 6. FVG check ─────────────────────────────────────────────
    fvgs      = detect_fvg(df_h4)
    fvg_type  = "bullish" if direction == "BUY" else "bearish"
    active_fvg = price_in_fvg(price, fvgs, fvg_type)

    # Require at least OB or FVG
    if active_ob is None and active_fvg is None:
        return None

    # ── 7. Liquidity sweep (bonus confluence) ────────────────────
    liq    = detect_liquidity_zones(df_h4)
    sweep  = detect_sweep(df_h4, liq)
    swept  = sweep["bullish_sweep"] if direction == "BUY" else sweep["bearish_sweep"]

    # ── 8. Fibonacci OTE zone (4H swing) ─────────────────────────
    in_ote = False
    from strategies.indicators import detect_swing_points
    sp = detect_swing_points(df_h4)
    s_highs = sp[sp["swing_high"]]["high"].values
    s_lows  = sp[sp["swing_low"]]["low"].values

    if len(s_highs) >= 1 and len(s_lows) >= 1:
        if direction == "BUY":
            fibs = calculate_fibonacci(s_lows[-1], s_highs[-1])
        else:
            fibs = calculate_fibonacci(s_lows[-1], s_highs[-1])
        in_ote = price_in_fib_zone(price, fibs)

    # ── 9. Kill Zone timing ───────────────────────────────────────
    kz = get_active_kill_zone()
    # Prefer London / NY; allow signal outside KZ if confluence is very strong
    strong_confluence = sum([bool(active_ob), bool(active_fvg), swept, in_ote]) >= 3
    if kz is None and not strong_confluence:
        return None

    # ── 10. LTF candle confirmation ──────────────────────────────
    ltf_df = df_m15 if not df_m15.empty else df_h1
    candle_pattern = candlestick_confirm(ltf_df, direction) if not ltf_df.empty else ""

    # ── 11. Build confluence list ─────────────────────────────────
    confluence = []
    if has_bos:   confluence.append("BOS")
    if has_choch: confluence.append("CHOCH")
    if active_ob: confluence.append(f"OB({ob_type})")
    if active_fvg: confluence.append(f"FVG({fvg_type})")
    if swept:     confluence.append("LiqSweep")
    if in_ote:    confluence.append("OTE(61.8-79%)")
    if kz:        confluence.append(f"KZ:{kz}")
    if candle_pattern: confluence.append(candle_pattern)

    # Must have at least 3 confluence factors
    if len(confluence) < 3:
        return None

    # ── 12. Stop Loss & Take Profit ──────────────────────────────
    current_atr = atr(df_h4, 14)
    if current_atr == 0:
        return None

    if direction == "BUY":
        sl_base = active_ob["bottom"] if active_ob else (price - current_atr * SL_ATR_MULT)
        stop_loss   = min(sl_base, price - current_atr * SL_ATR_MULT)
        risk        = price - stop_loss
        if risk <= 0:
            return None
        take_profit = price + risk * MIN_RR
    else:
        sl_base = active_ob["top"] if active_ob else (price + current_atr * SL_ATR_MULT)
        stop_loss   = max(sl_base, price + current_atr * SL_ATR_MULT)
        risk        = stop_loss - price
        if risk <= 0:
            return None
        take_profit = price - risk * MIN_RR

    rr = round(abs(take_profit - price) / risk, 2)
    if rr < MIN_RR:
        return None

    # ── 13. Build Signal ─────────────────────────────────────────
    strategy_tag = "+".join(confluence[:4])    # first 4 factors as label

    signal = Signal(
        id          = str(uuid.uuid4())[:8],
        pair        = pair,
        direction   = direction,
        entry       = round(price, 6),
        stop_loss   = round(stop_loss, 6),
        take_profit = round(take_profit, 6),
        rr_ratio    = rr,
        strategy    = strategy_tag,
        timeframe   = "4H",
        kill_zone   = kz,
        confluence  = confluence,
        timestamp   = datetime.now(timezone.utc),
    )
    log.info(f"SIGNAL  {pair}  {direction}  entry={price:.4f}  R:R={rr}  [{strategy_tag}]")
    return signal
