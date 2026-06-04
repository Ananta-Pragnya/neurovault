import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import ScrollVisualizer from './ScrollVisualizer';
import data from '../data/financialData.json';
import { QuantApi } from '../src/services/quantApi';
import { useNavigate } from 'react-router-dom';

interface HeroProps {
  appState: 'idle' | 'input' | 'dashboard';
  setAppState: (state: 'idle' | 'input' | 'dashboard') => void;
  onConfirm: (ticker: string) => void;
}

const TICKERS = [
  { sym: 'SPY',  base: 595.21, chg: +0.41 },
  { sym: 'QQQ',  base: 514.88, chg: +0.63 },
  { sym: 'NVDA', base: 134.66, chg: +1.34 },
  { sym: 'TSLA', base: 286.55, chg: -0.89 },
  { sym: 'AAPL', base: 213.88, chg: +0.22 },
  { sym: 'MSFT', base: 447.12, chg: +0.51 },
  { sym: 'AMZN', base: 202.77, chg: -0.33 },
  { sym: 'META', base: 608.41, chg: +1.02 },
];

function useLiveTickers() {
  const [tickers, setTickers] = useState(TICKERS.map(t => ({ ...t, price: t.base })));
  useEffect(() => {
    const id = setInterval(() => {
      setTickers(prev => prev.map(t => ({
        ...t,
        price: t.base + (Math.random() - 0.5) * 0.8,
        chg:   t.chg  + (Math.random() - 0.5) * 0.05,
      })));
    }, 2200);
    return () => clearInterval(id);
  }, []);
  return tickers;
}

