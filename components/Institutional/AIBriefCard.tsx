// AI Intelligence Brief
// RESTRAINED LUXURY: Executive Summary Style

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BriefData {
    summary: string[];
    timestamp: string;
}

export function AIBriefCard({ summary, timestamp }: { summary: string[], timestamp: string }) {

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
        >
            <div className="h-full flex flex-col relative group">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <span className="text-[11px] font-bold tracking-[0.2em] uppercase flex items-center gap-3 text-[#D4AF37]">
                        <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full shadow-[0_0_8px_#D4AF37]"></span>
                        KEY INTELLIGENCE
                    </span>
                    <span className="text-[10px] font-mono text-[#556677] uppercase tracking-wider">{timestamp || 'LIVE'}</span>
                </div>

                {/* Content - Clean List */}
                <div className="space-y-8 flex-grow border-l border-white/5 pl-6">
                    {(summary || ["Loading intelligence..."]).slice(0, 3).map((item, i) => (
                        <div key={i} className="relative">
                            <p className="text-lg text-[#B0B8C1] font-light leading-relaxed group-hover:text-white transition-colors duration-500">
                                {item}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Action */}
                <div className="mt-8 pt-4 pl-6">
                    <button className="text-xs font-bold tracking-[0.2em] uppercase transition-colors flex items-center gap-3 text-[#D4AF37] hover:opacity-80">
                        READ FULL BRIEF <span className="text-lg leading-none text-[#D4AF37]">→</span>
                    </button>
                </div>

            </div>
        </motion.div>
    );
}
