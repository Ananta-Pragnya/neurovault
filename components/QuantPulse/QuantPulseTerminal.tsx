
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Settings,
  BarChart3,
  BrainCircuit,
  Activity,
  Search,
  Cpu,
  Info,
  Target,
  ShieldAlert,
  Zap,
  AlertCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { StockDataPoint, PredictionResult, EnsembleWeights, ModelType } from '../../types';
import { SYMBOLS, DEFAULT_WEIGHTS, INDICATOR_COLORS } from '../../constants.tsx';
import { calculateTechnicalIndicators } from '../../services/quant/indicatorService';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────
interface ForecastResult {
  symbol:        string;
  last_close:    number;
  price_target:  number;
  direction:     'bullish' | 'bearish' | 'neutral';
  composite:     number;
  confidence:    number;
  signals: {
    sma_trend:    { value: number; label: string };
    rsi_momentum: { value: number; label: string };
    bollinger:    { value: number; label: string };
  };
  sma_20:           number;
  sma_50:           number;
  rsi:              number;
  momentum_pct:     number;
  market_analysis:  string;
  source:           string;
}

interface StrategyResult {
  symbol:     string;
  payoff:     Array<{ price: number; total_pnl: number }>;
  max_profit?: number;
  breakeven?:  number;
  premium?:    number;
  net_credit?: number;
  strategy:    string;
}

// ── Real price history fetch ──────────────────────────────────────
async function fetchRealPriceHistory(symbol: string, days = 60): Promise<StockDataPoint[]> {
  try {
    const res  = await fetch(`${API_BASE}/api/bars/${encodeURIComponent(symbol)}?days=${days}`);
    const data = await res.json();
    const closes: number[] = data.closes ?? [];
    if (!closes.length) throw new Error('empty');

    const today = new Date();
    return closes.map((close, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (closes.length - i));
      return {
        date:   date.toISOString().split('T')[0],
        open:   close * (1 - 0.001),
        high:   close * (1 + 0.002),
        low:    close * (1 - 0.002),
        close,
        volume: 1_000_000,
      };
    });
  } catch {
    console.warn(`[QuantPulse] Real history unavailable for ${symbol} — showing empty chart`);
    return [];
  }
}

