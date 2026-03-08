// components/SignalCard.js
import React from 'react';

const DIR_COLOR = { BUY: '#3fb950', SELL: '#f85149' };
const DIR_BG    = { BUY: 'rgba(63,185,80,0.12)', SELL: 'rgba(248,81,73,0.12)' };

const s = {
  card: {
    background: '#161b22', border: '1px solid #30363d',
    borderRadius: 10, padding: '14px 16px', marginBottom: 8,
    borderLeft: '3px solid',
    transition: 'background 0.2s',
  },
  top:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pair:   { fontSize: 15, fontWeight: 700, color: '#e6edf3' },
  dir:    { fontSize: 13, fontWeight: 700, borderRadius: 4, padding: '2px 10px' },
  grid:   { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px 12px', marginBottom: 8 },
  label:  { fontSize: 10, color: '#8b949e', marginBottom: 2 },
  value:  { fontSize: 13, fontWeight: 600, color: '#e6edf3' },
  conf:   { display: 'flex', flexWrap: 'wrap', gap: 4 },
  tag:    { fontSize: 10, background: '#1f2937', border: '1px solid #30363d', borderRadius: 4, padding: '1px 7px', color: '#8b949e' },
  time:   { fontSize: 10, color: '#8b949e', marginTop: 6 },
  rr:     { fontSize: 13, fontWeight: 700, color: '#f0883e' },
};

function fmt(n) {
  if (!n) return '—';
  const num = Number(n);
  if (num > 1000) return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return num.toPrecision(6);
}

export default function SignalCard({ signal }) {
  if (!signal) return null;
  const dir = signal.direction;
  return (
    <div style={{ ...s.card, borderLeftColor: DIR_COLOR[dir], background: DIR_BG[dir] }}>
      <div style={s.top}>
        <span style={s.pair}>{signal.pair}</span>
        <span style={{ ...s.dir, color: DIR_COLOR[dir], background: `${DIR_COLOR[dir]}22` }}>{dir}</span>
      </div>

      <div style={s.grid}>
        <div>
          <div style={s.label}>ENTRY</div>
          <div style={s.value}>${fmt(signal.entry)}</div>
        </div>
        <div>
          <div style={s.label}>STOP LOSS</div>
          <div style={{ ...s.value, color: '#f85149' }}>${fmt(signal.stop_loss)}</div>
        </div>
        <div>
          <div style={s.label}>TAKE PROFIT</div>
          <div style={{ ...s.value, color: '#3fb950' }}>${fmt(signal.take_profit)}</div>
        </div>
        <div>
          <div style={s.label}>R:R RATIO</div>
          <div style={s.rr}>1:{signal.rr_ratio}</div>
        </div>
      </div>

      <div style={s.conf}>
        {(signal.confluence || []).map((c, i) => <span key={i} style={s.tag}>{c}</span>)}
        {signal.kill_zone && <span style={{ ...s.tag, background: '#1f6feb22', color: '#58a6ff', borderColor: '#1f6feb' }}>{signal.kill_zone.toUpperCase()} KZ</span>}
      </div>

      <div style={s.time}>
        {signal.timeframe}  •  {signal.strategy}  •  {new Date(signal.timestamp).toUTCString()}
      </div>
    </div>
  );
}
