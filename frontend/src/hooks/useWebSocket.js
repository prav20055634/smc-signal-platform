// hooks/useWebSocket.js
// Manages the WebSocket connection to the backend and
// distributes live data to the rest of the app.

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL ||
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
  (window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host) + '/ws';

export default function useWebSocket() {
  const [signals,   setSignals]   = useState([]);
  const [snapshots, setSnapshots] = useState({});
  const [prices,    setPrices]    = useState({});
  const [connected, setConnected] = useState(false);
  const wsRef  = useRef(null);
  const timer  = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      clearTimeout(timer.current);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'init') {
          setSignals(msg.signals   || []);
          setSnapshots(msg.snapshots || {});
          setPrices(msg.prices     || {});
        } else if (msg.type === 'signal') {
          setSignals(prev => [msg.data, ...prev].slice(0, 500));
        } else if (msg.type === 'snapshot') {
          setSnapshots(prev => ({ ...prev, [msg.data.pair]: msg.data }));
          setPrices(prev => ({ ...prev, [msg.data.pair]: msg.data.price }));
        }
      } catch (e) { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      setConnected(false);
      timer.current = setTimeout(connect, 3000);   // auto-reconnect
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(timer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { signals, snapshots, prices, connected };
}
