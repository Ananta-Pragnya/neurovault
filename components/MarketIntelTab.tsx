import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ICONS } from '../constants';

const MarketIntelTab: React.FC = () => {
    const [symbol, setSymbol] = useState('AAPL');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchIntel = async (sym: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`http://localhost:5000/api/market-intel/${sym}`);
            setData(response.data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch intelligence');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIntel(symbol);
    }, [symbol]);

    const favorites = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header & Symbol Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-gold p-5 rounded-xl border border-gold-primary/10 bg-black/40">
                <div>
                    <h2 className="text-xl font-bold font-heading text-white flex items-center gap-2">
                        <span className="text-gold-primary">Market</span> Intelligence
                    </h2>
                    <p className="text-slate-400 text-xs font-medium mt-1">AI Analysis with Live Market Data</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {favorites.map(fav => (
                        <button
                            key={fav}
                            onClick={() => setSymbol(fav)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${symbol === fav
                                ? 'bg-gold-primary/20 border-gold-primary text-gold-primary shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                                : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'
                                }`}
                        >
                            {fav}
                        </button>
                    ))}
                    <div className="relative ml-2">
                        <input
                            type="text"
                            placeholder="CUSTOM SYMBOL..."
                            className="bg-black/60 border border-white/10 rounded-lg px-4 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-gold-primary/50 w-32 tracking-widest"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') setSymbol((e.target as HTMLInputElement).value.toUpperCase());
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Intel Content */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="glass-gold rounded-xl p-6 border border-gold-primary/10 bg-black/40 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
                        {/* Decorative Background Element */}
                        <div className="absolute -top-20 -right-20 w-48 h-48 bg-gold-primary/5 rounded-full blur-[80px] pointer-events-none"></div>

                        {loading ? (
                            <div className="flex flex-col items-center gap-6">
                                <div className="relative">
                                    <div className="w-16 h-16 border-2 border-gold-primary/10 rounded-full animate-ping absolute inset-0"></div>
                                    <div className="w-16 h-16 border-t-2 border-gold-primary rounded-full animate-spin"></div>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gold-primary/60">Intercepting Market Data...</p>
                                    <p className="text-xs text-slate-500 mt-2">Grounding Gemini with live search context for {symbol}</p>
                                </div>
                            </div>
                        ) : data ? (
                            <div className="w-full h-full animate-in zoom-in-95 duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gold-gradient rounded-xl flex items-center justify-center text-black font-bold text-lg">
                                            {data.symbol[0]}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold font-heading text-white">{data.symbol} <span className="text-gold-primary">Intel</span></h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${data.sentiment === 'bullish' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    data.sentiment === 'bearish' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                        'bg-gold-primary/10 text-gold-primary border-gold-primary/20'
                                                    }`}>
                                                    {data.sentiment}
                                                </span>
                                                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Confidence: 94%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-bold font-heading text-white">${data.price}</p>
                                        <p className={`text-sm font-bold ${data.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {data.percentChange >= 0 ? '+' : ''}{data.percentChange}%
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-gold-primary/5 border border-gold-primary/20 rounded-2xl p-8 mb-8 relative">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-gold-primary opacity-50"></div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-primary mb-4 flex items-center gap-2">
                                        <div className="w-1 h-1 bg-gold-primary rounded-full"></div>
                                        AI Intelligence Synthesis
                                    </h4>
                                    <p className="text-xl text-slate-200 leading-relaxed font-medium italic">
                                        "{data.summaryText}"
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="glass-gold p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic mb-2">Day Range</p>
                                        <p className="text-xs font-bold text-white tracking-widest">{data.dayRange}</p>
                                    </div>
                                    <div className="glass-gold p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic mb-2">Cycle Time</p>
                                        <p className="text-xs font-bold text-white tracking-widest">{new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                                    </div>
                                    <div className="glass-gold p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic mb-2">Optimizer</p>
                                        <p className={`text-xs font-black tracking-[0.2em] ${data.cached ? 'text-gold-primary animate-pulse' : 'text-slate-400'}`}>
                                            {data.cached ? 'CACHED' : 'LIVE FEED'}
                                        </p>
                                    </div>
                                    <div className="glass-gold p-4 rounded-xl border border-gold-primary/20 bg-gold-primary/5">
                                        <p className="text-[9px] text-gold-primary font-bold uppercase tracking-widest italic mb-2">Security</p>
                                        <p className="text-xs font-black text-white tracking-widest">VERIFIED</p>
                                    </div>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="text-center p-8">
                                <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center text-rose-500 text-2xl mb-4 mx-auto">!</div>
                                <h3 className="text-lg font-bold text-white mb-2">Intelligence Drop Fault</h3>
                                <p className="text-slate-500 text-sm mb-6">{error}</p>
                                <button
                                    onClick={() => fetchIntel(symbol)}
                                    className="px-6 py-2 bg-gold-gradient text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all"
                                >
                                    RETRY CONNECTION
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Sidebar Intel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="glass-gold rounded-xl p-5 border border-gold-primary/10 bg-black/40">
                        <h3 className="text-xs font-bold uppercase tracking-wider mb-5 text-gold-primary flex items-center justify-between">
                            Alpha Signals
                            <div className="flex gap-1">
                                <div className="w-1 h-1 bg-gold-primary rounded-full animate-pulse"></div>
                                <div className="w-1 h-1 bg-gold-primary rounded-full animate-pulse delay-75"></div>
                                <div className="w-1 h-1 bg-gold-primary rounded-full animate-pulse delay-150"></div>
                            </div>
                        </h3>

                        <div className="space-y-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-gold-primary/30 transition-colors group cursor-help">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Institutional Acc</p>
                                </div>
                                <p className="text-xs text-slate-300 font-medium">Whale wallets increasing spot exposure by 14.2% over 24h.</p>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-gold-primary/30 transition-colors group cursor-help">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-gold-primary"></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gold-primary">Grounding Match</p>
                                </div>
                                <p className="text-xs text-slate-300 font-medium">Recent Earnings Call sentiment confirms AI-driven margin expansion.</p>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-gold-primary/30 transition-colors group cursor-help">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Macro Hedge</p>
                                </div>
                                <p className="text-xs text-slate-300 font-medium">Low correlation with broader tech indices provides downside protection.</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-gold rounded-xl p-6 border border-gold-primary/20 bg-gold-primary/5 text-center">
                        <h4 className="text-base font-bold text-white mb-2">Premium Access</h4>
                        <p className="text-xs text-slate-400 mb-5">Upgrade for real-time analytics and advanced features.</p>
                        <button className="w-full py-2.5 bg-gold-gradient text-black text-xs font-bold uppercase tracking-wide rounded-lg hover:scale-[1.02] transition-all">
                            Upgrade Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketIntelTab;
