import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crosshair, TrendingDown, TrendingUp, Shield, Zap,
  RefreshCw, AlertTriangle, BarChart2, Activity
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const WATCHLIST = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META', 'SPY', 'QQQ'];

interface Bet {
  symbol: string;
  structure: string;
  entry_cost_pct: number;
  max_loss_pct: number;
  upside_multiple: number;
  breakeven_move_pct: number;
  kelly_size_pct: number;
  reasoning: string;
}

interface ScanResult {
  symbol: string;
  action: 'EVALUATE' | 'NO_TRADE';
  bet?: Bet;
  reason?: string;
  warning?: string;
  loading: boolean;
  error?: string;
}

const STRUCTURE_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode;
}> = {
  long_vol_put_spread: {
    label: 'Long Vol Put Spread',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950',
    border: 'border-emerald-700/40',
    icon: <TrendingDown size={14} />,
  },
  iron_condor: {
    label: 'Iron Condor',
    color: 'text-amber-400',
    bg: 'bg-amber-950',
    border: 'border-amber-700/40',
    icon: <BarChart2 size={14} />,
  },
  tail_protection: {
    label: 'Tail Protection',
    color: 'text-red-400',
    bg: 'bg-red-950',
    border: 'border-red-700/40',
    icon: <Shield size={14} />,
  },
  skew_hedge: {
    label: 'Skew Hedge',
    color: 'text-purple-400',
    bg: 'bg-purple-950',
    border: 'border-purple-700/40',
    icon: <Activity size={14} />,
  },
};

const DEFAULT_STRUCTURE = {
  label: 'Unknown',
  color: 'text-slate-400',
  bg: 'bg-slate-900',
  border: 'border-slate-700/40',
  icon: <Zap size={14} />,
};

