// components/Header.js
import React from 'react';

const styles = {
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 24px',
    background: 'linear-gradient(90deg,#161b22 0%,#1a2030 100%)',
    borderBottom: '1px solid #30363d',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 20, fontWeight: 700, letterSpacing: 1,
    color: '#58a6ff',
  },
  dot: {
    width: 10, height: 10, borderRadius: '50%',
    background: '#3fb950', boxShadow: '0 0 6px #3fb950',
  },
  dotRed: { background: '#f85149', boxShadow: '0 0 6px #f85149' },
  status: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8b949e' },
  badge: {
    background: '#1f2937', border: '1px solid #30363d',
    borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#e6edf3',
  },
};

export default function Header({ connected, signalCount }) {
  return (
    <div style={styles.header}>
      <div style={styles.logo}>
        <span>⚡</span>
        <span>SMC Signal Platform</span>
      </div>
      <div style={styles.status}>
        <div style={{ ...styles.dot, ...(connected ? {} : styles.dotRed) }} />
        <span>{connected ? 'LIVE' : 'CONNECTING…'}</span>
        <div style={styles.badge}>10 Pairs</div>
        <div style={styles.badge}>{signalCount} Signals</div>
      </div>
    </div>
  );
}
