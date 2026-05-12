
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

const API_BASE = 'http://localhost:8000';

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
const SignalMeter: React.FC<{ label: string; value: number; detail: string }> = ({ label, value, detail }) => {
  const pct = ((value + 1) / 2) * 100; // map -1..1 to 0..100%
  const colour = value > 0.1 ? 'bg-emerald-500' : value < -0.1 ? 'bg-rose-500' : 'bg-slate-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
        <span className="text-slate-400">{label}</span>
        <span className={value > 0.1 ? 'text-emerald-400' : value < -0.1 ? 'text-rose-400' : 'text-slate-400'}>
          {value > 0.1 ? '▲' : value < -0.1 ? '▼' : '–'} {Math.abs(value).toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${colour} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[9px] text-slate-600 font-mono">{detail}</p>
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
      let url = '';
      if (strategy === 'covered-call') {
        const strike  = (lastClose * 1.05).toFixed(2);
        const premium = (lastClose * 0.015).toFixed(2);
        url = `${API_BASE}/api/strategy/covered-call?symbol=${symbol}&stock_price=${lastClose}&strike=${strike}&premium=${premium}`;
      } else if (strategy === 'iron-condor') {
        const w = (lastClose * 0.03).toFixed(2);
        url = `${API_BASE}/api/strategy/iron-condor?symbol=${symbol}&put_long=${(lastClose * 0.92).toFixed(2)}&put_short=${(lastClose * 0.95).toFixed(2)}&call_short=${(lastClose * 1.05).toFixed(2)}&call_long=${(lastClose * 1.08).toFixed(2)}&net_credit=${(lastClose * 0.02).toFixed(2)}`;
      } else {
        const premium = (lastClose * 0.025).toFixed(2);
        url = `${API_BASE}/api/strategy/straddle?symbol=${symbol}&strike=${lastClose.toFixed(2)}&call_premium=${premium}&put_premium=${premium}`;
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
    <section className="bg-slate-900 border border-violet-900/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
          <Target size={14} /> Options Strategy Engine
        </h3>
        <span className="text-[9px] text-slate-600 font-mono uppercase">Real payoff math</span>
      </div>

      {/* Strategy selector */}
      <div className="flex gap-2">
        {(['covered-call', 'iron-condor', 'straddle'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStrategy(s)}
            className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all ${
              strategy === s
                ? 'bg-violet-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {s.replace('-', ' ')}
          </button>
        ))}
      </div>

      <button
        onClick={run}
        disabled={loading || !lastClose}
        className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <><div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> Calculating…</>
        ) : (
          <><Zap size={12} /> Run {strategy.replace('-', ' ')}</>
        )}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-900/20 border border-rose-900/40 rounded-lg p-3">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {result.max_profit != null && (
              <div className="bg-slate-800/60 rounded-xl p-2 text-center">
                <p className="text-[9px] text-slate-500 uppercase mb-1">Max Profit</p>
                <p className="text-sm font-bold text-emerald-400 font-mono">${result.max_profit.toFixed(0)}</p>
              </div>
            )}
            {result.breakeven != null && (
              <div className="bg-slate-800/60 rounded-xl p-2 text-center">
                <p className="text-[9px] text-slate-500 uppercase mb-1">Breakeven</p>
                <p className="text-sm font-bold text-amber-400 font-mono">${result.breakeven.toFixed(2)}</p>
              </div>
            )}
            {(result.premium ?? result.net_credit) != null && (
              <div className="bg-slate-800/60 rounded-xl p-2 text-center">
                <p className="text-[9px] text-slate-500 uppercase mb-1">{result.premium != null ? 'Premium' : 'Net Credit'}</p>
                <p className="text-sm font-bold text-indigo-400 font-mono">${(result.premium ?? result.net_credit)!.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Micro payoff chart */}
          {result.payoff?.length > 0 && (
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.payoff.slice(0, 60)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="price" hide />
                  <YAxis fontSize={8} stroke="#475569" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
                    formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'P&L']}
                    labelFormatter={(l) => `Price: $${Number(l).toFixed(2)}`}
                  />
                  <defs>
                    <linearGradient id="payoffGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="total_pnl"
                    stroke="#8b5cf6"
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
    const ws = new WebSocket(`ws://localhost:8000/ws/data-hub`);

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
  const legacyPrediction: PredictionResult | null = forecast
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BrainCircuit className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400">
              QuantPulse AI
            </h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
              Real TA Engine · SMA + RSI + Bollinger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Data source badge */}
          {!loading && (
            <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded border ${
              dataSource === 'real'
                ? 'text-emerald-400 border-emerald-900/50 bg-emerald-900/20'
                : 'text-amber-400 border-amber-900/50 bg-amber-900/20'
            }`}>
              {dataSource === 'real' ? '✓ Live Alpaca Data' : '⚠ No Data'}
            </span>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
            >
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">

          {/* Prediction Summary Card */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Forecast</span>
              {forecast && (
                <span className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center gap-1 ${
                  forecast.direction === 'bullish'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : forecast.direction === 'bearish'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {forecast.direction === 'bullish' ? <TrendingUp size={10} /> : forecast.direction === 'bearish' ? <TrendingDown size={10} /> : null}
                  {forecast.direction.toUpperCase()}
                </span>
              )}
            </div>

            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-8 bg-slate-800 rounded w-2/3" />
                <div className="h-4 bg-slate-800 rounded w-1/2" />
              </div>
            ) : forecast ? (
              <>
                <div className="mb-4">
                  <span className={`text-3xl font-bold font-mono ${directionColor}`}>
                    ${forecast.price_target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">Target (vs ${forecast.last_close.toFixed(2)} last close)</p>
                </div>

                {/* Confidence bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                    <span>Signal Confidence</span>
                    <span className="text-indigo-400">{forecast.confidence.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-1000 rounded-full"
                      style={{ width: `${forecast.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-slate-800/50 p-2.5 rounded-xl">
                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">RSI (14)</p>
                    <p className={`text-sm font-bold font-mono ${forecast.rsi > 70 ? 'text-rose-400' : forecast.rsi < 30 ? 'text-emerald-400' : 'text-white'}`}>
                      {forecast.rsi.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 p-2.5 rounded-xl">
                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Momentum</p>
                    <p className={`text-sm font-bold font-mono ${forecast.momentum_pct > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {forecast.momentum_pct > 0 ? '+' : ''}{forecast.momentum_pct.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-600 italic">No forecast available</p>
            )}
          </section>

          {/* Real Signal Breakdown */}
          {forecast && (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Cpu size={14} /> Signal Breakdown
              </h3>
              <SignalMeter
                label="SMA Trend"
                value={forecast.signals.sma_trend.value}
                detail={forecast.signals.sma_trend.label}
              />
              <SignalMeter
                label="RSI Momentum"
                value={forecast.signals.rsi_momentum.value}
                detail={forecast.signals.rsi_momentum.label}
              />
              <SignalMeter
                label="Bollinger"
                value={forecast.signals.bollinger.value}
                detail={forecast.signals.bollinger.label}
              />
              <div className="pt-2 border-t border-slate-800 space-y-1 text-[10px] font-mono text-slate-500">
                <div className="flex justify-between">
                  <span>SMA 20</span>
                  <span className="text-slate-300">${forecast.sma_20.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SMA 50</span>
                  <span className="text-slate-300">${forecast.sma_50.toFixed(2)}</span>
                </div>
              </div>
            </section>
          )}

          {/* AI Analysis */}
          {forecast?.market_analysis && (
            <section className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Activity size={14} /> AI Analyst Insights
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "{forecast.market_analysis}"
              </p>
              <div className="text-[9px] font-bold text-indigo-500/40 uppercase mt-2 text-right">
                {forecast.source === 'real_ta' ? 'Real TA · Verified' : 'Gemini Enhanced'}
              </div>
            </section>
          )}
        </div>

        {/* Right 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          {/* Main Chart */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-[480px] relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <BarChart3 className="text-indigo-400" size={18} />
                Price Action &amp; Real AI Forecast
                {!loading && dataSource === 'empty' && (
                  <span className="ml-2 text-[9px] text-amber-400 border border-amber-900/40 bg-amber-900/20 px-2 py-0.5 rounded">
                    No Alpaca data
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-4 text-[9px] font-bold uppercase">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Actual
                </span>
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> AI Forecast
                </span>
              </div>
            </div>

            <div className="h-full pb-16">
              {loading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-sm font-medium text-slate-500 animate-pulse">
                    Fetching Alpaca bars · Running SMA + RSI + Bollinger…
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 11 }}
                      itemStyle={{ color: '#94a3b8' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#histGrad)"
                      connectNulls
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="forecastClose"
                      stroke="#6366f1"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      fillOpacity={1}
                      fill="url(#foreGrad)"
                      connectNulls
                      dot={false}
                    />
                    <Line type="monotone" dataKey="sma20" stroke={INDICATOR_COLORS.sma20} strokeWidth={1} dot={false} opacity={0.5} />
                    <Line type="monotone" dataKey="sma50" stroke={INDICATOR_COLORS.sma50} strokeWidth={1} dot={false} opacity={0.5} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Technical indicator cards + Strategy panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Indicator cards */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {/* RSI */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 col-span-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase">RSI (14)</span>
                    <Info size={13} className="text-slate-600" />
                  </div>
                  <div className="flex flex-col items-center">
                    <div className={`text-2xl font-bold font-mono ${
                      (forecast?.rsi ?? 50) > 70 ? 'text-rose-400' : (forecast?.rsi ?? 50) < 30 ? 'text-emerald-400' : 'text-white'
                    }`}>
                      {(forecast?.rsi ?? data[data.length - 1]?.rsi ?? 0).toFixed(1)}
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full mt-3 relative overflow-hidden">
                      <div className="absolute left-[30%] right-[30%] h-full bg-slate-700/50 border-x border-slate-600/50" />
                      <div
                        className={`h-full ${(forecast?.rsi ?? 50) > 70 ? 'bg-rose-500' : (forecast?.rsi ?? 50) < 30 ? 'bg-emerald-500' : 'bg-indigo-500'} transition-all`}
                        style={{ width: `${forecast?.rsi ?? 50}%` }}
                      />
                    </div>
                    <div className="flex justify-between w-full mt-1 text-[8px] text-slate-600 font-bold uppercase">
                      <span>Oversold</span><span>Neutral</span><span>Overbought</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy Panel — wired to real endpoints */}
            <StrategyPanel
              symbol={selectedSymbol}
              lastClose={forecast?.last_close ?? lastPriceRef.current}
            />
          </div>
        </div>
      </main>

      {/* Settings sidebar */}
      <aside className={`fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-800 shadow-2xl transition-transform duration-300 z-[60] p-6 ${showSettings ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-bold flex items-center gap-2"><Settings size={18} /> Settings</h2>
          <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white">&times;</button>
        </div>
        <div className="space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-4 block">Signal Weights (display only)</label>
            <div className="space-y-4">
              {Object.entries(weights).map(([model, weight]) => (
                <div key={model}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-slate-300 font-bold">{model}</span>
                    <span className="text-[10px] text-indigo-400">{(weight * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05" value={weight}
                    onChange={(e) => handleWeightChange(model as ModelType, parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="pt-6 border-t border-slate-800">
            <button
              onClick={() => { loadData(selectedSymbol); setShowSettings(false); }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Cpu size={16} /> Refresh Forecast
            </button>
            <p className="text-[9px] text-slate-500 text-center mt-3">Pulls fresh Alpaca bars and re-runs SMA + RSI + Bollinger ensemble</p>
          </div>
        </div>
      </aside>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 px-6 py-2 flex justify-between items-center">
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'live' ? 'bg-emerald-500 animate-pulse' : wsStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-slate-600'}`} />
            {wsStatus === 'live' ? 'Live Stream' : wsStatus === 'connecting' ? 'Connecting…' : 'Stream Offline'}
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${forecast ? 'bg-indigo-500' : 'bg-slate-700'}`} />
            {forecast ? 'Real TA Ensemble' : 'No Forecast'}
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-700">
          {new Date().toLocaleTimeString()}
        </div>
      </footer>
    </div>
  );
};

export default QuantPulseTerminal;
