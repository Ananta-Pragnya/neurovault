// NEUROVAULT — Live Market Pulse Dashboard
// Meridian aesthetic: data-dense, monospaced, teal accent

import React, { useEffect, useState } from 'react';

interface MarketPulse {
  symbol: string;
  timestamp: number;
  last_price: number;
  regime: 'unknown' | 'compressed' | 'normal' | 'stressed' | 'crisis' | 'transition';
  regime_confidence: number;
  realized_vol_instant: number;
  realized_vol_hourly: number;
  realized_vol_daily: number;
  vol_of_vol: number;
  bid_ask_spread_bps: number;
  tick_velocity: number;
  volume_surge_ratio: number;
  regime_changed: boolean;
  regime_age_seconds: number;
  tail_risk_score: number;
  liquidity_stress: number;
  requires_attention: boolean;
}

const MONO = "'IBM Plex Mono', monospace";

const REGIME_CONFIG = {
  unknown: {
    label: 'UNKNOWN',
    abbr: 'UNK',
    color:  '#505060',
    bg:     'rgba(80,80,96,0.08)',
    border: '#2A2A3A',
    glow:   'none',
    bar:    '#2A2A3A',
    icon:   '○',
    tip:    'Insufficient data',
  },
  compressed: {
    label: 'COMPRESSED',
    abbr: 'CMPRS',
    color:  '#00CC88',
    bg:     'rgba(0,204,136,0.06)',
    border: 'rgba(0,204,136,0.2)',
    glow:   '0 0 12px rgba(0,204,136,0.12)',
    bar:    '#00CC88',
    icon:   '▼',
    tip:    'BUY convexity',
  },
  normal: {
    label: 'NORMAL',
    abbr: 'NORM',
    color:  '#4D9FFF',
    bg:     'rgba(77,159,255,0.06)',
    border: 'rgba(77,159,255,0.2)',
    glow:   '0 0 12px rgba(77,159,255,0.12)',
    bar:    '#4D9FFF',
    icon:   '●',
    tip:    'Selective trading',
  },
  stressed: {
    label: 'STRESSED',
    abbr: 'STRS',
    color:  '#FF8C00',
    bg:     'rgba(255,140,0,0.06)',
    border: 'rgba(255,140,0,0.2)',
    glow:   '0 0 12px rgba(255,140,0,0.12)',
    bar:    '#FF8C00',
    icon:   '▲',
    tip:    'SELL premium carefully',
  },
  crisis: {
    label: 'CRISIS',
    abbr: 'CRIS',
    color:  '#FF3055',
    bg:     'rgba(255,48,85,0.08)',
    border: 'rgba(255,48,85,0.3)',
    glow:   '0 0 16px rgba(255,48,85,0.18)',
    bar:    '#FF3055',
    icon:   '■',
    tip:    'Pure defense',
  },
  transition: {
    label: 'TRANSITION',
    abbr: 'TRNS',
    color:  '#9B6DFF',
    bg:     'rgba(155,109,255,0.08)',
    border: 'rgba(155,109,255,0.25)',
    glow:   '0 0 14px rgba(155,109,255,0.15)',
    bar:    '#9B6DFF',
    icon:   '◆',
    tip:    'HALT trades',
  },
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div style={{ position: 'relative', height: '2px', background: 'rgba(255,255,255,0.06)', flex: 1 }}>
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        height: '100%',
        width: `${pct}%`,
        background: color,
        transition: 'width 0.5s ease',
      }} />
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
      <span style={{ fontSize: '8px', color: '#383848', letterSpacing: '0.1em', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: '9px',
        fontWeight: warn ? 700 : 400,
        color: warn ? '#FF3055' : '#707080',
        letterSpacing: '0.05em',
        textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  );
}

