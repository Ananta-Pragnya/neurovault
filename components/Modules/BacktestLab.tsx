import React, { useState } from 'react';
import { Loader2, Play, BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTradingStore } from '../../src/stores/tradingStore';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const C = {
  surface:  '#111113',
  surface2: '#161618',
  border:   '#1E1E21',
  gold:     '#C9962A',
  platinum: '#9EA8B3',
  sage:     '#4CAF82',
  coral:    '#C94F4F',
  ice:      '#5B9BD5',
  muted:    '#4A5260',
};

interface BacktestResult {
  equity_curve: number[];
  trades: { entry: number; exit: number; pnl: number; type: string }[];
  metrics: {
    total_return: number;
    final_equity: number;
    sharpe:       number;
    max_drawdown: number;
    win_rate:     number;
    n_trades:     number;
  };
}

type Strategy = 'sma_crossover' | 'rsi_mean_reversion';

export const BacktestLab: React.FC = () => {
  const { selectedTicker } = useTradingStore();
  const [symbol, setSymbol]     = useState(selectedTicker);
  const [strategy, setStrategy] = useState<Strategy>('sma_crossover');
  const [fast, setFast]         = useState(20);
  const [slow, setSlow]         = useState(50);
  const [capital, setCapital]   = useState(10000);
  const [days, setDays]         = useState(180);
  const [result, setResult]     = useState<BacktestResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const runBacktest = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/backtest/${symbol.toUpperCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy, fast, slow, capital, days }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResult(data);
    } catch (e) {
      setError('Backend offline or request failed.');
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.equity_curve.map((v, i) => ({ i, equity: Math.round(v) })) || [];

  const StatCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '16px' }}>
      <p style={{ fontSize: '10px', color: C.muted, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
        {label}
      </p>
      <p style={{ fontSize: '20px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: color || '#E2E8F0' }}>
        {value}
      </p>
    </div>
  );

  return (
    <div style={{ padding: '24px', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <BarChart3 size={16} color={C.gold} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: C.gold, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Backtest Lab
          </span>
        </div>
        <p style={{ fontSize: '12px', color: C.muted }}>
          Run TA strategies against real historical bars
        </p>
      </div>

      {/* Controls */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '14px', alignItems: 'end' }}>

          <div>
            <label style={{ fontSize: '10px', color: C.muted, display: 'block', marginBottom: '4px', fontFamily: "'JetBrains Mono', monospace" }}>SYMBOL</label>
            <input
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '8px 10px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '6px', color: '#E2E8F0', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '10px', color: C.muted, display: 'block', marginBottom: '4px', fontFamily: "'JetBrains Mono', monospace" }}>STRATEGY</label>
            <select
              value={strategy}
              onChange={e => setStrategy(e.target.value as Strategy)}
              style={{ width: '100%', padding: '8px 10px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '6px', color: '#E2E8F0', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="sma_crossover">SMA Crossover</option>
              <option value="rsi_mean_reversion">RSI Reversion</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '10px', color: C.muted, display: 'block', marginBottom: '4px', fontFamily: "'JetBrains Mono', monospace" }}>
              {strategy === 'sma_crossover' ? 'FAST SMA' : 'RSI PERIOD'}: {fast}
            </label>
            <input type="range" min={5} max={50} value={fast} onChange={e => setFast(+e.target.value)}
              style={{ width: '100%', accentColor: C.gold }} />
          </div>

          {strategy === 'sma_crossover' && (
            <div>
              <label style={{ fontSize: '10px', color: C.muted, display: 'block', marginBottom: '4px', fontFamily: "'JetBrains Mono', monospace" }}>SLOW SMA: {slow}</label>
              <input type="range" min={20} max={200} value={slow} onChange={e => setSlow(+e.target.value)}
                style={{ width: '100%', accentColor: C.gold }} />
            </div>
          )}

          <div>
            <label style={{ fontSize: '10px', color: C.muted, display: 'block', marginBottom: '4px', fontFamily: "'JetBrains Mono', monospace" }}>CAPITAL: ${capital.toLocaleString()}</label>
            <input type="range" min={1000} max={100000} step={1000} value={capital} onChange={e => setCapital(+e.target.value)}
              style={{ width: '100%', accentColor: C.gold }} />
          </div>

          <div>
            <label style={{ fontSize: '10px', color: C.muted, display: 'block', marginBottom: '4px', fontFamily: "'JetBrains Mono', monospace" }}>LOOKBACK: {days}d</label>
            <input type="range" min={60} max={365} step={30} value={days} onChange={e => setDays(+e.target.value)}
              style={{ width: '100%', accentColor: C.gold }} />
          </div>

          <button
            onClick={runBacktest}
            disabled={loading}
            style={{
              padding: '9px 20px', borderRadius: '6px',
              background: loading ? 'rgba(201,150,42,0.05)' : 'rgba(201,150,42,0.14)',
              border: `1px solid ${loading ? C.border : C.gold}`,
              color: loading ? C.muted : C.gold,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '12px', fontFamily: "'JetBrains Mono', monospace",
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={12} />}
            Run
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(201,79,79,0.1)', border: `1px solid ${C.coral}44`, borderRadius: '8px', padding: '12px 16px' }}>
          <p style={{ fontSize: '12px', color: C.coral, fontFamily: "'JetBrains Mono', monospace" }}>{error}</p>
        </div>
      )}

      {result && (
        <>
          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
            <StatCard
              label="Total Return"
              value={`${result.metrics.total_return > 0 ? '+' : ''}${result.metrics.total_return.toFixed(2)}%`}
              color={result.metrics.total_return >= 0 ? C.sage : C.coral}
            />
            <StatCard
              label="Sharpe Ratio"
              value={result.metrics.sharpe.toFixed(2)}
              color={result.metrics.sharpe >= 1 ? C.sage : result.metrics.sharpe >= 0 ? C.platinum : C.coral}
            />
            <StatCard label="Max Drawdown" value={`-${result.metrics.max_drawdown.toFixed(2)}%`} color={C.coral} />
            <StatCard
              label="Win Rate"
              value={`${result.metrics.win_rate.toFixed(1)}%`}
              color={result.metrics.win_rate >= 50 ? C.sage : C.coral}
            />
            <StatCard label="# Trades" value={String(result.metrics.n_trades)} />
            <StatCard label="Final Equity" value={`$${result.metrics.final_equity.toLocaleString()}`} color={C.gold} />
          </div>

          {/* Equity Curve */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '20px' }}>
            <p style={{ fontSize: '11px', color: C.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', marginBottom: '14px', textTransform: 'uppercase' }}>
              Equity Curve — {symbol} · {strategy === 'sma_crossover' ? `SMA ${fast}/${slow}` : `RSI ${fast}`} · ${capital.toLocaleString()} initial
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <XAxis dataKey="i" hide />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: C.muted, fontFamily: "'JetBrains Mono', monospace" }} />
                <Tooltip
                  contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace" }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'Equity']}
                  labelFormatter={() => ''}
                />
                <ReferenceLine y={capital} stroke={C.muted} strokeDasharray="3 3" />
                <Line
                  type="monotone" dataKey="equity" stroke={C.gold}
                  strokeWidth={2} dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Recent trades */}
          {result.trades.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '20px' }}>
              <p style={{ fontSize: '11px', color: C.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', marginBottom: '14px', textTransform: 'uppercase' }}>
                Recent Trades (last {Math.min(result.trades.length, 20)})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {result.trades.slice(-20).reverse().map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: C.surface2, borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {t.pnl > 0 ? <TrendingUp size={12} color={C.sage} /> : t.pnl < 0 ? <TrendingDown size={12} color={C.coral} /> : <Minus size={12} color={C.muted} />}
                      <span style={{ fontSize: '11px', color: C.platinum, fontFamily: "'JetBrains Mono', monospace" }}>
                        ${t.entry.toFixed(2)} → ${t.exit.toFixed(2)}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: t.pnl >= 0 ? C.sage : C.coral }}>
                      {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
