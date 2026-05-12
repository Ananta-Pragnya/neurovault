import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import ScrollVisualizer from './ScrollVisualizer';
import data from '../data/financialData.json';
import { QuantApi } from '../src/services/quantApi';

interface HeroProps {
  appState: 'idle' | 'input' | 'dashboard';
  setAppState: (state: 'idle' | 'input' | 'dashboard') => void;
  onConfirm: (ticker: string) => void;
}

const Hero: React.FC<HeroProps> = ({ appState, setAppState, onConfirm }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100, damping: 30, restDelta: 0.001
  });

  const [localTicker, setLocalTicker] = useState("");
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [ghostData, setGhostData] = useState<any>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState<string[]>([]);

  // Focus input when morphing
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (appState === 'input' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [appState]);

  // Autocomplete & Ghost Metrics logic
  useEffect(() => {
    if (localTicker.length >= 2) {
      const timer = setTimeout(async () => {
        const results = await QuantApi.fetchTickerAutocomplete(localTicker);
        setSuggestions(results);
        
        // Fetch ghost data for anticipation
        if (results.length > 0) {
            const preview = await QuantApi.fetchYahooData(results[0].symbol);
            setGhostData(preview);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setGhostData(null);
    }
  }, [localTicker]);

  const loadingSteps = [
    "Establishing secure link to QuantMind Kernel...",
    "Decrypting order flow telemetry...",
    "Calibrating BSM Greeks...",
    "Running 10k Monte Carlo paths...",
    "Finalizing analyst brief..."
  ];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!localTicker.trim()) return;
    
    setLoadingComplete(true);
    setLoadingStep(0);
    setLoadingLogs(["Synthesizing intelligence..."]);

    // Sequence through log steps
    const stepInterval = setInterval(() => {
        setLoadingStep(prev => {
            if (prev >= loadingSteps.length - 1) {
                clearInterval(stepInterval);
                setTimeout(() => {
                    onConfirm(localTicker.toUpperCase());
                    setLoadingComplete(false);
                }, 500);
                return prev;
            }
            setLoadingLogs(logs => [...logs, loadingSteps[prev + 1]]);
            return prev + 1;
        });
    }, 400);
  };

  return (
    <div ref={containerRef} className="relative bg-[#0b0f14] text-white">
      {/* Visualizer Background - morphs slightly during input */}
      <div className={`transition-all duration-1000 ${appState !== 'idle' ? 'scale-110 blur-xl opacity-20' : 'opacity-100'}`}>
        <ScrollVisualizer progress={smoothProgress} />
      </div>

      {/* Ghost Metrics Background */}
      <AnimatePresence>
        {appState === 'input' && ghostData && (
            <motion.div 
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 0.15, scale: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden"
            >
                <div className="text-[20vw] font-black tracking-tighter text-white/50 blur-3xl select-none">
                    {ghostData.symbol} ${ghostData.currentPrice}
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center px-6 z-20">
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`border p-10 rounded-2xl transition-all duration-700 ${appState !== 'idle' ? 'glass-gold border-gold-primary shadow-[0_0_50px_rgba(212,175,55,0.4)] bg-black/90 max-w-2xl w-full' : 'glass-gold border-gold-primary/20 max-w-4xl'}`}
        >
          {loadingComplete ? (
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="h-64 flex flex-col items-center justify-center w-full"
            >
               <div className="w-full max-w-sm mb-8">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest text-gold-primary font-bold mb-2">
                    <span>Alpha Nexus Connection</span>
                    <span>{Math.round((loadingStep / (loadingSteps.length - 1)) * 100)}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(loadingStep / (loadingSteps.length - 1)) * 100}%` }}
                        className="h-full bg-gold-gradient shadow-[0_0_15px_rgba(212,175,55,1)]"
                    />
                  </div>
               </div>
               
               <div className="text-left w-full h-24 overflow-hidden font-mono text-[10px] text-slate-500 space-y-1">
                  <AnimatePresence>
                    {loadingLogs.slice(-4).map((log, i) => (
                        <motion.p 
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1 - (3-i)*0.2, x: 0 }}
                        >
                            <span className="text-gold-primary mr-2">{">>>"}</span> {log}
                        </motion.p>
                    ))}
                  </AnimatePresence>
               </div>
            </motion.div>
          ) : (
             <AnimatePresence mode="wait">
               {appState === 'idle' ? (
                 <motion.div
                   key="idle-state"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0, scale: 0.9 }}
                   transition={{ duration: 0.3 }}
                 >
                   <span className="text-xs font-bold uppercase tracking-widest text-gold-primary mb-4 block">Institutional Sovereignty</span>
                   <h1 className="text-5xl md:text-7xl font-bold font-heading tracking-tight leading-tight mb-6">
                     $1.32B <span className="text-gold">AUM</span>
                   </h1>
                   <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-8">
                     See the real odds on your next trade.
                   </p>
         
                   <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                     <button
                       onClick={() => setAppState('input')}
                       className="px-8 py-3 bg-gold-primary text-black font-bold rounded-lg hover:bg-gold-primary/90 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                     >
                       Analyze a Stock →
                     </button>
                   </div>
                 </motion.div>
               ) : (
                 <motion.form
                   key="input-state"
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 0.5 }}
                   onSubmit={handleSubmit}
                   className="flex flex-col items-center justify-center py-6 w-full"
                 >
                   <label className="text-gold-primary text-sm font-bold uppercase tracking-widest mb-4 block">Enter Ticker Symbol</label>
                   
                   <div className="relative w-full max-w-md">
                        <input
                            ref={inputRef}
                            type="text"
                            value={localTicker}
                            onChange={(e) => setLocalTicker(e.target.value.toUpperCase())}
                            placeholder="e.g. NVDA"
                            className="w-full bg-black/50 border-2 border-gold-primary/50 rounded-xl px-6 py-4 text-center text-4xl font-black text-white focus:outline-none focus:border-gold-primary focus:shadow-[0_0_30px_rgba(212,175,55,0.6)] transition-all uppercase placeholder-slate-700"
                        />
                        
                        {/* Autocomplete Dropdown */}
                        <AnimatePresence>
                            {suggestions.length > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute left-0 right-0 mt-2 bg-black/90 border border-gold-primary/20 rounded-xl overflow-hidden z-50 backdrop-blur-xl"
                                >
                                    {suggestions.map((s, i) => (
                                        <div 
                                            key={i}
                                            onClick={() => {
                                                setLocalTicker(s.symbol);
                                                setSuggestions([]);
                                                handleSubmit();
                                            }}
                                            className="p-4 hover:bg-gold-primary/10 cursor-pointer flex justify-between items-center group transition-colors"
                                        >
                                            <div className="text-left">
                                                <p className="text-gold-primary font-bold group-hover:text-white">{s.symbol}</p>
                                                <p className="text-[10px] text-slate-500 uppercase">{s.name}</p>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-700 uppercase border border-slate-700 px-1 rounded">{s.exch}</span>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                   </div>

                   <p className="text-xs text-slate-400 mt-10 max-w-xs mx-auto">
                     Press <kbd className="bg-white/10 px-2 py-1 rounded text-white">Enter</kbd> to launch QuantMind Analysis
                   </p>
                 </motion.form>
               )}
             </AnimatePresence>
          )}
        </motion.div>
      </section>

      {/* KEEPING THE REST OF THE HERO FILE INTACT BUT FADED WHEN NOT IDLE */}
      <div className={`transition-opacity duration-1000 ${appState !== 'idle' ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
        {/* Section 2: Performance */}
        <section className="relative h-screen flex items-center justify-end px-6 md:px-24 z-10">
          <div className="max-w-xl glass p-8 rounded-2xl border-white/5 bg-black/40 backdrop-blur-xl">
            <h2 className="text-3xl font-bold font-heading text-gold mb-5">Consistent Performance</h2>
            <p className="text-base text-slate-300 leading-relaxed mb-6">
              Our multi-strategy engine delivers consistent returns through peak volatility regimes.
              <span className="text-white block mt-3 italic">"Precision isn't an act, it's a mandate."</span>
            </p>
            <div className="grid grid-cols-2 gap-5 pt-5 border-t border-white/5">
              <div>
                <p className="text-2xl font-bold text-white">67%</p>
                <p className="text-xs uppercase font-medium text-slate-400 mt-1">Win Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">2.5</p>
                <p className="text-xs uppercase font-medium text-slate-400 mt-1">Sharpe Ratio</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Strategy Allocation */}
        <section className="relative h-screen flex items-center justify-start px-6 md:px-24 z-10">
          <div className="max-w-xl glass p-10 rounded-3xl border-white/5 bg-black/40 backdrop-blur-xl">
            <h2 className="text-4xl font-black font-heading text-white mb-6 uppercase">Strategic <span className="text-gold">Diversity.</span></h2>
            <div className="space-y-4">
              {data.strategies.slice(0, 3).map((s, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-sm font-bold">{s.name}</span>
                  <span className="text-gold font-black">{s.allocation}%</span>
                </div>
              ))}
            </div>
            <p className="mt-8 text-sm text-slate-500 font-medium italic">
              Dynamically rebalanced across G10 and Digital asset corridors.
            </p>
          </div>
        </section>

        {/* Section 4: AI Models */}
        <section className="relative h-screen flex flex-col items-center justify-center text-center px-6 z-10">
          <div className="max-w-4xl">
            <h2 className="text-5xl md:text-7xl font-black font-heading text-white mb-12 uppercase">
              Quant Intelligence <br /><span className="text-gold">Nodes</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.aiModels.slice(0, 3).map((m, i) => (
                <div key={i} className="p-8 glass border border-gold-primary/10 rounded-2xl hover:border-gold-primary/30 transition-all group">
                  <p className="text-gold-primary font-black text-xl mb-2 group-hover:scale-110 transition-transform">{m.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{m.type}</p>
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-2xl font-bold text-white">{m.accuracy}%</p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Accuracy</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Financial Scale */}
        <section className="relative h-screen flex items-center justify-end px-6 md:px-24 z-10">
          <div className="max-w-xl glass p-10 rounded-3xl border-white/5 bg-black/40 backdrop-blur-xl">
            <h2 className="text-4xl font-black font-heading text-white mb-6 uppercase">Scalable <span className="text-gold">Operations.</span></h2>
            <p className="text-lg text-slate-400 leading-relaxed mb-8">
              Optimized capital flow ensures that operational costs remain lean while R&D expenditure fuels the next generation of Alpha discovery.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Annual R&D</span>
                <span className="text-white font-black">$42.0M</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gold-primary w-[75%]" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Infrastructure</span>
                <span className="text-white font-black">$19.0M</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-white/20 w-[45%]" />
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Closing */}
        <section className="relative h-screen flex flex-col items-center justify-center text-center px-6 z-10 bg-[#0b0f14]/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-10"
          >
            <h2 className="text-5xl md:text-7xl font-bold font-heading text-white tracking-tight">
              SECURE YOUR <br /><span className="text-gold">MANDATE</span>
            </h2>
            <div className="flex flex-col md:flex-row gap-5 justify-center pointer-events-auto">
              <button className="px-10 py-4 bg-gold-gradient text-black font-bold rounded-lg text-base hover:scale-105 transition-all">
                Request VIP Access
              </button>
              <button className="px-10 py-4 glass text-gold-primary font-bold rounded-lg text-base hover:bg-gold-primary/10 transition-all border border-gold-primary/20">
                Contact Us
              </button>
            </div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider pt-8">
              © 2026 FinTech Institutional Intelligence
            </p>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default Hero;