export const MarketPulseDashboard: React.FC = () => {
  const [pulseData, setPulseData] = useState<Record<string, MarketPulse>>({});
  const [flashingSymbols, setFlashingSymbols] = useState<Set<string>>(new Set());
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/pulse/state`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.state) return;
        const seeded: Record<string, MarketPulse> = {};
        for (const [sym, s] of Object.entries(data.state as Record<string, any>)) {
          seeded[sym] = {
            symbol: sym,
            timestamp: data.timestamp,
            last_price: s.last_price ?? 0,
            regime: s.regime ?? 'unknown',
            regime_confidence: s.confidence ?? 0,
            realized_vol_instant: 0,
            realized_vol_hourly: 0,
            realized_vol_daily: s.realized_vol_daily ?? 0,
            vol_of_vol: 0,
            bid_ask_spread_bps: 0,
            tick_velocity: 0,
            volume_surge_ratio: 1,
            regime_changed: false,
            regime_age_seconds: 0,
            tail_risk_score: s.tail_risk_score ?? 0,
            liquidity_stress: 0,
            requires_attention: s.requires_attention ?? false,
          };
        }
        setPulseData(prev => ({ ...seeded, ...prev }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const wsBase = (API_BASE).replace('https://', 'wss://').replace('http://', 'ws://');
    const socket = new WebSocket(`${wsBase}/ws/data-hub`);

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'market_pulse') {
          const pulse = msg.data as MarketPulse;
          setPulseData(prev => ({ ...prev, [pulse.symbol]: pulse }));
          if (pulse.regime_changed) {
            setFlashingSymbols(prev => new Set(prev).add(pulse.symbol));
            setTimeout(() => {
              setFlashingSymbols(prev => {
                const next = new Set(prev);
                next.delete(pulse.symbol);
                return next;
              });
            }, 2500);
          }
        }
      } catch { /* ignore */ }
    };

    return () => { socket.close(); };
  }, []);

  const symbols = Object.keys(pulseData).sort();

  if (symbols.length === 0) {
    return (
      <div style={{
        padding: '12px 16px',
        marginBottom: '0',
        background: '#0C0C10',
        borderBottom: '1px solid #1C1C26',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: MONO,
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#FF8C00',
          animation: 'nvPulse 1.5s ease-in-out infinite',
        }} />
        <span style={{ fontSize: '8px', color: '#505060', letterSpacing: '0.2em' }}>
          CONNECTING TO MARKET PULSE STREAM...
        </span>
        <style>{`@keyframes nvPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>
    );
  }

  // Count regimes for summary
  const regimeCounts: Record<string, number> = {};
  symbols.forEach(s => {
    const r = pulseData[s].regime;
    regimeCounts[r] = (regimeCounts[r] || 0) + 1;
  });

  return (
    <div style={{
      background: '#080809',
      borderBottom: '1px solid #1C1C26',
      fontFamily: MONO,
    }}>
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid #1C1C26',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
            <div style={{ width: '2px', height: '10px', background: '#00E8C8', boxShadow: '0 0 6px rgba(0,232,200,0.6)' }} />
            <div style={{ width: '2px', height: '10px', background: 'rgba(0,232,200,0.3)' }} />
          </div>
          <span style={{ fontSize: '8px', fontWeight: 600, color: '#A0A0B8', letterSpacing: '0.2em' }}>
            LIVE MARKET PULSE
          </span>
          <span style={{ fontSize: '7px', color: '#383848', letterSpacing: '0.15em' }}>
            REAL-TIME REGIME DETECTION · {symbols.length} INSTRUMENTS
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Regime summary pills */}
          {Object.entries(regimeCounts).map(([regime, count]) => {
            const cfg = REGIME_CONFIG[regime as keyof typeof REGIME_CONFIG] ?? REGIME_CONFIG.unknown;
            return (
              <div key={regime} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '7px',
                color: cfg.color,
                letterSpacing: '0.12em',
              }}>
                <span>{cfg.icon}</span>
                <span style={{ color: '#383848' }}>{cfg.abbr}</span>
                <span style={{ fontWeight: 700 }}>{count}</span>
              </div>
            );
          })}
          <div style={{ width: '1px', height: '10px', background: '#1C1C26' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: '4px', height: '4px', borderRadius: '50%',
              background: '#00E8C8',
              animation: 'nvPulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '7px', color: '#505060', letterSpacing: '0.1em' }}>{time}</span>
          </div>
        </div>
      </div>

      {/* Pulse cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '1px',
        background: '#1C1C26',
        borderBottom: '1px solid #1C1C26',
      }}>
        {symbols.map(symbol => {
          const pulse = pulseData[symbol];
          const cfg = REGIME_CONFIG[pulse.regime] ?? REGIME_CONFIG.unknown;
          const isFlashing = flashingSymbols.has(symbol);
          const needsAttention = pulse.requires_attention;

          return (
            <div
              key={symbol}
              style={{
                background: isFlashing ? 'rgba(155,109,255,0.08)' : cfg.bg,
                padding: '10px 12px',
                position: 'relative',
                transition: 'background 0.3s ease',
                boxShadow: isFlashing ? '0 0 20px rgba(155,109,255,0.15) inset' : cfg.glow,
                outline: isFlashing ? '1px solid rgba(155,109,255,0.4)' : 'none',
                animation: isFlashing ? 'nvRegimeFlash 0.5s ease-in-out 3' : 'none',
              }}
            >
              {/* Left regime color bar */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '2px',
                background: isFlashing ? '#9B6DFF' : cfg.bar,
                boxShadow: isFlashing ? '0 0 8px rgba(155,109,255,0.6)' : `0 0 6px ${cfg.bar}80`,
              }} />

              {/* Header row: ticker + price */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: isFlashing ? '#9B6DFF' : cfg.color,
                    letterSpacing: '0.05em',
                    lineHeight: 1,
                  }}>
                    {symbol}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '3px',
                  }}>
                    <span style={{ fontSize: '8px', color: cfg.color, opacity: 0.7 }}>{cfg.icon}</span>
                    <span style={{
                      fontSize: '7px',
                      color: isFlashing ? '#9B6DFF' : cfg.color,
                      letterSpacing: '0.15em',
                      fontWeight: 600,
                    }}>
                      {cfg.abbr}
                    </span>
                    <span style={{ fontSize: '7px', color: '#383848', letterSpacing: '0.08em' }}>
                      {(pulse.regime_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#A0A0B8',
                  letterSpacing: '0.02em',
                  textAlign: 'right',
                  lineHeight: 1,
                }}>
                  ${pulse.last_price.toFixed(2)}
                </div>
              </div>

              {/* Confidence bar */}
              <ConfidenceBar value={pulse.regime_confidence} color={isFlashing ? '#9B6DFF' : cfg.bar} />

              {/* Strategy tip */}
              <div style={{ fontSize: '7px', color: '#383848', letterSpacing: '0.1em', marginTop: '4px', marginBottom: '6px' }}>
                {cfg.tip}
              </div>

              {/* Metrics */}
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.04)',
                paddingTop: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}>
                <Metric label="RV·D" value={`${(pulse.realized_vol_daily * 100).toFixed(1)}%`} warn={pulse.realized_vol_daily > 0.25} />
                <Metric label="VoV" value={pulse.vol_of_vol.toFixed(3)} warn={pulse.vol_of_vol > 0.08} />
                <Metric label="TAIL" value={`${pulse.tail_risk_score.toFixed(1)}/10`} warn={pulse.tail_risk_score > 7} />
                <Metric label="VOL·X" value={`${pulse.volume_surge_ratio.toFixed(1)}×`} warn={pulse.volume_surge_ratio > 2} />
              </div>

              {/* Alert badges */}
              {(needsAttention || isFlashing) && (
                <div style={{
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                  paddingTop: '5px',
                  marginTop: '5px',
                  display: 'flex',
                  gap: '6px',
                }}>
                  {needsAttention && (
                    <span style={{
                      fontSize: '7px',
                      color: '#FF3055',
                      letterSpacing: '0.15em',
                      fontWeight: 600,
                      animation: 'nvPulse 1s ease-in-out infinite',
                    }}>
                      ⚠ ATTN
                    </span>
                  )}
                  {isFlashing && (
                    <span style={{
                      fontSize: '7px',
                      color: '#9B6DFF',
                      letterSpacing: '0.15em',
                      fontWeight: 600,
                    }}>
                      ◆ REGIME SHIFT
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes nvPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes nvRegimeFlash { 0%,100%{opacity:1} 30%,70%{opacity:0.4} }
      `}</style>
    </div>
  );
};
