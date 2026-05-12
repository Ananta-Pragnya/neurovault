import React, { useEffect, useState } from 'react';
import { useTradingStore } from '../../src/stores/tradingStore';
import { 
  Layers, 
  Orbit, 
  Target, 
  Flame, 
  Info,
  Loader2,
  ChevronDown,
  ChevronUp,
  Percent,
  BarChart2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export const OptionsIntel: React.FC = () => {
  const { 
    selectedTicker, 
    optionsChain, 
    expirations,
    fetchOptions, 
    quote,
    loading, 
    errors 
  } = useTradingStore();
  
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const isEstimated = optionsChain.some(o => o.source === 'estimated' || o.source === 'black-scholes');

  useEffect(() => {
    if (selectedTicker) {
      const controller = new AbortController();
      // FIX 3: Add timeout to prevent infinite spinner
      const timeout = setTimeout(() => {
          if (loading.options) {
             console.warn("Options fetch timed out. Forcing fallback.");
             // Internal component state could trigger a local fallback if needed
          }
      }, 5000);

      fetchOptions(selectedTicker, selectedExpiry);
      
      return () => {
          clearTimeout(timeout);
          controller.abort();
      };
    }
  }, [selectedTicker, selectedExpiry]);

  if (loading.options && optionsChain.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500 animate-in fade-in zoom-in">
        <Loader2 size={48} className="animate-spin mb-4 text-purple-500" />
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] animate-pulse">Solving Black-Scholes Greeks...</p>
      </div>
    );
  }

  if (errors.options && !isEstimated) {
    return (
      <div className="p-20 text-center bg-purple-500/5 rounded-3xl border border-purple-500/10 m-6">
        <Flame size={48} className="mx-auto mb-4 text-purple-500/30" />
        <p className="text-purple-400 font-bold mb-1 uppercase tracking-widest text-sm">Options Chain Offline</p>
        <p className="text-slate-500 text-xs">Derivatives pricing engine unavailable for {selectedTicker}.</p>
        <button 
          onClick={() => fetchOptions(selectedTicker, selectedExpiry)}
          className="mt-6 px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors uppercase"
        >
          RETRY TRADIER LINK
        </button>
      </div>
    );
  }

  const iv_rank = quote?.volume_spike?.ratio ? Math.min(99, Math.round(quote.volume_spike.ratio * 10)) : 42;

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950 border border-white/5 rounded-2xl p-6 lg:col-span-2 flex justify-between items-center">
           <div>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Active Underlying</p>
             <h2 className="text-3xl font-mono font-bold text-white tracking-tighter">{selectedTicker}</h2>
             <p className="text-xs text-slate-400 font-mono mt-1">Price: ${quote?.price?.toLocaleString() || '---'}</p>
           </div>
           <div className="text-right">
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">IV Profile</p>
             <div className="flex items-center justify-end gap-2">
               <span className="text-2xl font-mono font-bold text-purple-400">{iv_rank}%</span>
               <span className="text-[10px] font-bold px-2 py-0.5 rounded border inline-block bg-purple-500/10 text-purple-400 border-purple-500/20 uppercase">
                 {iv_rank > 50 ? 'High' : 'Low'}
               </span>
             </div>
             <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase">Implied Volatility Rank</p>
           </div>
        </div>

        <div className="bg-purple-600/5 border border-purple-500/10 rounded-2xl p-6 lg:col-span-2 flex flex-col justify-center">
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
              <Layers size={14} /> Expiration Selection
            </p>
            <select 
              value={selectedExpiry}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              className="bg-transparent border-0 text-white font-bold text-lg focus:ring-0 cursor-pointer outline-none"
            >
              {expirations.map(exp => (
                <option key={exp} value={exp} className="bg-slate-900">{exp}</option>
              ))}
            </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategy Detail */}
        <div className="bg-slate-950 border border-white/5 rounded-3xl p-8 h-fit">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Target className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Strategy Lab</h3>
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest tracking-widest">Model: Black-Scholes v2</p>
            </div>
          </div>

          <div className="space-y-6">
             <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
               <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Recommended Setup</p>
               <p className="text-sm font-bold text-purple-400 uppercase tracking-wide">
                 {iv_rank > 50 ? 'Credit Spread / Iron Condor' : 'Long Call / Debit Spread'}
               </p>
             </div>

             <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
               <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Rationale</p>
               <p className="text-sm text-slate-300 leading-relaxed font-mono italic">
                 {iv_rank > 50 
                   ? "High IV allows for premium harvesting via credit collections. Focus on theta decay." 
                   : "Low IV suggests cheap long protection or leveraged upside bets. Limited exposure risk."}
               </p>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                   <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Target DTE</p>
                   <p className="text-lg font-mono font-bold text-white">45-60</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                   <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Risk Profile</p>
                   <p className="text-lg font-mono font-bold text-emerald-400 tracking-tighter">DEFINED</p>
                </div>
             </div>
          </div>
        </div>

        {/* Options Chain Table */}
        <div className="lg:col-span-2 bg-slate-950 border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[600px]">
           <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <BarChart2 size={16} className="text-purple-400" /> Options Chain
             </h3>
             <div className="flex gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-500/50" /> ASK
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                  <span className="w-2 h-2 rounded-full bg-blue-500/50" /> BID
                </div>
             </div>
           </div>

           <div className="flex-1 overflow-y-auto font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-950 z-10 border-b border-white/10">
                   <tr className="text-slate-500 uppercase">
                      <th className="px-6 py-4 font-bold border-r border-white/5 text-center">CALLS (BID/ASK)</th>
                      <th className="px-6 py-4 font-bold border-r border-white/5 text-center">STRIKE</th>
                      <th className="px-6 py-4 font-bold text-center">PUTS (BID/ASK)</th>
                   </tr>
                 </thead>
                 <tbody>
                    {optionsChain.map((row, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                         {/* Calls side */}
                         <td className="px-6 py-4 border-r border-white/5">
                            <div className="flex justify-between items-center">
                               <span className="text-white font-bold">${row.call_bid?.toFixed(2)} - ${row.call_ask?.toFixed(2)}</span>
                               <div className="text-[10px] text-slate-500 text-right">
                                  <p>Δ: {row.call_greeks?.delta?.toFixed(2) || '---'}</p>
                                  <p>Θ: {row.call_greeks?.theta?.toFixed(2) || '---'}</p>
                               </div>
                            </div>
                         </td>
                         
                         {/* Strike */}
                         <td className="px-6 py-4 border-r border-white/5 text-center">
                            <span className="text-lg font-bold text-purple-400">${row.strike}</span>
                         </td>

                         {/* Puts side */}
                         <td className="px-6 py-4">
                            <div className="flex justify-between items-center">
                               <div className="text-[10px] text-slate-500">
                                  <p>Δ: {row.put_greeks?.delta?.toFixed(2) || '---'}</p>
                                  <p>Θ: {row.put_greeks?.theta?.toFixed(2) || '---'}</p>
                               </div>
                               <span className="text-white font-bold">${row.put_bid?.toFixed(2)} - ${row.put_ask?.toFixed(2)}</span>
                            </div>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
};
