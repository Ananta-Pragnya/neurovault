import React, { useEffect, useState } from 'react';
import { useTradingStore } from '../../src/stores/tradingStore';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Globe, 
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { ResponsiveContainer, Treemap, Tooltip, AreaChart, Area } from 'recharts';
import { searchTickers } from '../../src/services/api';

export const MarketDashboard: React.FC = () => {
  const { 
    quotes, 
    macro, 
    fetchQuotes, 
    fetchMacro, 
    setTicker, 
    loading,
    errors 
  } = useTradingStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const SECTORS = ['XLK','XLF','XLE','XLV','XLY','XLP','XLI','XLB','XLRE','XLU','XLC'];
  
  useEffect(() => {
    fetchMacro();
    const allTickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'META', ...SECTORS];
    fetchQuotes(allTickers);
    
    const interval = setInterval(() => {
      fetchQuotes(allTickers);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length > 1) {
      setIsSearching(true);
      try {
        const results = await searchTickers(q);
        setSearchResults(results || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const heatmapData = quotes.map(q => ({
    name: q.ticker,
    value: 1, // Relative weight simplified for rewire
    change: q.change_pct,
    color: q.change_pct >= 0 ? '#10b981' : '#ef4444'
  }));

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500" style={{ background: '#0A0A0B' }}>
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5" style={{ borderBottom: '1px solid #1E1E21' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#E2E8F0', marginBottom: '4px', letterSpacing: '-0.02em' }}>
            Market Intelligence
          </h1>
          <p style={{ fontSize: '13px', color: '#4A5260', fontFamily: "'JetBrains Mono', monospace" }}>Real-time global surveillance</p>
        </div>

        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search symbols (AAPL, RELIANCE.NS, BTC-USD)..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
          />
          
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto backdrop-blur-xl">
              {searchResults.map((res) => (
                <button
                  key={res.ticker}
                  onClick={() => {
                    setTicker(res.ticker);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 flex justify-between items-center group/item"
                >
                  <div>
                    <span className="font-bold text-white group-hover/item:text-blue-400 transition-colors">{res.ticker}</span>
                    <span className="text-xs text-slate-500 ml-2">{res.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 border border-white/10 px-1.5 rounded">{res.market}</span>
                </button>
              ))}
            </div>
          )}
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 size={16} className="animate-spin text-slate-500" />
            </div>
          )}
        </div>
      </div>

      {/* Macro Overlay */}
      <div className="relative">
        {errors.macro && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '28px', textAlign: 'center',
            background: '#111113', border: '1px solid #1E1E21', borderRadius: '10px',
            marginBottom: '0',
          }}>
            <Zap size={28} style={{ color: '#C9962A', marginBottom: '10px', opacity: 0.7 }} />
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#E2E8F0', marginBottom: '4px' }}>Macro data unavailable</p>
            <p style={{ fontSize: '13px', color: '#4A5260', marginBottom: '16px' }}>
              FRED feed unavailable — check API key configuration
            </p>
            <button
              onClick={() => fetchMacro()}
              style={{
                padding: '6px 18px', border: '1px solid #C9962A', background: 'transparent',
                color: '#D4A843', fontSize: '12px', fontWeight: 500, borderRadius: '6px', cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em',
              }}
            >
              RETRY CONNECTION
            </button>
          </div>
        )}
        {macro && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
            <MacroItem label="FED RATE" value={macro.fed_rate != null ? `${macro.fed_rate}%` : '—'} sub="Target Rate" />
            <MacroItem label="CPI" value={macro.cpi != null ? `${macro.cpi}` : '—'} sub="Index Level" />
            <MacroItem label="10Y YIELD" value={macro.yield_10y != null ? `${macro.yield_10y}%` : '—'} sub="Treasury" />
            <MacroItem label="GDP GROWTH" value={macro.gdp_growth != null ? `$${(macro.gdp_growth / 1000).toFixed(1)}T` : '—'} sub="Nominal GDP" />
            <div className="hidden lg:flex flex-col justify-center px-4 border-l border-white/5">
               <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">Status</p>
               <p className="text-[11px] text-slate-400 leading-tight">Live FRED data feed active. Updated: {macro.last_updated}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price Cards */}
        <div className="lg:col-span-2 relative">
          {errors.quotes && (
            <div className="absolute inset-0 z-10 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl border border-red-500/20 p-10">
              <BarChart3 size={40} className="text-red-500/40 mb-2" />
              <p className="text-red-400 font-bold uppercase tracking-widest text-sm">Market Data Unavailable</p>
              <p className="text-slate-500 text-xs mt-1">Connecting to Alpaca data feed...</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading.quotes ? (
               Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '160px', borderRadius: '10px', border: '1px solid #1E1E21' }} />
               ))
            ) : (
              quotes.map(q => (
                <PriceCard key={q.ticker} data={q} onSelect={() => setTicker(q.ticker)} />
              ))
            )}
          </div>
        </div>

        {/* Heatmap & Activity */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-950 border border-white/5 rounded-2xl p-5 h-[300px] flex flex-col">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" /> Sector Heatmap
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={heatmapData}
                  dataKey="value"
                  stroke="#0A0E14"
                  fill="#8884d8"
                  content={<CustomTreemapContent />}
                />
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-950 border border-white/5 rounded-2xl p-5 flex-1 min-h-[250px]">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={16} className="text-blue-400" /> Market Anomalies
            </h3>
            <div className="space-y-4">
               {quotes.filter(q => q.volume_spike?.spike).map(q => (
                 <div key={q.ticker} className="flex justify-between items-center p-3 bg-red-400/5 border border-red-400/10 rounded-lg">
                    <div>
                      <p className="font-bold text-white text-sm">{q.ticker}</p>
                      <p className="text-[10px] text-red-300 font-bold uppercase tracking-tighter">{q.volume_spike?.label} VOLUME SURGE</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-white">{(q.volume_spike?.ratio || 0).toFixed(1)}x Avg</p>
                      <ArrowUpRight size={14} className="text-red-400 ml-auto" />
                    </div>
                 </div>
               ))}
               {quotes.filter(q => q.volume_spike?.spike).length === 0 && (
                 <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <Activity size={24} style={{ color: '#2A2A2E', margin: '0 auto 10px' }} />
                    <p style={{ fontSize: '13px', color: '#4A5260' }}>No anomalies detected</p>
                    <p style={{ fontSize: '11px', color: '#2A2A2E', marginTop: '4px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>
                      MONITORING FOR VOLUME SPIKES
                    </p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MacroItem = ({ label, value, sub, color = 'text-white' }: any) => (
  <div className="px-4 border-r last:border-0 border-white/5">
    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">{label}</p>
    <p className={`text-lg font-mono font-bold leading-none mb-1 ${color}`}>{value}</p>
    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{sub}</p>
  </div>
);

const PriceCard = ({ data, onSelect }: { data: any, onSelect: () => void }) => {
  const isUp = (data.change_pct || 0) >= 0;
  const price = data.current_price || data.price || 0;
  const sparkline = data.sparkline || [];
  const hasSparkline = sparkline.length > 0;

  return (
    <div
      onClick={onSelect}
      style={{
        background: '#111113', border: '1px solid #1E1E21', borderRadius: '10px',
        padding: '18px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.15s ease-out, background 0.15s ease-out',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2A2A2E'; (e.currentTarget as HTMLElement).style.background = '#161618'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1E1E21'; (e.currentTarget as HTMLElement).style.background = '#111113'; }}
      className="group"
    >
      {/* Sparkline decoration */}
      {hasSparkline && (
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-10 pointer-events-none grayscale group-hover:grayscale-0 transition-all">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline.map((p: any, i: any) => ({ p, i }))}>
              <Area type="monotone" dataKey="p" stroke={isUp ? '#10b981' : '#ef4444'} fill={isUp ? '#10b981' : '#ef4444'} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h4 className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors uppercase">{data.ticker}</h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter truncate w-32">{data.name || data.ticker}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 500, color: isUp ? '#4CAF82' : '#C94F4F' }}>
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isUp ? '+' : ''}{(data.change_pct || 0).toFixed(2)}%
        </div>
      </div>

      <div className="flex justify-between items-end relative z-10">
        <div>
          <p className="text-2xl font-mono font-bold text-white tracking-tighter">
            {data.currency === 'INR' ? '₹' : '$'}{price > 0 ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
          </p>
          <div className="flex gap-2 mt-1">
             <span className="text-[9px] font-bold text-slate-600 border border-white/5 px-1 rounded">{data.market || 'US'}</span>
             <span className="text-[9px] font-bold text-emerald-500/80 border border-emerald-500/20 bg-emerald-500/5 px-1 rounded uppercase tracking-tighter">
               {data.provider === 'stub' ? 'PENDING' : 'ALPACA LIVE'}
             </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Updated</p>
          <p className="text-[10px] font-mono text-slate-400">{data.last_fetch || (data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '—')}</p>
        </div>
      </div>
    </div>
  );
};

const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, index, name, change, color } = props;
  if (width < 30 || height < 30) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          fillOpacity: 0.15,
          stroke: 'rgba(255,255,255,0.05)',
          strokeWidth: 2,
        }}
      />
      {width > 40 && height > 30 && (
        <>
          <text
            x={x + 5}
            y={y + 15}
            fill="#fff"
            fontSize={10}
            fontWeight="bold"
            className="uppercase"
          >
            {name}
          </text>
          <text
            x={x + 5}
            y={y + 28}
            fill={color}
            fontSize={9}
            fontWeight="bold"
          >
            {change > 0 ? '+' : ''}{change}%
          </text>
        </>
      )}
    </g>
  );
};
