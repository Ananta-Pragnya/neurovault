import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuantApi } from '../src/services/quantApi';
import { QuantEngine } from '../src/utils/quantEngine';
import { QuantMindService, ComputedData } from '../src/services/QuantMindService';

const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} className="text-sm font-bold text-amber-500 mt-4 mb-2">{line.replace('## ', '')}</h3>;
        if (line.startsWith('# ')) return <h2 key={i} className="text-lg font-bold text-amber-500 mt-4 mb-2">{line.replace('# ', '')}</h2>;
        if (line.startsWith('* ') || line.startsWith('- ')) return <li key={i} className="ml-4 list-disc text-slate-300 text-sm mb-1">{line.substring(2)}</li>;
        if (line.trim() === '') return <br key={i} />;
        return <p key={i} className="text-slate-300 text-sm leading-relaxed mb-2">{line}</p>;
    });
};

interface QuantDashboardProps {
  isVisible: boolean;
  ticker: string;
  onClose: () => void;
}

export const QuantDashboard: React.FC<QuantDashboardProps> = ({ isVisible, ticker, onClose }) => {
  const [loadingStep, setLoadingStep] = useState<'idle'|'fetching'|'computing'|'ai'|'complete'>('idle');
  const [marketRef, setMarketRef] = useState<any>(null);
  const [computed, setComputed] = useState<ComputedData | null>(null);
  const [aiBrief, setAiBrief] = useState<string>('');
  const [paths, setPaths] = useState<number[][]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
      if (!isVisible || !ticker) return;
      
      let isMounted = true;
      const runPipeline = async () => {
          setLoadingStep('fetching');
          const [yahoo, rfr, alpha] = await Promise.all([
             QuantApi.fetchYahooData(ticker),
             QuantApi.fetchFredRiskFreeRate(),
             QuantApi.fetchAlphaVantage(ticker)
          ]);
          if (!isMounted) return;

          setMarketRef(yahoo);
          
          setLoadingStep('computing');
          const prices = yahoo.prices;
          const S = yahoo.currentPrice;
          const K = S * 1.05; 
          const T = 30 / 365;
          const days = 30;

          const hv60 = QuantEngine.calculateHistoricalVolatility(prices, 60);
          const hv30 = QuantEngine.calculateHistoricalVolatility(prices, 30);
          const volTrend = hv30 > hv60 * 1.05 ? 'rising' : hv30 < hv60 * 0.95 ? 'falling' : 'stable';

          const bsm = QuantEngine.blackScholes(S, K, T, rfr, hv60);
          const mcPaths = QuantEngine.monteCarloGBM(S, 0.08, hv60, days, 5000);
          setPaths(mcPaths.slice(0, 200)); 
          
          const terminals = mcPaths.map(p => p[p.length - 1]);
          const percentiles = QuantEngine.extractPercentiles(mcPaths);
          const probGain = (terminals.filter(t => t > S).length / mcPaths.length);
          const probITM = (terminals.filter(t => t > K).length / mcPaths.length);
          const probMaxLoss = 1 - probITM; // for buyers of OTM calls

          const day1Prices = mcPaths.map(p => p[1] || p[0]);
          const var95_1d = QuantEngine.calculateVaR(day1Prices, S, 0.95);
          const var99_1d = QuantEngine.calculateVaR(day1Prices, S, 0.99);
          const var95_full = QuantEngine.calculateVaR(terminals, S, 0.95);
          const cvar95 = QuantEngine.calculateCVaR(terminals, S, 0.95);

          const returns = prices.slice(1).map((p:number, i:number) => (p - prices[i])/prices[i]);
          const sharpe = QuantEngine.calculateSharpeRatio(returns, rfr);
          const mdd = QuantEngine.calculateMaxDrawdown(prices);
          const kelly = QuantEngine.kellyCriterion(probGain, 1); 

          const intrinsic = Math.max(0, S - K);
          
          const computedData: ComputedData = {
              ticker, companyName: yahoo.companyName, price: S,
              low52: yahoo.low52, high52: yahoo.high52, volume: yahoo.volume,
              beta: yahoo.beta, pe: yahoo.pe, marketCap: yahoo.marketCap,
              hv30, hv60, volTrend, rsi: alpha.rsi, macdSignal: alpha.macdSignal,
              rfr, optionType: "Call", strike: K, expiryDate: "30 Days", dte: days,
              callPrice: bsm.callPrice, putPrice: bsm.putPrice, 
              intrinsic, timeValue: Math.max(0, bsm.callPrice - intrinsic), ivEstimate: hv60,
              delta: bsm.delta, gamma: bsm.gamma, theta: bsm.theta, vega: bsm.vega, rho: bsm.rho,
              days, mcMean: percentiles.mean, mcStdDev: percentiles.stdDev,
              mc5: percentiles.p5, mc25: percentiles.p25, mc50: percentiles.p50, mc75: percentiles.p75, mc95: percentiles.p95,
              probUp: probGain, probITM, probMaxLoss,
              var95_1d, var99_1d, var95_full, cvar95,
              sharpe, mdd, kelly
          };
          setComputed(computedData);

          if (!isMounted) return;
          setLoadingStep('ai');

          const brief = await QuantMindService.generateBrief(computedData);
          if (!isMounted) return;

          setAiBrief(brief);
          setLoadingStep('complete');
      };

      runPipeline();

      return () => { isMounted = false; };
  }, [isVisible, ticker]);

  useEffect(() => {
      if ((loadingStep === 'ai' || loadingStep === 'complete') && paths.length > 0 && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (!ctx) return;
          const w = canvasRef.current.width;
          const h = canvasRef.current.height;

          ctx.clearRect(0, 0, w, h);
          
          const maxPrice = Math.max(...paths.map(p => Math.max(...p)));
          const minPrice = Math.min(...paths.map(p => Math.min(...p)));
          const range = maxPrice - minPrice || 1;
          
          const steps = paths[0].length;
          const dx = w / (steps - 1);

          let currentStep = 1;
          
          const drawFrame = () => {
              for (let i = 0; i < 200; i++) {
                 const path = paths[i];
                 if (!path) continue;
                 ctx.beginPath();
                 const xPrev = (currentStep - 1) * dx;
                 const yPrev = h - ((path[currentStep - 1] - minPrice) / range) * h;
                 const xNow = currentStep * dx;
                 const yNow = h - ((path[currentStep] - minPrice) / range) * h;
                 
                 ctx.moveTo(xPrev, yPrev);
                 ctx.lineTo(xNow, yNow);
                 ctx.strokeStyle = `rgba(59, 130, 246, 0.15)`; 
                 ctx.lineWidth = 1;
                 ctx.stroke();
              }
              currentStep++;
              if (currentStep < steps) {
                  requestAnimationFrame(drawFrame);
              } else {
                  const medianPath = paths.sort((a,b) => a[steps-1] - b[steps-1])[Math.floor(paths.length/2)];
                  ctx.beginPath();
                  for(let s=0; s<steps; s++) {
                      const xx = s * dx;
                      const yy = h - ((medianPath[s] - minPrice) / range) * h;
                      if(s===0) ctx.moveTo(xx,yy);
                      else ctx.lineTo(xx,yy);
                  }
                  ctx.strokeStyle = '#F59E0B'; 
                  ctx.lineWidth = 2;
                  ctx.stroke();
              }
          };

          requestAnimationFrame(drawFrame);
      }
  }, [loadingStep, paths]);

  const renderLoading = () => (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
          <div className="w-8 h-8 rounded-full border-t-2 border-gold-primary animate-spin"></div>
          <p className="text-gold-primary text-xs uppercase tracking-widest font-bold">
              {loadingStep === 'fetching' && "Aggregating Market Data..."}
              {loadingStep === 'computing' && "Running BSM & Extended MC Paths..."}
              {loadingStep === 'ai' && "QuantMind Architecting Unfiltered Diagnostic..."}
          </p>
      </div>
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 bg-[#0A0E14] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 w-full p-6 flex justify-between items-center border-b border-white/5 bg-[#0A0E14]/80 backdrop-blur-md z-10">
            <h2 className="text-2xl font-bold text-white flex gap-2 items-center uppercase tracking-wider">
              <div className={`w-2 h-2 rounded-full ${loadingStep === 'complete' ? 'bg-green-500' : 'bg-gold-primary animate-pulse'}`}></div>
              {ticker} <span className="text-slate-500 font-normal">| QuantMind Engine v2</span>
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-sm font-bold tracking-widest uppercase">
              Close ✕
            </button>
          </div>

          <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8">
            {loadingStep !== 'complete' && loadingStep !== 'ai' ? renderLoading() : (
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                 
                 {/* Left Column (4/12): Cold/Analytical Data Panel */}
                 <div className="lg:col-span-4 space-y-6">
                   <div className="p-5 rounded-2xl bg-[#0F1419] border border-blue-900/30">
                     <h3 className="text-blue-400 font-bold uppercase tracking-widest text-[10px] mb-4">Identity & Metacharacteristics</h3>
                     <div className="space-y-3">
                         <div className="flex justify-between text-sm"><span className="text-slate-500">Spot (S)</span><span className="text-white font-mono">${computed?.price.toFixed(2)}</span></div>
                         <div className="flex justify-between text-sm"><span className="text-slate-500">HV (30d)</span><span className="text-white font-mono">{(computed!.hv30*100).toFixed(1)}%</span></div>
                         <div className="flex justify-between text-sm"><span className="text-slate-500">Risk-Free (r)</span><span className="text-white font-mono">{(computed!.rfr*100).toFixed(2)}%</span></div>
                         <div className="flex justify-between text-sm"><span className="text-slate-500">Beta</span><span className="text-white font-mono">{computed?.beta.toFixed(2)}</span></div>
                     </div>
                   </div>

                   <div className="p-5 rounded-2xl bg-[#0F1419] border border-red-900/30">
                     <h3 className="text-red-400 font-bold uppercase tracking-widest text-[10px] mb-4">Risk Exposure Card</h3>
                     <div className="space-y-4">
                         <div>
                            <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Value at Risk (99%, 1d)</span><span className="text-red-400 font-mono">${computed?.var99_1d.toFixed(2)}</span></div>
                         </div>
                         <div className="flex justify-between text-sm"><span className="text-slate-500">Cond. VaR (95%)</span><span className="text-red-400 font-mono">${computed?.cvar95.toFixed(2)}</span></div>
                         <div className="flex justify-between text-sm"><span className="text-slate-500">Sharpe Ratio</span><span className={computed!.sharpe > 1 ? 'text-green-400 font-mono' : 'text-amber-400 font-mono'}>{computed?.sharpe.toFixed(2)}</span></div>
                         <div className="flex justify-between text-sm"><span className="text-slate-500">Max Drawdown</span><span className="text-red-400 font-mono">{(computed!.mdd*100).toFixed(1)}%</span></div>
                         <div className="pt-3 border-t border-white/5 flex justify-between items-center text-sm">
                            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Kelly Sizing</span>
                            <span className="text-green-400 font-black text-lg">{(computed!.kelly*100).toFixed(1)}%</span>
                         </div>
                     </div>
                   </div>
                 </div>

                 {/* Center Column (8/12): Charts & AI panel side by side inside a grid or stacked */}
                 <div className="lg:col-span-8 space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)'}}>
                       
                       <div className="p-6 rounded-2xl bg-[#0F1419] border border-white/5 flex flex-col relative overflow-hidden" style={{ minHeight: '500px' }}>
                          <h3 className="text-blue-400 font-bold uppercase tracking-widest text-[10px] mb-2 z-10">Monte Carlo GBM (10,000 Paths)</h3>
                          <p className="text-xs text-slate-500 mb-6 z-10">Geometric Brownian Motion</p>
                          
                          <div className="flex-1 relative w-full border-b border-l border-white/10 z-10">
                              <canvas 
                                 ref={canvasRef} 
                                 width={400} 
                                 height={300} 
                                 className="absolute inset-0 w-full h-full"
                              />
                          </div>

                          <div className="mt-6 grid grid-cols-2 gap-2 text-center z-10">
                              <div className="bg-black/50 p-2 rounded"><div className="text-[10px] text-slate-500 uppercase">25th Pctl</div><div className="text-sm font-mono text-red-400">${computed?.mc25.toFixed(1)}</div></div>
                              <div className="bg-black/50 p-2 rounded"><div className="text-[10px] text-slate-500 uppercase">Median</div><div className="text-sm font-mono text-amber-500">${computed?.mc50.toFixed(1)}</div></div>
                              <div className="bg-black/50 p-2 rounded"><div className="text-[10px] text-slate-500 uppercase">75th Pctl</div><div className="text-sm font-mono text-green-400">${computed?.mc75.toFixed(1)}</div></div>
                              <div className="bg-black/50 p-2 rounded"><div className="text-[10px] text-slate-500 uppercase">Win Prob</div><div className="text-sm font-mono text-blue-400">{(computed!.probUp * 100).toFixed(1)}%</div></div>
                          </div>
                       </div>
                       
                       {/* AI Brief Panel */}
                       <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#1F1610] to-[#0A0705] border border-amber-900/30 overflow-y-auto shadow-[0_0_30px_rgba(212,175,55,0.05)]" style={{ maxHeight: '600px' }}>
                         <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="min-w-8 h-8 rounded bg-gradient-to-br from-amber-400 to-orange-600 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                                <span className="text-[10px] font-black text-black">QM</span>
                            </div>
                            <div>
                                <h3 className="text-gold-primary font-black uppercase tracking-widest text-xs">QuantMind AI Diagnostic</h3>
                                <p className="text-[9px] text-amber-500/50 uppercase tracking-widest">v2 Intelligence Engine</p>
                            </div>
                         </div>

                         <div className="relative z-10 prose prose-invert prose-sm max-w-none">
                             {loadingStep === 'ai' ? (
                                 <div className="space-y-4 animate-pulse pt-4">
                                     <div className="h-3 bg-white/5 rounded w-3/4"></div>
                                     <div className="h-3 bg-white/5 rounded w-full"></div>
                                     <div className="h-3 bg-white/5 rounded w-5/6"></div>
                                 </div>
                             ) : (
                                 renderMarkdown(aiBrief)
                             )}
                         </div>
                       </div>
                   </div>

                   {/* Options Data */}
                   <div className="p-5 rounded-2xl bg-[#0F1419] border border-white/5 overflow-x-auto mt-6">
                        <table className="w-full text-left text-xs text-slate-300 font-mono">
                            <thead className="text-[9px] uppercase tracking-widest text-slate-500 border-b border-white/10">
                                <tr>
                                    <th className="pb-2">Call/Put</th>
                                    <th className="pb-2">Price</th>
                                    <th className="pb-2">Intrinsic</th>
                                    <th className="pb-2">Time Val</th>
                                    <th className="pb-2">Delta</th>
                                    <th className="pb-2">Gamma</th>
                                    <th className="pb-2">Theta</th>
                                    <th className="pb-2">Vega</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-white/5">
                                    <td className="py-3 text-green-400">CALL (+5%)</td>
                                    <td className="py-3">${computed?.callPrice.toFixed(2)}</td>
                                    <td className="py-3">${computed?.intrinsic.toFixed(2)}</td>
                                    <td className="py-3">${computed?.timeValue.toFixed(2)}</td>
                                    <td className="py-3">{computed?.delta.toFixed(3)}</td>
                                    <td className="py-3">{computed?.gamma.toFixed(4)}</td>
                                    <td className="py-3">{computed?.theta.toFixed(3)}</td>
                                    <td className="py-3">{computed?.vega.toFixed(3)}</td>
                                </tr>
                            </tbody>
                        </table>
                   </div>
                 </div>

               </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
