// NEUROVAULT — Institutional Terminal Shell
// Obsidian gold aesthetic · dot grid · premium status layer

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
import { Loader2, MonitorOff, Activity, ShieldCheck, Zap, Globe } from 'lucide-react';
import { marketSocket, MarketStatus } from '../services/MarketSocket';

const STATUS_CONFIG: Record<MarketStatus, { label: string; color: string; glow: string; bg: string }> = {
    NOMINAL:  { label: 'System Nominal',   color: '#10B981', glow: '0 0 10px rgba(16,185,129,0.6)',  bg: 'rgba(16,185,129,0.08)' },
    DEGRADED: { label: 'Service Degraded', color: '#F59E0B', glow: '0 0 10px rgba(245,158,11,0.6)', bg: 'rgba(245,158,11,0.08)' },
    CRITICAL: { label: 'Critical Alert',   color: '#EF4444', glow: '0 0 10px rgba(239,68,68,0.6)',   bg: 'rgba(239,68,68,0.08)'  },
    OFFLINE:  { label: 'Offline',          color: '#4B5563', glow: 'none',                            bg: 'rgba(75,85,99,0.08)'   },
};

export const InstitutionalTerminal: React.FC = () => {
    const { module } = useParams<{ module: string }>();
    const { setModule, isEngineOffline } = useTradingStore();
    const [status, setStatus] = useState<MarketStatus>('NOMINAL');
    const [retryCount, setRetryCount] = useState(0);
    const [timeStr, setTimeStr] = useState('');

    useEffect(() => {
        if (module) setModule(module);
    }, [module, setModule]);

    useEffect(() => {
        const unsub = marketSocket.onStatusChange(s => setStatus(s));
        return () => { unsub(); };
    }, []);

    useEffect(() => {
        const tick = () => setTimeStr(
            new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' EST'
        );
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.NOMINAL;

    const handleRetry = () => { setRetryCount(p => p + 1); window.location.reload(); };

    const renderModule = () => {
        if (isEngineOffline && status === 'OFFLINE') {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    gap: '24px',
                    fontFamily: "'Outfit', sans-serif",
                }}>
                    <div style={{ position: 'relative' }}>
                        <MonitorOff size={72} style={{ color: 'rgba(239,68,68,0.15)' }} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Activity size={36} style={{ color: '#EF4444', filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.7))' }} />
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em', marginBottom: '8px' }}>
                            System Critical
                        </h2>
                        <p style={{ fontSize: '12px', color: '#4B5563', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.8, maxWidth: '400px' }}>
                            Data fusion layer disconnected. Entering{' '}
                            <span style={{ color: '#F59E0B' }}>Historical Intelligence Mode</span>.
                            {' '}Live feeds paused. Re-routing through L4 persistent cache.
                        </p>
                    </div>
                    <button
                        onClick={handleRetry}
                        style={{
                            padding: '10px 28px',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            color: '#EF4444',
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            letterSpacing: '0.05em',
                        }}
                    >
                        Relink Feed {retryCount > 0 && `(${retryCount}/3)`}
                    </button>
                </div>
            );
        }

        const wrap = (name: string, node: React.ReactNode) => (
            <TabErrorBoundary tabName={name}>{node}</TabErrorBoundary>
        );

        switch (module || 'intel') {
            case 'intel':       return wrap('Market Dashboard',  <MarketDashboard />);
            case 'news-intel':  return wrap('Deep Intel',        <MarketIntelTerminal />);
            case 'forecasting': return wrap('Forecasting',       <QuantPulseTerminal />);
            case 'signals':     return wrap('Signal Engine',     <SignalEngine />);
            case 'options':     return wrap('Options Intel',     <OptionsIntel />);
            case 'portfolio':   return wrap('Portfolio Tracker', <PortfolioTracker />);
            case 'lab':         return wrap('Simulation Lab',    <SimulationLab />);
            case 'edge':        return wrap('Edge Scanner',      <EdgeScanner />);
            default:            return <Navigate to="/terminal/intel" />;
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#080C14',
            color: '#E2E8F0',
            paddingTop: '58px', /* nav: 2px stripe + 56px main */
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Outfit', sans-serif",
            position: 'relative',
        }}>
            {/* Atmospheric radial gradient — gold corona at top */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '900px',
                height: '300px',
                background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 1,
            }} />

            {/* Dot grid background */}
            <div style={{
                position: 'fixed',
                inset: 0,
                backgroundImage: 'radial-gradient(circle, rgba(212,175,55,0.05) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
                pointerEvents: 'none',
                zIndex: 0,
            }} />

            {/* System status bar */}
            <div style={{
                height: '32px',
                background: 'rgba(8,12,20,0.95)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                position: 'relative',
                zIndex: 10,
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Status pill */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '3px 10px 3px 8px',
                        background: sc.bg,
                        border: `1px solid ${sc.color}28`,
                        borderRadius: '20px',
                    }}>
                        <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: sc.color,
                            boxShadow: sc.glow,
                            animation: status !== 'OFFLINE' ? 'nvPulse 2.5s ease-in-out infinite' : 'none',
                        }} />
                        <span style={{
                            fontSize: '9px',
                            fontWeight: 600,
                            color: sc.color,
                            letterSpacing: '0.12em',
                            fontFamily: "'JetBrains Mono', monospace",
                            textTransform: 'uppercase',
                        }}>
                            {sc.label}
                        </span>
                    </div>

                    {/* Meta items */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {[
                            { icon: '↯', label: 'Lat: 12ms' },
                            { icon: '⬡', label: 'Alpaca · Finnhub · FRED', color: 'rgba(16,185,129,0.7)' },
                            { icon: '◈', label: 'Terminal v5.0A', color: 'rgba(59,130,246,0.6)' },
                        ].map(({ icon, label, color }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontSize: '9px', color: color || 'rgba(75,85,99,0.8)', fontFamily: "'JetBrains Mono', monospace" }}>
                                    {icon}
                                </span>
                                <span style={{
                                    fontSize: '9px',
                                    color: color || 'rgba(75,85,99,0.7)',
                                    letterSpacing: '0.06em',
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}>
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: feed + clock */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 10px',
                        background: 'rgba(16,185,129,0.07)',
                        border: '1px solid rgba(16,185,129,0.2)',
                        borderRadius: '20px',
                    }}>
                        <div style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            background: '#10B981',
                            animation: 'nvPingGold 1.5s ease-in-out infinite',
                        }} />
                        <span style={{
                            fontSize: '9px',
                            color: '#10B981',
                            fontWeight: 600,
                            letterSpacing: '0.1em',
                            fontFamily: "'JetBrains Mono', monospace",
                        }}>
                            FEED SECURED
                        </span>
                    </div>

                    {status !== 'NOMINAL' && (
                        <div style={{
                            padding: '3px 10px',
                            background: 'rgba(245,158,11,0.08)',
                            border: '1px solid rgba(245,158,11,0.25)',
                            borderRadius: '20px',
                            fontSize: '9px',
                            color: '#F59E0B',
                            fontWeight: 600,
                            letterSpacing: '0.1em',
                            fontFamily: "'JetBrains Mono', monospace",
                            animation: 'nvPulse 1.2s ease-in-out infinite',
                        }}>
                            INTEL MODE
                        </div>
                    )}

                    <span style={{
                        fontSize: '10px',
                        color: 'rgba(75,85,99,0.7)',
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.05em',
                        borderLeft: '1px solid rgba(255,255,255,0.05)',
                        paddingLeft: '14px',
                    }}>
                        {timeStr}
                    </span>
                </div>
            </div>

            {/* Degraded warning stripe */}
            {status === 'DEGRADED' && (
                <div style={{
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #F59E0B, transparent)',
                    animation: 'nvPulse 1.5s ease-in-out infinite',
                    flexShrink: 0,
                }} />
            )}

            {/* Main content */}
            <main style={{
                flex: 1,
                overflowY: 'auto',
                position: 'relative',
                zIndex: 5,
            }}>
                <MarketPulseDashboard />
                {renderModule()}
            </main>

            {/* Bottom command bar */}
            <div style={{
                height: '34px',
                background: 'rgba(8,12,20,0.95)',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                gap: '12px',
                flexShrink: 0,
                position: 'relative',
                zIndex: 10,
            }}>
                {/* Prompt */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        color: '#D4AF37',
                        fontWeight: 700,
                        fontSize: '14px',
                        fontFamily: "'JetBrains Mono', monospace",
                        filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.7))',
                    }}>›</span>
                    <span style={{
                        fontSize: '9px',
                        color: 'rgba(75,85,99,0.8)',
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                    }}>
                        CONN: {sc.label}
                    </span>
                </div>

                <div style={{ flex: 1 }} />

                {/* Signal bars decoration */}
                <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '14px' }}>
                    {[3, 5, 8, 11, 14, 11, 8, 5, 3].map((h, i) => (
                        <div key={i} style={{
                            width: '3px',
                            height: `${h}px`,
                            borderRadius: '1px',
                            background: i === 4
                                ? 'linear-gradient(180deg, #FFD966, #D4AF37)'
                                : `rgba(212,175,55,${0.08 + i * 0.03})`,
                            boxShadow: i === 4 ? '0 0 6px rgba(212,175,55,0.6)' : 'none',
                        }} />
                    ))}
                </div>

                <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.05)' }} />

                {/* Shortcuts */}
                {['HELP', 'ALT+1–8', 'SHORTCUTS'].map((s, i) => (
                    <span
                        key={s}
                        style={{
                            fontSize: '9px',
                            color: 'rgba(75,85,99,0.5)',
                            fontFamily: "'JetBrains Mono', monospace",
                            letterSpacing: '0.08em',
                            cursor: 'help',
                            padding: i === 1 ? '0 10px' : '0',
                            borderLeft:  i === 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                            borderRight: i === 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        }}
                    >
                        {s}
                    </span>
                ))}
            </div>

            <style>{`
                @keyframes nvPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
                @keyframes nvPingGold {
                    0%   { transform:scale(1); opacity:1; }
                    70%  { transform:scale(2); opacity:0; }
                    100% { transform:scale(1); opacity:0; }
                }
            `}</style>
        </div>
    );
};
