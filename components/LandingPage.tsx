import React, { useState } from 'react';
import Hero from './Hero';
import GlobalPresence from './GlobalPresence';
import PerformanceAnalysis from './PerformanceAnalysis';
import ElitePlans from './ElitePlans';
import RelianceBox from './RelianceBox';
import InstitutionalContact from './InstitutionalContact';
import { QuantDashboard } from './QuantDashboard';

export function LandingPage() {
    const [appState, setAppState] = useState<'idle' | 'input' | 'dashboard'>('idle');
    const [ticker, setTicker] = useState("");

    const handleConfirm = (symbol: string) => {
        setTicker(symbol);
        setAppState('dashboard');
    };

    return (
        <div className="bg-[#0b0f14] relative min-h-screen">
            <Hero 
                appState={appState} 
                setAppState={setAppState} 
                onConfirm={handleConfirm} 
            />
            <div className={`transition-opacity duration-1000 ${appState !== 'idle' ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                <GlobalPresence />
                <PerformanceAnalysis />
                <ElitePlans />
                <RelianceBox />
                <InstitutionalContact />
            </div>
            
            <QuantDashboard 
                isVisible={appState === 'dashboard'} 
                ticker={ticker} 
                onClose={() => setAppState('idle')} 
            />
        </div>
    );
}
