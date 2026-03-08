// components/MarketRow.js
import React from 'react';

const BIAS_COLOR = { BULLISH: '#3fb950', BEARISH: '#f85149', RANGING: '#8b949e' };

const s = {
  card: {
    background: '#161b22', border: '1px solid #30363d',
    borderRadius: 8, padding: '10px 14px',
    display: 'flex', flexDirection: 'column', gap: 4,
    minWidth: 140,
  },
  pair:  { fontSize: 13, fontWeight: 700, color: '#e6edf3' },
  price: { fontSize: 15, fontWeight: 600, color: '#e6edf3' },
  row:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  small: { fontSize: 11, color: '#8b949e' },
  kz:    { fontSize: 10, background: '#1f6feb', color:'#fff', borderRadius:4, padding:'1px 6px' },
};

export default function MarketRow({ snap, price }) {
  if (!snap) return null;
  const bias  = snap.htf_bias || 'RANGING';
  const chg   = snap.change_24h || 0;
  const chgColor = chg >= 0 ? '#3fb950' : '#f85149';

  return (
    <div style={s.card}>
      <div style={s.row}>
        <span style={s.pair}>{snap.pair}</span>
        {snap.active_kz && <span style={s.kz}>{snap.active_kz.toUpperCase()}</span>}
      </div>
      <span style={s.price}>${Number(price || snap.price || 0).toLocaleString('en-US', {maximumFractionDigits: 4})}</span>
      <div style={s.row}>
        <span style={{ ...s.small, color: chgColor }}>{chg >= 0 ? '+' : ''}{chg}%</span>
        <span style={{ ...s.small, color: BIAS_COLOR[bias], fontWeight: 600 }}>{bias}</span>
      </div>
    </div>
  );
}
