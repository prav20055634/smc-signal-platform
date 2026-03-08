// components/KillZoneBar.js
import React, { useState, useEffect } from 'react';

const ZONES = [
  { name: 'Asian',    start: 2,  end: 4,  color: '#8b949e' },
  { name: 'London',   start: 7,  end: 9,  color: '#1f6feb' },
  { name: 'NY Open',  start: 13, end: 15, color: '#3fb950' },
  { name: 'Late NY',  start: 20, end: 22, color: '#f0883e' },
];

const s = {
  bar:    { display:'flex', gap:8, padding:'8px 24px', background:'#0d1117', borderBottom:'1px solid #21262d', alignItems:'center', flexWrap:'wrap' },
  label:  { fontSize:11, color:'#8b949e', marginRight:4 },
  zone:   { display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:6, border:'1px solid #30363d', fontSize:11 },
  dot:    { width:7, height:7, borderRadius:'50%' },
  clock:  { marginLeft:'auto', fontSize:12, color:'#8b949e', fontFamily:'monospace' },
};

export default function KillZoneBar() {
  const [utcHour, setUtcHour] = useState(new Date().getUTCHours());
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setUtcHour(n.getUTCHours());
      setUtcTime(n.toUTCString().split(' ')[4] + ' UTC');
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={s.bar}>
      <span style={s.label}>ICT Kill Zones:</span>
      {ZONES.map(z => {
        const active = utcHour >= z.start && utcHour < z.end;
        return (
          <div key={z.name} style={{ ...s.zone, borderColor: active ? z.color : '#30363d', background: active ? `${z.color}18` : 'transparent' }}>
            <div style={{ ...s.dot, background: active ? z.color : '#30363d', boxShadow: active ? `0 0 5px ${z.color}` : 'none' }} />
            <span style={{ color: active ? z.color : '#8b949e', fontWeight: active ? 700 : 400 }}>
              {z.name} {z.start}:00–{z.end}:00
            </span>
          </div>
        );
      })}
      <span style={s.clock}>{utcTime}</span>
    </div>
  );
}