// ── Fetch real ensemble forecast ──────────────────────────────────
async function fetchForecast(symbol: string): Promise<ForecastResult | null> {
  try {
    const res = await fetch(`${API_BASE}/api/forecast/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
  } catch (e) {
    console.warn(`[QuantPulse] Forecast fetch failed for ${symbol}:`, e);
    return null;
  }
}

// ── Signal meter component ─────────────────────────────────────────
const NV = {
  bg: '#0A0A0B', surface: '#111113', border: '#1E1E21', border2: '#2A2A2E',
  gold: '#C9962A', goldText: '#D4A843', platinum: '#9EA8B3',
  sage: '#4CAF82', coral: '#C94F4F', ice: '#5B9BD5',
};

const SignalMeter: React.FC<{ label: string; value: number; detail: string }> = ({ label, value, detail }) => {
  const pct = ((value + 1) / 2) * 100;
  const barColor = value > 0.1 ? NV.sage : value < -0.1 ? NV.coral : '#475569';
  const textColor = value > 0.1 ? NV.sage : value < -0.1 ? NV.coral : NV.platinum;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
        <span style={{ color: NV.platinum }}>{label}</span>
        <span style={{ color: textColor }}>
          {value > 0.1 ? '▲' : value < -0.1 ? '▼' : '–'} {Math.abs(value).toFixed(2)}
        </span>
      </div>
      <div style={{ height: '6px', background: NV.border2, borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, transition: 'width 700ms ease' }} />
      </div>
      <p style={{ fontSize: '9px', color: '#4A5260', fontFamily: "'JetBrains Mono', monospace" }}>{detail}</p>
    </div>
  );
};

// ── Strategy Panel ─────────────────────────────────────────────────
const StrategyPanel: React.FC<{ symbol: string; lastClose: number }> = ({ symbol, lastClose }) => {
  const [result, setResult]     = useState<StrategyResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [strategy, setStrategy] = useState<'covered-call' | 'iron-condor' | 'straddle'>('covered-call');
  const [error, setError]       = useState<string | null>(null);

  const run = async () => {
    if (!lastClose) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = strategy === 'straddle' ? 'iron-condor' : strategy;
      const body: Record<string, any> = { symbol, shares: 100 };
      if (strategy === 'iron-condor' || strategy === 'straddle') {
        body.width       = parseFloat((lastClose * 0.03).toFixed(2));
        body.expiry_days = 30;
      } else {
        body.target_premium = parseFloat((lastClose * 0.015).toFixed(2));
      }
      const res = await fetch(`${API_BASE}/api/strategy/${endpoint}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message || 'Strategy compute failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ background: NV.surface, border: `1px solid ${NV.border}`, borderRadius: '16px', padding: '20px' }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: '11px', fontWeight: 700, color: NV.goldText, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Target size={13} /> Options Strategy Engine
        </h3>
        <span style={{ fontSize: '9px', color: '#4A5260', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>Real payoff math</span>
      </div>

      {/* Strategy selector */}
      <div className="flex gap-2">
        {(['covered-call', 'iron-condor', 'straddle'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStrategy(s)}
            style={{
              flex: 1, padding: '6px 0',
              fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              borderRadius: '8px', border: `1px solid ${strategy === s ? NV.gold : NV.border2}`,
              background: strategy === s ? `rgba(201,150,42,0.12)` : 'transparent',
              color: strategy === s ? NV.goldText : NV.platinum,
              cursor: 'pointer', transition: 'all 150ms ease-out',
            }}
          >
            {s.replace('-', ' ')}
          </button>
        ))}
      </div>

      <button
        onClick={run}
        disabled={loading || !lastClose}
        style={{
          width: '100%', padding: '10px',
          background: loading || !lastClose ? NV.border2 : NV.gold,
          border: 'none', borderRadius: '10px',
          color: loading || !lastClose ? '#4A5260' : '#0A0A0B',
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          cursor: loading || !lastClose ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          transition: 'all 150ms ease-out',
          boxShadow: loading || !lastClose ? 'none' : '0 0 14px rgba(201,150,42,0.25)',
        }}
      >
        {loading ? (
          <><div className="w-3 h-3 border border-black/30 border-t-black rounded-full animate-spin" /> Calculating…</>
        ) : (
          <><Zap size={12} /> Run {strategy.replace('-', ' ')}</>
        )}
      </button>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: NV.coral, fontSize: '11px', background: 'rgba(201,79,79,0.08)', border: `1px solid rgba(201,79,79,0.2)`, borderRadius: '8px', padding: '10px 12px' }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {result.max_profit != null && (
              <div style={{ background: NV.bg, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '9px', color: '#4A5260', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Max Profit</p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: NV.sage, fontFamily: "'JetBrains Mono', monospace" }}>${result.max_profit.toFixed(0)}</p>
              </div>
            )}
            {result.breakeven != null && (
              <div style={{ background: NV.bg, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '9px', color: '#4A5260', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Breakeven</p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: NV.goldText, fontFamily: "'JetBrains Mono', monospace" }}>${result.breakeven.toFixed(2)}</p>
              </div>
            )}
            {(result.premium ?? result.net_credit) != null && (
              <div style={{ background: NV.bg, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '9px', color: '#4A5260', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{result.premium != null ? 'Premium' : 'Net Credit'}</p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: NV.ice, fontFamily: "'JetBrains Mono', monospace" }}>${(result.premium ?? result.net_credit)!.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Micro payoff chart */}
          {result.payoff?.length > 0 && (
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.payoff.slice(0, 60)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke={NV.border} vertical={false} />
                  <XAxis dataKey="price" hide />
                  <YAxis fontSize={8} stroke="#475569" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: NV.surface, border: `1px solid ${NV.border}`, borderRadius: 8, fontSize: 10 }}
                    formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'P&L']}
                    labelFormatter={(l) => `Price: $${Number(l).toFixed(2)}`}
                  />
                  <defs>
                    <linearGradient id="payoffGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={NV.gold} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={NV.gold} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="total_pnl"
                    stroke={NV.gold}
                    strokeWidth={1.5}
                    fill="url(#payoffGrad)"
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

// ── Main Terminal ──────────────────────────────────────────────────
const QuantPulseTerminal: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOLS[0]);
  const [data,           setData]           = useState<StockDataPoint[]>([]);
  const [forecast,       setForecast]       = useState<ForecastResult | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [dataSource,     setDataSource]     = useState<'real' | 'empty'>('real');
  const [weights,        setWeights]        = useState<EnsembleWeights>(DEFAULT_WEIGHTS);
  const [showSettings,   setShowSettings]   = useState(false);
  const [wsStatus,       setWsStatus]       = useState<'connecting' | 'live' | 'offline'>('connecting');
  const lastPriceRef = useRef<number>(0);

  // FIX 8: Fetch real Alpaca history and real TA ensemble in parallel
  const loadData = useCallback(async (symbol: string) => {
    setLoading(true);
    setForecast(null);

    const [rawHistory, forecastData] = await Promise.all([
      fetchRealPriceHistory(symbol, 90),
      fetchForecast(symbol),
    ]);

    if (rawHistory.length > 0) {
      const withIndicators = calculateTechnicalIndicators(rawHistory);
      setData(withIndicators);
      setDataSource('real');
      lastPriceRef.current = rawHistory[rawHistory.length - 1].close;
    } else {
      setData([]);
      setDataSource('empty');
    }

    setForecast(forecastData);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData(selectedSymbol);
  }, [selectedSymbol, loadData]);

  // Live WebSocket tick updates
  useEffect(() => {
    setWsStatus('connecting');
    const wsBase = (import.meta.env.VITE_API_BASE || 'http://localhost:8000').replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsBase}/ws/data-hub`);

    ws.onopen  = () => setWsStatus('live');
    ws.onerror = () => setWsStatus('offline');
    ws.onclose = () => setWsStatus('offline');

    ws.onmessage = (event) => {
      const updates = JSON.parse(event.data);
      const hit      = Array.isArray(updates)
        ? updates.find((u: any) => u.symbol === selectedSymbol)
        : null;
      if (!hit?.price) return;

      lastPriceRef.current = hit.price;
      setData(prev => {
        if (!prev.length) return prev;
        const next   = [...prev];
        const last   = { ...next[next.length - 1] };
        last.close   = hit.price;
        last.high    = Math.max(last.high,  hit.price);
        last.low     = Math.min(last.low,   hit.price);
        next[next.length - 1] = last;
        return next;
      });
    };

    return () => ws.close();
  }, [selectedSymbol]);

  const chartData = [
    ...data.map(d => ({ ...d, forecastClose: undefined })),
    ...(forecast
      ? (() => {
          const step = (forecast.price_target - forecast.last_close) / 7;
          return Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i + 1);
            return {
              date:          date.toISOString().split('T')[0],
              close:         undefined,
              forecastClose: parseFloat((forecast.last_close + step * (i + 1)).toFixed(2)),
            };
          });
        })()
      : []),
  ];

  // Shape legacy PredictionResult for sections that expect it
  const legacyPrediction: PredictionResult | null = forecast && forecast.direction
    ? {
        nextDayPrice:          forecast.price_target,
        forecast7Day:          [],
        trend:                 forecast.direction.charAt(0).toUpperCase() + forecast.direction.slice(1),
        confidence:            forecast.confidence / 100,
        rmse:                  0,
        mae:                   0,
        individualPredictions: {
          'SMA Trend':    forecast.signals.sma_trend.value,
          'RSI Momentum': forecast.signals.rsi_momentum.value,
          'Bollinger':    forecast.signals.bollinger.value,
        },
        marketAnalysis: forecast.market_analysis,
      }
    : null;

  const handleWeightChange = (model: string, value: number) =>
    setWeights(prev => ({ ...prev, [model]: value }));

  const directionColor = forecast?.direction === 'bullish'
    ? 'text-emerald-400' : forecast?.direction === 'bearish'
    ? 'text-rose-400' : 'text-slate-400';

  const rsiVal = forecast?.rsi ?? data[data.length - 1]?.rsi ?? 50;
  const rsiColor = rsiVal > 70 ? NV.coral : rsiVal < 30 ? NV.sage : '#fff';

  return (
    <div style={{ background: NV.bg, color: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Tab-internal toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: `1px solid ${NV.border}`,
        background: NV.surface,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BrainCircuit size={15} style={{ color: NV.gold }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: NV.platinum, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            SMA · RSI · Bollinger Ensemble
          </span>
          {!loading && (
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '3px 8px', borderRadius: '4px',
              background: dataSource === 'real' ? 'rgba(76,175,130,0.1)' : 'rgba(201,150,42,0.12)',
              border: `1px solid ${dataSource === 'real' ? 'rgba(76,175,130,0.25)' : 'rgba(201,150,42,0.3)'}`,
              color: dataSource === 'real' ? NV.sage : NV.goldText,
            }}>
              {dataSource === 'real' ? '● LIVE DATA' : '⚠ NO DATA — SYNTHETIC'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4A5260' }} />
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              style={{
                background: NV.bg, border: `1px solid ${NV.border2}`, borderRadius: '8px',
                padding: '6px 12px 6px 28px', fontSize: '11px', fontWeight: 600,
                color: '#fff', fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
                outline: 'none', appearance: 'none',
              }}
            >
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: '6px 8px', background: showSettings ? `rgba(201,150,42,0.12)` : 'transparent',
              border: `1px solid ${showSettings ? NV.gold : NV.border2}`, borderRadius: '8px',
              color: showSettings ? NV.gold : NV.platinum, cursor: 'pointer', display: 'flex', alignItems: 'center',
              transition: 'all 150ms ease-out',
            }}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', padding: '24px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Forecast card */}
          <div style={{ background: NV.surface, border: `1px solid ${NV.border}`, borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#4A5260', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Forecast</span>
              {forecast && (
                <span style={{
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px',
                  background: forecast.direction === 'bullish' ? 'rgba(76,175,130,0.1)' : forecast.direction === 'bearish' ? 'rgba(201,79,79,0.1)' : 'rgba(158,168,179,0.08)',
                  border: `1px solid ${forecast.direction === 'bullish' ? 'rgba(76,175,130,0.25)' : forecast.direction === 'bearish' ? 'rgba(201,79,79,0.25)' : NV.border2}`,
                  color: forecast.direction === 'bullish' ? NV.sage : forecast.direction === 'bearish' ? NV.coral : NV.platinum,
                }}>
                  {forecast.direction === 'bullish' ? <TrendingUp size={9} /> : forecast.direction === 'bearish' ? <TrendingDown size={9} /> : null}
                  {(forecast.direction ?? 'neutral').toUpperCase()}
                </span>
              )}
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="skeleton" style={{ height: '36px', width: '60%', borderRadius: '6px' }} />
                <div className="skeleton" style={{ height: '14px', width: '45%', borderRadius: '4px' }} />
              </div>
            ) : forecast ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{
                    fontSize: '28px', fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: forecast.direction === 'bullish' ? NV.sage : forecast.direction === 'bearish' ? NV.coral : '#fff',
                  }}>
                    ${(forecast.price_target ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p style={{ fontSize: '10px', color: '#4A5260', marginTop: '4px', fontFamily: "'JetBrains Mono', monospace" }}>
                    Target · last close ${(forecast.last_close ?? 0).toFixed(2)}
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    <span style={{ color: '#4A5260' }}>Signal Confidence</span>
                    <span style={{ color: NV.goldText, fontFamily: "'JetBrains Mono', monospace" }}>{(forecast.confidence ?? 0).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: '6px', background: NV.border2, borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${forecast.confidence ?? 0}%`, background: NV.gold, borderRadius: '999px', transition: 'width 1000ms ease' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: NV.bg, borderRadius: '10px', padding: '10px' }}>
                    <p style={{ fontSize: '9px', color: '#4A5260', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>RSI (14)</p>
                    <p style={{ fontSize: '15px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: rsiColor }}>{(forecast.rsi ?? 50).toFixed(1)}</p>
                  </div>
                  <div style={{ background: NV.bg, borderRadius: '10px', padding: '10px' }}>
                    <p style={{ fontSize: '9px', color: '#4A5260', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Momentum</p>
                    <p style={{ fontSize: '15px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: (forecast.momentum_pct ?? 0) > 0 ? NV.sage : NV.coral }}>
                      {(forecast.momentum_pct ?? 0) > 0 ? '+' : ''}{(forecast.momentum_pct ?? 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Activity size={28} style={{ color: NV.gold, opacity: 0.3, margin: '0 auto 8px' }} />
                <p style={{ fontSize: '11px', color: '#4A5260', fontStyle: 'italic' }}>No forecast available</p>
              </div>
            )}
          </div>

          {/* Signal Breakdown */}
          {forecast && (
            <div style={{ background: NV.surface, border: `1px solid ${NV.border}`, borderRadius: '16px', padding: '20px' }}>
              <h3 style={{ fontSize: '10px', fontWeight: 700, color: '#4A5260', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                <Cpu size={13} /> Signal Breakdown
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <SignalMeter label="SMA Trend" value={forecast.signals?.sma_trend?.value ?? 0} detail={forecast.signals?.sma_trend?.label ?? ''} />
                <SignalMeter label="RSI Momentum" value={forecast.signals?.rsi_momentum?.value ?? 0} detail={forecast.signals?.rsi_momentum?.label ?? ''} />
                <SignalMeter label="Bollinger" value={forecast.signals?.bollinger?.value ?? 0} detail={forecast.signals?.bollinger?.label ?? ''} />
              </div>
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${NV.border}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[['SMA 20', `$${(forecast.sma_20 ?? 0).toFixed(2)}`], ['SMA 50', `$${(forecast.sma_50 ?? 0).toFixed(2)}`]].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: "'JetBrains Mono', monospace" }}>
                    <span style={{ color: '#4A5260' }}>{label}</span>
                    <span style={{ color: NV.platinum }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {forecast?.market_analysis && (
            <div style={{ background: `rgba(201,150,42,0.04)`, border: `1px solid rgba(201,150,42,0.12)`, borderRadius: '16px', padding: '20px' }}>
              <h3 style={{ fontSize: '10px', fontWeight: 700, color: NV.goldText, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <Activity size={13} /> AI Analyst
              </h3>
              <p style={{ fontSize: '12px', color: NV.platinum, lineHeight: 1.7, fontStyle: 'italic' }}>
                "{forecast.market_analysis}"
              </p>
              <div style={{ fontSize: '9px', color: '#4A5260', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '10px', textAlign: 'right' }}>
                {forecast.source === 'real_ta' ? 'Real TA · Verified' : 'Gemini Enhanced'}
              </div>
            </div>
          )}
        </div>

        {/* Right columns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Chart */}
          <div style={{ background: NV.surface, border: `1px solid ${NV.border}`, borderRadius: '16px', padding: '24px', height: '420px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={16} style={{ color: NV.gold }} />
                Price Action &amp; AI Forecast
                {!loading && dataSource === 'empty' && (
                  <span style={{
                    fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    padding: '3px 8px', borderRadius: '4px',
                    background: 'rgba(201,150,42,0.12)', border: `1px solid rgba(201,150,42,0.3)`, color: NV.goldText,
                  }}>
                    ⚠ NO ALPACA DATA
                  </span>
                )}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: NV.sage }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: NV.sage, flexShrink: 0 }} /> Actual
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: NV.gold }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: NV.gold, flexShrink: 0 }} /> AI Forecast
                </span>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              {loading ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', border: `3px solid rgba(201,150,42,0.15)`, borderTopColor: NV.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ fontSize: '11px', color: '#4A5260', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', animation: 'pulse 1.5s ease-in-out infinite' }}>
                    Fetching bars · Running ensemble…
                  </p>
                </div>
              ) : chartData.length === 0 || dataSource === 'empty' ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <BarChart3 size={40} style={{ color: NV.gold, opacity: 0.2 }} />
                  <p style={{ fontSize: '12px', fontWeight: 600, color: NV.platinum }}>No price history available</p>
                  <p style={{ fontSize: '10px', color: '#4A5260', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', maxWidth: '260px', lineHeight: 1.6 }}>
                    Alpaca free plan returned no OHLCV bars for {selectedSymbol}.<br />Forecast signals still available in the left panel.
                  </p>
                  <button
                    onClick={() => loadData(selectedSymbol)}
                    style={{
                      marginTop: '8px', padding: '7px 18px',
                      background: 'transparent', border: `1px solid ${NV.gold}`, borderRadius: '8px',
                      color: NV.goldText, fontSize: '10px', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                      transition: 'all 150ms ease-out',
                    }}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={NV.sage} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={NV.sage} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={NV.gold} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={NV.gold} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={NV.border} vertical={false} />
                    <XAxis dataKey="date" stroke="#4A5260" fontSize={9} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis stroke="#4A5260" fontSize={9} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: NV.surface, border: `1px solid ${NV.border}`, borderRadius: 10, fontSize: 11 }}
                      itemStyle={{ color: NV.platinum }}
                    />
                    <Area type="monotone" dataKey="close" stroke={NV.sage} strokeWidth={1.5} fillOpacity={1} fill="url(#histGrad)" connectNulls dot={false} isAnimationActive={false} />
                    <Area type="monotone" dataKey="forecastClose" stroke={NV.gold} strokeWidth={1.5} strokeDasharray="5 5" fillOpacity={1} fill="url(#foreGrad)" connectNulls dot={false} />
                    <Line type="monotone" dataKey="sma20" stroke={INDICATOR_COLORS.sma20} strokeWidth={1} dot={false} opacity={0.5} />
                    <Line type="monotone" dataKey="sma50" stroke={INDICATOR_COLORS.sma50} strokeWidth={1} dot={false} opacity={0.5} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* RSI + Strategy row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* RSI card */}
            <div style={{ background: NV.surface, border: `1px solid ${NV.border}`, borderRadius: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#4A5260', textTransform: 'uppercase', letterSpacing: '0.1em' }}>RSI (14)</span>
                <Info size={13} style={{ color: '#4A5260' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: rsiColor }}>
                  {rsiVal.toFixed(1)}
                </div>
                <div style={{ width: '100%', height: '8px', background: NV.border2, borderRadius: '999px', marginTop: '14px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: '30%', right: '30%', height: '100%', background: 'rgba(158,168,179,0.08)', borderLeft: `1px solid ${NV.border2}`, borderRight: `1px solid ${NV.border2}` }} />
                  <div style={{ height: '100%', background: rsiVal > 70 ? NV.coral : rsiVal < 30 ? NV.sage : NV.ice, width: `${rsiVal}%`, transition: 'width 500ms ease', borderRadius: '999px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '6px', fontSize: '8px', color: '#4A5260', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <span>Oversold</span><span>Neutral</span><span>Overbought</span>
                </div>
              </div>
            </div>

            {/* Strategy Panel */}
            <StrategyPanel symbol={selectedSymbol} lastClose={forecast?.last_close ?? lastPriceRef.current} />
          </div>
        </div>
      </div>

      {/* Settings sidebar */}
      <aside style={{
        position: 'fixed', inset: '0 0 0 auto', width: '300px',
        background: NV.surface, borderLeft: `1px solid ${NV.border}`,
        boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
        transform: showSettings ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 300ms ease', zIndex: 200, padding: '24px',
        display: 'flex', flexDirection: 'column', gap: '0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={15} style={{ color: NV.gold }} /> Settings
          </h2>
          <button onClick={() => setShowSettings(false)} style={{ color: '#4A5260', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: '#4A5260', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '16px' }}>Signal Weights (display only)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(weights).map(([model, weight]) => (
              <div key={model}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', color: NV.platinum, fontWeight: 600 }}>{model}</span>
                  <span style={{ fontSize: '10px', color: NV.goldText, fontFamily: "'JetBrains Mono', monospace" }}>{(weight * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.05" value={weight}
                  onChange={(e) => handleWeightChange(model as ModelType, parseFloat(e.target.value))}
                  className="nv-slider w-full cursor-pointer"
                />
              </div>
            ))}
          </div>
          <div style={{ paddingTop: '20px', marginTop: '20px', borderTop: `1px solid ${NV.border}` }}>
            <button
              onClick={() => { loadData(selectedSymbol); setShowSettings(false); }}
              style={{
                width: '100%', padding: '11px', background: NV.gold, border: 'none', borderRadius: '10px',
                color: '#0A0A0B', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 0 16px rgba(201,150,42,0.25)', transition: 'all 150ms ease-out',
              }}
            >
              <Cpu size={14} /> Refresh Forecast
            </button>
            <p style={{ fontSize: '9px', color: '#4A5260', textAlign: 'center', marginTop: '10px', fontFamily: "'JetBrains Mono', monospace" }}>
              Pulls fresh Alpaca bars · re-runs SMA + RSI + Bollinger
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default QuantPulseTerminal;
