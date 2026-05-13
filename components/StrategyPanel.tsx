/**
 * StrategyPanel.tsx
 *
 * Standalone component that wires to the three backend strategy endpoints:
 *   GET /api/strategy/covered-call
 *   GET /api/strategy/iron-condor
 *   GET /api/strategy/straddle
 *   GET /api/strategy/suggest  ← AI-suggested strategy
 *
 * Can be dropped into any tab (InstitutionalTerminal, Dashboard, etc.)
 * by passing the ticker symbol and last known price.
 */

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import { Target, Zap, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────
type StrategyType = 'covered-call' | 'iron-condor' | 'straddle';

interface PayoffPoint { price: number; total_pnl: number }

interface StrategyResult {
  symbol:      string;
  strategy:    string;
  payoff:      PayoffPoint[];
  max_profit?: number;
  breakeven?:  number;
  premium?:    number;
  net_credit?: number;
  breakeven_upper?: number;
  breakeven_lower?: number;
  total_cost?:  number;
}

interface SuggestionResult {
  primary:    { name: string; action: 'BUY' | 'SELL'; rationale: string; risk: string; ideal_dte: string; confidence: number };
  alternatives: { name: string; confidence: number; rationale: string }[];
  context:    { iv_rank: number; trend: string; iv_environment: string; days_to_expiry: number };
}

interface StrategyPanelProps {
  symbol:    string;
  lastClose: number;
  /** Optional: pass from your market data to get better strategy suggestions */
  ivRank?:   number;
  trend?:    'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

// ── Helpers ───────────────────────────────────────────────────────
const actionColor = (a: 'BUY' | 'SELL') =>
  a === 'BUY' ? 'text-emerald-400 bg-emerald-900/20 border-emerald-900/40'
              : 'text-amber-400 bg-amber-900/20 border-amber-900/40';

// ── Component ─────────────────────────────────────────────────────
export const StrategyPanel: React.FC<StrategyPanelProps> = ({
  symbol, lastClose, ivRank = 45, trend = 'NEUTRAL',
}) => {
  const [activeStrategy, setActiveStrategy] = useState<StrategyType>('covered-call');
  const [result,         setResult]         = useState<StrategyResult | null>(null);
  const [suggestion,     setSuggestion]     = useState<SuggestionResult | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [showPayoff,     setShowPayoff]     = useState(true);

  // Auto-load AI suggestion when symbol/lastClose changes
  useEffect(() => {
    if (!lastClose) return;
    fetch(`${API_BASE}/api/strategy/suggest?symbol=${symbol}&iv_rank=${ivRank}&trend=${trend}&days_to_expiry=30`)
      .then(r => r.json())
      .then(setSuggestion)
      .catch(() => setSuggestion(null));
  }, [symbol, lastClose, ivRank, trend]);

  const runStrategy = async () => {
    if (!lastClose) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let url = '';
      if (activeStrategy === 'covered-call') {
        const strike  = (lastClose * 1.05).toFixed(2);
        const premium = (lastClose * 0.015).toFixed(2);
        url = `${API_BASE}/api/strategy/covered-call?symbol=${encodeURIComponent(symbol)}&stock_price=${lastClose}&strike=${strike}&premium=${premium}`;
      } else if (activeStrategy === 'iron-condor') {
        url = `${API_BASE}/api/strategy/iron-condor?symbol=${encodeURIComponent(symbol)}`
            + `&put_long=${(lastClose * 0.92).toFixed(2)}&put_short=${(lastClose * 0.95).toFixed(2)}`
            + `&call_short=${(lastClose * 1.05).toFixed(2)}&call_long=${(lastClose * 1.08).toFixed(2)}`
            + `&net_credit=${(lastClose * 0.02).toFixed(2)}`;
      } else {
        const premium = (lastClose * 0.025).toFixed(2);
        url = `${API_BASE}/api/strategy/straddle?symbol=${encodeURIComponent(symbol)}&strike=${lastClose.toFixed(2)}&call_premium=${premium}&put_premium=${premium}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message || 'Strategy compute failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0F1419] border border-violet-900/30 rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
          <Target size={14} /> Options Strategy Engine
        </h3>
        <span className="text-[9px] text-slate-600 font-mono">
          {lastClose ? `${symbol} @ $${lastClose.toFixed(2)}` : 'No price data'}
        </span>
      </div>

      {/* AI Suggestion Banner */}
      {suggestion?.primary && (
        <div className="border border-white/5 rounded-xl p-3 space-y-1 bg-black/30">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">AI Suggested</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${actionColor(suggestion.primary.action)}`}>
              {suggestion.primary.action} · {suggestion.primary.name}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">{suggestion.primary.rationale}</p>
          <div className="flex gap-3 text-[9px] text-slate-600 font-mono">
            <span>IV: {suggestion.context.iv_environment}</span>
            <span>·</span>
            <span>DTE: {suggestion.primary.ideal_dte}</span>
            <span>·</span>
            <span>Confidence: {suggestion.primary.confidence.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Strategy Selector */}
      <div className="flex gap-2">
        {(['covered-call', 'iron-condor', 'straddle'] as StrategyType[]).map(s => (
          <button
            key={s}
            onClick={() => { setActiveStrategy(s); setResult(null); }}
            className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all ${
              activeStrategy === s
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {s.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Run button */}
      <button
        onClick={runStrategy}
        disabled={loading || !lastClose}
        className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
      >
        {loading ? (
          <><div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> Calculating payoff…</>
        ) : (
          <><Zap size={12} /> Run {activeStrategy.replace('-', ' ')}</>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-900/10 border border-rose-900/30 rounded-lg p-3">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Metrics grid */}
          <div className="grid grid-cols-3 gap-2">
            {result.max_profit != null && (
              <div className="bg-black/40 rounded-xl p-3 text-center border border-white/5">
                <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Max Profit</p>
                <p className="text-sm font-bold text-emerald-400 font-mono">${result.max_profit.toFixed(0)}</p>
              </div>
            )}
            {result.breakeven != null && (
              <div className="bg-black/40 rounded-xl p-3 text-center border border-white/5">
                <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Breakeven</p>
                <p className="text-sm font-bold text-amber-400 font-mono">${result.breakeven.toFixed(2)}</p>
              </div>
            )}
            {result.breakeven_upper != null && (
              <div className="bg-black/40 rounded-xl p-3 text-center border border-white/5">
                <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">BE Upper</p>
                <p className="text-sm font-bold text-amber-400 font-mono">${result.breakeven_upper.toFixed(2)}</p>
              </div>
            )}
            {result.breakeven_lower != null && (
              <div className="bg-black/40 rounded-xl p-3 text-center border border-white/5">
                <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">BE Lower</p>
                <p className="text-sm font-bold text-amber-400 font-mono">${result.breakeven_lower.toFixed(2)}</p>
              </div>
            )}
            {result.premium != null && (
              <div className="bg-black/40 rounded-xl p-3 text-center border border-white/5">
                <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Premium</p>
                <p className="text-sm font-bold text-indigo-400 font-mono">${result.premium.toFixed(2)}</p>
              </div>
            )}
            {result.net_credit != null && (
              <div className="bg-black/40 rounded-xl p-3 text-center border border-white/5">
                <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Net Credit</p>
                <p className="text-sm font-bold text-indigo-400 font-mono">${result.net_credit.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Payoff chart toggle */}
          <button
            onClick={() => setShowPayoff(p => !p)}
            className="text-[9px] text-slate-500 hover:text-slate-300 font-bold uppercase flex items-center gap-1 transition-colors"
          >
            {showPayoff ? '▾ Hide' : '▸ Show'} Payoff Diagram
          </button>

          {showPayoff && result.payoff?.length > 0 && (
            <div className="h-44 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.payoff} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="price"
                    fontSize={8}
                    stroke="#334155"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `$${Number(v).toFixed(0)}`}
                    minTickGap={20}
                  />
                  <YAxis
                    fontSize={8}
                    stroke="#334155"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `$${Number(v).toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
                    formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'P&L']}
                    labelFormatter={(l) => `Price: $${Number(l).toFixed(2)}`}
                  />
                  <defs>
                    <linearGradient id="stratGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" label={{ value: 'Breakeven', position: 'right', fontSize: 8, fill: '#64748b' }} />
                  {lastClose > 0 && (
                    <ReferenceLine x={lastClose} stroke="#f59e0b" strokeDasharray="3 3"
                      label={{ value: 'Current', position: 'top', fontSize: 8, fill: '#f59e0b' }} />
                  )}
                  <Area
                    type="monotone"
                    dataKey="total_pnl"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#stratGrad)"
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Alternatives */}
      {suggestion?.alternatives?.length > 0 && (
        <div className="pt-3 border-t border-white/5 space-y-2">
          <p className="text-[9px] text-slate-600 uppercase font-bold tracking-wider">Also Consider</p>
          {suggestion.alternatives.map((alt, i) => (
            <div key={i} className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">{alt.name}</span>
              <span className="text-violet-400 font-mono">{alt.confidence.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StrategyPanel;
