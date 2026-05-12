
import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const data = [
    { month: 'JAN', alpha: 4000, benchmark: 2400 },
    { month: 'FEB', alpha: 3000, benchmark: 1398 },
    { month: 'MAR', alpha: 2000, benchmark: 9800 },
    { month: 'APR', alpha: 2780, benchmark: 3908 },
    { month: 'MAY', alpha: 1890, benchmark: 4800 },
    { month: 'JUN', alpha: 2390, benchmark: 3800 },
    { month: 'JUL', alpha: 3490, benchmark: 4300 },
];

const PerformanceAnalysis: React.FC = () => {
    return (
        <section id="performance" className="py-32 px-6 bg-[#0b0f14]">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                    <div className="max-w-2xl">
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gold-primary mb-4 block">Quantitative Velocity</span>
                        <h2 className="text-6xl font-black font-heading text-white tracking-tighter leading-none mb-6 italic">
                            PERFORMANCE <br /> <span className="text-gold">ARBITRAGE.</span>
                        </h2>
                        <p className="text-lg text-slate-400 font-medium">
                            A continuous decoupling from traditional market variance. Our alpha-generation cycles are engineered for institutional scale and resilience.
                        </p>
                    </div>
                    <div className="flex gap-12">
                        <div className="text-right">
                            <p className="text-4xl font-black text-white">+34.2%</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Alpha Yield YTD</p>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-black text- gold-primary">0.12</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Market Correlation</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[500px]">
                    {/* Main Chart Card */}
                    <div className="lg:col-span-2 glass p-8 rounded-[3rem] border border-white/5 bg-black/40 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Yield Comparison (Alpha vs Global)</h4>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-gold-primary" />
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Quant Alpha</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">S&P 500 Index</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="colorAlpha" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="month" stroke="rgba(148, 163, 184, 0.5)" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '12px' }}
                                        itemStyle={{ color: '#D4AF37', fontSize: '10px' }}
                                    />
                                    <Area type="monotone" dataKey="alpha" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorAlpha)" />
                                    <Area type="monotone" dataKey="benchmark" stroke="#334155" strokeWidth={1} fill="transparent" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Secondary Stats Card */}
                    <div className="flex flex-col gap-8">
                        <div className="flex-1 glass p-8 rounded-[3rem] border border-white/5 bg-black/40 backdrop-blur-xl flex flex-col justify-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-gold-primary mb-2">Liquidity Score</span>
                            <p className="text-5xl font-black text-white">AA+</p>
                            <p className="text-xs text-slate-500 mt-4 leading-relaxed italic">
                                Top-tier collateral velocity rated by global auditing partners.
                            </p>
                        </div>
                        <div className="flex-1 glass p-8 rounded-[3rem] border border-white/5 bg-gold-primary/5 backdrop-blur-xl flex flex-col justify-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-gold-primary mb-2">Global Nodes</span>
                            <p className="text-5xl font-black text-white">1,240</p>
                            <p className="text-xs text-slate-500 mt-4 leading-relaxed italic">
                                Geographically distributed low-latency computation clusters.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PerformanceAnalysis;
