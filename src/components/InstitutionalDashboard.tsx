import React, { useState, useEffect } from 'react';
import { HeroMarketBrain } from './HeroMarketBrain';
import { CommandPalette } from './CommandPalette';
import { OpportunityRadar } from './OpportunityRadar';
import { DecisionMode } from './DecisionMode';
import { fetcherService } from '../lib/fetcher';
import { MarketDigest, TickerSnapshot } from '../lib/types';

// Mock Data (To be replaced by API)
const MOCK_DIGEST: MarketDigest = {
    market_mood: "Risk-On",
    top_bullets: [
        "Nasdaq leads gains; semiconductor sector showing strong momentum.",
        "Oil prices stabilize above $75; inflation concerns easing temporarily.",
        "Emerging markets FX showing resilience despite dollar strength."
    ],
    probabilities: {
        short_week: 0.65,
        medium_month: 0.45,
        long_quarter: 0.30
    },
    top_shock_candidates: [
        { ticker: "TRY", reason: "Sudden FX reserve drop interacting with high inflation print.", severity: 0.82 }
    ],
    recommendations: [
        { action: "HEDGE", text: "Consider USD-hedged EM ETFs for Turkish exposure.", confidence: 0.78 },
        { action: "LONG", text: "Momentum signal triggered for AI semiconductor basket.", confidence: 0.85 },
        { action: "HOLD", text: "Maintain current duration on innovation bonds.", confidence: 0.60 }
    ]
};

export const InstitutionalDashboard: React.FC = () => {
    const [tickerData, setTickerData] = useState<TickerSnapshot[]>([]);
    const [decisionMode, setDecisionMode] = useState(false);

    useEffect(() => {
        // Start Fetcher
        fetcherService.start();

        // Listen for updates
        const handleUpdate = (e: any) => {
            const { data, timestamp } = e.detail;
            setTickerData(data);
            setLastUpdated(timestamp);
        };
        window.addEventListener('market-update', handleUpdate);

        return () => {
            fetcherService.stop();
            window.removeEventListener('market-update', handleUpdate);
        };
    }, []);

    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    // Keyboard shortcut for Decision Mode (D)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'd' && !e.metaKey && !e.ctrlKey && !e.target.matches('input')) {
                setDecisionMode(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="min-h-screen bg-background text-text-primary font-sans p-6 selection:bg-primary/20">
            <CommandPalette />
            <DecisionMode isActive={decisionMode} digest={MOCK_DIGEST} onExit={() => setDecisionMode(false)} />

            {/* Top Bar */}
            <header className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-bronze opacity-80" />
                    <span className="font-heading font-bold text-xl tracking-wide">AMB <span className="text-primary text-sm font-normal opacity-70"> / INSTITUTIONAL</span></span>
                </div>
                <div className="flex items-center gap-6 text-sm font-mono">
                    <button onClick={() => setDecisionMode(true)} className="flex items-center gap-2 px-3 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        FOCUS MODE [D]
                    </button>
                    <span className="text-text-secondary">System: <span className="text-green-500">ONLINE</span></span>
                    {lastUpdated && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded border border-white/10 text-[10px] text-slate-500">
                             <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                             LAST FETCH: {new Date(lastUpdated).toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </header>

            {/* AI Commentary Bar */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="glass rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-4 animate-in slide-in-from-top duration-700">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-black animate-pulse">AI</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">Institutional Analyst Commentary</p>
                        <p className="text-sm font-medium text-slate-200 italic leading-relaxed">
                            "Equities maintaining high-conviction support levels at current valuations; Alpaca real-time feed indicates narrowing spreads in tech-heavy sectors as institutional accumulation continues."
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <main className="max-w-7xl mx-auto space-y-6">

                {/* Hero Section */}
                <HeroMarketBrain digest={MOCK_DIGEST} />

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[500px]">

                    {/* Left: Opportunity Radar (Live Data) */}
                    <div className="col-span-12 md:col-span-8 glass rounded-2xl border border-white/5 p-6 relative overflow-hidden">
                        <OpportunityRadar data={tickerData} />
                    </div>

                    {/* Right: Portfolio / Risk Summary (Placeholder for Week 2) */}
                    <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
                        <div className="flex-1 glass rounded-2xl border border-white/5 p-6 flex flex-col justify-center items-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-bronze/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="text-label text-text-secondary mb-2">PORTFOLIO EXPOSURE</span>
                            <div className="text-5xl text-white font-bold tracking-tighter">42<span className="text-2xl text-primary">%</span></div>
                            <div className="text-sm text-primary mt-2">TECHNOLOGY</div>
                        </div>

                        <div className="flex-1 glass rounded-2xl border border-white/5 p-6 flex flex-col justify-center items-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="text-label text-text-secondary mb-2">RISK ANOMALY</span>
                            <div className="text-4xl text-white font-bold">NVDA</div>
                            <div className="text-xs text-red-400 mt-2">EARNINGS VOLATILITY</div>
                        </div>
                    </div>

                </div>

            </main>
        </div>
    );
};
