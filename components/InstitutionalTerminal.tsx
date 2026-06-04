// NEUROVAULT — Institutional Terminal Shell
// 3-zone status bar · obsidian surface · Inter / JetBrains Mono

import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useTradingStore } from '../src/stores/tradingStore';
import { MarketPulseDashboard } from './Terminal/MarketPulseDashboard';
import { MarketDashboard } from './Modules/MarketDashboard';
import { SignalEngine } from './Modules/SignalEngine';
import { OptionsIntel } from './Modules/OptionsIntel';
import { PortfolioTracker } from './Modules/PortfolioTracker';
import { SimulationLab } from './Modules/SimulationLab';
import MarketIntelTerminal from './MarketIntel/MarketIntelTerminal';
import QuantPulseTerminal from './QuantPulse/QuantPulseTerminal';
import { EdgeScanner } from './Modules/EdgeScanner';
import { SectorHeatmap } from './Modules/SectorHeatmap';
import { BacktestLab } from './Modules/BacktestLab';
import { AlertPanel } from './Alerts/AlertPanel';
import { TabErrorBoundary } from './ErrorBoundary';
import { MonitorOff, Activity, RefreshCw } from 'lucide-react';
import { marketSocket, MarketStatus } from '../services/MarketSocket';
import { NV_SIDEBAR_FULL, NV_SIDEBAR_RAIL } from './Institutional/InstitutionalNav';

const C = {
    bg:       '#0A0A0B',
    surface:  '#111113',
    border:   '#1E1E21',
    gold:     '#C9962A',
    platinum: '#9EA8B3',
    sage:     '#4CAF82',
    coral:    '#C94F4F',
    ice:      '#5B9BD5',
    amber:    '#D4892A',
    muted:    '#4A5260',
};

const STATUS_MAP: Record<MarketStatus, { label: string; color: string }> = {
    NOMINAL:  { label: 'SYSTEM NOMINAL',   color: C.sage   },
    DEGRADED: { label: 'SERVICE DEGRADED', color: C.amber  },
    CRITICAL: { label: 'CRITICAL ALERT',   color: C.coral  },
    OFFLINE:  { label: 'OFFLINE',          color: C.muted  },
};

