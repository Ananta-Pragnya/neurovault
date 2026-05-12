// Macro Page
// Global intelligence and country risk

import React from 'react';
import { motion } from 'framer-motion';

export function MacroPage() {
    const countries = [
        { name: 'United States', stability: 85, risk: 'Low', trend: 'Stable' },
        { name: 'China', stability: 65, risk: 'Medium', trend: 'Volatile' },
        { name: 'Europe (EU)', stability: 72, risk: 'Medium', trend: 'Weak' },
        { name: 'Japan', stability: 78, risk: 'Low', trend: 'Stable' },
        { name: 'Emerging Markets', stability: 58, risk: 'High', trend: 'Mixed' }
    ];

    return (
        <div className="min-h-screen bg-[#0A0E14] text-white pt-24 px-6 pb-20">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl font-semibold mb-3">Macro Intelligence</h1>
                    <p className="text-slate-400 text-sm">Global risk signals and capital flows.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <StabilityHeatmap countries={countries} />
                        <VolatilityCard />
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <FXCard />
                        <BondsCard />
                        <InflationCard />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StabilityHeatmap({ countries }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#151922] border border-white/5 rounded-xl p-6"
        >
            <h3 className="text-lg font-semibold mb-6">Global Stability</h3>
            <div className="space-y-3">
                {countries.map((country: any, i: number) => (
                    <div key={i} className="flex items-center gap-4">
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-white">{country.name}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-500">{country.trend}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${country.risk === 'Low' ? 'bg-emerald-500/10 text-emerald-400' :
                                            country.risk === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                                                'bg-rose-500/10 text-rose-400'
                                        }`}>
                                        {country.risk}
                                    </span>
                                </div>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${country.stability}%` }}
                                    transition={{ duration: 1, delay: i * 0.1 }}
                                    className={`h-full rounded-full ${country.stability >= 75 ? 'bg-emerald-500' :
                                            country.stability >= 60 ? 'bg-amber-500' :
                                                'bg-rose-500'
                                        }`}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

function VolatilityCard() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#151922] border border-white/5 rounded-xl p-6"
        >
            <h3 className="text-lg font-semibold mb-4">Volatility Indices</h3>
            <div className="grid grid-cols-2 gap-4">
                <VolItem label="VIX (US)" value="14.2" change={-2.1} />
                <VolItem label="VSTOXX (EU)" value="16.8" change={+1.3} />
                <VolItem label="VXN (Tech)" value="15.9" change={-0.8} />
                <VolItem label="VXEEM (EM)" value="22.4" change={+3.2} />
            </div>
        </motion.div>
    );
}

function VolItem({ label, value, change }: any) {
    return (
        <div className="bg-white/[0.02] rounded-lg p-4">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className="text-2xl font-semibold text-white mb-1">{value}</div>
            <div className={`text-xs ${change >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {change >= 0 ? '+' : ''}{change}%
            </div>
        </div>
    );
}

function FXCard() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#151922] border border-white/5 rounded-xl p-6"
        >
            <h3 className="text-lg font-semibold mb-4">FX Markets</h3>
            <div className="space-y-3 text-sm">
                <FXPair pair="EUR/USD" rate="1.0842" change={-0.23} />
                <FXPair pair="USD/JPY" rate="149.52" change={+0.45} />
                <FXPair pair="GBP/USD" rate="1.2634" change={-0.12} />
                <FXPair pair="USD/CNY" rate="7.2418" change={+0.08} />
            </div>
        </motion.div>
    );
}

function FXPair({ pair, rate, change }: any) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <span className="text-slate-400">{pair}</span>
            <div className="text-right">
                <div className="text-white font-medium">{rate}</div>
                <div className={`text-xs ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {change >= 0 ? '+' : ''}{change}%
                </div>
            </div>
        </div>
    );
}

function BondsCard() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#151922] border border-white/5 rounded-xl p-6"
        >
            <h3 className="text-lg font-semibold mb-4">Bond Yields</h3>
            <div className="space-y-3 text-sm">
                <BondRow name="US 10Y" yield="4.21%" change={+0.03} />
                <BondRow name="US 2Y" yield="4.47%" change={+0.05} />
                <BondRow name="Germany 10Y" yield="2.36%" change={-0.01} />
                <BondRow name="Japan 10Y" yield="0.68%" change={+0.02} />
            </div>
        </motion.div>
    );
}

function BondRow({ name, yield: yieldVal, change }: any) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-slate-400">{name}</span>
            <div className="text-right">
                <div className="text-white font-medium">{yieldVal}</div>
                <div className={`text-xs ${change >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {change >= 0 ? '+' : ''}{(change * 100).toFixed(0)}bp
                </div>
            </div>
        </div>
    );
}

function InflationCard() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#151922] border border-white/5 rounded-xl p-6"
        >
            <h3 className="text-lg font-semibold mb-4">Inflation</h3>
            <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-400">US CPI</span>
                    <span className="text-white font-medium">3.2%</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">EU HICP</span>
                    <span className="text-white font-medium">2.9%</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">UK CPI</span>
                    <span className="text-white font-medium">4.1%</span>
                </div>
            </div>
        </motion.div>
    );
}
