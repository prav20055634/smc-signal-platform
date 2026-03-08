// dashboard/Dashboard.js
import React, { useState, useMemo } from 'react';
import useWebSocket from '../hooks/useWebSocket';

const PAIRS = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT',
               'ADAUSDT','DOGEUSDT','AVAXUSDT','LINKUSDT','MATICUSDT'];

const PAIR_NAMES = {
  BTCUSDT:'Bitcoin',ETHUSDT:'Ethereum',BNBUSDT:'BNB',SOLUSDT:'Solana',
  XRPUSDT:'Ripple',ADAUSDT:'Cardano',DOGEUSDT:'Dogecoin',AVAXUSDT:'Avalanche',
  LINKUSDT:'Chainlink',MATICUSDT:'Polygon'
};

const PAIR_ICONS = {
  BTCUSDT:'₿',ETHUSDT:'Ξ',BNBUSDT:'◈',SOLUSDT:'◎',XRPUSDT:'✕',
  ADAUSDT:'₳',DOGEUSDT:'Ð',AVAXUSDT:'▲',LINKUSDT:'⬡',MATICUSDT:'⬟'
};

function fmt(n) {
  if (!n || n === 0) return '—';
  const num = Number(n);
  if (num > 10000) return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (num > 100)   return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (num > 1)     return '$' + num.toFixed(4);
  return '$' + num.toPrecision(4);
}

function calcTargets(entry, stop_loss, direction) {
  const risk = Math.abs(Number(entry) - Number(stop_loss));
  const e = Number(entry);
  if (direction === 'BUY') return { tp1: e + risk, tp2: e + risk * 2, tp3: e + risk * 3 };
  return { tp1: e - risk, tp2: e - risk * 2, tp3: e - risk * 3 };
}

function getKillZoneStatus() {
  const utcH = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  if (utcH >= 2  && utcH < 4)  return { name: 'Asian',         ist: '7:30–9:30 AM' };
  if (utcH >= 7  && utcH < 9)  return { name: 'London Open KZ ⭐', ist: '12:30–2:30 PM' };
  if (utcH >= 13 && utcH < 15) return { name: 'NY Open KZ ⭐',    ist: '6:30–8:30 PM' };
  if (utcH >= 20 && utcH < 22) return { name: 'Late NY',         ist: '1:30–3:30 AM' };
  return null;
}

function getSessions() {
  const utcH = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  return [
    { name:'Asian',          star:false, ist:'7:30 AM – 9:30 AM IST',   active: utcH>=2  && utcH<4  },
    { name:'London Open KZ', star:true,  ist:'12:30 PM – 2:30 PM IST',  active: utcH>=7  && utcH<9  },
    { name:'London Full',    star:false, ist:'12:30 PM – 8:30 PM IST',  active: utcH>=7  && utcH<15 },
    { name:'NY Open KZ',     star:true,  ist:'6:30 PM – 8:30 PM IST',   active: utcH>=13 && utcH<15 },
    { name:'Overlap 🔥',     star:false, ist:'6:30 PM – 8:30 PM IST',   active: utcH>=13 && utcH<15 },
  ];
}

