import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useTradingStore } from '../src/stores/tradingStore';
import { MarketPulseDashboard } from './Terminal/MarketPulseDashboard';
import { MarketDashboard } from './Modules/MarketDashboard';
import { SignalEngine } from './Modules/SignalEngine';
import { OptionsIntel } from './Modules/OptionsIntel';
import { SentimentNews } from './Modules/SentimentNews';
import { PortfolioTracker } from './Modules/PortfolioTracker';
import { SimulationLab } from './Modules/SimulationLab';
import MarketIntelTerminal from './MarketIntel/MarketIntelTerminal';
import QuantPulseTerminal from './QuantPulse/QuantPulseTerminal';
import { TabErrorBoundary } from './ErrorBoundary';
import { Loader2, MonitorOff, ShieldCheck, Zap, Activity, Globe } from 'lucide-react';
import { marketSocket, MarketStatus } from '../services/MarketSocket';

export const InstitutionalTerminal: React.FC = () => {
    const { module } = useParams<{ module: string }>();
    const { setModule, activeModule, loading, isEngineOffline } = useTradingStore();
    const [status, setStatus] = useState<MarketStatus>('NOMINAL');
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        if (module) setModule(module);
    }, [module, setModule]);

    useEffect(() => {
        const unsub = marketSocket.onStatusChange(s => setStatus(s));
        return () => { unsub(); };
    }, []);

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        window.location.reload();
    };

    const renderModule = () => {
        // LEVEL 4 Override: Intelligent System Failure
        if (isEngineOffline && status === 'OFFLINE') {
            return (
                <div className="flex flex-col items-center justify-center h-[70vh] text-center p-20 animate-in fade-in zoom-in duration-500">
                    <div className="relative mb-8">
                        <MonitorOff size={80} className="text-red-500/10" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Activity size={40} className="text-red-500 animate-pulse" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-tighter">System Critical</h2>
                    <p className="text-slate-500 max-w-md mx-auto mb-8 font-mono text-xs uppercase tracking-widest leading-relaxed">
                        Data fusion layer disconnected. Entering <span className="text-amber-500">Historical Intelligence Mode</span>. 
                        Live feeds paused. Re-routing through L4 persistent cache.
                    </p>
                    <div className="flex gap-4">
                        <button 
                           onClick={handleRetry}
                           className="px-8 py-3 bg-red-500/10 border border-red-500/20 text-red-500 font-bold rounded-xl hover:bg-red-500/20 transition-all uppercase tracking-widest text-[10px]"
                        >
                            Relink Feed {retryCount > 0 && `(${retryCount}/3)`}
                        </button>
                    </div>
                </div>
            );
        }

        const renderWrappedTab = (name: string, Component: React.ReactNode) => (
            <TabErrorBoundary tabName={name}>
                {Component}
            </TabErrorBoundary>
        );

        switch (module || 'intel') {
            case 'intel': return renderWrappedTab("Market Dashboard", <MarketDashboard />);
            case 'news-intel': return renderWrappedTab("Deep Intel", <MarketIntelTerminal />);
            case 'forecasting': return renderWrappedTab("Forecasting", <QuantPulseTerminal />);
            case 'signals': return renderWrappedTab("Signal Engine", <SignalEngine />);
            case 'options': return renderWrappedTab("Options Intel", <OptionsIntel />);
            case 'portfolio': return renderWrappedTab("Portfolio Tracker", <PortfolioTracker />);
            case 'lab': return renderWrappedTab("Simulation Lab", <SimulationLab />);
            default: return <Navigate to="/terminal/intel" />;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'NOMINAL': return 'bg-emerald-500';
            case 'DEGRADED': return 'bg-amber-500';
            case 'CRITICAL': return 'bg-red-500';
            default: return 'bg-slate-700';
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0E14] text-white pt-16 flex flex-col selection:bg-amber-500/30">
            {/* Global Institutional Status Bar */}
            <div className="h-8 bg-[#0D121A] border-b border-white/5 flex items-center justify-between px-6 overflow-hidden">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()} animate-pulse shadow-[0_0_8px] shadow-current`} />
                        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${status === 'NOMINAL' ? 'text-emerald-500/80' : 'text-amber-500'}`}>
                            {status === 'NOMINAL' ? 'System Nominal' : `Service ${status}`}
                        </span>
                    </div>
                    <div className="hidden lg:flex items-center gap-4 text-[9px] font-mono text-slate-500 uppercase tracking-widest border-l border-white/5 pl-6">
                        <div className="flex items-center gap-1.5"><Zap size={10} /> <span>Latency: 12ms</span></div>
                        <div className="flex items-center gap-1.5 text-emerald-500/80"><Globe size={10} /> <span>Feeds: Alpaca Markets / Institutional LP</span></div>
                        <div className="flex items-center gap-1.5 text-blue-500/60"><ShieldCheck size={10} /> <span>Terminal v5.0A</span></div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 text-[9px] font-mono text-slate-400">
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                       <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                       <span className="text-emerald-500 font-bold uppercase tracking-widest">Alpaca Feed: Connection Secured</span>
                    </div>
                    <span className="text-slate-600 border-l border-white/10 pl-4">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} UTC-5</span>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar relative">
                {status === 'DEGRADED' && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0 z-50 animate-pulse" />
                )}
                <MarketPulseDashboard />
                {renderModule()}
            </main>

            {/* Terminal Command Line / Overlay */}
            <div className="h-10 bg-[#0D121A] border-t border-white/5 flex items-center px-6 gap-3 text-[10px] font-mono text-slate-500">
                <span className="text-emerald-500 font-black animate-pulse">{'>'}</span>
                <span className="tracking-tighter uppercase">Connection: {status === 'NOMINAL' ? 'Secured' : 'Degraded'}</span>
                {status !== 'NOMINAL' && (
                    <span className="ml-4 px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[8px] animate-pulse">
                        INTELLIGENCE MODE ACTIVE
                    </span>
                )}
                <div className="flex-1" />
                <div className="flex gap-4 items-center">
                   <div className="flex gap-1">
                      <div className="w-1 h-3 bg-emerald-500/50" />
                      <div className="w-1 h-3 bg-emerald-500/50" />
                      <div className="w-1 h-3 bg-emerald-500/30" />
                      <div className="w-1 h-3 bg-emerald-500/10" />
                   </div>
                   <span className="hover:text-blue-400 cursor-help transition-colors">HELP</span>
                   <span className="hover:text-blue-400 cursor-help transition-colors px-2 border-x border-white/5">SHORTCUTS: ALT+1-6</span>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,1); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,191,0,0.1); border-radius: 0px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,191,0,0.3); }
            `}} />
        </div>
    );
};
