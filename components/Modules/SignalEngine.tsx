import React, { useEffect, useState } from 'react';
import { useTradingStore } from '../../src/stores/tradingStore';
import { 
  Zap, 
  Shield, 
  BrainCircuit, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';

export const SignalEngine: React.FC = () => {
  const { 
    selectedTicker, 
    signal, 
    fetchQuote, 
    loading, 
    errors 
  } = useTradingStore();
  
  const [timeframe, setTimeframe] = useState('6mo');

  useEffect(() => {
    if (selectedTicker) {
      fetchQuote(selectedTicker);
    }
  }, [selectedTicker, timeframe]);

  if (loading.quote && !signal) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500">
        <BrainCircuit size={48} className="animate-pulse mb-4 text-blue-500/50" />
        <p className="font-mono text-xs uppercase tracking-widest animate-pulse">Running Neural Inference...</p>
      </div>
    );
  }

  if (errors.signal) {
    return (
      <div className="p-20 text-center bg-red-500/5 rounded-3xl border border-red-500/10 m-6">
        <AlertTriangle size={48} className="mx-auto mb-4 text-red-500/50" />
        <p className="text-red-400 font-bold mb-1 uppercase tracking-widest text-sm">Intelligence Engine Offline</p>
        <p className="text-slate-500 text-xs">AI Inference temporarily unavailable for {selectedTicker}.</p>
        <button 
          onClick={() => fetchQuote(selectedTicker)}
          className="mt-6 px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors"
        >
          RETRY NEURAL LINK
        </button>
      </div>
    );
  }

  if (!signal) return null;

  const isBuy = signal.signal?.includes('BUY');
  const isSell = signal.signal?.includes('SELL');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 animate-in slide-in-from-bottom-5 duration-500">
      {/* Primary Signal Card */}
      <div className="flex flex-col gap-6">
        <div className={`relative overflow-hidden bg-slate-950 border border-white/5 rounded-3xl p-8`}>
          {/* Signal Glow */}
          <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[100px] opacity-20 pointer-events-none ${isBuy ? 'bg-emerald-500' : isSell ? 'bg-red-500' : 'bg-blue-500'}`} />
          
          <div className="flex justify-between items-start mb-10 relative z-10">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mb-2">Quant Intelligence Signal</p>
              <h2 className="text-5xl font-mono font-bold text-white tracking-tighter uppercase">
                {selectedTicker}
              </h2>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border ${
                isBuy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                isSell ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                {signal.signal?.replace('_', ' ')}
              </div>
              <div className="text-[8px] font-mono text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 uppercase tracking-tighter">
                Live Alpaca Feed
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 mb-10 relative z-10">
             <div>
               <p className="text-[10px] text-slate-500 font-bold uppercase mb-4 flex items-center gap-2">
                 <Zap size={12} className="text-yellow-500" /> Confidence Score
               </p>
               <div className="flex items-end gap-3">
                 <span className="text-4xl font-mono font-bold text-white leading-none">{signal.confidence}%</span>
               </div>
               <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${signal.confidence}%` }}
                   transition={{ duration: 1.5, ease: "easeOut" }}
                   className={`h-full ${isBuy ? 'bg-emerald-500' : isSell ? 'bg-red-500' : 'bg-blue-500'}`} 
                 />
               </div>
             </div>

             <div>
               <p className="text-[10px] text-slate-500 font-bold uppercase mb-4 flex items-center gap-2">
                 <Shield size={12} className="text-blue-400" /> Risk Assessment
               </p>
               <div className="flex items-end gap-3">
                 <span className={`text-4xl font-mono font-bold leading-none ${
                   signal.risk_level === 'HIGH' ? 'text-red-400' : 
                   signal.risk_level === 'MEDIUM' ? 'text-yellow-400' : 
                   'text-emerald-400'
                 }`}>{signal.risk_level}</span>
               </div>
               <div className="flex gap-1 mt-4">
                 {[1, 2, 3, 4, 5].map(i => (
                   <div key={i} className={`h-1 flex-1 rounded-full ${
                     i <= (signal.risk_level === 'HIGH' ? 5 : signal.risk_level === 'MEDIUM' ? 3 : 1)
                     ? (signal.risk_level === 'HIGH' ? 'bg-red-500' : signal.risk_level === 'MEDIUM' ? 'bg-yellow-500' : 'bg-emerald-500')
                     : 'bg-white/5'
                   }`} />
                 ))}
               </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-10 relative z-10">
             <div>
               <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Quant Trend</p>
               <div className={`flex items-center gap-2 font-bold ${signal.trend === 'BULLISH' ? 'text-emerald-400' : 'text-red-400'}`}>
                 {signal.trend === 'BULLISH' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                 <span className="text-lg uppercase">{signal.trend}</span>
               </div>
             </div>
             <div>
               <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Engine Integrity</p>
               <div className="flex items-center gap-2 font-bold text-blue-400">
                 <BrainCircuit size={20} />
                 <span className="text-lg">STABLE</span>
               </div>
             </div>
          </div>
        </div>

        {/* Action Strategy Card */}
        <div className="bg-slate-950 border border-white/5 rounded-3xl p-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Target size={14} className="text-blue-400" /> Actionable Advice
          </h3>
          <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
             <p className="text-white font-serif italic text-lg leading-relaxed">
                {signal.suggested_action}
             </p>
          </div>
        </div>
      </div>

      {/* AI Reasoning & Action */}
      <div className="flex flex-col gap-6">
        <div className="bg-blue-600/5 border border-blue-500/10 rounded-3xl p-8 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BrainCircuit className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Claude Intelligence</h3>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Model: Sonnet 3.5 — Active</p>
            </div>
          </div>

          <div className="flex-1 relative">
            <div className="absolute top-0 left-0 text-4xl text-blue-500/20 font-serif lowercase italic">"</div>
            <div className="pt-6 relative z-10">
              <p className="text-xl text-slate-300 leading-relaxed font-serif italic mb-10">
                {signal.reasoning}
              </p>
            </div>
            <div className="absolute bottom-0 right-0 text-4xl text-blue-500/20 font-serif lowercase italic rotate-180">"</div>
          </div>

          <div className="mt-auto pt-8 border-t border-blue-500/10">
             <div className="flex items-center justify-between p-6 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <div>
                   <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">Bias</p>
                   <p className="text-2xl font-bold text-white">{signal.signal?.replace('_', ' ')}</p>
                </div>
                <button className="px-8 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
                   <Zap size={18} /> EXECUTE
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
