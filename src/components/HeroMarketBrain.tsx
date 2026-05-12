import React from 'react';
import { motion } from 'framer-motion';
import { MarketDigest } from '../lib/types';

interface HeroMarketBrainProps {
    digest: MarketDigest;
}

export const HeroMarketBrain: React.FC<HeroMarketBrainProps> = ({ digest }) => {
    return (
        <div className="relative w-full h-[400px] rounded-3xl overflow-hidden glass border border-white/5 p-8 flex flex-col justify-between group">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            {/* Header / Mood */}
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <h2 className="text-label text-text-secondary mb-2 uppercase tracking-widest">Market Regime</h2>
                    <h1 className="text-market-mood text-text-primary">
                        {digest.market_mood.toUpperCase()}
                        <span className="text-primary">.</span>
                    </h1>
                </div>

                {/* Probabilities */}
                <div className="flex gap-8 text-right">
                    <div>
                        <div className="text-label text-text-secondary mb-1">WEEK</div>
                        <div className="text-2xl font-bold text-text-primary">{(digest.probabilities.short_week * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                        <div className="text-label text-text-secondary mb-1">MONTH</div>
                        <div className="text-2xl font-bold text-text-primary">{(digest.probabilities.medium_month * 100).toFixed(0)}%</div>
                    </div>
                </div>
            </div>

            {/* Scenic Line Chart Placeholder */}
            <div className="absolute inset-0 z-0 top-24 opacity-30">
                {/* Mock Chart SVG */}
                <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="none">
                    <path d="M0,250 C200,240 300,100 500,150 C700,200 800,50 1000,100" fill="none" stroke="#D4AF37" strokeWidth="2" />
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d="M0,250 C200,240 300,100 500,150 C700,200 800,50 1000,100 V300 H0 Z" fill="url(#chartGradient)" />
                </svg>
            </div>

            {/* Bottom: Bullets */}
            <div className="relative z-10 grid grid-cols-2 gap-8">
                <div>
                    <div className="text-label text-text-secondary mb-4 uppercase tracking-widest">Intelligence Digest</div>
                    <ul className="space-y-3">
                        {digest.top_bullets.map((bullet, i) => (
                            <motion.li
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-start gap-3 text-sm text-text-primary"
                            >
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-primary" />
                                {bullet}
                            </motion.li>
                        ))}
                    </ul>
                </div>

                {/* Top Shock */}
                {digest.top_shock_candidates[0] && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="flex justify-between mb-2">
                            <span className="text-label text-primary">ANOMALY DETECTED</span>
                            <span className="text-label text-red-400">SEVERITY: {digest.top_shock_candidates[0].severity.toFixed(2)}</span>
                        </div>
                        <div className="text-xl font-bold mb-1">{digest.top_shock_candidates[0].ticker}</div>
                        <div className="text-sm text-text-secondary leading-relaxed">
                            {digest.top_shock_candidates[0].reason}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
