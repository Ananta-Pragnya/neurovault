// NEUROVAULT — Meridian Terminal Shell
// Precision intelligence interface with CRT scanline texture

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
import { EdgeScanner } from './Modules/EdgeScanner';
import { TabErrorBoundary } from './ErrorBoundary';
import { marketSocket, MarketStatus } from '../services/MarketSocket';

const MONO = "'IBM Plex Mono', monospace";

function StatusDot({ status }: { status: MarketStatus }) {
    const colors: Record<MarketStatus, string> = {
        NOMINAL:  '#00CC88',
        DEGRADED: '#FF8C00',
        CRITICAL: '#FF3055',
        OFFLINE:  '#505060',
    };
    const color = colors[status] ?? '#505060';
    return (
        <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
            flexShrink: 0,
            animation: status !== 'OFFLINE' ? 'nvPulse 2s ease-in-out infinite' : 'none',
        }} />
    );
}

export const InstitutionalTerminal: React.FC = () => {
    const { module } = useParams<{ module: string }>();
    const { setModule, activeModule, loading, isEngineOffline } = useTradingStore();
    const [status, setStatus] = useState<MarketStatus>('NOMINAL');
    const [retryCount, setRetryCount] = useState(0);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (module) setModule(module);
    }, [module, setModule]);

    useEffect(() => {
        const unsub = marketSocket.onStatusChange(s => setStatus(s));
        return () => { unsub(); };
    }, []);

    // Clock tick for bottom bar
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        window.location.reload();
    };

    const getStatusLabel = () => {
        switch (status) {
            case 'NOMINAL':  return { text: 'SYSTEM NOMINAL',   color: '#00CC88' };
            case 'DEGRADED': return { text: 'SERVICE DEGRADED', color: '#FF8C00' };
            case 'CRITICAL': return { text: 'CRITICAL ALERT',   color: '#FF3055' };
            case 'OFFLINE':  return { text: 'OFFLINE',          color: '#505060' };
            default:         return { text: 'UNKNOWN',          color: '#505060' };
        }
    };

    const renderModule = () => {
        if (isEngineOffline && status === 'OFFLINE') {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    padding: '4rem',
                    textAlign: 'center',
                    fontFamily: MONO,
                }}>
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            border: '1px solid #FF3055',
                            margin: '0 auto 16px',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: '24px', color: '#FF3055' }}>⊗</span>
                            <div style={{
                                position: 'absolute',
                                inset: '-4px',
                                border: '1px solid rgba(255,48,85,0.2)',
                            }} />
                        </div>
                        <div style={{ fontSize: '10px', color: '#FF3055', letterSpacing: '0.3em', marginBottom: '8px' }}>
                            SYSTEM CRITICAL
                        </div>
                        <div style={{ fontSize: '9px', color: '#505060', letterSpacing: '0.1em', maxWidth: '360px', lineHeight: '1.8' }}>
                            DATA FUSION LAYER DISCONNECTED.<br />
                            ENTERING{' '}
                            <span style={{ color: '#FF8C00' }}>HISTORICAL INTELLIGENCE MODE</span>.<br />
                            LIVE FEEDS PAUSED — ROUTING THROUGH L4 CACHE.
                        </div>
                    </div>
                    <button
                        onClick={handleRetry}
                        style={{
                            padding: '10px 24px',
                            background: 'rgba(255,48,85,0.08)',
                            border: '1px solid rgba(255,48,85,0.3)',
                            color: '#FF3055',
                            fontFamily: MONO,
                            fontSize: '9px',
                            letterSpacing: '0.2em',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            transition: 'all 0.15s',
                        }}
                    >
                        RELINK FEED {retryCount > 0 && `(${retryCount}/3)`}
                    </button>
                </div>
            );
        }

        const wrap = (name: string, node: React.ReactNode) => (
            <TabErrorBoundary tabName={name}>{node}</TabErrorBoundary>
        );

        switch (module || 'intel') {
            case 'intel':       return wrap('Market Dashboard',   <MarketDashboard />);
            case 'news-intel':  return wrap('Deep Intel',         <MarketIntelTerminal />);
            case 'forecasting': return wrap('Forecasting',        <QuantPulseTerminal />);
            case 'signals':     return wrap('Signal Engine',      <SignalEngine />);
            case 'options':     return wrap('Options Intel',      <OptionsIntel />);
            case 'portfolio':   return wrap('Portfolio Tracker',  <PortfolioTracker />);
            case 'lab':         return wrap('Simulation Lab',     <SimulationLab />);
            case 'edge':        return wrap('Edge Scanner',       <EdgeScanner />);
            default:            return <Navigate to="/terminal/intel" />;
        }
    };

    const statusLabel = getStatusLabel();
    const timeStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });

    return (
        <>
            {/* CRT scanline overlay */}
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.055) 3px, rgba(0,0,0,0.055) 4px)',
                pointerEvents: 'none',
                zIndex: 9998,
            }} />

            <div style={{
                minHeight: '100vh',
                background: '#020204',
                color: '#C8C8D8',
                paddingTop: '64px', /* nav height: 22px strip + 42px main */
                display: 'flex',
                flexDirection: 'column',
                fontFamily: MONO,
                position: 'relative',
            }}>
                {/* System status bar */}
                <div style={{
                    height: '28px',
                    background: '#0C0C10',
                    borderBottom: '1px solid #1C1C26',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {/* Primary status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <StatusDot status={status} />
                            <span style={{
                                fontSize: '8px',
                                fontWeight: 600,
                                color: statusLabel.color,
                                letterSpacing: '0.2em',
                            }}>
                                {statusLabel.text}
                            </span>
                        </div>

                        <div style={{ width: '1px', height: '12px', background: '#1C1C26' }} />

                        {/* Meta info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ fontSize: '8px', color: '#505060', letterSpacing: '0.12em' }}>
                                ↯ LAT: 12ms
                            </span>
                            <span style={{ fontSize: '8px', color: '#505060', letterSpacing: '0.12em' }}>
                                ⬡ FEEDS: ALPACA MARKETS · FINNHUB · FRED
                            </span>
                            <span style={{ fontSize: '8px', color: '#505060', letterSpacing: '0.12em' }}>
                                ◈ TERMINAL v5.0A
                            </span>
                        </div>
                    </div>

                    {/* Feed status pill */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 10px',
                            border: '1px solid rgba(0, 204, 136, 0.2)',
                            background: 'rgba(0, 204, 136, 0.06)',
                        }}>
                            <div style={{
                                width: '4px',
                                height: '4px',
                                borderRadius: '50%',
                                background: '#00CC88',
                                animation: 'nvPing 1.5s ease-in-out infinite',
                            }} />
                            <span style={{ fontSize: '8px', color: '#00CC88', letterSpacing: '0.15em', fontWeight: 600 }}>
                                ALPACA · SECURED
                            </span>
                        </div>

                        {status !== 'NOMINAL' && (
                            <div style={{
                                padding: '3px 10px',
                                border: '1px solid rgba(255, 140, 0, 0.3)',
                                background: 'rgba(255, 140, 0, 0.08)',
                                fontSize: '8px',
                                color: '#FF8C00',
                                letterSpacing: '0.15em',
                                fontWeight: 600,
                                animation: 'nvPulse 1s ease-in-out infinite',
                            }}>
                                INTEL MODE ACTIVE
                            </div>
                        )}
                    </div>
                </div>

                {/* Degraded ribbon */}
                {status === 'DEGRADED' && (
                    <div style={{
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent, #FF8C00, transparent)',
                        animation: 'nvPulse 2s ease-in-out infinite',
                    }} />
                )}

                {/* Main scrollable content */}
                <main style={{
                    flex: 1,
                    overflowY: 'auto',
                    position: 'relative',
                }}>
                    <MarketPulseDashboard />
                    {renderModule()}
                </main>

                {/* Bottom command bar */}
                <div style={{
                    height: '32px',
                    background: '#0C0C10',
                    borderTop: '1px solid #1C1C26',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    gap: '10px',
                    flexShrink: 0,
                }}>
                    {/* Prompt */}
                    <span style={{ color: '#00E8C8', fontWeight: 700, fontSize: '11px', lineHeight: 1 }}>›</span>
                    <span style={{ fontSize: '8px', color: '#505060', letterSpacing: '0.15em' }}>
                        {`CONN: ${statusLabel.text}`}
                    </span>

                    {status !== 'NOMINAL' && (
                        <div style={{
                            padding: '2px 8px',
                            background: 'rgba(255,140,0,0.08)',
                            border: '1px solid rgba(255,140,0,0.2)',
                            fontSize: '7px',
                            color: '#FF8C00',
                            letterSpacing: '0.15em',
                            animation: 'nvPulse 1.5s ease-in-out infinite',
                        }}>
                            DEGRADED
                        </div>
                    )}

                    <div style={{ flex: 1 }} />

                    {/* Waveform decoration */}
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                        {[4, 8, 12, 10, 6, 10, 14, 8, 4].map((h, i) => (
                            <div key={i} style={{
                                width: '2px',
                                height: `${h}px`,
                                background: i === 4 ? '#00E8C8' : `rgba(0, 232, 200, ${0.08 + i * 0.04})`,
                                borderRadius: '1px',
                            }} />
                        ))}
                    </div>

                    <div style={{ width: '1px', height: '12px', background: '#1C1C26' }} />

                    {/* Keyboard shortcuts */}
                    <span style={{ fontSize: '7px', color: '#303040', letterSpacing: '0.12em' }}>
                        ALT+1-8 · SHORTCUTS
                    </span>
                    <span style={{ fontSize: '7px', color: '#303040', letterSpacing: '0.12em' }}>
                        /HELP
                    </span>

                    <div style={{ width: '1px', height: '12px', background: '#1C1C26' }} />

                    {/* Clock */}
                    <span style={{ fontSize: '8px', color: '#505060', letterSpacing: '0.1em', minWidth: '80px', textAlign: 'right' }}>
                        {timeStr}
                    </span>
                </div>
            </div>

            <style>{`
                @keyframes nvPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes nvPing {
                    0% { transform: scale(1); opacity: 1; }
                    70% { transform: scale(1.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 0; }
                }
            `}</style>
        </>
    );
};
