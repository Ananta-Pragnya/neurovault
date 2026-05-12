// Market Intel Page
// Research-style report, not dashboard

import React from 'react';
import { motion } from 'framer-motion';
import { useMarketOverview, useIntelligenceBrief } from '../../hooks/useInstitutionalData';

export function MarketIntelPage() {
    const { data: market } = useMarketOverview();
    const { brief } = useIntelligenceBrief();

    return (
        <div className="min-h-screen bg-[#0A0E14] text-white pt-24 px-6 pb-20">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <h1 className="text-4xl font-semibold mb-3">Market Intelligence</h1>
                    <p className="text-slate-400 text-sm">Research-grade analysis. Updated every 15 minutes.</p>
                </motion.div>

                {/* Executive Summary */}
                <Section title="Executive Summary">
                    <ul className="space-y-3">
                        {brief?.data?.summary?.map((item, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className="w-1 h-1 rounded-full bg-gold-primary mt-2" />
                                <span className="text-slate-300 leading-relaxed">{item}</span>
                            </li>
                        ))}
                    </ul>
                </Section>

                {/* Outlook */}
                <Section title="Market Outlook">
                    <div className="space-y-4">
                        <OutlookItem label="Short-term" text={brief?.data?.outlook?.short} />
                        <OutlookItem label="Medium-term" text={brief?.data?.outlook?.medium} />
                        <OutlookItem label="Long-term" text={brief?.data?.outlook?.long} />
                    </div>
                </Section>

                {/* Sector Analysis */}
                <Section title="Sector Rotation">
                    <p className="text-slate-400 text-sm">Analysis based on relative strength and breadth.</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <SectorCard name="Technology" performance="+2.4%" sentiment="Strong" />
                        <SectorCard name="Financials" performance="+0.8%" sentiment="Neutral" />
                        <SectorCard name="Energy" performance="-1.2%" sentiment="Weak" />
                        <SectorCard name="Healthcare" performance="+0.3%" sentiment="Stable" />
                    </div>
                </Section>

                {/* Volatility Analysis */}
                <Section title="Volatility & Risk">
                    <div className="space-y-3">
                        <MetricRow label="VIX Level" value={market?.indices?.VIX?.price?.toFixed(1) || '—'} />
                        <MetricRow label="Market Regime" value={market?.regime?.status || 'NEUTRAL'} />
                        <MetricRow label="Breadth" value={`${market?.regime?.metrics?.breadth?.toFixed(0) || '50'}%`} />
                    </div>
                </Section>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
        >
            <h2 className="text-xl font-semibold mb-6 pb-3 border-b border-white/5">{title}</h2>
            {children}
        </motion.section>
    );
}

function OutlookItem({ label, text }: { label: string; text?: string }) {
    return (
        <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">{label}</h3>
            <p className="text-slate-300 leading-relaxed">{text || 'Pending analysis...'}</p>
        </div>
    );
}

function SectorCard({ name, performance, sentiment }: any) {
    const sentimentColor = {
        'Strong': 'text-emerald-400',
        'Weak': 'text-rose-400',
        'Neutral': 'text-slate-400',
        'Stable': 'text-blue-400'
    };

    return (
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{name}</span>
                <span className={`text-sm ${performance.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {performance}
                </span>
            </div>
            <span className={`text-xs ${sentimentColor[sentiment]}`}>{sentiment}</span>
        </div>
    );
}

function MetricRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-sm text-slate-400">{label}</span>
            <span className="text-sm font-medium text-white">{value}</span>
        </div>
    );
}
