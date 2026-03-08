"""
scanner.py — Async scanner that analyses all pairs every SCAN_INTERVAL_MS.

Uses asyncio.gather to run all pairs concurrently.
Implements per-pair signal cooldown to avoid duplicate signals.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Tuple

from core.config import PAIRS, SCAN_INTERVAL_MS, SIGNAL_COOLDOWN_S
from core.models import MarketSnapshot
from data.store import store
from strategies.smc_strategy import analyse_pair
from strategies.indicators import htf_bias, get_active_kill_zone

log = logging.getLogger(__name__)

# last_signal[pair] → (direction, timestamp)
_last_signal: Dict[str, Tuple[str, datetime]] = {}


async def _analyse_one(pair: str):
    """Run SMC analysis for one pair, emit signal if valid and not in cooldown."""
    try:
        candles = {tf: store.get_candles(pair, tf) for tf in ["weekly","daily","h4","h1","m15","m5"]}

        # Update market snapshot
        df_daily = candles.get("daily")
        bias  = htf_bias(df_daily) if df_daily is not None and len(df_daily) >= 50 else "RANGING"
        price = store.prices.get(pair, 0.0)
        kz    = get_active_kill_zone()

        snap = MarketSnapshot(
            pair       = pair,
            price      = price,
            change_24h = _calc_change(candles.get("daily")),
            volume_24h = _calc_volume(candles.get("daily")),
            htf_bias   = bias,
            active_kz  = kz,
        )
        await store.update_snapshot(snap)

        # Run strategy
        signal = analyse_pair(pair, candles)
        if signal is None:
            return

        # Cooldown check
        now = datetime.now(timezone.utc)
        last = _last_signal.get(pair)
        if last:
            last_dir, last_ts = last
            if (last_dir == signal.direction
                    and (now - last_ts).total_seconds() < SIGNAL_COOLDOWN_S):
                return

        _last_signal[pair] = (signal.direction, now)
        await store.add_signal(signal)

    except Exception as e:
        log.error(f"Scanner error [{pair}]: {e}", exc_info=True)


async def scanner_loop():
    """Main scanner coroutine. Runs indefinitely."""
    log.info(f"Scanner started — interval {SCAN_INTERVAL_MS}ms — pairs: {PAIRS}")
    while True:
        await asyncio.gather(*[_analyse_one(p) for p in PAIRS])
        await asyncio.sleep(SCAN_INTERVAL_MS / 1000)


def _calc_change(df) -> float:
    """24h % change from daily candle."""
    try:
        if df is None or len(df) < 2:
            return 0.0
        prev  = float(df["close"].iloc[-2])
        close = float(df["close"].iloc[-1])
        return round((close - prev) / prev * 100, 2) if prev else 0.0
    except Exception:
        return 0.0


def _calc_volume(df) -> float:
    """Last daily candle volume."""
    try:
        if df is None or df.empty:
            return 0.0
        return float(df["volume"].iloc[-1])
    except Exception:
        return 0.0