export const InstitutionalTerminal: React.FC = () => {
    const { module } = useParams<{ module: string }>();
    const { setModule, isEngineOffline } = useTradingStore();
    const [status, setStatus]   = useState<MarketStatus>('NOMINAL');
    const [retryCount, setRetryCount] = useState(0);
    const [timeStr, setTimeStr] = useState('');
    const [sidebarW, setSidebarW] = useState(NV_SIDEBAR_FULL);

    useEffect(() => { if (module) setModule(module); }, [module, setModule]);
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

    useEffect(() => {
        const check = () => setSidebarW(window.innerWidth < 1024 ? NV_SIDEBAR_RAIL : NV_SIDEBAR_FULL);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const sc = STATUS_MAP[status] ?? STATUS_MAP.NOMINAL;

    const handleRetry = () => { setRetryCount(p => p + 1); window.location.reload(); };

    const renderModule = () => {
        if (isEngineOffline && status === 'OFFLINE') {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '60vh', gap: '20px',
                    fontFamily: "'Inter', sans-serif",
                }}>
                    <div style={{ position: 'relative' }}>
                        <MonitorOff size={64} color="rgba(201,79,79,0.15)" />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Activity size={32} color={C.coral} style={{ filter: `drop-shadow(0 0 8px ${C.coral}80)` }} />
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#E2E8F0', marginBottom: '8px' }}>
                            System Critical
                        </p>
                        <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.7 }}>
                            Data fusion layer disconnected. Entering{' '}
                            <span style={{ color: C.amber }}>Historical Intelligence Mode</span>.
                            {' '}Live feeds paused — routing through L4 cache.
                        </p>
                    </div>
                    <button
                        onClick={handleRetry}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 20px',
                            border: `1px solid rgba(201,79,79,0.35)`,
                            background: 'rgba(201,79,79,0.08)',
                            color: C.coral, fontSize: '13px', fontWeight: 500,
                            borderRadius: '7px', cursor: 'pointer',
                            transition: 'all 0.15s ease-out',
                        }}
                    >
                        <RefreshCw size={14} /> Relink Feed {retryCount > 0 && `(${retryCount}/3)`}
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
            case 'sectors':     return wrap('Sector Heatmap',   <SectorHeatmap />);
            case 'backtest':    return wrap('Backtest Lab',      <BacktestLab />);
            case 'alerts':      return wrap('Price Alerts',      <AlertPanel />);
            default:            return <Navigate to="/terminal/intel" />;
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: C.bg,
            color: '#E2E8F0',
            paddingLeft: `${sidebarW}px`,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Inter', system-ui, sans-serif",
            transition: 'padding-left 0.18s ease-out',
        }}>
            {/* ── 3-Zone Status Bar ── */}
            <div style={{
                height: '30px',
                background: C.surface,
                borderBottom: `1px solid ${C.border}`,
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                padding: '0 20px',
                flexShrink: 0,
            }}>
                {/* Zone 1 — System status (sage green, small caps mono) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: sc.color,
                        boxShadow: `0 0 7px ${sc.color}AA`,
                        animation: status !== 'OFFLINE' ? 'nvPulse 2.5s ease-in-out infinite' : 'none',
                        flexShrink: 0,
                    }} />
                    <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '10px', fontWeight: 500,
                        color: sc.color,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                    }}>
                        {sc.label}
                    </span>
                    {status !== 'NOMINAL' && (
                        <span style={{
                            fontSize: '9px', color: C.amber,
                            fontFamily: "'JetBrains Mono', monospace",
                            letterSpacing: '0.12em',
                            marginLeft: '8px',
                            animation: 'nvPulse 1.2s ease-in-out infinite',
                        }}>
                            INTEL MODE
                        </span>
                    )}
                </div>

                {/* Zone 2 — Metadata (platinum, center) */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '9px', color: C.platinum,
                    letterSpacing: '0.04em',
                }}>
                    {['Lat: 12ms', 'Alpaca', 'Finnhub', 'FRED'].map((item, i) => (
                        <React.Fragment key={item}>
                            {i > 0 && (
                                <span style={{ margin: '0 8px', color: C.border, userSelect: 'none' }}>·</span>
                            )}
                            <span>{item}</span>
                        </React.Fragment>
                    ))}
                </div>

                {/* Zone 3 — Feed + clock (ice blue, right-aligned) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            background: C.ice,
                            boxShadow: `0 0 6px ${C.ice}AA`,
                            animation: 'nvPing 1.8s ease-in-out infinite',
                        }} />
                        <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '9px', fontWeight: 500,
                            color: C.ice,
                            letterSpacing: '0.1em',
                        }}>
                            FEED SECURED
                        </span>
                    </div>
                    <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '9px', color: C.muted,
                        letterSpacing: '0.04em',
                        borderLeft: `1px solid ${C.border}`,
                        paddingLeft: '10px',
                    }}>
                        {timeStr}
                    </span>
                </div>
            </div>

            {/* Degraded stripe */}
            {status === 'DEGRADED' && (
                <div style={{
                    height: '2px',
                    background: `linear-gradient(90deg, transparent, ${C.amber}, transparent)`,
                    animation: 'nvPulse 1.5s ease-in-out infinite',
                    flexShrink: 0,
                }} />
            )}

            {/* Main content */}
            <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                <MarketPulseDashboard />
                {renderModule()}
            </main>

            {/* Bottom bar */}
            <div style={{
                height: '28px',
                background: C.surface,
                borderTop: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center',
                padding: '0 20px', gap: '10px',
                flexShrink: 0,
            }}>
                <span style={{ color: C.gold, fontSize: '13px', fontFamily: "'JetBrains Mono', monospace" }}>›</span>
                <span style={{ fontSize: '9px', color: C.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
                    {`CONN: ${sc.label}`}
                </span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: '9px', color: C.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>
                    ALT+1–8 · SHORTCUTS
                </span>
            </div>

            <style>{`
                @keyframes nvPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
                @keyframes nvPing  { 0%{transform:scale(1);opacity:1} 70%{transform:scale(2.2);opacity:0} 100%{transform:scale(1);opacity:0} }
            `}</style>
        </div>
    );
};
