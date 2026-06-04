import React, { useEffect, useState } from 'react';
import { useTradingStore } from '../../src/stores/tradingStore';
import {
  FlaskConical,
  Play,
  Settings,
  Dna,
  ShieldAlert,
  Thermometer,
  Activity,
  BarChart3,
  Loader2,
  RefreshCcw,
  Target,
  Download
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { exportCSV } from '../../src/lib/export';

export const SimulationLab: React.FC = () => {
  const { 
    selectedTicker, 
    quote, 
    simulation, 
    runSimulation, 
    loading,
    errors 
  } = useTradingStore();

  const [params, setParams] = useState({
    initial_price: 150,
    volatility: 0.25,
    scenario: undefined as string | undefined
  });

  useEffect(() => {
    if (quote) {
      setParams(p => ({
        ...p,
        initial_price: quote.price ?? p.initial_price,
        volatility: Math.abs(quote.change_pct / 10) || 0.25
      }));
    }
  }, [selectedTicker, quote]);

  const handleRun = () => {
    runSimulation(selectedTicker, params.initial_price, params.volatility);
  };

  if (errors.simulation) {
     return (
       <div className="p-20 text-center bg-emerald-500/5 rounded-3xl border border-emerald-500/10 m-6">
         <FlaskConical size={48} className="mx-auto mb-4 text-emerald-500/30" />
         <p className="text-emerald-400 font-bold mb-1 uppercase tracking-widest text-sm">Monte Carlo Engine Offline</p>
         <p className="text-slate-500 text-xs">Simulation lab currently unavailable for {selectedTicker}.</p>
         <button 
           onClick={handleRun}
           className="mt-6 px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors uppercase"
         >
           RETRY COMPUTE LINK
         </button>
       </div>
     );
  }

  const chartData = simulation?.paths ? simulation.time_labels.map((label: string, i: number) => {
    const point: any = { time: label };
    simulation.paths.slice(0, 15).forEach((path: number[], pathIdx: number) => {
      point[`path_${pathIdx}`] = path[i];
    });
    return point;
  }) : [];

  const handleExportSim = () => {
    if (!simulation?.percentiles) return;
    exportCSV([{
      ticker:           selectedTicker,
      p5_final:         simulation.percentiles?.p5,
      p50_final:        simulation.percentiles?.p50,
      p95_final:        simulation.percentiles?.p95,
      prob_profit:      simulation.prob_profit,
      prob_loss_20pct:  simulation.prob_loss_20pct,
      expected_return:  simulation.expected_return,
      n_simulations:    simulation.n_simulations,
    }], `montecarlo_${selectedTicker}_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 animate-in zoom-in-95 duration-500">
      {/* Parameters Panel */}
      <div className="bg-slate-950 border border-white/5 rounded-3xl p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
           <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
             <Settings className="text-white" size={24} />
           </div>
           <div>
             <h3 className="text-lg font-bold text-white tracking-tight">Scenario Params</h3>
             <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest uppercase">Monte Carlo Config v1.2</p>
           </div>
        </div>

        <div className="space-y-6 flex-1">
           <InputRange label="INITIAL PRICE" value={params.initial_price} unit="$" min={1} max={5000} onChange={(v: number) => setParams(p => ({ ...p, initial_price: v }))} />
           <InputRange label="VOLATILITY (σ)" value={params.volatility} unit="%" min={0.05} max={1.5} step={0.01} percent onChange={(v: number) => setParams(p => ({ ...p, volatility: v }))} />
           
           <div className="pt-4 border-t border-white/5">
              <h4 className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-4">Market Stress Presets</h4>
              <div className="grid grid-cols-2 gap-2">
                 <ScenarioBtn label="NORMAL" active={!params.scenario} onClick={() => setParams(p => ({ ...p, scenario: undefined, volatility: 0.25 }))} />
                 <ScenarioBtn label="CRASH" color="border-red-500/30 text-red-400" active={params.scenario === 'market_crash'} onClick={() => setParams(p => ({ ...p, scenario: 'market_crash', volatility: 0.8 }))} />
                 <ScenarioBtn label="VOL SPIKE" color="border-purple-500/30 text-purple-400" active={params.scenario === 'iv_spike'} onClick={() => setParams(p => ({ ...p, scenario: 'iv_spike', volatility: 1.2 }))} />
                 <ScenarioBtn label="STABLE" color="border-emerald-500/30 text-emerald-400" active={params.scenario === 'stable'} onClick={() => setParams(p => ({ ...p, scenario: 'stable', volatility: 0.1 }))} />
              </div>
           </div>
        </div>

        <button
          onClick={handleRun}
          disabled={loading.simulation}
          style={{
            marginTop: '32px', width: '100%', padding: '12px',
            background: loading.simulation ? '#1A1A1D' : '#C9962A',
            border: 'none', borderRadius: '8px', cursor: loading.simulation ? 'not-allowed' : 'pointer',
            color: loading.simulation ? '#4A5260' : '#0A0A0B',
            fontSize: '13px', fontWeight: 700, fontFamily: "'Inter', sans-serif",
            letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.15s ease-out',
            boxShadow: loading.simulation ? 'none' : '0 0 18px rgba(201,150,42,0.22)',
          }}
          onMouseEnter={e => { if (!loading.simulation) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 28px rgba(201,150,42,0.4)'; }}
          onMouseLeave={e => { if (!loading.simulation) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 18px rgba(201,150,42,0.22)'; }}
        >
          {loading.simulation ? <RefreshCcw size={16} className="animate-spin" /> : <Play size={16} />}
          {loading.simulation ? 'Simulating...' : 'Execute Simulation'}
        </button>
      </div>

      {/* Main Simulation View */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="bg-slate-950 border border-white/5 rounded-3xl p-8 flex-1 flex flex-col min-h-[450px]">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Dna size={16} className="text-emerald-400" /> Probabilistic Outcomes
              </h3>
              {simulation && (
                <div className="flex gap-4">
                   <div className="text-right">
                      <p className="text-[9px] text-slate-600 font-bold uppercase">Mean Predict</p>
                      <p className="text-sm font-mono font-bold text-white">${simulation.statistics.mean.toFixed(2)}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] text-slate-600 font-bold uppercase">Prob. Gain</p>
                      <p className="text-sm font-mono font-bold text-emerald-400">{(simulation.statistics.prob_above_start * 100).toFixed(1)}%</p>
                   </div>
                </div>
              )}
           </div>

           <div className="flex-1 min-h-0">
             {simulation ? (
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                   <XAxis dataKey="time" hide />
                   <YAxis 
                     domain={['auto', 'auto']} 
                     orientation="right" 
                     tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }} 
                     axisLine={false}
                     tickLine={false}
                   />
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                     itemStyle={{ padding: '0 4px' }}
                     labelStyle={{ display: 'none' }}
                   />
                   {Array.from({ length: 15 }).map((_, i) => (
                     <Line 
                       key={i} 
                       type="monotone" 
                       dataKey={`path_${i}`} 
                       stroke={i === 0 ? '#10b981' : 'rgba(255,255,255,0.15)'} 
                       strokeWidth={i === 0 ? 3 : 1} 
                       dot={false}
                       activeDot={false}
                     />
                   ))}
                 </LineChart>
               </ResponsiveContainer>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
                  <Activity size={48} style={{ color: '#C9962A', opacity: 0.35 }} />
                  <p style={{ fontSize: '12px', color: '#4A5260', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Awaiting simulation parameters
                  </p>
               </div>
             )}
           </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <StatBox label="LOWER 5th" value={simulation ? `$${simulation.statistics.percentile_5.toFixed(0)}` : 'N/A'} sub="VAR LIMIT" />
           <StatBox label="MEDIAN" value={simulation ? `$${simulation.statistics.median.toFixed(0)}` : 'N/A'} sub="EXPECTED" />
           <StatBox label="UPPER 95th" value={simulation ? `$${simulation.statistics.percentile_95.toFixed(0)}` : 'N/A'} sub="CEILING" />
           <StatBox label="LOSS PROB" value={simulation ? `${(simulation.statistics.prob_loss_10pct * 100).toFixed(0)}%` : 'N/A'} sub=">10% DRAW" color="text-red-400" />
        </div>
      </div>
    </div>
  );
};

const InputRange = ({ label, value, unit, min, max, step = 1, percent, onChange }: any) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
       <span className="text-slate-500">{label}</span>
       <span className="text-white bg-white/5 px-2 py-0.5 rounded font-mono">
         {percent ? ((value ?? 0) * 100).toFixed(0) : (value ?? 0).toLocaleString()}{unit}
       </span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step} 
      value={value} 
      onChange={e => onChange(parseFloat(e.target.value))}
      className="nv-slider w-full cursor-pointer"
    />
  </div>
);

const ScenarioBtn = ({ label, active, onClick, color = 'border-white/10 text-slate-400' }: any) => (
  <button 
    onClick={onClick}
    className={`px-3 py-2 text-[9px] font-bold border rounded-lg transition-all ${
      active ? 'bg-white/5 border-white/20 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]' : `hover:bg-white/5 ${color}`
    }`}
  >
    {label}
  </button>
);

const StatBox = ({ label, value, sub, color = 'text-white' }: any) => (
  <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
     <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-1">{label}</p>
     <p className={`text-lg font-mono font-bold truncate ${color}`}>{value}</p>
     <p className="text-[9px] text-slate-500 font-bold uppercase truncate">{sub}</p>
  </div>
);
