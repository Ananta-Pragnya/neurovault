import React, { useEffect, useState } from 'react';
import { useTradingStore } from '../../src/stores/tradingStore';
import { 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieIcon, 
  ShieldAlert, 
  BrainCircuit,
  Plus,
  Trash2,
  Loader2,
  BarChart3,
  Dna
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export const PortfolioTracker: React.FC = () => {
  const { 
    portfolio, 
    holdings, 
    analyzePortfolio, 
    removeHolding, 
    loading 
  } = useTradingStore();

  useEffect(() => {
    analyzePortfolio();
  }, [holdings]);

  if (loading.portfolio && !portfolio) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500">
        <Loader2 size={48} className="animate-spin mb-4 text-emerald-500" />
        <p className="font-mono text-xs uppercase tracking-widest animate-pulse">Running Portfolio Stress Tests...</p>
      </div>
    );
  }

  if (!portfolio) return null;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const sectorData = portfolio.sector_exposure.sectors || [];

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500">
      {/* Portfolio Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950 border border-white/5 rounded-2xl p-6">
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Equity</p>
           <h2 className="text-3xl font-mono font-bold text-white tracking-tighter">${portfolio.overview?.total_value?.toLocaleString() || "—"}</h2>
           <div className={`flex items-center gap-1 text-xs font-bold mt-1 ${(portfolio.overview?.total_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <TrendingUp size={14} /> +{(portfolio.overview?.total_pnl_pct || 0).toFixed(2)}% (+${(portfolio.overview?.total_pnl || 0).toLocaleString()})
           </div>
        </div>

        <div className="bg-slate-950 border border-white/5 rounded-2xl p-6">
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Risk Profile</p>
           <h2 className="font-mono font-bold tracking-tighter" style={{
             fontSize: '22px',
             color: portfolio.risk?.risk_class === 'HIGH' ? '#C94F4F'
                  : portfolio.risk?.risk_class === 'MEDIUM' ? '#D4892A'
                  : '#4CAF82',
           }}>{portfolio.risk?.risk_class || "—"}</h2>
           <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase">95% VaR: ${portfolio.risk?.var_95?.var_dollar?.toLocaleString() || "—"}</p>
        </div>

        <div className="bg-slate-950 border border-white/5 rounded-2xl p-6">
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Sharpe Ratio</p>
           <h2 className="text-3xl font-mono font-bold text-white tracking-tighter">{portfolio.sharpe?.sharpe?.toFixed(2) || "—"}</h2>
           <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase">Quality: {portfolio.sharpe?.quality || "—"}</p>
        </div>

        <div className="bg-slate-950 border border-white/5 rounded-2xl p-6">
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Diversification</p>
           <h2 className="text-3xl font-mono font-bold tracking-tighter" style={{ color: '#5B9BD5' }}>
             {portfolio.correlation?.diversification_score > 0 ? `${portfolio.correlation.diversification_score}/100` : '—'}
           </h2>
           <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase">
             {portfolio.correlation?.diversification_score > 0
               ? `Concentration: ${portfolio.sector_exposure?.concentration_risk || '—'}`
               : 'Insufficient holdings data'}
           </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings Table */}
        <div className="lg:col-span-2 bg-slate-950 border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[500px]">
           <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <Briefcase size={16} className="text-blue-400" /> Active Holdings
             </h3>
             <button className="p-2 hover:bg-white/5 rounded-lg transition-all text-slate-500 hover:text-white">
                <Plus size={18} />
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-950 z-10 border-b border-white/10 uppercase text-slate-500">
                   <tr>
                      <th className="px-6 py-4 font-bold">TICKER</th>
                      <th className="px-6 py-4 font-bold text-right">QTY</th>
                      <th className="px-6 py-4 font-bold text-right">VALUE</th>
                      <th className="px-6 py-4 font-bold text-right">P&L (%)</th>
                      <th className="px-6 py-4 font-bold text-right">WEIGHT</th>
                      <th className="px-6 py-4 font-bold text-center">ACTION</th>
                   </tr>
                </thead>
                <tbody>
                   {portfolio.positions.length === 0 && (
                     <tr>
                       <td colSpan={6} style={{ padding: '32px 24px', textAlign: 'center' }}>
                         <p style={{ fontSize: '13px', color: '#4A5260', fontStyle: 'italic', marginBottom: '10px' }}>
                           No active positions — add holdings to begin tracking
                         </p>
                         <button style={{
                           padding: '6px 16px', border: '1px solid #C9962A', background: 'transparent',
                           color: '#D4A843', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
                           fontFamily: "'Inter', sans-serif",
                         }}>
                           + Add Position
                         </button>
                       </td>
                     </tr>
                   )}
                   {portfolio.positions.map((pos, i) => (
                     <tr key={i} className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group">
                        <td className="px-6 py-4">
                           <span className="font-bold text-white group-hover:text-blue-400 transition-colors uppercase">{pos.ticker}</span>
                           <p className="text-[9px] text-slate-600 font-bold uppercase">LONG EQUITY</p>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-300 font-bold italic">{pos.quantity}</td>
                        <td className="px-6 py-4 text-right text-white font-bold">${pos.current_value.toLocaleString()}</td>
                        <td className={`px-6 py-4 text-right font-bold ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                           {pos.pnl_pct >= 0 ? '+' : ''}{pos.pnl_pct.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex flex-col items-end gap-1">
                              <span className="text-slate-400 font-bold">{pos.weight_pct.toFixed(1)}%</span>
                              <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                 <div className="h-full bg-blue-500" style={{ width: `${pos.weight_pct}%` }} />
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <button 
                             onClick={() => removeHolding(pos.ticker)}
                             className="p-2 text-slate-700 hover:text-red-400 transition-colors"
                           >
                             <Trash2 size={14} />
                           </button>
                        </td>
                     </tr>
                   ))}
                </tbody>
              </table>
           </div>
        </div>

        {/* Portfolio Analytics Detail */}
        <div className="flex flex-col gap-6">
           {/* Sector Exposure Chart */}
           <div className="bg-slate-950 border border-white/5 rounded-3xl p-6 h-[250px] flex flex-col">
              <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                 <PieIcon size={14} className="text-emerald-400" /> Sector Allocation
              </h3>
              <div className="flex-1 min-h-0 flex items-center text-[10px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie 
                         data={sectorData} 
                         cx="50%" 
                         cy="50%" 
                         innerRadius={50} 
                         outerRadius={70} 
                         paddingAngle={5} 
                         dataKey="value"
                         stroke="none"
                       >
                          {sectorData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                       </Pie>
                       <Tooltip 
                         contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                         itemStyle={{ color: '#fff' }}
                       />
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="space-y-1 ml-4 font-mono font-bold uppercase">
                    {sectorData.slice(0, 5).map((s, i) => (
                       <div key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-slate-500">{s.sector}:</span>
                          <span className="text-white">{s.weight_pct.toFixed(0)}%</span>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* AI Rebalancing Advice */}
           <div className="bg-blue-600/5 border border-blue-500/10 rounded-3xl p-6 flex flex-col min-h-[220px]">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                   <BrainCircuit className="text-white" size={18} />
                 </div>
                 <h3 className="text-xs font-bold text-white tracking-tight uppercase tracking-widest">AI Portfolio Advisor</h3>
              </div>
              <p className="text-[11px] text-slate-400 font-serif leading-relaxed mb-6 italic">
                {portfolio.ai_advice}
              </p>
              <div className="mt-auto">
                 <button className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest transition-all">
                    AUTO-REBALANCE ENGINE
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
