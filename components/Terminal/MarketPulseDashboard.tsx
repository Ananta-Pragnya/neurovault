// NEUROVAULT — Live Market Pulse Dashboard
// Obsidian gold · large price hotspot · vivid regime gradients

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

const REGIME = {
  unknown: {
    label: 'UNKNOWN', tip: 'Insufficient data',
    primary: '#4A5260', faded: 'rgba(74,82,96,0.08)', border: 'rgba(74,82,96,0.2)',
    glow: 'none', gradient: 'rgba(74,82,96,0.04)', icon: '○',
  },
  compressed: {
    label: 'COMPRESSED', tip: 'Vol low — buy convexity',
    primary: '#4CAF82', faded: 'rgba(76,175,130,0.08)', border: 'rgba(76,175,130,0.22)',
    glow: '0 0 20px rgba(76,175,130,0.14)', gradient: 'rgba(76,175,130,0.05)', icon: '▼',
  },
  normal: {
    label: 'NORMAL', tip: 'Mean state — selective trading',
    primary: '#5B9BD5', faded: 'rgba(91,155,213,0.08)', border: 'rgba(91,155,213,0.22)',
    glow: '0 0 20px rgba(91,155,213,0.14)', gradient: 'rgba(91,155,213,0.05)', icon: '●',
  },
  stressed: {
    label: 'STRESSED', tip: 'Vol elevated — sell premium carefully',
    primary: '#D4892A', faded: 'rgba(212,137,42,0.10)', border: 'rgba(212,137,42,0.28)',
    glow: '0 0 24px rgba(212,137,42,0.18)', gradient: 'rgba(212,137,42,0.06)', icon: '▲',
  },
  crisis: {
    label: 'CRISIS', tip: 'Fat tail event — pure defense',
    primary: '#C94F4F', faded: 'rgba(201,79,79,0.12)', border: 'rgba(201,79,79,0.32)',
    glow: '0 0 32px rgba(201,79,79,0.22)', gradient: 'rgba(201,79,79,0.08)', icon: '■',
  },
  transition: {
    label: 'TRANSITION', tip: 'Regime shifting — halt trades',
    primary: '#7B68C8', faded: 'rgba(123,104,200,0.10)', border: 'rgba(123,104,200,0.28)',
    glow: '0 0 24px rgba(123,104,200,0.18)', gradient: 'rgba(123,104,200,0.07)', icon: '◆',
  },
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function RegimeCard({ pulse, isFlashing }: { pulse: MarketPulse; isFlashing: boolean }) {
  const cfg = REGIME[pulse.regime] ?? REGIME.unknown;
  const col = isFlashing ? REGIME.transition.primary : cfg.primary;
  const pct = Math.min(100, pulse.regime_confidence * 100);
  const isCritical = pulse.regime === 'crisis' || (pulse.tail_risk_score > 7);

  return (
    <div style={{
      position: 'relative',
      background: `linear-gradient(145deg, ${isFlashing ? REGIME.transition.gradient : cfg.gradient} 0%, rgba(8,12,20,0.95) 65%)`,
      border: `1px solid ${isFlashing ? REGIME.transition.border : cfg.border}`,
      borderRadius: '10px',
      padding: '14px 14px 12px',
      boxShadow: isFlashing ? REGIME.transition.glow : (isCritical ? cfg.glow : 'none'),
      transition: 'box-shadow 0.4s ease, border-color 0.3s ease',
      animation: isFlashing ? 'nvRegimeFlash 0.55s ease-in-out 4' : isCritical ? 'nvBreathe 2.5s ease-in-out infinite' : 'none',
      overflow: 'hidden',
    }}>
      {/* Decorative corner accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '40px',
        height: '40px',
        background: `linear-gradient(225deg, ${col}20 0%, transparent 60%)`,
        borderRadius: '0 10px 0 0',
      }} />

      {/* Left regime bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: '10%',
        bottom: '10%',
        width: '3px',
        background: `linear-gradient(180deg, ${col}80, ${col}, ${col}80)`,
        borderRadius: '0 2px 2px 0',
        boxShadow: `0 0 8px ${col}80`,
      }} />

      {/* Header: regime label + icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '11px',
            color: col,
            filter: isCritical ? `drop-shadow(0 0 6px ${col})` : 'none',
            animation: (pulse.regime === 'crisis') ? 'nvPulse 1.2s ease-in-out infinite' : 'none',
          }}>
            {cfg.icon}
          </span>
          <span style={{
            fontSize: '9px',
            fontWeight: 700,
            color: col,
            letterSpacing: '0.15em',
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase',
          }}>
            {cfg.label}
          </span>
        </div>
        {/* Attention badge */}
        {pulse.requires_attention && (
          <span style={{
            fontSize: '7px',
            color: '#EF4444',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.15em',
            fontWeight: 700,
            animation: 'nvPulse 0.8s ease-in-out infinite',
          }}>
            ⚠
          </span>
        )}
      </div>

      {/* ★ EYE HOTSPOT: Ticker + Large Price ★ */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 500,
          color: 'rgba(136,146,164,0.7)',
          letterSpacing: '0.12em',
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: '2px',
        }}>
          {pulse.symbol}
        </div>
        <div style={{
          fontSize: '22px',
          fontWeight: 700,
          color: '#F1F5F9',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '-0.02em',
          lineHeight: 1,
          textShadow: isCritical ? `0 0 20px ${col}40` : 'none',
        }}>
          ${pulse.last_price.toFixed(2)}
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
        }}>
          <span style={{ fontSize: '7px', color: 'rgba(75,85,99,0.8)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
            CONFIDENCE
          </span>
          <span style={{ fontSize: '8px', color: col, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
            {pct.toFixed(0)}%
          </span>
        </div>
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${col}70, ${col})`,
            boxShadow: `0 0 6px ${col}60`,
            borderRadius: '2px',
            transition: 'width 0.8s ease',
          }} />
        </div>
      </div>

      {/* Action tip */}
      <div style={{
        fontSize: '7px',
        color: col,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.12em',
        fontWeight: 600,
        marginBottom: '8px',
        opacity: 0.8,
      }}>
        {cfg.tip}
      </div>

      {/* Metric grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '4px 8px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        paddingTop: '8px',
      }}>
        {[
          { label: 'RV·D',  val: `${(pulse.realized_vol_daily * 100).toFixed(1)}%`, warn: pulse.realized_vol_daily > 0.25 },
          { label: 'VoV',   val: pulse.vol_of_vol.toFixed(3),                        warn: pulse.vol_of_vol > 0.08 },
          { label: 'TAIL',  val: `${pulse.tail_risk_score.toFixed(1)}/10`,           warn: pulse.tail_risk_score > 7 },
          { label: 'VOL×',  val: `${pulse.volume_surge_ratio.toFixed(1)}×`,          warn: pulse.volume_surge_ratio > 2 },
        ].map(({ label, val, warn }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
            <span style={{
              fontSize: '7px',
              color: 'rgba(75,85,99,0.6)',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.08em',
              flexShrink: 0,
            }}>
              {label}
            </span>
            <span style={{
              fontSize: '9px',
              fontWeight: warn ? 700 : 400,
              color: warn ? '#EF4444' : 'rgba(136,146,164,0.8)',
              fontFamily: "'JetBrains Mono', monospace",
              textShadow: warn ? '0 0 8px rgba(239,68,68,0.5)' : 'none',
            }}>
              {val}
            </span>
          </div>
        ))}
      </div>

      {/* Regime change banner */}
      {isFlashing && (
        <div style={{
          marginTop: '8px',
          padding: '4px 8px',
          background: 'rgba(139,92,246,0.15)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '7px',
          color: '#8B5CF6',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.12em',
          fontWeight: 700,
        }}>
          <span style={{ animation: 'nvPulse 0.6s ease-in-out infinite' }}>◆</span>
          REGIME CHANGED
        </div>
      )}
    </div>
  );
}

export const MarketPulseDashboard: React.FC = () => {
  const [pulseData, setPulseData] = useState<Record<string, MarketPulse>>({});
  const [flashingSymbols, setFlashingSymbols] = useState<Set<string>>(new Set());
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }));
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
            symbol: sym, timestamp: data.timestamp,
            last_price: s.last_price ?? 0, regime: s.regime ?? 'unknown',
            regime_confidence: s.confidence ?? 0,
            realized_vol_instant: 0, realized_vol_hourly: 0,
            realized_vol_daily: s.realized_vol_daily ?? 0,
            vol_of_vol: 0, bid_ask_spread_bps: 0, tick_velocity: 0,
            volume_surge_ratio: 1, regime_changed: false, regime_age_seconds: 0,
            tail_risk_score: s.tail_risk_score ?? 0, liquidity_stress: 0,
            requires_attention: s.requires_attention ?? false,
          };
        }
        setPulseData(prev => ({ ...seeded, ...prev }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const wsBase = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://');
    const socket = new WebSocket(`${wsBase}/ws/data-hub`);

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'market_pulse') {
          const pulse = msg.data as MarketPulse;
          setPulseData(prev => ({ ...prev, [pulse.symbol]: pulse }));
          if (pulse.regime_changed) {
            setFlashingSymbols(prev => new Set(prev).add(pulse.symbol));
            setTimeout(() => setFlashingSymbols(prev => {
              const next = new Set(prev);
              next.delete(pulse.symbol);
              return next;
            }), 2500);
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
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: '#F59E0B',
          boxShadow: '0 0 10px rgba(245,158,11,0.7)',
          animation: 'nvPulse 1.2s ease-in-out infinite',
        }} />
        <span style={{ fontSize: '10px', color: 'rgba(75,85,99,0.8)', letterSpacing: '0.12em' }}>
          CONNECTING TO MARKET PULSE STREAM...
        </span>
        <style>{`@keyframes nvPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>
    );
  }

  // Regime count summary
  const regimeCounts: Record<string, number> = {};
  symbols.forEach(s => {
    const r = pulseData[s].regime;
    regimeCounts[r] = (regimeCounts[r] || 0) + 1;
  });

  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      fontFamily: "'Outfit', sans-serif",
      padding: '16px 20px',
    }}>
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Gold bar accent */}
          <div style={{ display: 'flex', gap: '3px' }}>
            <div style={{
              width: '3px', height: '16px',
              background: 'linear-gradient(180deg, #FFD966, #D4AF37)',
              boxShadow: '0 0 8px rgba(212,175,55,0.6)',
              borderRadius: '1px',
            }} />
            <div style={{
              width: '3px', height: '16px',
              background: 'rgba(212,175,55,0.25)',
              borderRadius: '1px',
            }} />
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#E2E8F0',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Live Market Pulse
          </span>
          <span style={{
            fontSize: '9px',
            color: 'rgba(75,85,99,0.7)',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.1em',
          }}>
            {symbols.length} instruments · real-time regime detection
          </span>
        </div>

        {/* Summary + clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {Object.entries(regimeCounts).map(([regime, count]) => {
            const cfg = REGIME[regime as keyof typeof REGIME] ?? REGIME.unknown;
            return (
              <div key={regime} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '9px', color: cfg.primary }}>{cfg.icon}</span>
                <span style={{ fontSize: '9px', color: 'rgba(75,85,99,0.6)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {cfg.label}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: cfg.primary,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {count}
                </span>
              </div>
            );
          })}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 8px rgba(16,185,129,0.8)',
              animation: 'nvPulse 2s ease-in-out infinite',
            }} />
            <span style={{
              fontSize: '10px',
              color: 'rgba(75,85,99,0.6)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {time}
            </span>
          </div>
        </div>
      </div>

      {/* Cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
        gap: '10px',
      }}>
        {symbols.map(symbol => (
          <RegimeCard
            key={symbol}
            pulse={pulseData[symbol]}
            isFlashing={flashingSymbols.has(symbol)}
          />
        ))}
      </div>

      <style>{`
        @keyframes nvPulse    { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes nvBreathe  { 0%,100%{box-shadow:none} 50%{box-shadow:var(--glow)} }
        @keyframes nvRegimeFlash { 0%,100%{opacity:1} 40%{opacity:0.2} }
      `}</style>
    </div>
  );
};
