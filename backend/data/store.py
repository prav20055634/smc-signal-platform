"""
store.py — In-memory data store shared across the app.
All state lives here; no database needed for personal use.
"""

import asyncio
from collections import deque
from datetime import datetime
from typing import Dict, Deque, List, Optional
import pandas as pd

from core.models import Signal, MarketSnapshot
from core.config import PAIRS, TIMEFRAMES, CANDLE_LIMIT


class DataStore:
    """Central store for candles, prices, signals, and snapshots."""

    def __init__(self):
        # candles[pair][tf] → pandas DataFrame (OHLCV)
        self.candles: Dict[str, Dict[str, pd.DataFrame]] = {
            pair: {tf: pd.DataFrame() for tf in TIMEFRAMES}
            for pair in PAIRS
        }

        # latest ticker price per pair
        self.prices: Dict[str, float] = {p: 0.0 for p in PAIRS}

        # signals queue — last 500 signals
        self.signals: Deque[Signal] = deque(maxlen=500)

        # latest snapshot per pair
        self.snapshots: Dict[str, MarketSnapshot] = {}

        # WebSocket broadcast queues — one per connected client
        self._ws_queues: List[asyncio.Queue] = []

        # lock for write operations
        self._lock = asyncio.Lock()

    # ── candle helpers ───────────────────────────────────────────

    async def update_candles(self, pair: str, tf: str, df: pd.DataFrame):
        async with self._lock:
            self.candles[pair][tf] = df.tail(CANDLE_LIMIT).reset_index(drop=True)

    def get_candles(self, pair: str, tf: str) -> pd.DataFrame:
        return self.candles[pair].get(tf, pd.DataFrame())

    # ── price helpers ────────────────────────────────────────────

    async def update_price(self, pair: str, price: float):
        self.prices[pair] = price

    # ── signal helpers ───────────────────────────────────────────

    async def add_signal(self, signal: Signal):
        async with self._lock:
            self.signals.appendleft(signal)
        await self._broadcast({"type": "signal", "data": signal.model_dump(mode="json")})

    def get_signals(self, limit: int = 100) -> List[Signal]:
        return list(self.signals)[:limit]

    # ── snapshot helpers ─────────────────────────────────────────

    async def update_snapshot(self, snap: MarketSnapshot):
        self.snapshots[snap.pair] = snap
        await self._broadcast({"type": "snapshot", "data": snap.model_dump(mode="json")})

    # ── WebSocket broadcast ──────────────────────────────────────

    def register_ws(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._ws_queues.append(q)
        return q

    def unregister_ws(self, q: asyncio.Queue):
        try:
            self._ws_queues.remove(q)
        except ValueError:
            pass

    async def _broadcast(self, msg: dict):
        dead = []
        for q in self._ws_queues:
            try:
                q.put_nowait(msg)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self.unregister_ws(q)


# Singleton
store = DataStore()
