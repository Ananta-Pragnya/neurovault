// Opportunity Radar
// RESTRAINED LUXURY: Quantitative Table Style

import React from 'react';
import { motion } from 'framer-motion';

interface Opportunity {
    symbol: string;
    type: string;
    magnitude: number;
}

export function OpportunityRadar({ opportunities }: { opportunities?: Opportunity[] }) {

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
        >
            <div className="h-full flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <span className="text-[11px] font-bold tracking-[0.2em] uppercase bg-gradient-to-r from-slate-400 to-slate-600 bg-clip-text text-transparent">
                        ALGORITHMIC SIGNALS
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider bg-gradient-to-r from-[#F6E27A] via-[#D4AF37] to-[#F6E27A] bg-clip-text text-transparent font-bold">
                        TOP 5 ACTIVE
                    </span>
                </div>

                {/* Minimal Table */}
                <div className="w-full">
                    <div className="grid grid-cols-12 text-[10px] text-[#556677] uppercase tracking-wider font-bold mb-4 px-2">
                        <div className="col-span-4">Asset</div>
                        <div className="col-span-4 text-right">Signal</div>
                        <div className="col-span-4 text-right">Strength</div>
                    </div>

                    <div className="space-y-1">
                        {(opportunities && opportunities.length > 0 ? opportunities : [
                            { symbol: 'NVDA', type: 'MOMENTUM', magnitude: 9.2 },
                            { symbol: 'XLE', type: 'ROTATION', magnitude: 8.4 },
                            { symbol: 'TLT', type: 'MEAN REV', magnitude: 7.8 },
                        ]).map((item, i) => (
                            <div key={i} className="grid grid-cols-12 items-center py-4 px-2 border-b border-white/5 hover:bg-white/[0.02] transition-colors group">

                                {/* Asset */}
                                <div className="col-span-4 flex items-center gap-3">
                                    <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent group-hover:from-[#F6E27A] group-hover:to-[#D4AF37] transition-all duration-500">{item.symbol}</span>
                                </div>

                                {/* Signal */}
                                <div className="col-span-4 text-right">
                                    <span className="text-[10px] bg-white/5 text-[#8899A6] px-2 py-1 rounded inline-block group-hover:text-white transition-colors">
                                        {item.type}
                                    </span>
                                </div>

                                {/* Strength */}
                                <div className="col-span-4 flex items-center justify-end gap-3">
                                    <span className="text-xs font-mono font-bold bg-gradient-to-r from-[#D4AF37] to-[#B59128] bg-clip-text text-transparent">{item.magnitude.toFixed(1)}</span>
                                    <div className="w-12 h-[1px] bg-[#2A3036]">
                                        <div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F6E27A]" style={{ width: `${(item.magnitude / 10) * 100}%` }}></div>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </motion.div>
    );
}