function LiveMarketPanel({ onAnalyze }: { onAnalyze: () => void }) {
  const tickers = useLiveTickers();
  const [rsi, setRsi] = useState(68.4);
  const [signal, setSignal] = useState('STRONG BUY');

  useEffect(() => {
    const id = setInterval(() => {
      setRsi(r => Math.max(30, Math.min(85, r + (Math.random() - 0.5) * 1.2)));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const signalColor = signal === 'STRONG BUY' ? '#4CAF82' : signal === 'SELL' ? '#C94F4F' : '#C9962A';

  return (
    <div style={{
      background:    'rgba(10,10,12,0.82)',
      border:        '1px solid rgba(201,150,42,0.18)',
      borderRadius:  '20px',
      backdropFilter: 'blur(24px)',
      padding:       '0',
      overflow:      'hidden',
      boxShadow:     '0 0 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,150,42,0.1)',
    }}>
      {/* Panel header */}
      <div style={{
        padding:       '14px 20px',
        borderBottom:  '1px solid rgba(255,255,255,0.04)',
        display:       'flex',
        alignItems:    'center',
        justifyContent:'space-between',
        background:    'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4CAF82', boxShadow: '0 0 8px rgba(76,175,130,0.9)', animation: 'nvPing 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: '#4A5260', textTransform: 'uppercase' }}>
            Live Market Feed
          </span>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#2A2A32', letterSpacing: '0.06em' }}>
          ALPACA · SECURED
        </span>
      </div>

      {/* Ticker rows */}
      <div style={{ padding: '4px 0' }}>
        {tickers.slice(0, 5).map((t) => {
          const up = t.chg >= 0;
          const barW = Math.min(100, Math.abs(t.chg) * 40 + 30);
          return (
            <div key={t.sym} style={{
              display:       'flex',
              alignItems:    'center',
              padding:       '9px 20px',
              gap:           '0',
              borderBottom:  '1px solid rgba(255,255,255,0.025)',
              transition:    'background 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,150,42,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700, color: '#C9962A', width: '48px', flexShrink: 0 }}>{t.sym}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#D8E0EA', flex: 1 }}>${t.price.toFixed(2)}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: up ? '#4CAF82' : '#C94F4F', width: '64px', textAlign: 'right', flexShrink: 0 }}>
                {up ? '▲' : '▼'} {Math.abs(t.chg).toFixed(2)}%
              </span>
              <div style={{ width: '60px', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginLeft: '12px', flexShrink: 0, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barW}%`, background: up ? '#4CAF82' : '#C94F4F', opacity: 0.7, borderRadius: '2px', transition: 'width 0.8s ease-out' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicators */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#4A5260', letterSpacing: '0.12em', width: '70px', flexShrink: 0 }}>RSI (14)</span>
          <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${rsi}%`, background: `linear-gradient(90deg, #4CAF82, #C9962A)`, borderRadius: '2px', transition: 'width 1s ease-out' }} />
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#9EA8B3', width: '32px', textAlign: 'right' }}>{rsi.toFixed(1)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#4A5260', letterSpacing: '0.12em' }}>AI SIGNAL</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: signalColor, boxShadow: `0 0 6px ${signalColor}` }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 700, color: signalColor, letterSpacing: '0.1em' }}>{signal}</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 20px 18px' }}>
        <button
          onClick={onAnalyze}
          style={{
            width:         '100%',
            padding:       '12px 0',
            background:    'linear-gradient(135deg, rgba(201,150,42,0.15), rgba(212,168,67,0.08))',
            border:        '1px solid rgba(201,150,42,0.35)',
            borderRadius:  '10px',
            color:         '#D4A843',
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '10px',
            fontWeight:    700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase' as const,
            cursor:        'pointer',
            transition:    'all 0.15s ease-out',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background  = 'rgba(201,150,42,0.18)';
            e.currentTarget.style.borderColor = 'rgba(201,150,42,0.6)';
            e.currentTarget.style.boxShadow   = '0 0 20px rgba(201,150,42,0.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background  = 'linear-gradient(135deg, rgba(201,150,42,0.15), rgba(212,168,67,0.08))';
            e.currentTarget.style.borderColor = 'rgba(201,150,42,0.35)';
            e.currentTarget.style.boxShadow   = 'none';
          }}
        >
          Run Deep Analysis →
        </button>
      </div>
    </div>
  );
}

function TickerStrip() {
  const live = useLiveTickers();
  return (
    <div style={{
      position:      'absolute',
      top:           0,
      left:          0,
      right:         0,
      height:        '32px',
      background:    'rgba(8,8,10,0.92)',
      borderBottom:  '1px solid rgba(255,255,255,0.04)',
      display:       'flex',
      alignItems:    'center',
      overflow:      'hidden',
      zIndex:        30,
    }}>
      <div style={{ display: 'flex', gap: '0', animation: 'nvTickerScroll 30s linear infinite', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {[...live, ...live].map((t, i) => {
          const up = t.chg >= 0;
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '0 20px', borderRight: '1px solid rgba(255,255,255,0.04)', fontFamily: "'JetBrains Mono', monospace", fontSize: '9px' }}>
              <span style={{ color: '#C9962A', fontWeight: 700 }}>{t.sym}</span>
              <span style={{ color: '#9EA8B3' }}>${t.price.toFixed(2)}</span>
              <span style={{ color: up ? '#4CAF82' : '#C94F4F' }}>{up ? '▲' : '▼'}{Math.abs(t.chg).toFixed(2)}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

const Hero: React.FC<HeroProps> = ({ appState, setAppState, onConfirm }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const [localTicker, setLocalTicker] = useState("");
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [ghostData, setGhostData] = useState<any>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (appState === 'input' && inputRef.current) inputRef.current.focus(); }, [appState]);

  useEffect(() => {
    if (localTicker.length >= 2) {
      const timer = setTimeout(async () => {
        const results = await QuantApi.fetchTickerAutocomplete(localTicker);
        setSuggestions(results);
        if (results.length > 0) {
          const preview = await QuantApi.fetchYahooData(results[0].symbol);
          setGhostData(preview);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else { setSuggestions([]); setGhostData(null); }
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
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev >= loadingSteps.length - 1) {
          clearInterval(stepInterval);
          setTimeout(() => { onConfirm(localTicker.toUpperCase()); setLoadingComplete(false); }, 500);
          return prev;
        }
        setLoadingLogs(logs => [...logs, loadingSteps[prev + 1]]);
        return prev + 1;
      });
    }, 400);
  };

  return (
    <div ref={containerRef} className="relative bg-[#0b0f14] text-white">
      {/* Background visualizer */}
      <div className={`transition-all duration-1000 ${appState !== 'idle' ? 'scale-110 blur-xl opacity-20' : 'opacity-100'}`}>
        <ScrollVisualizer progress={smoothProgress} />
      </div>

      {/* Ghost ticker background */}
      <AnimatePresence>
        {appState === 'input' && ghostData && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 0.12, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden"
          >
            <div className="text-[18vw] font-black tracking-tighter text-white/40 blur-3xl select-none">
              {ghostData.symbol} ${ghostData.currentPrice}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FIRST FOLD ── */}
      <section className="relative h-screen flex flex-col z-20">
        <TickerStrip />

        {/* Main hero grid */}
        <div className="flex-1 flex items-center px-8 md:px-16 xl:px-24 pt-8">
          <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-12 xl:gap-20 items-center">

            {/* Left: Headline */}
            <AnimatePresence mode="wait">
              {loadingComplete ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-start"
                >
                  <div className="w-full max-w-sm mb-8">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest text-gold-primary font-bold mb-2">
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>Alpha Nexus</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{Math.round((loadingStep / (loadingSteps.length - 1)) * 100)}%</span>
                    </div>
                    <div className="h-px w-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(loadingStep / (loadingSteps.length - 1)) * 100}%` }}
                        className="h-full bg-gold-gradient shadow-[0_0_15px_rgba(212,175,55,1)]"
                      />
                    </div>
                  </div>
                  <div className="text-left h-24 overflow-hidden font-mono text-[10px] text-slate-500 space-y-1">
                    <AnimatePresence>
                      {loadingLogs.slice(-4).map((log, i) => (
                        <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1 - (3 - i) * 0.2, x: 0 }}>
                          <span className="text-gold-primary mr-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>›</span> {log}
                        </motion.p>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : appState === 'idle' ? (
                <motion.div key="idle" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.55, ease: "easeOut" }}>
                  {/* Label */}
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-px h-5 bg-gold-primary opacity-70" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.45em] text-gold-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Institutional Intelligence
                    </span>
                  </div>

                  {/* Headline */}
                  <h1 className="font-heading font-black tracking-tighter leading-[0.88] mb-8" style={{ fontSize: 'clamp(56px, 8vw, 112px)' }}>
                    $1.32B<br />
                    <span className="text-gold">AUM.</span>
                  </h1>

                  {/* Sub */}
                  <p className="text-slate-400 mb-10 max-w-lg leading-relaxed" style={{ fontSize: '17px' }}>
                    See the real odds on your next trade. Neural alpha synthesis across 47 markets, delivered at sub-millisecond latency.
                  </p>

                  {/* CTAs */}
                  <div className="flex flex-wrap gap-4 items-center">
                    <button
                      onClick={() => setAppState('input')}
                      className="px-8 py-3.5 bg-gold-primary text-black font-bold rounded-lg hover:bg-gold-primary/90 transition-all hover:shadow-[0_0_24px_rgba(212,175,55,0.35)] hover:scale-[1.02] text-sm"
                    >
                      Analyze a Stock →
                    </button>
                    <button
                      onClick={() => navigate('/terminal/intel')}
                      className="px-8 py-3.5 border border-white/10 text-slate-300 font-medium rounded-lg hover:border-gold-primary/30 hover:text-gold-primary transition-all text-sm"
                    >
                      Open Terminal
                    </button>
                  </div>

                  {/* Social proof strip */}
                  <div className="flex items-center gap-6 mt-12 pt-8 border-t border-white/5">
                    {[['67%', 'Win Rate'], ['2.5×', 'Sharpe'], ['47', 'Markets'], ['<12ms', 'Latency']].map(([val, label]) => (
                      <div key={label}>
                        <div className="text-xl font-black text-white font-heading">{val}</div>
                        <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="input" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                  <form onSubmit={handleSubmit} className="flex flex-col items-start py-6 w-full max-w-md">
                    <label className="text-gold-primary text-[10px] font-bold uppercase tracking-[0.35em] mb-4 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Enter Ticker Symbol
                    </label>
                    <div className="relative w-full">
                      <input
                        ref={inputRef}
                        type="text"
                        value={localTicker}
                        onChange={e => setLocalTicker(e.target.value.toUpperCase())}
                        placeholder="NVDA"
                        className="w-full bg-black/60 border border-gold-primary/40 rounded-xl px-6 py-4 text-4xl font-black text-white focus:outline-none focus:border-gold-primary focus:shadow-[0_0_28px_rgba(212,175,55,0.5)] transition-all uppercase placeholder-slate-700"
                        style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}
                      />
                      <AnimatePresence>
                        {suggestions.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                            className="absolute left-0 right-0 mt-2 bg-black/95 border border-gold-primary/20 rounded-xl overflow-hidden z-50 backdrop-blur-xl"
                          >
                            {suggestions.map((s, i) => (
                              <div key={i} onClick={() => { setLocalTicker(s.symbol); setSuggestions([]); handleSubmit(); }}
                                className="p-4 hover:bg-gold-primary/8 cursor-pointer flex justify-between items-center group transition-colors border-b border-white/4 last:border-0"
                              >
                                <div>
                                  <p className="text-gold-primary font-bold group-hover:text-white text-sm">{s.symbol}</p>
                                  <p className="text-[10px] text-slate-500 uppercase mt-0.5">{s.name}</p>
                                </div>
                                <span className="text-[9px] font-black text-slate-700 uppercase border border-slate-800 px-1.5 py-0.5 rounded">{s.exch}</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-6">
                      Press <kbd className="bg-white/8 px-1.5 py-0.5 rounded text-white text-[10px] border border-white/10">Enter</kbd> to launch QuantMind Analysis
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Right: Live data panel — hidden on mobile, hidden when not idle */}
            <AnimatePresence>
              {appState === 'idle' && (
                <motion.div
                  className="hidden xl:block"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <LiveMarketPanel onAnalyze={() => setAppState('input')} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── SCROLL SECTIONS (fades when not idle) ── */}
      <div className={`transition-opacity duration-1000 ${appState !== 'idle' ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>

        {/* Section 2: Performance — full-width split */}
        <section className="relative h-screen flex items-center px-8 md:px-24 z-10">
          <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-16">
            <div className="max-w-lg">
              <span className="text-[9px] font-black uppercase tracking-[0.45em] text-gold-primary mb-5 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Consistent Performance
              </span>
              <h2 className="text-5xl font-black font-heading text-white leading-none tracking-tighter mb-6">
                Precision Isn't<br />An Act.
              </h2>
              <p className="text-slate-400 leading-relaxed mb-8" style={{ fontSize: '15px' }}>
                Our multi-strategy engine delivers consistent returns through peak volatility regimes.
                <span className="text-white/70 block mt-3 italic text-sm">"It's a mandate."</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5 shrink-0">
              {[['67%', 'Win Rate'], ['2.5', 'Sharpe Ratio'], ['+34.2%', 'Alpha Yield YTD'], ['0.12', 'Market Correlation']].map(([val, label]) => (
                <div key={label} className="p-8 bg-[#0b0f14] hover:bg-white/[0.02] transition-colors">
                  <p className="text-4xl font-black text-white font-heading mb-1">{val}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Strategy */}
        <section className="relative h-screen flex items-center px-8 md:px-24 z-10">
          <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 max-w-md">
              <span className="text-[9px] font-black uppercase tracking-[0.45em] text-gold-primary mb-5 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Allocation Architecture
              </span>
              <h2 className="text-5xl font-black font-heading text-white tracking-tighter leading-none mb-6 uppercase">
                Strategic<br /><span className="text-gold">Diversity.</span>
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Dynamically rebalanced across G10 and digital asset corridors.
              </p>
            </div>
            <div className="flex-1 space-y-2">
              {data.strategies.slice(0, 3).map((s: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center justify-between px-6 py-5 bg-white/[0.025] border border-white/5 rounded-xl hover:border-gold-primary/20 hover:bg-white/[0.04] transition-all group"
                >
                  <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{s.name}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-px bg-white/5 relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full bg-gold-primary/60 transition-all" style={{ width: `${s.allocation}%` }} />
                    </div>
                    <span className="text-gold font-black w-12 text-right text-sm">{s.allocation}%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: AI Models */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-8 md:px-16 z-10 py-24">
          <div className="w-full max-w-[1600px] mx-auto">
            <div className="text-center mb-16">
              <span className="text-[9px] font-black uppercase tracking-[0.45em] text-gold-primary mb-4 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Neural Architecture
              </span>
              <h2 className="text-6xl md:text-8xl font-black font-heading text-white uppercase tracking-tighter leading-none">
                Quant<br /><span className="text-gold">Intelligence.</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-4">
              {data.aiModels.slice(0, 3).map((m: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-8 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-gold-primary/25 hover:bg-white/[0.04] transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-gold-primary/4 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative z-10">
                    <p className="text-gold-primary font-black text-lg mb-1 group-hover:text-white transition-colors">{m.name}</p>
                    <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-8" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.type}</p>
                    <div className="border-t border-white/5 pt-6 flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-black text-white font-heading">{m.accuracy}%</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Accuracy</p>
                      </div>
                      <div className="w-16 h-16 rounded-full border border-gold-primary/15 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-gold-primary/60 group-hover:bg-gold-primary group-hover:shadow-[0_0_12px_rgba(201,150,42,0.8)] transition-all" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Scale */}
        <section className="relative h-screen flex items-center px-8 md:px-24 z-10">
          <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row-reverse items-center gap-16">
            <div className="flex-1 max-w-lg">
              <span className="text-[9px] font-black uppercase tracking-[0.45em] text-gold-primary mb-5 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Capital Efficiency
              </span>
              <h2 className="text-5xl font-black font-heading text-white tracking-tighter leading-none mb-6 uppercase">
                Scalable<br /><span className="text-gold">Operations.</span>
              </h2>
              <p className="text-slate-400 leading-relaxed text-sm">
                Optimized capital flow ensures operational costs remain lean while R&D expenditure fuels the next generation of Alpha discovery.
              </p>
            </div>
            <div className="flex-1 max-w-sm space-y-6">
              {[['Annual R&D', '$42.0M', 75], ['Infrastructure', '$19.0M', 45], ['Alpha Engine', '$31.5M', 62]].map(([label, val, pct]) => (
                <div key={label as string}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
                    <span className="text-white font-black text-sm">{val}</span>
                  </div>
                  <div className="h-px w-full bg-white/5 relative overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="absolute left-0 top-0 h-full bg-gold-primary/70"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 6: Closing */}
        <section className="relative h-screen flex flex-col items-center justify-center text-center px-8 z-10">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl"
          >
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-px flex-1 max-w-[120px] bg-white/8" />
              <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-gold-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Neurovault 2026</span>
              <div className="h-px flex-1 max-w-[120px] bg-white/8" />
            </div>
            <h2 className="text-6xl md:text-9xl font-black font-heading text-white tracking-tighter leading-none mb-12 uppercase">
              Secure Your<br /><span className="text-gold">Mandate.</span>
            </h2>
            <div className="flex flex-col md:flex-row gap-4 justify-center pointer-events-auto mb-12">
              <button className="px-12 py-4 bg-gold-gradient text-black font-bold rounded-lg hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(212,175,55,0.12)] hover:shadow-[0_0_40px_rgba(212,175,55,0.25)]">
                Request VIP Access
              </button>
              <button className="px-12 py-4 border border-white/10 text-gold-primary font-bold rounded-lg hover:border-gold-primary/35 hover:bg-gold-primary/5 transition-all">
                Contact Us
              </button>
            </div>
            <p className="text-[10px] text-slate-600 uppercase tracking-[0.4em]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              © 2026 FinMotion Intelligence · All rights reserved
            </p>
          </motion.div>
        </section>
      </div>

      <style>{`
        @keyframes nvTickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes nvPing { 0%{transform:scale(1);opacity:1} 70%{transform:scale(2.4);opacity:0} 100%{transform:scale(1);opacity:0} }
      `}</style>
    </div>
  );
};

export default Hero;
