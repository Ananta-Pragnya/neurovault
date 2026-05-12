// Lab Page
// Advanced tools: correlations, backtesting, screeners, AI console

import React, { useState } from 'react';
import { motion } from 'framer-motion';

const tools = [
    { id: 'correlations', name: 'Correlation Matrix', icon: '🔗', description: 'Asset correlation analysis' },
    { id: 'backtest', name: 'Strategy Backtester', icon: '⏮', description: 'Test trading strategies' },
    { id: 'screener', name: 'Stock Screener', icon: '🔍', description: 'Filter by fundamentals' },
    { id: 'factors', name: 'Factor Models', icon: '📊', description: 'Multi-factor analysis' },
    { id: 'ai-console', name: 'AI Research Console', icon: '🤖', description: 'Natural language research' }
];

export function LabPage() {
    const [activeTool, setActiveTool] = useState('ai-console');

    return (
        <div className="min-h-screen bg-[#0A0E14] text-white pt-24 px-6 pb-20">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl font-semibold mb-3">Lab</h1>
                    <p className="text-slate-400 text-sm">Advanced research and analysis tools.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Tool Selector */}
                    <div className="lg:col-span-1">
                        <div className="bg-[#151922] border border-white/5 rounded-xl p-4 sticky top-24">
                            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-4">Tools</h3>
                            <div className="space-y-1">
                                {tools.map((tool) => (
                                    <button
                                        key={tool.id}
                                        onClick={() => setActiveTool(tool.id)}
                                        className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-300 ${activeTool === tool.id
                                                ? 'bg-gold-primary/10 border border-gold-primary/20 text-white'
                                                : 'text-slate-400 hover:bg-white/[0.02] hover:text-white'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 mb-1">
                                            <span>{tool.icon}</span>
                                            <span className="text-sm font-medium">{tool.name}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 ml-8">{tool.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tool Content */}
                    <div className="lg:col-span-3">
                        {activeTool === 'ai-console' && <AIConsole />}
                        {activeTool === 'screener' && <Screener />}
                        {activeTool === 'correlations' && <Correlations />}
                        {activeTool === 'backtest' && <Backtester />}
                        {activeTool === 'factors' && <FactorModels />}
                    </div>
                </div>
            </div>
        </div>
    );
}

function AIConsole() {
    const [query, setQuery] = useState('');

    return (
        <motion.div
            key="ai-console"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#151922] border border-white/5 rounded-xl p-6"
        >
            <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-gold-primary animate-pulse" />
                <h2 className="text-xl font-semibold">AI Research Console</h2>
            </div>

            <p className="text-sm text-slate-400 mb-6">
                Ask questions in natural language. Get institutional-grade research insights.
            </p>

            <div className="mb-6">
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g., What are the macroeconomic risks to tech stocks in Q2 2024?"
                    className="w-full bg-white/[0.02] border border-white/5 rounded-lg p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-primary/30 min-h-[120px]"
                />
            </div>

            <button className="px-6 py-2.5 bg-gold-primary/10 border border-gold-primary/20 rounded-lg text-sm font-medium text-gold-primary hover:bg-gold-primary/20 transition-colors">
                Generate Research →
            </button>

            <div className="mt-8 pt-6 border-t border-white/5">
                <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-4">Example Queries</h3>
                <div className="space-y-2">
                    {[
                        'Compare AAPL vs MSFT on risk-adjusted returns',
                        'Analyze correlation between VIX and tech stocks',
                        'Impact of rising yields on growth sectors'
                    ].map((example, i) => (
                        <button
                            key={i}
                            onClick={() => setQuery(example)}
                            className="block w-full text-left text-xs text-slate-400 hover:text-white p-2 rounded hover:bg-white/[0.02] transition-colors"
                        >
                            {example}
                        </button>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

function Screener() {
    return (
        <motion.div
            key="screener"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#151922] border border-white/5 rounded-xl p-6"
        >
            <h2 className="text-xl font-semibold mb-6">Stock Screener</h2>
            <p className="text-sm text-slate-400 mb-6">Filter stocks by fundamentals and technicals.</p>

            <div className="grid grid-cols-2 gap-4">
                <FilterInput label="Market Cap" placeholder="Min $1B" />
                <FilterInput label="P/E Ratio" placeholder="Max 25" />
                <FilterInput label="Dividend Yield" placeholder="Min 2%" />
                <FilterInput label="Volume" placeholder="Min 1M" />
            </div>

            <button className="mt-6 px-6 py-2.5 bg-gold-primary/10 border border-gold-primary/20 rounded-lg text-sm font-medium text-gold-primary hover:bg-gold-primary/20 transition-colors">
                Run Screen →
            </button>
        </motion.div>
    );
}

function FilterInput({ label, placeholder }: { label: string; placeholder: string }) {
    return (
        <div>
            <label className="block text-xs text-slate-500 mb-2">{label}</label>
            <input
                type="text"
                placeholder={placeholder}
                className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-primary/30"
            />
        </div>
    );
}

function Correlations() {
    return (
        <motion.div
            key="correlations"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#151922] border border-white/5 rounded-xl p-6"
        >
            <h2 className="text-xl font-semibold mb-4">Correlation Matrix</h2>
            <p className="text-sm text-slate-400">Asset correlation analysis - Coming soon.</p>
        </motion.div>
    );
}

function Backtester() {
    return (
        <motion.div
            key="backtest"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#151922] border border-white/5 rounded-xl p-6"
        >
            <h2 className="text-xl font-semibold mb-4">Strategy Backtester</h2>
            <p className="text-sm text-slate-400">Test trading strategies - Coming soon.</p>
        </motion.div>
    );
}

function FactorModels() {
    return (
        <motion.div
            key="factors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#151922] border border-white/5 rounded-xl p-6"
        >
            <h2 className="text-xl font-semibold mb-4">Factor Models</h2>
            <p className="text-sm text-slate-400">Multi-factor analysis - Coming soon.</p>
        </motion.div>
    );
}
