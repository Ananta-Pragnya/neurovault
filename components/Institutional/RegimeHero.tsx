// Premium Hero - Market Regime Display
// RESTRAINED LUXURY: Private Equity Style

import React from 'react';
import { motion } from 'framer-motion';

interface RegimeData {
    status: string;
    confidence: number;
    metrics: {
        vix: number;
        breadth: number;
        momentum: number;
    };
}

export function RegimeHero({ regime, description, metrics }: { regime: string, description: string, metrics?: any }) {
    // Config: Minimalist, no heavy backgrounds. Text color denotes status subtly.
    const regimeConfig: any = {
        'RISK-ON': { color: 'text-emerald-400', icon: '↗' },
        'RISK-OFF': { color: 'text-rose-400', icon: '↘' },
        'VOLATILE': { color: 'text-amber-400', icon: '⚡' },
        'NEUTRAL': { color: 'text-slate-300', icon: '→' }
    };

    const config = regimeConfig[regime] || regimeConfig.NEUTRAL;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full mb-12"
        >
            <div className="flex flex-col md:flex-row items-end justify-between gap-8 border-b border-white/5 pb-8">

                {/* Left: Signal */}
                <div className="relative">
                    <span className="text-[11px] font-bold tracking-[0.3em] uppercase mb-4 block text-[#C6A85A]">
                        MACRO REGIME
                    </span>
                    <div className="flex items-baseline gap-6">
                        <h1 className="text-7xl md:text-9xl font-black tracking-tighter brief-text drop-shadow-[0_0_30px_rgba(198,168,90,0.15)]">
                            {regime}
                        </h1>
                        <span className={`text-4xl ${config.color} opacity-80 font-light`}>{config.icon}</span>
                    </div>
                    <p className="mt-4 text-[#8899A6] text-lg font-light max-w-xl leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Right: Key Metrics (Data Table Style) */}
                {metrics && (
                    <div className="flex gap-12">
                        <MetricItem label="VIX" value={metrics.vix?.toFixed(1) || "14.2"} />
                        <MetricItem label="BREADTH" value={`${metrics.breadth?.toFixed(0) || "68"}%`} isHighlight />
                        <MetricItem label="MOMENTUM" value={metrics.momentum?.toFixed(1) || "2.3"} />
                    </div>
                )}

            </div>
        </motion.div>
    );
}

function MetricItem({ label, value, isHighlight = false }: { label: string, value: string, isHighlight?: boolean }) {
    return (
        <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#556677] uppercase mb-2">{label}</span>
            <div className={`text-3xl font-light tracking-tight ${isHighlight ? 'text-[#D4AF37] font-bold' : 'text-white'}`}>
                {value}
            </div>
        </div>
    )
}
