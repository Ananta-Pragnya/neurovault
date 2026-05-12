import React from 'react';
import CardGlass from './CardGlass';

interface HeroProps {
    regime: string;
    desc: string;
    bullets: string[];
}

const HeroMarketBrain: React.FC<HeroProps> = ({ regime, desc, bullets }) => {
    const getRegimeColor = (r: string) => {
        switch (r.toUpperCase()) {
            case 'RISK-ON': return 'text-[#C6A85A]'; // Gold for standard "good"
            case 'RISK-OFF': return 'text-[#EAEAEA]'; // White for defensive
            case 'VOLATILE': return 'text-[#C6A85A]';
            case 'CRISIS': return 'text-rose-500';  // Only red if actual crisis
            default: return 'text-[#9CA3AF]';
        }
    };

    return (
        <CardGlass className="w-full relative overflow-hidden group">
            {/* Subtle Background Glow for Regime */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex flex-col md:flex-row items-start justify-between gap-8 relative z-10">
                {/* Left: Regime & Description */}
                <div className="max-w-xl">
                    <h2 className={`text-6xl font-black tracking-tighter mb-2 ${getRegimeColor(regime)}`}>
                        {regime}
                    </h2>
                    <p className="text-[#9CA3AF] text-lg font-medium leading-relaxed max-w-md">
                        {desc}
                    </p>

                    {/* Visual Status Indicator */}
                    <div className="flex items-center gap-2 mt-6">
                        <div className="w-2 h-2 rounded-full bg-gold-primary animate-pulse"></div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#C6A85A]">Live Intelligence Connected</span>
                    </div>
                </div>

                {/* Right: Key Bullets (The "Digest") */}
                <div className="flex-1 w-full md:max-w-lg">
                    <div className="bg-[#11161D]/50 rounded-lg p-5 border border-white/5">
                        <h3 className="text-xs font-bold text-[#C6A85A] uppercase tracking-widest mb-4">Market Pulse</h3>
                        <ul className="space-y-3">
                            {bullets.map((bullet, idx) => (
                                <li key={idx} className="flex gap-3 text-sm text-[#EAEAEA]">
                                    <span className="text-gold-primary mt-1.5">•</span>
                                    <span className="leading-relaxed">{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </CardGlass>
    );
};

export default HeroMarketBrain;
