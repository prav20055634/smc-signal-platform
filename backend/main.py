"""
main.py — FastAPI entry point.

Endpoints:
  GET  /api/signals          → last N signals
  GET  /api/snapshots        → current market snapshot for all pairs
  GET  /api/health           → health check
  WS   /ws                   → real-time signal + snapshot broadcast

On startup:
  1. Bootstrap historical candles from Binance REST
  2. Start live WebSocket stream (Binance)
  3. Start scanner loop
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

from core.config import FRONTEND_ORIGINS, API_HOST, API_PORT
from data.store import store
from data.fetcher import bootstrap_candles, live_stream_loop
from scanner.scanner import scanner_loop

# ── Logging ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(name)s  %(message)s"
)
log = logging.getLogger(__name__)


# ── Lifespan ─────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background tasks on app startup."""
    await bootstrap_candles()
    asyncio.create_task(live_stream_loop(), name="ws_stream")
    asyncio.create_task(scanner_loop(),    name="scanner")
    log.info("All background tasks started.")
    yield
    log.info("Shutting down.")


# ── App ───────────────────────────────────────────────────────────

app = FastAPI(
    title="SMC Crypto Signal Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── REST Endpoints ────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "pairs": len(store.prices)}


@app.get("/api/signals")
async def get_signals(limit: int = Query(default=50, le=500)):
    signals = store.get_signals(limit)
    return [s.model_dump(mode="json") for s in signals]


@app.get("/api/snapshots")
async def get_snapshots():
    return {k: v.model_dump(mode="json") for k, v in store.snapshots.items()}


@app.get("/api/prices")
async def get_prices():
    return store.prices


# ── WebSocket ─────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    q = store.register_ws()
    log.info("WS client connected")
    try:
        # Send current state immediately on connect
        init_payload = {
            "type": "init",
            "signals":   [s.model_dump(mode="json") for s in store.get_signals(50)],
            "snapshots": {k: v.model_dump(mode="json") for k, v in store.snapshots.items()},
            "prices":    store.prices,
        }
        await websocket.send_text(json.dumps(init_payload))

        while True:
            msg = await q.get()
            await websocket.send_text(json.dumps(msg, default=str))
    except WebSocketDisconnect:
        log.info("WS client disconnected")
    except Exception as e:
        log.warning(f"WS error: {e}")
    finally:
        store.unregister_ws(q)


# ── Dev runner ────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=API_HOST, port=API_PORT, reload=False)
