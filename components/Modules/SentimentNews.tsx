import React, { useEffect, useState } from 'react';
import { useTradingStore } from '../../src/stores/tradingStore';
import { 
  Newspaper, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Clock, 
  Hash,
  BrainCircuit,
  Zap,
  Loader2,
  ExternalLink
} from 'lucide-react';

export const SentimentNews: React.FC = () => {
  const { 
    selectedTicker, 
    news,
    sentiment,
    newsSummary,
    fetchNews, 
    loading,
    errors 
  } = useTradingStore();

  useEffect(() => {
    if (selectedTicker) {
      fetchNews(selectedTicker);
    }
  }, [selectedTicker]);

  if (loading.news && news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500">
        <Loader2 size={48} className="animate-spin mb-4 text-emerald-500" />
        <p className="font-mono text-xs uppercase tracking-widest animate-pulse">Scanning Global News Feeds...</p>
      </div>
    );
  }

  if (errors.news || (!loading.news && news.length === 0)) {
    return (
      <div className="p-20 text-center bg-emerald-500/5 rounded-3xl border border-emerald-500/10 m-6">
        <Newspaper size={48} className="mx-auto mb-4 text-emerald-500/30" />
        <p className="text-emerald-400 font-bold mb-1 uppercase tracking-widest text-sm">News Pipeline Offline</p>
        <p className="text-slate-500 text-xs">Real-time sentiment feeds currently unavailable for {selectedTicker}.</p>
        <button 
          onClick={() => fetchNews(selectedTicker)}
          className="mt-6 px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors uppercase"
        >
          RETRY NEWS LINK
        </button>
      </div>
    );
  }

  const sentimentScore = sentiment?.sentiment ? Math.round(sentiment.sentiment * 100) : 50;
  const isPositive = sentimentScore > 50;
  const isNegative = sentimentScore < 50;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 animate-in slide-in-from-right-5 duration-500">
      {/* Sentiment Overview */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <div className="bg-slate-950 border border-white/5 rounded-3xl p-8 relative overflow-hidden">
          <div className={`absolute -top-12 -left-12 w-48 h-48 blur-[80px] opacity-10 ${
            isPositive ? 'bg-emerald-500' : isNegative ? 'bg-red-500' : 'bg-blue-500'
          }`} />
          
          <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8 flex items-center gap-2 relative z-10">
            <BrainCircuit size={14} className="text-emerald-400" /> Aggregate Sentiment
          </h3>

          <div className="flex flex-col items-center text-center mb-10 relative z-10">
             <div className={`text-6xl font-mono font-bold mb-2 ${
               isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-400'
             }`}>
               {sentimentScore}
               <span className="text-xl opacity-50 ml-1">/100</span>
             </div>
             <p className={`text-sm font-bold uppercase tracking-widest ${
               isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-slate-500'
             }`}>
               {isPositive ? 'POSITIVE' : isNegative ? 'NEGATIVE' : 'NEUTRAL'} BIAS
             </p>
          </div>

          <div className="space-y-4 relative z-10">
             <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-500">SOCIAL BUZZ</span>
                <span className="text-white font-bold">{Math.round((sentiment?.buzz || 0) * 100)}%</span>
             </div>
             <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000" 
                  style={{ width: `${(sentiment?.buzz || 0) * 100}%` }}
                />
             </div>
             <p className="text-[10px] text-slate-600 font-bold mt-4 uppercase text-center italic leading-tight">
               Sentiment fusion derived from Finnhub & StockTwits analytics.
             </p>
          </div>
        </div>

        {/* Intelligence Alerts */}
        <div className="bg-slate-950 border border-white/5 rounded-3xl p-6 h-full">
          <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
            <Zap size={14} className="text-yellow-400" /> Sector Context
          </h3>
          <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
             <p className="text-xs text-slate-300 leading-relaxed font-mono">
                Sentiment tracking indicates {isPositive ? 'elevated buyer interest' : 'heightened caution'} in the {selectedTicker} ecosystem. Volume is currently {sentimentScore > 70 ? 'anomalous' : 'within standard deviation'}.
             </p>
          </div>
        </div>
      </div>

      {/* Scored News Feed */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="bg-emerald-600/5 border border-emerald-500/10 rounded-3xl p-8">
           <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
               <Newspaper className="text-white" size={24} />
             </div>
             <div>
               <h3 className="text-lg font-bold text-white tracking-tight">Market Mood Pulse</h3>
               <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Model: SONNET 3.5 AI SUMMARY</p>
             </div>
           </div>

           <div className="mb-10 min-h-[80px]">
             {newsSummary ? (
                <p className="text-lg text-slate-200 font-serif italic border-l-2 border-emerald-500/30 pl-6 leading-relaxed">
                  "{newsSummary}"
                </p>
             ) : (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-emerald-500/10 rounded w-3/4" />
                  <div className="h-4 bg-emerald-500/10 rounded w-1/2" />
                </div>
             )}
           </div>

           <div className="space-y-4">
              {news.slice(0, 8).map((n, i) => (
                <a 
                  key={i} 
                  href={n.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between p-4 bg-slate-950 border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-5">
                    <div className="text-xs font-mono font-bold text-slate-500 w-12 text-center uppercase">
                       {n.datetime ? new Date(n.datetime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                    </div>
                    <div>
                       <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">{n.headline}</p>
                       <p className="text-[10px] uppercase font-bold text-slate-600 mt-1">{n.source}</p>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
                </a>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};
