// dashboard/Dashboard.js
import React, { useState, useMemo } from 'react';
import Header      from '../components/Header';
import KillZoneBar from '../components/KillZoneBar';
import MarketRow   from '../components/MarketRow';
import SignalCard  from '../components/SignalCard';
import useWebSocket from '../hooks/useWebSocket';

const PAIRS = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT',
               'ADAUSDT','DOGEUSDT','AVAXUSDT','LINKUSDT','MATICUSDT'];

export default function Dashboard() {
  const { signals, snapshots, prices, connected } = useWebSocket();
  const [filter, setFilter]       = useState('ALL');
  const [view, setView]           = useState('signals'); // 'signals' | 'market' | 'stats'
  const [selectedSignal, setSelectedSignal] = useState(null);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return signals;
    if (filter === 'BUY' || filter === 'SELL') return signals.filter(s => s.direction === filter);
    return signals.filter(s => s.pair === filter);
  }, [signals, filter]);

  const buyCount  = signals.filter(s => s.direction === 'BUY').length;
  const sellCount = signals.filter(s => s.direction === 'SELL').length;
  const avgRR     = signals.length
    ? (signals.reduce((a, s) => a + (s.rr_ratio || 0), 0) / signals.length).toFixed(2)
    : '—';

  // ── SIGNAL DETAIL PAGE ──────────────────────────────────────
  if (selectedSignal) {
    return <SignalDetailPage signal={selectedSignal} onBack={() => setSelectedSignal(null)} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'system-ui, sans-serif' }}>
      <Header connected={connected} signalCount={signals.length} />
      <KillZoneBar />

      {/* ── MOBILE TAB BAR ── */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #21262d',
        background: '#161b22', position: 'sticky', top: 0, zIndex: 10
      }}>
        {[
          { id: 'signals', label: `📊 Signals (${signals.length})` },
          { id: 'market',  label: '💹 Market' },
          { id: 'stats',   label: '📈 Stats' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id)} style={{
            flex: 1, padding: '10px 4px', fontSize: 12, fontWeight: 600,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: view === tab.id ? '#58a6ff' : '#8b949e',
            borderBottom: view === tab.id ? '2px solid #58a6ff' : '2px solid transparent',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── SIGNALS TAB ── */}
      {view === 'signals' && (
        <div style={{ padding: '12px' }}>
          {/* Filter buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {['ALL', 'BUY', 'SELL'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                fontSize: 12, padding: '5px 16px', borderRadius: 6,
                border: '1px solid', cursor: 'pointer',
                background: filter === f ? '#1f6feb22' : 'transparent',
                borderColor: filter === f ? '#1f6feb' : '#30363d',
                color: filter === f ? '#58a6ff' : '#8b949e',
              }}>{f}</button>
            ))}
            <span style={{ fontSize: 12, color: '#8b949e', alignSelf: 'center', marginLeft: 4 }}>
              {filtered.length} signal{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Signal cards */}
          {filtered.length === 0
            ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8b949e' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>No signals yet</div>
                <div style={{ fontSize: 12 }}>Scanner is warming up…</div>
                <div style={{ fontSize: 11, marginTop: 8, color: '#58a6ff' }}>
                  Best times: London 12:30–14:30 IST | NY 18:30–20:30 IST
                </div>
              </div>
            )
            : filtered.map(sig => (
              <div key={sig.id + sig.timestamp} onClick={() => setSelectedSignal(sig)}>
                <SignalCard signal={sig} />
              </div>
            ))
          }
        </div>
      )}

      {/* ── MARKET TAB ── */}
      {view === 'market' && (
        <div style={{ padding: '12px' }}>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
            Market Overview
          </div>
          {PAIRS.map(p => (
            <div key={p} onClick={() => { setFilter(filter === p ? 'ALL' : p); setView('signals'); }}
              style={{
                background: '#161b22', border: '1px solid #21262d', borderRadius: 8,
                padding: '10px 14px', marginBottom: 8, cursor: 'pointer',
                opacity: filter !== 'ALL' && filter !== p ? 0.5 : 1,
              }}>
              <MarketRow snap={snapshots[p]} price={prices[p]} />
            </div>
          ))}
        </div>
      )}

      {/* ── STATS TAB ── */}
      {view === 'stats' && (
        <div style={{ padding: '12px' }}>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
            Statistics
          </div>
          {[
            { label: 'Total Signals', value: signals.length, color: '#e6edf3' },
            { label: 'BUY Signals',   value: buyCount,       color: '#3fb950' },
            { label: 'SELL Signals',  value: sellCount,      color: '#f85149' },
            { label: 'Avg R:R',       value: `1:${avgRR}`,   color: '#f0883e' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#161b22', border: '1px solid #30363d', borderRadius: 8,
              padding: '14px 16px', marginBottom: 10,
            }}>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          ))}

          <div style={{ marginTop: 8, fontSize: 11, color: '#8b949e', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
            Recent Pairs
          </div>
          {[...new Set(signals.slice(0, 10).map(s => s.pair))].map(p => (
            <div key={p} style={{
              fontSize: 13, color: '#e6edf3', marginBottom: 6, padding: '8px 12px',
              background: '#161b22', border: '1px solid #21262d', borderRadius: 6,
            }}>{p}</div>
          ))}

          <div style={{ marginTop: 16, fontSize: 11, color: '#8b949e', lineHeight: 1.8, textAlign: 'center' }}>
            ⚠️ For educational purposes only.<br />Not financial advice.<br />Always use proper risk management.
          </div>
        </div>
      )}
    </div>
  );
}

