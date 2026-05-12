// Institutional Overview Page
// RESTRAINED LUXURY: High whitespace, focused content

import React from 'react';
import { RegimeHero } from './Institutional/RegimeHero';
import { AIBriefCard } from './Institutional/AIBriefCard';
import { OpportunityRadar } from './Institutional/OpportunityRadar';
import { useMarketOverview, useIntelligenceBrief } from '../hooks/useInstitutionalData';

export function InstitutionalOverview() {
    const { data: market, loading: marketLoading } = useMarketOverview();
    const { brief, loading: briefLoading } = useIntelligenceBrief();

    return (
        <div className="min-h-screen bg-[#0B0F14] text-[#F2F2F2] pt-32 px-12 pb-20 font-inter">

            {/* Subtle top light leak - Reduced opacity */}
            <div className="fixed top-0 left-0 w-full h-[200px] bg-gradient-to-b from-[#151922] to-transparent pointer-events-none opacity-20" />

            <div className="max-w-[1600px] mx-auto relative z-10">

                {/* Top: Regime */}
                <RegimeHero
                    regime={market?.regime?.status || "NEUTRAL"}
                    description={market?.regime?.description || "Market consolidating. Awaiting key economic data."}
                    metrics={market?.regime?.metrics}
                />

                {/* Content Grid: 60/40 Split */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mt-16">

                    {/* Intelligence Brief */}
                    <div className="lg:col-span-7">
                        <AIBriefCard
                            summary={brief?.data?.summary}
                            timestamp={brief?.data?.timestamp}
                        />
                    </div>

                    {/* Radar & Signals */}
                    <div className="lg:col-span-5 border-l border-white/5 pl-16">
                        <OpportunityRadar opportunities={market?.opportunities} />
                    </div>

                </div>

            </div>
        </div>
    );
}
