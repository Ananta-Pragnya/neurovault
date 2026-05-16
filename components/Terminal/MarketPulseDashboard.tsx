/**
 * LIVE MARKET PULSE DASHBOARD
 * ============================
 * Real-time regime monitoring with visual alerts.
 * Sits at the top of the Terminal tab.
 *
 * Shows:
 * - Current regime state for each symbol (color-coded)
 * - Live volatility metrics updating every second
 * - Regime transition alerts (flashes when regime changes)
 * - Tail risk warning lights
 * - Volume surge indicators
 */

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

const REGIME_CONFIG = {
  unknown: {
    label: 'Unknown',
    color: 'bg-gray-900 text-gray-400 border-gray-700',
    textColor: 'text-gray-500',
    icon: '○',
    description: 'Insufficient data',
  },
  compressed: {
    label: 'Compressed',
    color: 'bg-emerald-950 text-emerald-400 border-emerald-700',
    textColor: 'text-emerald-500',
    icon: '▼',
    description: 'Vol abnormally low — BUY convexity',
  },
  normal: {
    label: 'Normal',
    color: 'bg-blue-950 text-blue-400 border-blue-700',
    textColor: 'text-blue-500',
    icon: '●',
    description: 'Mean state — selective trading',
  },
  stressed: {
    label: 'Stressed',
    color: 'bg-amber-950 text-amber-400 border-amber-700',
    textColor: 'text-amber-500',
    icon: '▲',
    description: 'Vol elevated — SELL premium carefully',
  },
  crisis: {
    label: 'Crisis',
    color: 'bg-red-950 text-red-400 border-red-700',
    textColor: 'text-red-500',
    icon: '■',
    description: 'Fat tail event — pure defense',
  },
  transition: {
    label: 'Transition',
    color: 'bg-purple-950 text-purple-400 border-purple-700',
    textColor: 'text-purple-500',
    icon: '◆',
    description: 'Regime changing NOW — halt trades',
  },
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export const MarketPulseDashboard: React.FC = () => {
  const [pulseData, setPulseData] = useState<Record<string, MarketPulse>>({});
  const [flashingSymbols, setFlashingSymbols] = useState<Set<string>>(new Set());

  // Seed initial state from REST so cards show immediately on mount
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
    const wsBase = (import.meta.env.VITE_API_BASE || 'http://localhost:8000').replace('https://', 'wss://').replace('http://', 'ws://');
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
            }, 2000);
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => { socket.close(); };
  }, []);

  const symbols = Object.keys(pulseData).sort();

  if (symbols.length === 0) {
    return (
      <div className="bg-[#0D121A] rounded-lg border border-white/5 p-4 mb-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono uppercase tracking-widest">
          <div className="animate-pulse text-amber-500">●</div>
          <span>Connecting to market pulse stream...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-3 px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Live Market Pulse
        </h3>
        <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono uppercase tracking-widest">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span>Real-time regime detection</span>
        </div>
      </div>

      {/* Pulse Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {symbols.map(symbol => {
          const pulse = pulseData[symbol];
          const config = REGIME_CONFIG[pulse.regime] ?? REGIME_CONFIG.unknown;
          const isFlashing = flashingSymbols.has(symbol);
          const requiresAttention = pulse.requires_attention;

          return (
            <div
              key={symbol}
              className={`
                rounded-lg border p-3 transition-all duration-300 text-xs
                ${config.color}
                ${isFlashing ? 'ring-2 ring-purple-500 scale-105' : ''}
                ${requiresAttention && !isFlashing ? 'ring-1 ring-red-500/50' : ''}
              `}
            >
              {/* Symbol + Price */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight">{symbol}</span>
                  <span className="text-base leading-none opacity-80">{config.icon}</span>
                </div>
                <div className="text-right text-[10px] font-mono opacity-70">
                  ${pulse.last_price.toFixed(2)}
                </div>
              </div>

              {/* Regime label */}
              <div className="mb-2">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
                  <span>{config.label}</span>
                  <span className="opacity-50">{(pulse.regime_confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="text-[9px] opacity-60 mt-0.5 leading-tight">
                  {config.description}
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-1 text-[9px] font-mono border-t border-current/10 pt-2 mt-2">
                <MetricRow
                  label="RV daily"
                  value={`${(pulse.realized_vol_daily * 100).toFixed(1)}%`}
                  warn={pulse.realized_vol_daily > 0.25}
                />
                <MetricRow
                  label="Vol-of-Vol"
                  value={pulse.vol_of_vol.toFixed(3)}
                  warn={pulse.vol_of_vol > 0.08}
                />
                <MetricRow
                  label="Tail risk"
                  value={`${pulse.tail_risk_score.toFixed(1)}/10`}
                  warn={pulse.tail_risk_score > 7}
                />
                <MetricRow
                  label="Volume"
                  value={`${pulse.volume_surge_ratio.toFixed(1)}x`}
                  warn={pulse.volume_surge_ratio > 2}
                />
              </div>

              {/* Alerts */}
              {requiresAttention && (
                <div className="mt-2 pt-1.5 border-t border-red-500/20 flex items-center gap-1 text-[9px] text-red-400 font-bold uppercase tracking-widest">
                  <span className="animate-pulse">⚠</span>
                  <span>Attention</span>
                </div>
              )}
              {isFlashing && (
                <div className="mt-2 pt-1.5 border-t border-purple-500/20 flex items-center gap-1 text-[9px] text-purple-400 font-bold uppercase tracking-widest">
                  <span className="animate-bounce">◆</span>
                  <span>Regime changed</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className="bg-[#0D121A] rounded-lg border border-white/5 px-4 py-2 flex items-center justify-between text-[9px] font-mono text-slate-500 uppercase tracking-widest">
        <div className="flex items-center gap-4">
          {Object.entries(countRegimes(pulseData)).map(([regime, count]) => {
            const cfg = REGIME_CONFIG[regime as keyof typeof REGIME_CONFIG] ?? REGIME_CONFIG.unknown;
            return (
              <div key={regime} className="flex items-center gap-1.5">
                <span className={cfg.textColor}>{cfg.icon}</span>
                <span>{cfg.label}</span>
                <span className="text-white font-bold">{count}</span>
              </div>
            );
          })}
        </div>
        <span>{new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

const MetricRow: React.FC<{ label: string; value: string; warn?: boolean }> = ({
  label, value, warn,
}) => (
  <div className="flex justify-between">
    <span className="opacity-50">{label}</span>
    <span className={warn ? 'text-red-400 font-bold' : ''}>{value}</span>
  </div>
);

function countRegimes(pulseData: Record<string, MarketPulse>): Record<string, number> {
  const counts: Record<string, number> = {};
  Object.values(pulseData).forEach(pulse => {
    counts[pulse.regime] = (counts[pulse.regime] || 0) + 1;
  });
  return counts;
}
