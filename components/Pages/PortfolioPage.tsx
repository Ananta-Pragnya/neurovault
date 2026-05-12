// Portfolio Page
// Risk-first approach

import React from 'react';
import { motion } from 'framer-motion';

export function PortfolioPage() {
    // Mock portfolio data
    const portfolio = {
        totalValue: 125000,
        dayChange: 1250,
        dayChangePercent: 1.01,
        positions: [
            { symbol: 'AAPL', shares: 100, value: 17500, weight: 14, change: 2.3 },
            { symbol: 'MSFT', shares: 50, value: 18750, weight: 15, change: 1.8 },
            { symbol: 'NVDA', shares: 25, value: 18000, weight: 14.4, change: 3.2 },
            { symbol: 'GOOGL', shares: 75, value: 10125, weight: 8.1, change: 0.9 },
        ],
        exposure: {
            tech: 52,
            finance: 15,
            healthcare: 12,
            consumer: 11,
            other: 10
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0E14] text-white pt-24 px-6 pb-20">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl font-semibold mb-3">Portfolio</h1>
                    <p className="text-slate-400 text-sm">Risk-first analysis and diversification coaching.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Portfolio Value */}
                    <div className="lg:col-span-2 space-y-6">
                        <ValueCard portfolio={portfolio} />
                        <PositionsCard positions={portfolio.positions} />
                    </div>

                    {/* Risk & Exposure */}
                    <div className="space-y-6">
                        <ExposureCard exposure={portfolio.exposure} />
                        <RiskCard />
                        <AICoachCard />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ValueCard({ portfolio }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#151922] border border-white/5 rounded-xl p-6"
        >
            <span className="text-xs text-slate-500 uppercase tracking-wider">Total Value</span>
            <h2 className="text-4xl font-semibold mt-2 mb-3">
                ${portfolio.totalValue.toLocaleString()}
            </h2>
            <div className="flex items-center gap-2">
                <span className={`text-sm ${portfolio.dayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {portfolio.dayChange >= 0 ? '+' : ''}${portfolio.dayChange.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">
                    ({portfolio.dayChange >= 0 ? '+' : ''}{portfolio.dayChangePercent.toFixed(2)}%) today
                </span>
            </div>
        </motion.div>
    );
}

function PositionsCard({ positions }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#151922] border border-white/5 rounded-xl p-6"
        >
            <h3 className="text-lg font-semibold mb-4">Positions</h3>
            <div className="space-y-3">
                {positions.map((pos: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-white">{pos.symbol}</span>
                                <span className="text-xs text-slate-500">{pos.shares} shares</span>
                            </div>
                            <span className="text-xs text-slate-500">{pos.weight}% of portfolio</span>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-medium text-white">${pos.value.toLocaleString()}</div>
                            <div className={`text-xs ${pos.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {pos.change >= 0 ? '+' : ''}{pos.change}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

function ExposureCard({ exposure }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#151922] border border-white/5 rounded-xl p-6"
        >
            <h3 className="text-lg font-semibold mb-4">Sector Exposure</h3>
            <div className="space-y-3">
                {Object.entries(exposure).map(([sector, percent]: any, i) => (
                    <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-400 capitalize">{sector}</span>
                            <span className="text-xs text-white">{percent}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percent}%` }}
                                transition={{ duration: 1, delay: i * 0.1 }}
                                className="h-full bg-gold-primary rounded-full"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

function RiskCard() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#151922] border border-white/5 rounded-xl p-6"
        >
            <h3 className="text-lg font-semibold mb-4">Risk Analysis</h3>
            <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-400">Portfolio Beta</span>
                    <span className="text-white font-medium">1.24</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Max Drawdown</span>
                    <span className="text-rose-400 font-medium">-12.3%</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Sharpe Ratio</span>
                    <span className="text-white font-medium">1.84</span>
                </div>
            </div>
        </motion.div>
    );
}

function AICoachCard() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-gold-primary/5 to-transparent border border-gold-primary/10 rounded-xl p-6"
        >
            <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-gold-primary animate-pulse" />
                <h3 className="text-sm font-semibold text-gold-primary">AI Coach</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
                You are 52% tech heavy. A 3% Nasdaq drop may reduce portfolio ~5%. Consider adding defensive sectors.
            </p>
            <button className="w-full text-xs text-gold-primary hover:text-white transition-colors py-2 border border-gold-primary/20 rounded-lg hover:bg-gold-primary/10">
                Get Diversification Plan →
            </button>
        </motion.div>
    );
}
