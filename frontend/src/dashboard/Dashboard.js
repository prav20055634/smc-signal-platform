// dashboard/Dashboard.js
import React, { useState, useMemo } from 'react';
import Header     from '../components/Header';
import KillZoneBar from '../components/KillZoneBar';
import MarketRow  from '../components/MarketRow';
import SignalCard from '../components/SignalCard';
import useWebSocket from '../hooks/useWebSocket';

const PAIRS = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT',
               'ADAUSDT','DOGEUSDT','AVAXUSDT','LINKUSDT','MATICUSDT'];

const s = {
  page:   { minHeight:'100vh', background:'#0d1117' },
  body:   { display:'flex', gap:0, height:'calc(100vh - 92px)' },

  /* Left panel — market overview */
  left:   { width:200, background:'#0d1117', borderRight:'1px solid #21262d', padding:'12px 10px', overflowY:'auto', flexShrink:0 },
  leftTitle: { fontSize:11, color:'#8b949e', marginBottom:8, letterSpacing:1, textTransform:'uppercase', padding:'0 4px' },

  /* Center — signal feed */
  center: { flex:1, display:'flex', flexDirection:'column', overflowY:'auto', padding:'16px 20px' },
  filterBar: { display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' },
  filterBtn: { fontSize:12, padding:'4px 14px', borderRadius:6, border:'1px solid #30363d', background:'transparent', color:'#8b949e', cursor:'pointer' },
  filterActive: { background:'#1f6feb22', borderColor:'#1f6feb', color:'#58a6ff' },

  /* Right panel — stats */
  right:  { width:220, background:'#0d1117', borderLeft:'1px solid #21262d', padding:'14px', overflowY:'auto', flexShrink:0 },
  statCard: { background:'#161b22', border:'1px solid #30363d', borderRadius:8, padding:'12px', marginBottom:10 },
  statLabel: { fontSize:10, color:'#8b949e', marginBottom:4 },
  statVal:   { fontSize:20, fontWeight:700, color:'#e6edf3' },
  sectionTitle: { fontSize:11, color:'#8b949e', marginBottom:10, letterSpacing:1, textTransform:'uppercase' },
  empty: { color:'#8b949e', fontSize:13, textAlign:'center', marginTop:40 },
};

export default function Dashboard() {
  const { signals, snapshots, prices, connected } = useWebSocket();
  const [filter, setFilter] = useState('ALL');   // ALL | BUY | SELL | <pair>

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

  return (
    <div style={s.page}>
      <Header connected={connected} signalCount={signals.length} />
      <KillZoneBar />

      <div style={s.body}>

        {/* ─── LEFT: Market Overview ─────────────────────────── */}
        <div style={s.left}>
          <div style={s.leftTitle}>Market</div>
          {PAIRS.map(p => (
            <div key={p} onClick={() => setFilter(filter === p ? 'ALL' : p)}
                 style={{ cursor:'pointer', opacity: filter !== 'ALL' && filter !== p ? 0.5 : 1, marginBottom:6 }}>
              <MarketRow snap={snapshots[p]} price={prices[p]} />
            </div>
          ))}
        </div>

        {/* ─── CENTER: Signal Feed ───────────────────────────── */}
        <div style={s.center}>

          <div style={s.filterBar}>
            {['ALL','BUY','SELL'].map(f => (
              <button key={f} style={{ ...s.filterBtn, ...(filter===f ? s.filterActive : {}) }}
                      onClick={() => setFilter(f)}>{f}</button>
            ))}
            <span style={{ fontSize:12, color:'#8b949e', alignSelf:'center', marginLeft:8 }}>
              {filtered.length} signal{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filtered.length === 0
            ? <div style={s.empty}>No signals yet — scanner is warming up…</div>
            : filtered.map(sig => <SignalCard key={sig.id + sig.timestamp} signal={sig} />)
          }
        </div>

        {/* ─── RIGHT: Stats ──────────────────────────────────── */}
        <div style={s.right}>
          <div style={s.sectionTitle}>Stats</div>

          <div style={s.statCard}>
            <div style={s.statLabel}>Total Signals</div>
            <div style={s.statVal}>{signals.length}</div>
          </div>

          <div style={s.statCard}>
            <div style={s.statLabel}>BUY Signals</div>
            <div style={{ ...s.statVal, color:'#3fb950' }}>{buyCount}</div>
          </div>

          <div style={s.statCard}>
            <div style={s.statLabel}>SELL Signals</div>
            <div style={{ ...s.statVal, color:'#f85149' }}>{sellCount}</div>
          </div>

          <div style={s.statCard}>
            <div style={s.statLabel}>Avg R:R</div>
            <div style={{ ...s.statVal, color:'#f0883e' }}>1:{avgRR}</div>
          </div>

          <div style={{ marginTop:16, ...s.sectionTitle }}>Recent Pairs</div>
          {[...new Set(signals.slice(0,10).map(s=>s.pair))].map(p => (
            <div key={p} style={{ fontSize:12, color:'#e6edf3', marginBottom:4, padding:'4px 8px', background:'#161b22', borderRadius:4 }}>
              {p}
            </div>
          ))}

          <div style={{ marginTop:16, fontSize:10, color:'#8b949e', lineHeight:1.6 }}>
            ⚠️ For educational purposes only. Not financial advice. Always use proper risk management.
          </div>
        </div>

      </div>
    </div>
  );
}
