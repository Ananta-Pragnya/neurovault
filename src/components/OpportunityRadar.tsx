import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TickerSnapshot } from '../lib/types';

interface OpportunityRadarProps {
    data: TickerSnapshot[]; // Now accepts real data
}

export const OpportunityRadar: React.FC<OpportunityRadarProps> = ({ data }) => {
    // Top 5 sorted by change % absolute
    const sortedData = [...data].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <span className="text-label text-text-secondary">ALGORITHMIC ANALYST FEED</span>
                <span className="text-[10px] text-primary animate-pulse font-mono font-bold">ALPACA LIVE</span>
            </div>

            {/* Table */}
            <div className="w-full grow overflow-hidden">
                <div className="grid grid-cols-12 text-[9px] text-text-secondary uppercase tracking-widest font-black mb-4 px-2 opacity-50">
                    <div className="col-span-3">Asset</div>
                    <div className="col-span-3 text-right">Price / Chg</div>
                    <div className="col-span-3 text-right">Bid/Ask</div>
                    <div className="col-span-3 text-right">Updated</div>
                </div>

                <div className="space-y-2">
                        <motion.div
                            key={item.ticker}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                                type: "spring",
                                stiffness: 260,
                                damping: 20,
                                delay: i * 0.05 
                            }}
                            className="grid grid-cols-12 items-center py-5 px-4 rounded-2xl border border-white/0 hover:border-white/10 hover:bg-white/[0.05] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all group cursor-pointer relative overflow-hidden backdrop-blur-sm"
                        >
                            <div className="absolute inset-y-0 left-0 w-1.5 bg-primary/0 group-hover:bg-primary/70 transition-all rounded-full" />
                            
                            {/* Asset */}
                            <div className="col-span-3 flex flex-col">
                                <span className="text-base font-black text-white group-hover:text-primary transition-colors tracking-tight">
                                    {item.ticker}
                                </span>
                                <span className="text-[9px] text-slate-500 font-bold truncate uppercase tracking-[0.1em]">
                                    {item.name || "Global Market Tier 1"}
                                </span>
                            </div>

                            {/* Price / Change */}
                            <div className="col-span-3 text-right flex flex-col">
                                <span className="text-sm font-mono font-black text-white group-hover:scale-105 transition-transform origin-right">
                                    ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                                <span className={`text-[11px] font-black font-mono flex items-center justify-end gap-1 ${item.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {item.change >= 0 ? '▲' : '▼'}{Math.abs(item.change).toFixed(2)}%
                                </span>
                            </div>

                            {/* Bid / Ask */}
                            <div className="col-span-3 text-right flex flex-col opacity-40 group-hover:opacity-100 transition-opacity">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-mono text-slate-400">
                                        <span className="opacity-50 font-bold mr-1">B</span>{item.bid?.toFixed(2) || '-'}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">
                                        <span className="opacity-50 font-bold mr-1">A</span>{item.ask?.toFixed(2) || '-'}
                                    </span>
                                </div>
                            </div>

                            {/* Timestamp */}
                            <div className="col-span-3 text-right flex flex-col items-end gap-1">
                                <span className="text-[9px] font-black text-slate-600 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 uppercase tracking-widest">
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                            </div>

                        </motion.div>
                    {sortedData.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
                            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            <div className="text-[10px] font-bold uppercase tracking-widest">Awaiting Institutional Feed...</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