export const EdgeScanner: React.FC = () => {
  const [results, setResults] = useState<ScanResult[]>(
    WATCHLIST.map(s => ({ symbol: s, action: 'NO_TRADE', loading: false }))
  );
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [customTicker, setCustomTicker] = useState('');

  const scanSymbol = useCallback(async (symbol: string): Promise<ScanResult> => {
    try {
      const res = await fetch(`${API_BASE}/api/edge/scan/${symbol}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { symbol, ...data, loading: false };
    } catch (e: any) {
      return { symbol, action: 'NO_TRADE', loading: false, error: e.message };
    }
  }, []);

  const runFullScan = useCallback(async (symbols: string[]) => {
    setScanning(true);
    setResults(prev => prev.map(r =>
      symbols.includes(r.symbol) ? { ...r, loading: true } : r
    ));

    const batches = [];
    for (let i = 0; i < symbols.length; i += 3) {
      batches.push(symbols.slice(i, i + 3));
    }

    for (const batch of batches) {
      const batchResults = await Promise.all(batch.map(scanSymbol));
      setResults(prev => {
        const next = [...prev];
        batchResults.forEach(br => {
          const idx = next.findIndex(r => r.symbol === br.symbol);
          if (idx >= 0) next[idx] = br;
          else next.push(br);
        });
        return next;
      });
    }

    setLastScan(new Date());
    setScanning(false);
  }, [scanSymbol]);

  useEffect(() => {
    runFullScan(WATCHLIST);
  }, []);

  const handleAddTicker = () => {
    const sym = customTicker.trim().toUpperCase();
    if (!sym) return;
    setCustomTicker('');
    if (!results.find(r => r.symbol === sym)) {
      setResults(prev => [...prev, { symbol: sym, action: 'NO_TRADE', loading: true }]);
    }
    runFullScan([sym]);
  };

  const edgeCount = results.filter(r => r.action === 'EVALUATE').length;
  const noTradeCount = results.filter(r => r.action === 'NO_TRADE' && !r.loading).length;

  return (
    <div className="p-6 space-y-6 animate-in slide-in-from-bottom-5 duration-500">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center">
              <Crosshair size={16} className="text-amber-500" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Asymmetric Edge Scanner</h2>
          </div>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest ml-11">
            Universa/Taleb playbook — detect vol mispricing · Kelly-sized defined-risk bets
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastScan && (
            <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">
              Last scan: {lastScan.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => runFullScan(results.map(r => r.symbol))}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-amber-500/20 transition-all disabled:opacity-40"
          >
            <RefreshCw size={12} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning...' : 'Rescan All'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0D121A] border border-white/5 rounded-xl p-4">
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-2">Symbols Scanned</p>
          <p className="text-2xl font-bold text-white font-mono">{results.length}</p>
        </div>
        <div style={{ background: 'rgba(76,175,130,0.06)', border: '1px solid rgba(76,175,130,0.18)', borderRadius: '10px', padding: '16px' }}>
          <p style={{ fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", color: 'rgba(76,175,130,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Edge Detected</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#4CAF82', fontFamily: "'JetBrains Mono', monospace" }}>{edgeCount}</p>
            <p style={{ fontSize: '9px', color: 'rgba(76,175,130,0.45)', fontFamily: "'JetBrains Mono', monospace" }}>
              {results.length > 0 ? `${((edgeCount / results.length) * 100).toFixed(0)}% hit rate` : ''}
            </p>
          </div>
        </div>
        <div className="bg-[#0D121A] border border-white/5 rounded-xl p-4">
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-2">No Trade (Correct)</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-400 font-mono">{noTradeCount}</p>
            <p className="text-[9px] text-slate-600 font-mono">capital preserved</p>
          </div>
        </div>
      </div>

      {/* Add Custom Ticker */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customTicker}
          onChange={e => setCustomTicker(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleAddTicker()}
          placeholder="ADD TICKER — e.g. GLD, VIX"
          className="flex-1 bg-[#0D121A] border border-white/10 text-white text-xs font-mono uppercase tracking-widest px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500/40 placeholder-slate-600"
          maxLength={10}
        />
        <button
          onClick={handleAddTicker}
          className="px-5 py-2.5 bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-white/10 transition-all"
        >
          Scan
        </button>
      </div>

      {/* Edge Opportunities (top section) */}
      {edgeCount > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-amber-500/80 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse inline-block" />
            Edge Opportunities ({edgeCount})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence>
              {results.filter(r => r.action === 'EVALUATE').map(r => (
                <EdgeCard key={r.symbol} result={r} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* No Trade Grid */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          No Edge — Discipline Preserved ({noTradeCount + results.filter(r => r.loading).length})
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {results.filter(r => r.action === 'NO_TRADE' || r.loading).map(r => (
            <NoTradeCard key={r.symbol} result={r} />
          ))}
        </div>
      </div>

      {/* Philosophy Footer */}
      <div style={{ background: '#111113', border: '1px solid #1E1E21', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
        <p style={{ fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", color: '#4A5260', letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1.9 }}>
          The system refuses to trade ~70% of the time. That discipline{' '}
          <span style={{ color: '#9EA8B3' }}>is</span> the edge.{' '}
          Small constant bleed on false signals · Asymmetric payoff on true dislocations · Maximum loss always defined.
        </p>
      </div>
    </div>
  );
};

const EdgeCard: React.FC<{ result: ScanResult }> = ({ result }) => {
  const { bet } = result;
  if (!bet) return null;

  const cfg = STRUCTURE_CONFIG[bet.structure] ?? DEFAULT_STRUCTURE;
  const isLongVol = bet.structure.includes('long_vol') || bet.structure === 'tail_protection';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`${cfg.bg} border ${cfg.border} rounded-2xl p-5 space-y-4`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-bold text-xl tracking-tight text-white`}>{result.symbol}</span>
            <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.border} bg-black/20`}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Asymmetric Edge Detected</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono text-white">{(bet.upside_multiple ?? 0).toFixed(1)}x</div>
          <div className="text-[9px] text-slate-500 font-mono uppercase">payoff</div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetBox
          label="Entry Cost"
          value={`${Math.abs(bet.entry_cost_pct ?? 0).toFixed(2)}%`}
          sub={(bet.entry_cost_pct ?? 0) < 0 ? 'credit received' : 'debit paid'}
          highlight={false}
        />
        <MetBox
          label="Max Loss"
          value={`${(bet.max_loss_pct ?? 0).toFixed(2)}%`}
          sub="of capital at risk"
          highlight={false}
        />
        <MetBox
          label="Kelly Size"
          value={`${(bet.kelly_size_pct ?? 0).toFixed(2)}%`}
          sub="fractional Kelly (¼)"
          highlight={true}
        />
        <MetBox
          label="Breakeven Move"
          value={`${(bet.breakeven_move_pct ?? 0) > 0 ? '+' : ''}${(bet.breakeven_move_pct ?? 0).toFixed(1)}%`}
          sub="in underlying"
          highlight={false}
        />
      </div>

      {/* Reasoning */}
      <div className="bg-black/30 rounded-xl p-3 border border-white/5">
        <p className="text-[10px] font-mono text-slate-400 leading-relaxed">{bet.reasoning}</p>
      </div>

      {/* Warning */}
      {result.warning && (
        <div className="flex items-center gap-2 text-[9px] font-mono text-amber-500/70 uppercase tracking-widest">
          <AlertTriangle size={10} />
          {result.warning}
        </div>
      )}

      {/* Action hint */}
      <div className={`flex items-center justify-between pt-2 border-t ${cfg.border}`}>
        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Advisory mode — no auto-execution</span>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${isLongVol ? 'text-emerald-400' : 'text-amber-400'}`}>
          {isLongVol ? 'Buy convexity ▲' : 'Sell premium ◆'}
        </span>
      </div>
    </motion.div>
  );
};

const MetBox: React.FC<{ label: string; value: string; sub: string; highlight: boolean }> = ({
  label, value, sub, highlight
}) => (
  <div className={`rounded-lg p-3 ${highlight ? 'bg-white/5 border border-white/10' : 'bg-black/20'}`}>
    <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-base font-bold font-mono ${highlight ? 'text-white' : 'text-slate-300'}`}>{value}</p>
    <p className="text-[8px] font-mono text-slate-600 mt-0.5">{sub}</p>
  </div>
);

const NoTradeCard: React.FC<{ result: ScanResult }> = ({ result }) => (
  <div className={`
    bg-[#0D121A] border border-white/5 rounded-xl p-3 text-center
    ${result.loading ? 'animate-pulse' : ''}
    ${result.error ? 'border-red-900/30' : ''}
  `}>
    <p className="text-xs font-bold text-slate-400 font-mono mb-1">{result.symbol}</p>
    {result.loading ? (
      <p className="text-[8px] text-amber-500/60 font-mono uppercase tracking-wider">Scanning…</p>
    ) : result.error ? (
      <p className="text-[8px] text-red-500/60 font-mono uppercase tracking-wider">Error</p>
    ) : (
      <p className="text-[8px] text-slate-600 font-mono uppercase tracking-wider">No trade</p>
    )}
  </div>
);