// ── SIGNAL DETAIL PAGE ────────────────────────────────────────────
function fmt(n) {
  if (!n) return '—';
  const num = Number(n);
  if (num > 1000) return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return num.toPrecision(6);
}

function calcTargets(entry, stop_loss, direction) {
  const risk = Math.abs(Number(entry) - Number(stop_loss));
  const e = Number(entry);
  if (direction === 'BUY') {
    return { tp1: e + risk * 1.0, tp2: e + risk * 2.0, tp3: e + risk * 3.0 };
  } else {
    return { tp1: e - risk * 1.0, tp2: e - risk * 2.0, tp3: e - risk * 3.0 };
  }
}

function SignalDetailPage({ signal, onBack }) {
  const dir     = signal.direction;
  const color   = dir === 'BUY' ? '#3fb950' : '#f85149';
  const targets = calcTargets(signal.entry, signal.stop_loss, dir);

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{
        background: '#161b22', borderBottom: '1px solid #21262d',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <button onClick={onBack} style={{
          background: '#21262d', border: '1px solid #30363d', borderRadius: 8,
          color: '#e6edf3', padding: '6px 14px', fontSize: 13, cursor: 'pointer'
        }}>← Back</button>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{signal.pair}</span>
        <span style={{
          fontSize: 13, fontWeight: 700, borderRadius: 5, padding: '2px 12px',
          color: color, background: `${color}22`, border: `1px solid ${color}44`
        }}>{dir}</span>
        {signal.kill_zone && (
          <span style={{
            fontSize: 11, borderRadius: 5, padding: '2px 8px',
            color: '#58a6ff', background: '#1f6feb22'
          }}>{signal.kill_zone.toUpperCase()} KZ</span>
        )}
      </div>

      <div style={{ padding: '16px' }}>

        {/* Entry & SL */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '14px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6 }}>📍 ENTRY PRICE</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#e6edf3' }}>${fmt(signal.entry)}</div>
          </div>
          <div style={{ background: '#161b22', border: '1px solid #f8514944', borderRadius: 10, padding: '14px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6 }}>🛑 STOP LOSS</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f85149' }}>${fmt(signal.stop_loss)}</div>
            <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>Risk: 1% of account</div>
          </div>
        </div>

        {/* TP1 TP2 TP3 */}
        <div style={{ fontSize: 13, color: '#8b949e', marginBottom: 8, fontWeight: 600 }}>🎯 TAKE PROFIT TARGETS</div>
        {[
          { label: 'TP1', price: targets.tp1, rr: '1:1', reward: '1.0%', pct: 33, desc: 'Move SL to entry after hitting TP1' },
          { label: 'TP2', price: targets.tp2, rr: '1:2', reward: '2.0%', pct: 33, desc: 'Take 50% of remaining position' },
          { label: 'TP3', price: targets.tp3, rr: '1:3', reward: '3.0%', pct: 34, desc: 'Exit remaining position fully' },
        ].map((tp, i) => (
          <div key={tp.label} style={{
            background: '#161b22', border: '1px solid #3fb95044',
            borderLeft: `4px solid #3fb950`, borderRadius: 10,
            padding: '14px', marginBottom: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 12, fontWeight: 700, background: '#3fb95022',
                  color: '#3fb950', borderRadius: 5, padding: '2px 8px'
                }}>{tp.label}</span>
                <span style={{ fontSize: 12, color: '#8b949e' }}>{tp.rr} R:R</span>
              </div>
              <span style={{ fontSize: 11, color: '#3fb950', fontWeight: 600 }}>+{tp.reward} reward</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#3fb950', marginBottom: 4 }}>${fmt(tp.price)}</div>
            <div style={{ fontSize: 11, color: '#8b949e' }}>📌 {tp.desc}</div>
          </div>
        ))}

        {/* Risk Info */}
        <div style={{
          background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
          padding: '14px', marginBottom: 12
        }}>
          <div style={{ fontSize: 13, color: '#8b949e', fontWeight: 600, marginBottom: 10 }}>💰 RISK MANAGEMENT</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>Risk per trade</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f85149' }}>1%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>Max reward</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#3fb950' }}>3%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>R:R Ratio</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f0883e' }}>1:{signal.rr_ratio}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>Timeframe</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3' }}>{signal.timeframe || '4H'}</div>
            </div>
          </div>
        </div>

        {/* Trade Plan */}
        <div style={{
          background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
          padding: '14px', marginBottom: 12
        }}>
          <div style={{ fontSize: 13, color: '#58a6ff', fontWeight: 700, marginBottom: 10 }}>📋 STEP BY STEP TRADE PLAN</div>
          {[
            `1️⃣ Enter ${dir} at $${fmt(signal.entry)}`,
            `2️⃣ Set Stop Loss at $${fmt(signal.stop_loss)} (Max loss: 1%)`,
            `3️⃣ TP1 hit at $${fmt(targets.tp1)} → Move SL to entry (Risk free!)`,
            `4️⃣ TP2 hit at $${fmt(targets.tp2)} → Take 50% profit (+2%)`,
            `5️⃣ TP3 hit at $${fmt(targets.tp3)} → Exit fully (+3%)`,
          ].map((step, i) => (
            <div key={i} style={{
              fontSize: 13, color: '#e6edf3', padding: '8px 0',
              borderBottom: i < 4 ? '1px solid #21262d' : 'none', lineHeight: 1.5
            }}>{step}</div>
          ))}
        </div>

        {/* Confluence */}
        <div style={{
          background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
          padding: '14px', marginBottom: 12
        }}>
          <div style={{ fontSize: 13, color: '#8b949e', fontWeight: 600, marginBottom: 10 }}>🔍 CONFLUENCE FACTORS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(signal.confluence || []).map((c, i) => (
              <span key={i} style={{
                fontSize: 12, background: '#21262d', border: '1px solid #30363d',
                borderRadius: 6, padding: '4px 10px', color: '#e6edf3'
              }}>{c}</span>
            ))}
            {signal.kill_zone && (
              <span style={{
                fontSize: 12, background: '#1f6feb22', border: '1px solid #1f6feb',
                borderRadius: 6, padding: '4px 10px', color: '#58a6ff'
              }}>{signal.kill_zone.toUpperCase()} Kill Zone</span>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div style={{ fontSize: 11, color: '#8b949e', textAlign: 'center', marginBottom: 8 }}>
          🕐 Signal generated: {new Date(signal.timestamp).toUTCString()}
        </div>
        <div style={{
          fontSize: 11, color: '#8b949e', textAlign: 'center', padding: '12px',
          background: '#161b22', borderRadius: 8, lineHeight: 1.6
        }}>
          ⚠️ For educational purposes only.<br />
          Not financial advice. Always use proper risk management.<br />
          Never risk more than you can afford to lose.
        </div>
      </div>
    </div>
  );
}