export default function Dashboard() {
  const { signals, snapshots, prices, connected } = useWebSocket();
  const [tab, setTab]               = useState('home');
  const [filter, setFilter]         = useState('ALL');
  const [selectedSignal, setSelectedSignal] = useState(null);

  const kz       = getKillZoneStatus();
  const sessions = getSessions();
  const now      = new Date();
  const istTime  = now.toLocaleTimeString('en-IN', { timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const utcTime  = now.toLocaleTimeString('en-US', { timeZone:'UTC', hour:'2-digit', minute:'2-digit', second:'2-digit' });

  const filtered = useMemo(() => {
    if (filter === 'ALL') return signals;
    if (filter === 'BUY' || filter === 'SELL') return signals.filter(s => s.direction === filter);
    return signals.filter(s => s.pair === filter);
  }, [signals, filter]);

  if (selectedSignal) return <SignalDetailPage signal={selectedSignal} onBack={() => setSelectedSignal(null)} />;

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e17', color:'#e6edf3', fontFamily:"'SF Pro Display',-apple-system,sans-serif", paddingBottom:70 }}>

      {/* TOP BAR */}
      <div style={{ background:'#0d1117', borderBottom:'1px solid #21262d', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:20 }}>
        <div style={{ fontSize:17, fontWeight:700 }}>Dashboard</div>
        <div style={{ textAlign:'right' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:connected?'#3fb950':'#f85149', boxShadow:connected?'0 0 6px #3fb950':'none' }} />
            <span style={{ fontSize:12, color:connected?'#3fb950':'#f85149', fontWeight:600 }}>{kz ? kz.name.split(' ')[0]+' KZ' : 'LIVE'}</span>
          </div>
          <div style={{ fontSize:11, color:'#8b949e' }}>{istTime} IST</div>
          <div style={{ fontSize:10, color:'#8b949e' }}>{utcTime} GMT</div>
        </div>
      </div>

      {/* KILL ZONE BANNER */}
      {kz && (
        <div style={{ background:'linear-gradient(135deg,#0d2a1a,#0d1f0d)', border:'1px solid #3fb95044', margin:'10px 12px', borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#3fb950' }}>🎯 {kz.name.toUpperCase()} ACTIVE</div>
            <div style={{ fontSize:11, color:'#8b949e', marginTop:2 }}>{kz.ist} IST — HIGH PROBABILITY WINDOW</div>
          </div>
          <button onClick={() => setTab('signals')} style={{ background:'#3fb950', border:'none', borderRadius:8, color:'#0d1117', fontSize:12, fontWeight:700, padding:'6px 12px', cursor:'pointer' }}>
            Check Signal →
          </button>
        </div>
      )}

      {/* HOME */}
      {tab === 'home' && (
        <div style={{ padding:'0 12px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, margin:'12px 0' }}>
            {[{val:PAIRS.length,label:'TOTAL PAIRS',color:'#58a6ff'},{val:5,label:'STRATEGIES',color:'#f0883e'},{val:signals.length,label:'SIGNALS',color:'#3fb950'}].map(s=>(
              <div key={s.label} style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'12px 10px', textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:700, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:9, color:'#8b949e', marginTop:2, letterSpacing:0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'14px', marginBottom:12 }}>
            <div style={{ fontSize:11, color:'#8b949e', fontWeight:700, letterSpacing:1, marginBottom:10 }}>🕐 SESSION STATUS — IST</div>
            {sessions.map(s=>(
              <div key={s.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid #21262d33' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:s.active?'#3fb950':'#30363d', boxShadow:s.active?'0 0 6px #3fb950':'none' }} />
                  <span style={{ fontSize:13, color:s.active?'#e6edf3':'#8b949e', fontWeight:s.active?600:400 }}>{s.name}{s.star?' ⭐':''}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:11, color:'#8b949e' }}>{s.ist}</span>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5, background:s.active?'#3fb95022':'#21262d', color:s.active?'#3fb950':'#8b949e' }}>{s.active?'ACTIVE':'CLOSED'}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize:11, color:'#8b949e', fontWeight:700, letterSpacing:1, marginBottom:8 }}>💹 CRYPTO PAIRS</div>
          {PAIRS.map(pair=>{
            const price=prices[pair]; const snap=snapshots[pair];
            const chg=snap?.change_pct||0; const bias=snap?.bias||'RANGING'; const isUp=chg>=0;
            return (
              <div key={pair} onClick={()=>{ setFilter(pair); setTab('signals'); }} style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'12px 14px', marginBottom:8, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:'#21262d', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{PAIR_ICONS[pair]}</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700 }}>{pair.replace('USDT','/USDT')}</div>
                    <div style={{ fontSize:11, color:'#8b949e' }}>{PAIR_NAMES[pair]}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:15, fontWeight:700 }}>{price?fmt(price):'—'}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                    <span style={{ fontSize:12, color:isUp?'#3fb950':'#f85149', fontWeight:600 }}>{isUp?'▲':'▼'} {Math.abs(chg).toFixed(2)}%</span>
                    <span style={{ fontSize:10, color:bias==='BEARISH'?'#f85149':bias==='BULLISH'?'#3fb950':'#8b949e', background:'#21262d', borderRadius:4, padding:'1px 6px' }}>{bias}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SCANNER */}
      {tab === 'scanner' && (
        <div style={{ padding:'16px 12px' }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>📡 Scanner Status</div>
          <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'16px', marginBottom:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[{label:'Status',val:connected?'🟢 LIVE':'🔴 Offline',color:connected?'#3fb950':'#f85149'},{label:'Pairs',val:'10',color:'#58a6ff'},{label:'Interval',val:'200ms',color:'#f0883e'},{label:'Cooldown',val:'10 min',color:'#e6edf3'},{label:'Min R:R',val:'1:1',color:'#3fb950'},{label:'Timeframe',val:'4H',color:'#e6edf3'}].map(item=>(
                <div key={item.label} style={{ background:'#0d1117', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:'#8b949e', marginBottom:4 }}>{item.label}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:item.color }}>{item.val}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'16px' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#58a6ff', marginBottom:10 }}>🔍 SMC Conditions</div>
            {['BOS — Break of Structure','CHOCH — Change of Character','Order Blocks (OB)','Fair Value Gap (FVG)','Liquidity Sweep','ICT Kill Zones','Fibonacci OTE (0.618–0.79)'].map(s=>(
              <div key={s} style={{ fontSize:12, color:'#8b949e', padding:'7px 0', borderBottom:'1px solid #21262d22' }}>✅ {s}</div>
            ))}
          </div>
        </div>
      )}

      {/* SIGNALS */}
      {tab === 'signals' && (
        <div style={{ padding:'12px' }}>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            {['ALL','BUY','SELL'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ fontSize:12, padding:'5px 16px', borderRadius:6, border:'1px solid', cursor:'pointer', background:filter===f?'#1f6feb22':'transparent', borderColor:filter===f?'#1f6feb':'#30363d', color:filter===f?'#58a6ff':'#8b949e' }}>{f}</button>
            ))}
            <span style={{ fontSize:12, color:'#8b949e', alignSelf:'center', marginLeft:4 }}>{filtered.length} signals</span>
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'50px 20px' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>⏳</div>
              <div style={{ fontSize:15, color:'#e6edf3', marginBottom:6 }}>No signals yet</div>
              <div style={{ fontSize:12, color:'#8b949e', marginBottom:12 }}>Scanner is warming up…</div>
              <div style={{ fontSize:11, color:'#58a6ff', background:'#1f6feb11', borderRadius:8, padding:'10px', lineHeight:1.8 }}>
                Best times (IST):<br/>🇬🇧 London: 12:30–2:30 PM<br/>🇺🇸 NY Open: 6:30–8:30 PM
              </div>
            </div>
          ) : filtered.map(sig=>(
            <SignalCardCompact key={sig.id+sig.timestamp} signal={sig} onClick={()=>setSelectedSignal(sig)} />
          ))}
        </div>
      )}

      {/* PORTFOLIO */}
      {tab === 'portfolio' && (
        <div style={{ padding:'16px 12px' }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>💼 Portfolio</div>
          <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'20px', marginBottom:12, textAlign:'center' }}>
            <div style={{ fontSize:13, color:'#8b949e', marginBottom:6 }}>Total Signals Generated</div>
            <div style={{ fontSize:48, fontWeight:700, color:'#58a6ff' }}>{signals.length}</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[{label:'BUY Signals',val:signals.filter(s=>s.direction==='BUY').length,color:'#3fb950'},{label:'SELL Signals',val:signals.filter(s=>s.direction==='SELL').length,color:'#f85149'},{label:'Avg R:R',val:signals.length?`1:${(signals.reduce((a,s)=>a+(s.rr_ratio||0),0)/signals.length).toFixed(2)}`:'—',color:'#f0883e'},{label:'Active Pairs',val:[...new Set(signals.map(s=>s.pair))].length,color:'#58a6ff'}].map(item=>(
              <div key={item.label} style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'#8b949e', marginBottom:6 }}>{item.label}</div>
                <div style={{ fontSize:28, fontWeight:700, color:item.color }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MORE */}
      {tab === 'more' && (
        <div style={{ padding:'16px 12px' }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>⚙️ More</div>
          {[{icon:'🌐',label:'Backend',val:'Render.com'},{icon:'📊',label:'Data Source',val:'Binance WS'},{icon:'🔄',label:'Auto Reconnect',val:'3 seconds'},{icon:'⏱️',label:'Signal Cooldown',val:'10 minutes'},{icon:'📈',label:'Strategy',val:'SMC'}].map(item=>(
            <div key={item.label} style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'14px 16px', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }}>{item.icon}</span>
                <span style={{ fontSize:13, color:'#8b949e' }}>{item.label}</span>
              </div>
              <span style={{ fontSize:12, color:'#e6edf3', fontWeight:600 }}>{item.val}</span>
            </div>
          ))}
          <div style={{ marginTop:16, fontSize:11, color:'#8b949e', textAlign:'center', lineHeight:1.8 }}>⚠️ For educational purposes only.<br/>Not financial advice.</div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'#161b22', borderTop:'1px solid #21262d', display:'flex', zIndex:30 }}>
        {[{id:'home',icon:'🏠',label:'Home'},{id:'scanner',icon:'🔍',label:'Scanner'},{id:'signals',icon:'🎯',label:'Signals'},{id:'portfolio',icon:'💼',label:'Portfolio'},{id:'more',icon:'☰',label:'More'}].map(nav=>(
          <button key={nav.id} onClick={()=>setTab(nav.id)} style={{ flex:1, padding:'10px 4px', background:'transparent', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            <span style={{ fontSize:20 }}>{nav.icon}</span>
            <span style={{ fontSize:10, fontWeight:600, color:tab===nav.id?'#58a6ff':'#8b949e' }}>{nav.label}</span>
            {tab===nav.id && <div style={{ width:20, height:2, background:'#58a6ff', borderRadius:2 }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

// COMPACT SIGNAL CARD
function SignalCardCompact({ signal, onClick }) {
  const dir=signal.direction; const color=dir==='BUY'?'#3fb950':'#f85149';
  const targets=calcTargets(signal.entry,signal.stop_loss,dir);
  return (
    <div onClick={onClick} style={{ background:'#161b22', border:`1px solid ${color}33`, borderLeft:`4px solid ${color}`, borderRadius:10, padding:'14px', marginBottom:10, cursor:'pointer' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:15, fontWeight:700 }}>{signal.pair}</span>
          <span style={{ fontSize:11, fontWeight:700, borderRadius:5, padding:'2px 10px', color, background:`${color}22` }}>{dir}</span>
          {signal.kill_zone && <span style={{ fontSize:10, color:'#58a6ff', background:'#1f6feb22', borderRadius:4, padding:'1px 7px' }}>{signal.kill_zone.toUpperCase()} KZ</span>}
        </div>
        <span style={{ fontSize:12, color:'#f0883e', fontWeight:700 }}>1:{signal.rr_ratio} R:R</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
        <div style={{ background:'#0d1117', borderRadius:8, padding:'8px 10px' }}>
          <div style={{ fontSize:10, color:'#8b949e', marginBottom:2 }}>ENTRY</div>
          <div style={{ fontSize:14, fontWeight:700 }}>{fmt(signal.entry)}</div>
        </div>
        <div style={{ background:'#0d1117', borderRadius:8, padding:'8px 10px' }}>
          <div style={{ fontSize:10, color:'#8b949e', marginBottom:2 }}>STOP LOSS</div>
          <div style={{ fontSize:14, fontWeight:700, color:'#f85149' }}>{fmt(signal.stop_loss)}</div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
        {[['TP1',targets.tp1,'1:1'],['TP2',targets.tp2,'1:2'],['TP3',targets.tp3,'1:3']].map(([label,price,rr])=>(
          <div key={label} style={{ background:'#0d2a1a', borderRadius:7, padding:'6px 8px', border:'1px solid #3fb95033' }}>
            <div style={{ fontSize:9, color:'#8b949e', marginBottom:2 }}>{label} ({rr})</div>
            <div style={{ fontSize:11, fontWeight:700, color:'#3fb950' }}>{fmt(price)}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:10, color:'#8b949e', marginTop:8 }}>Tap for full trade plan →</div>
    </div>
  );
}

// SIGNAL DETAIL PAGE
function SignalDetailPage({ signal, onBack }) {
  const dir=signal.direction; const color=dir==='BUY'?'#3fb950':'#f85149';
  const targets=calcTargets(signal.entry,signal.stop_loss,dir);
  return (
    <div style={{ minHeight:'100vh', background:'#0a0e17', color:'#e6edf3', fontFamily:"'SF Pro Display',-apple-system,sans-serif" }}>
      <div style={{ background:'#161b22', borderBottom:'1px solid #21262d', padding:'12px 16px', display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, zIndex:10 }}>
        <button onClick={onBack} style={{ background:'#21262d', border:'1px solid #30363d', borderRadius:8, color:'#e6edf3', padding:'6px 14px', fontSize:13, cursor:'pointer' }}>← Back</button>
        <span style={{ fontSize:16, fontWeight:700 }}>{signal.pair}</span>
        <span style={{ fontSize:12, fontWeight:700, borderRadius:5, padding:'2px 12px', color, background:`${color}22`, border:`1px solid ${color}44` }}>{dir}</span>
        {signal.kill_zone && <span style={{ fontSize:11, borderRadius:5, padding:'2px 8px', color:'#58a6ff', background:'#1f6feb22' }}>{signal.kill_zone.toUpperCase()} KZ</span>}
      </div>
      <div style={{ padding:'16px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          <div style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:10, padding:'16px' }}>
            <div style={{ fontSize:11, color:'#8b949e', marginBottom:6 }}>📍 ENTRY PRICE</div>
            <div style={{ fontSize:24, fontWeight:700 }}>{fmt(signal.entry)}</div>
          </div>
          <div style={{ background:'#161b22', border:'1px solid #f8514944', borderRadius:10, padding:'16px' }}>
            <div style={{ fontSize:11, color:'#8b949e', marginBottom:6 }}>🛑 STOP LOSS</div>
            <div style={{ fontSize:24, fontWeight:700, color:'#f85149' }}>{fmt(signal.stop_loss)}</div>
            <div style={{ fontSize:11, color:'#8b949e', marginTop:4 }}>Risk: 1%</div>
          </div>
        </div>
        <div style={{ fontSize:13, color:'#8b949e', fontWeight:700, marginBottom:8 }}>🎯 TAKE PROFIT TARGETS</div>
        {[{label:'TP1',price:targets.tp1,rr:'1:1',reward:'1.0%',desc:'Move SL to entry → Risk Free!'},{label:'TP2',price:targets.tp2,rr:'1:2',reward:'2.0%',desc:'Take 50% profit here'},{label:'TP3',price:targets.tp3,rr:'1:3',reward:'3.0%',desc:'Exit remaining position'}].map(tp=>(
          <div key={tp.label} style={{ background:'#0d2a1a', border:'1px solid #3fb95044', borderLeft:'4px solid #3fb950', borderRadius:10, padding:'14px', marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:12, fontWeight:700, background:'#3fb95022', color:'#3fb950', borderRadius:5, padding:'2px 10px' }}>{tp.label}</span>
                <span style={{ fontSize:12, color:'#8b949e' }}>{tp.rr}</span>
              </div>
              <span style={{ fontSize:12, color:'#3fb950', fontWeight:700 }}>+{tp.reward}</span>
            </div>
            <div style={{ fontSize:22, fontWeight:700, color:'#3fb950', marginBottom:4 }}>{fmt(tp.price)}</div>
            <div style={{ fontSize:11, color:'#8b949e' }}>📌 {tp.desc}</div>
          </div>
        ))}
        <div style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:10, padding:'14px', marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#8b949e', marginBottom:10 }}>💰 RISK MANAGEMENT</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[{label:'Risk/Trade',val:'1%',color:'#f85149'},{label:'Max Reward',val:'3%',color:'#3fb950'},{label:'R:R Ratio',val:`1:${signal.rr_ratio}`,color:'#f0883e'},{label:'Timeframe',val:signal.timeframe||'4H',color:'#58a6ff'}].map(item=>(
              <div key={item.label} style={{ background:'#0d1117', borderRadius:8, padding:'10px 12px' }}>
                <div style={{ fontSize:10, color:'#8b949e', marginBottom:4 }}>{item.label}</div>
                <div style={{ fontSize:18, fontWeight:700, color:item.color }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:10, padding:'14px', marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#58a6ff', marginBottom:10 }}>📋 STEP BY STEP PLAN</div>
          {[`1️⃣ Enter ${dir} at ${fmt(signal.entry)}`,`2️⃣ Stop Loss at ${fmt(signal.stop_loss)} (Risk: 1%)`,`3️⃣ TP1 at ${fmt(targets.tp1)} → Move SL to entry`,`4️⃣ TP2 at ${fmt(targets.tp2)} → Take 50% profit (+2%)`,`5️⃣ TP3 at ${fmt(targets.tp3)} → Exit fully (+3%)`].map((step,i)=>(
            <div key={i} style={{ fontSize:13, color:'#e6edf3', padding:'8px 0', borderBottom:i<4?'1px solid #21262d':'none', lineHeight:1.6 }}>{step}</div>
          ))}
        </div>
        <div style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:10, padding:'14px', marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#8b949e', marginBottom:10 }}>🔍 CONFLUENCE</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {(signal.confluence||[]).map((c,i)=>(
              <span key={i} style={{ fontSize:12, background:'#21262d', border:'1px solid #30363d', borderRadius:6, padding:'4px 10px', color:'#e6edf3' }}>{c}</span>
            ))}
            {signal.kill_zone && <span style={{ fontSize:12, background:'#1f6feb22', border:'1px solid #1f6feb', borderRadius:6, padding:'4px 10px', color:'#58a6ff' }}>{signal.kill_zone.toUpperCase()} Kill Zone</span>}
          </div>
        </div>
        <div style={{ fontSize:11, color:'#8b949e', textAlign:'center', lineHeight:1.8, padding:'12px', background:'#161b22', borderRadius:8 }}>
          ⚠️ For educational purposes only. Not financial advice.<br/>Always use proper risk management.
        </div>
      </div>
    </div>
  );
}