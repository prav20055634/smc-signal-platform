"""
fetcher.py — Fetches historical candles from Binance REST and
             subscribes to live kline / ticker streams via WebSocket.
"""

import asyncio
import json
import logging
import aiohttp
import websockets
import pandas as pd
from datetime import datetime

from core.config import (
    PAIRS, TIMEFRAMES, CANDLE_LIMIT,
    BINANCE_REST_BASE, BINANCE_WS_BASE
)
from data.store import store

log = logging.getLogger(__name__)


# ── REST: historical candles ─────────────────────────────────────

async def fetch_candles_rest(
    session: aiohttp.ClientSession,
    pair: str,
    interval: str,
    limit: int = CANDLE_LIMIT
) -> pd.DataFrame:
    """Download klines from Binance REST endpoint."""
    url = f"{BINANCE_REST_BASE}/klines"
    params = {"symbol": pair, "interval": interval, "limit": limit}
    try:
        async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as r:
            raw = await r.json()
    except Exception as e:
        log.warning(f"REST fetch failed {pair}/{interval}: {e}")
        return pd.DataFrame()

    cols = ["open_time","open","high","low","close","volume",
            "close_time","qav","trades","tbb","tbq","ignore"]
    df = pd.DataFrame(raw, columns=cols)
    numeric = ["open","high","low","close","volume"]
    df[numeric] = df[numeric].astype(float)
    df["open_time"] = pd.to_datetime(df["open_time"], unit="ms", utc=True)
    return df[["open_time","open","high","low","close","volume"]].copy()


async def bootstrap_candles():
    """Load historical candles for all pairs × timeframes on startup."""
    log.info("Bootstrapping historical candles from Binance REST …")
    async with aiohttp.ClientSession() as session:
        tasks = []
        for pair in PAIRS:
            for tf_name, interval in TIMEFRAMES.items():
                tasks.append(_load_and_store(session, pair, tf_name, interval))
        await asyncio.gather(*tasks)
    log.info("Bootstrap complete.")


async def _load_and_store(session, pair, tf_name, interval):
    df = await fetch_candles_rest(session, pair, interval)
    if not df.empty:
        await store.update_candles(pair, tf_name, df)
        log.debug(f"  Loaded {len(df)} candles  {pair}/{tf_name}")


# ── WebSocket: live kline updates ────────────────────────────────

def _build_ws_url() -> str:
    """Build a combined stream URL for all pairs × timeframes + miniTicker."""
    streams = []
    for pair in PAIRS:
        symbol = pair.lower()
        for interval in TIMEFRAMES.values():
            streams.append(f"{symbol}@kline_{interval}")
        streams.append(f"{symbol}@miniTicker")
    return f"{BINANCE_WS_BASE}?streams=" + "/".join(streams)


async def live_stream_loop():
    """
    Persistent WebSocket loop.  On disconnect it waits 3 s then reconnects.
    Updates candle store and price store in real-time.
    """
    url = _build_ws_url()
    log.info("Connecting to Binance combined stream …")

    while True:
        try:
            async with websockets.connect(url, ping_interval=20, ping_timeout=20) as ws:
                log.info("WebSocket connected.")
                async for raw in ws:
                    await _handle_message(raw)
        except Exception as e:
            log.warning(f"WebSocket error: {e}  — reconnecting in 3 s")
            await asyncio.sleep(3)


async def _handle_message(raw: str):
    try:
        msg = json.loads(raw)
        data = msg.get("data", msg)
        event = data.get("e", "")

        if event == "kline":
            await _handle_kline(data)
        elif event == "24hrMiniTicker":
            await _handle_ticker(data)
    except Exception as e:
        log.debug(f"Message parse error: {e}")


# Map Binance interval string → our tf_name
_INTERVAL_TO_TF = {v: k for k, v in TIMEFRAMES.items()}


async def _handle_kline(data: dict):
    k = data["k"]
    if not k["x"]:          # only process closed candles
        # but update the price tick
        await store.update_price(data["s"], float(k["c"]))
        return

    pair     = data["s"]
    interval = k["i"]
    tf_name  = _INTERVAL_TO_TF.get(interval)
    if tf_name is None or pair not in PAIRS:
        return

    new_row = pd.DataFrame([{
        "open_time": pd.Timestamp(k["t"], unit="ms", tz="UTC"),
        "open":  float(k["o"]),
        "high":  float(k["h"]),
        "low":   float(k["l"]),
        "close": float(k["c"]),
        "volume": float(k["v"]),
    }])

    existing = store.get_candles(pair, tf_name)
    if existing.empty:
        updated = new_row
    else:
        updated = pd.concat([existing, new_row], ignore_index=True).tail(CANDLE_LIMIT)

    await store.update_candles(pair, tf_name, updated)
    await store.update_price(pair, float(k["c"]))


async def _handle_ticker(data: dict):
    pair = data.get("s", "")
    if pair in PAIRS:
        await store.update_price(pair, float(data["c"]))
