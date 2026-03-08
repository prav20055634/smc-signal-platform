"""
models.py — Pydantic models for signals and candle data
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class Candle(BaseModel):
    open_time: int
    open:  float
    high:  float
    low:   float
    close: float
    volume: float


class Signal(BaseModel):
    id:          str
    pair:        str
    direction:   Literal["BUY", "SELL"]
    entry:       float
    stop_loss:   float
    take_profit: float
    rr_ratio:    float
    strategy:    str                       # e.g. "BOS+OB+KZ"
    timeframe:   str
    kill_zone:   Optional[str] = None
    confluence:  list[str] = Field(default_factory=list)   # list of reasons
    timestamp:   datetime = Field(default_factory=datetime.utcnow)
    invalidated: bool = False


class MarketSnapshot(BaseModel):
    pair:          str
    price:         float
    change_24h:    float
    volume_24h:    float
    htf_bias:      Literal["BULLISH", "BEARISH", "RANGING"]
    active_kz:     Optional[str] = None
    timestamp:     datetime = Field(default_factory=datetime.utcnow)
