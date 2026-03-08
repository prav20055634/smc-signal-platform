// components/SignalCard.js
import React, { useState } from 'react';

const DIR_COLOR = { BUY: '#3fb950', SELL: '#f85149' };

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
    return {
      tp1: e + risk * 1.0,   // 1:1
      tp2: e + risk * 2.0,   // 1:2
      tp3: e + risk * 3.0,   // 1:3
    };
  } else {
    return {
      tp1: e - risk * 1.0,
      tp2: e - risk * 2.0,
      tp3: e - risk * 3.0,
    };
  }
}

export default function SignalCard({ signal }) {
  const [expanded, setExpanded] = useState(false);
  if (!signal) return null;

  const dir = signal.direction;
  const color = DIR_COLOR[dir];
  const targets = calcTargets(signal.entry, signal.stop_loss, dir);
  const riskPct = 1.0;
  const reward2 = (riskPct * 2).toFixed(1);
  const reward3 = (riskPct * 3).toFixed(1);

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: dir === 'BUY' ? 'rgba(63,185,80,0.08)' : 'rgba(248,81,73,0.08)',
        border: `1px solid ${color}44`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 10,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {/* ── TOP ROW ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#e6edf3' }}>{signal.pair}</span>
          <span style={{
            fontSize: 12, fontWeight: 700, borderRadius: 5, padding: '2px 10px',
            color: color, background: `${color}22`, border: `1px solid ${color}44`
          }}>{dir}</span>
          {signal.kill_zone && (
            <span style={{
              fontSize: 11, borderRadius: 5, padding: '2px 8px',
              color: '#58a6ff', background: '#1f6feb22', border: '1px solid #1f6feb44'
            }}>{signal.kill_zone.toUpperCase()} KZ</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f0883e' }}>R:R 1:{signal.rr_ratio}</span>
          <span style={{ fontSize: 12, color: '#8b949e' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* ── ENTRY / SL ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: 10 }}>
        <div style={{ background: '#0d1117', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 3 }}>ENTRY</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3' }}>${fmt(signal.entry)}</div>
        </div>
        <div style={{ background: '#0d1117', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 3 }}>STOP LOSS</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f85149' }}>${fmt(signal.stop_loss)}</div>
        </div>
      </div>

      {/* ── TP1 / TP2 / TP3 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: 10 }}>
        <div style={{ background: '#0d1117', borderRadius: 8, padding: '8px 12px', border: '1px solid #3fb95033' }}>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 3 }}>TP1 <span style={{ color: '#3fb950' }}>1:1</span></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#3fb950' }}>${fmt(targets.tp1)}</div>
          <div style={{ fontSize: 10, color: '#8b949e', marginTop: 2 }}>+{reward2}% reward</div>
        </div>
        <div style={{ background: '#0d1117', borderRadius: 8, padding: '8px 12px', border: '1px solid #3fb95055' }}>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 3 }}>TP2 <span style={{ color: '#3fb950' }}>1:2</span></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#3fb950' }}>${fmt(targets.tp2)}</div>
          <div style={{ fontSize: 10, color: '#8b949e', marginTop: 2 }}>+{reward2}% reward</div>
        </div>
        <div style={{ background: '#0d1117', borderRadius: 8, padding: '8px 12px', border: '1px solid #3fb95077' }}>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 3 }}>TP3 <span style={{ color: '#3fb950' }}>1:3</span></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#3fb950' }}>${fmt(targets.tp3)}</div>
          <div style={{ fontSize: 10, color: '#8b949e', marginTop: 2 }}>+{reward3}% reward</div>
        </div>
      </div>

      {/* ── RISK INFO ── */}
      <div style={{
        background: '#0d1117', borderRadius: 8, padding: '8px 12px',
        marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ fontSize: 11, color: '#8b949e' }}>
          💰 Risk per trade: <span style={{ color: '#f85149', fontWeight: 700 }}>{riskPct}%</span>
        </div>
        <div style={{ fontSize: 11, color: '#8b949e' }}>
          🎯 Max reward: <span style={{ color: '#3fb950', fontWeight: 700 }}>{reward3}%</span>
        </div>
      </div>

      {/* ── CONFLUENCE TAGS ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {(signal.confluence || []).map((c, i) => (
          <span key={i} style={{
            fontSize: 10, background: '#1f2937', border: '1px solid #30363d',
            borderRadius: 4, padding: '2px 7px', color: '#8b949e'
          }}>{c}</span>
        ))}
      </div>

      {/* ── EXPANDED DETAIL ── */}
      {expanded && (
        <div style={{
          marginTop: 12, borderTop: '1px solid #30363d', paddingTop: 12,
          animation: 'fadeIn 0.2s ease'
        }}>
          {/* Trade Plan */}
          <div style={{ fontSize: 11, color: '#58a6ff', fontWeight: 700, marginBottom: 8 }}>
            📋 TRADE PLAN
          </div>
          <div style={{ background: '#0d1117', borderRadius: 8, padding: '12px', marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.8 }}>
              <div>1️⃣ Enter at <span style={{ color: '#e6edf3', fontWeight: 700 }}>${fmt(signal.entry)}</span></div>
              <div>🛑 Stop Loss at <span style={{ color: '#f85149', fontWeight: 700 }}>${fmt(signal.stop_loss)}</span> (Risk {riskPct}%)</div>
              <div>🎯 TP1 at <span style={{ color: '#3fb950', fontWeight: 700 }}>${fmt(targets.tp1)}</span> → move SL to entry</div>
              <div>🎯 TP2 at <span style={{ color: '#3fb950', fontWeight: 700 }}>${fmt(targets.tp2)}</span> → take 50% profit</div>
              <div>🎯 TP3 at <span style={{ color: '#3fb950', fontWeight: 700 }}>${fmt(targets.tp3)}</span> → take remaining</div>
            </div>
          </div>

          {/* Signal Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: '#0d1117', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 3 }}>TIMEFRAME</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>{signal.timeframe || '4H'}</div>
            </div>
            <div style={{ background: '#0d1117', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 3 }}>STRATEGY</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>{signal.strategy || 'SMC'}</div>
            </div>
          </div>

          <div style={{ fontSize: 10, color: '#8b949e', marginTop: 10, textAlign: 'center' }}>
            🕐 {new Date(signal.timestamp).toUTCString()}
          </div>
          <div style={{ fontSize: 10, color: '#8b949e', textAlign: 'center', marginTop: 4 }}>
            ⚠️ For educational purposes only. Always use proper risk management.
          </div>
        </div>
      )}

      {!expanded && (
        <div style={{ fontSize: 10, color: '#8b949e', marginTop: 4 }}>
          🕐 {new Date(signal.timestamp).toUTCString()} • Tap for full trade plan
        </div>
      )}
    </div>
  );
}