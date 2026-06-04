// NEUROVAULT — Institutional Sidebar Navigation
// Vertical 220px sidebar · 64px icon rail on < 1024px · Inter / JetBrains Mono

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    BarChart2, Newspaper, TrendingUp, Zap, Layers,
    Briefcase, FlaskConical, Crosshair, PieChart, History, Bell,
    LogOut,
} from 'lucide-react';

export const NV_SIDEBAR_FULL = 220;
export const NV_SIDEBAR_RAIL = 64;

const TABS = [
    { id: 'intel',       label: 'Market Intel',  path: '/terminal/intel',       icon: BarChart2,    group: 'intel'  },
    { id: 'news-intel',  label: 'Deep Intel',    path: '/terminal/news-intel',  icon: Newspaper,    group: 'intel'  },
    { id: 'forecasting', label: 'Forecasting',   path: '/terminal/forecasting', icon: TrendingUp,   group: 'intel'  },
    { id: 'signals',     label: 'AI Signals',    path: '/terminal/signals',     icon: Zap,          group: 'intel'  },
    { id: 'options',     label: 'Options',       path: '/terminal/options',     icon: Layers,       group: 'intel'  },
    { id: 'portfolio',   label: 'Portfolio',     path: '/terminal/portfolio',   icon: Briefcase,    group: 'tools'  },
    { id: 'lab',         label: 'Sim Lab',       path: '/terminal/lab',         icon: FlaskConical, group: 'tools'  },
    { id: 'edge',        label: 'Edge',          path: '/terminal/edge',        icon: Crosshair,    group: 'tools'  },
    { id: 'sectors',     label: 'Sectors',       path: '/terminal/sectors',     icon: PieChart,     group: 'tools'  },
    { id: 'backtest',    label: 'Backtest',      path: '/terminal/backtest',    icon: History,      group: 'tools'  },
    { id: 'alerts',      label: 'Alerts',        path: '/terminal/alerts',      icon: Bell,         group: 'tools'  },
];

const C = {
    bg:       '#0C0C0E',
    surface:  '#111114',
    border:   '#1A1A1E',
    gold:     '#C9962A',
    goldGlow: 'rgba(201,150,42,0.30)',
    goldText: '#D4A843',
    platinum: '#9EA8B3',
    muted:    '#3E4654',
    white:    '#EDF2F7',
    sage:     '#4CAF82',
};

const INTEL_TABS = TABS.filter(t => t.group === 'intel');
const TOOL_TABS  = TABS.filter(t => t.group === 'tools');

export function InstitutionalNav({ user, logout }: { user: any; logout: () => void }) {
    const navigate  = useNavigate();
    const location  = useLocation();
    const [time, setTime]       = useState('');
    const [isRail, setIsRail]   = useState(false);

    const activeId = TABS.find(t => t.path === location.pathname)?.id ?? 'intel';

    useEffect(() => {
        const tick = () => {
            const d = new Date();
            setTime(
                d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                + ' EST'
            );
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const check = () => setIsRail(window.innerWidth < 1024);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const W = isRail ? NV_SIDEBAR_RAIL : NV_SIDEBAR_FULL;

    const renderTab = (tab: typeof TABS[0]) => {
        const isActive = tab.id === activeId;
        const Icon = tab.icon;
        return (
            <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                title={isRail ? tab.label : undefined}
                style={{
                    position:       'relative',
                    display:        'flex',
                    alignItems:     'center',
                    gap:            '10px',
                    width:          '100%',
                    padding:        isRail ? '11px 0' : '9px 14px 9px 16px',
                    justifyContent: isRail ? 'center' : 'flex-start',
                    background:     isActive ? 'rgba(201,150,42,0.06)' : 'transparent',
                    border:         'none',
                    borderLeft:     `2px solid ${isActive ? C.gold : 'transparent'}`,
                    cursor:         'pointer',
                    color:          isActive ? C.white : C.muted,
                    fontFamily:     "'Inter', system-ui, sans-serif",
                    fontSize:       '12.5px',
                    fontWeight:     isActive ? 500 : 400,
                    letterSpacing:  '0',
                    whiteSpace:     'nowrap',
                    overflow:       'hidden',
                    transition:     'color 0.12s ease-out, background 0.12s ease-out',
                    textAlign:      'left',
                }}
                onMouseEnter={e => {
                    if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                        e.currentTarget.style.color      = C.platinum;
                    }
                }}
                onMouseLeave={e => {
                    if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color      = C.muted;
                    }
                }}
            >
                {isActive && (
                    <motion.div
                        layoutId="nvSidebarLine"
                        style={{
                            position:   'absolute',
                            left:       0,
                            top:        '20%',
                            bottom:     '20%',
                            width:      '2px',
                            background: `linear-gradient(180deg, transparent, ${C.gold}, transparent)`,
                            boxShadow:  `0 0 10px ${C.goldGlow}, 0 0 20px ${C.goldGlow}`,
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                )}

                <Icon
                    size={14}
                    color={isActive ? C.gold : 'currentColor'}
                    style={{
                        flexShrink: 0,
                        filter:     isActive ? `drop-shadow(0 0 4px ${C.goldGlow})` : 'none',
                        transition: 'filter 0.12s',
                    }}
                />

                {!isRail && (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                        {tab.label}
                    </span>
                )}

                {isActive && !isRail && (
                    <div style={{
                        width:      '3px',
                        height:     '3px',
                        borderRadius: '50%',
                        background: C.gold,
                        flexShrink: 0,
                        boxShadow:  `0 0 5px ${C.goldGlow}`,
                    }} />
                )}
            </button>
        );
    };

    const sectionLabel = (text: string) => !isRail ? (
        <div style={{
            padding:        '10px 16px 5px',
            fontSize:       '8px',
            fontWeight:     700,
            color:          C.muted,
            letterSpacing:  '0.18em',
            fontFamily:     "'JetBrains Mono', monospace",
            textTransform:  'uppercase',
            userSelect:     'none',
        }}>
            {text}
        </div>
    ) : null;

    return (
        <nav style={{
            position:       'fixed',
            top:            0,
            left:           0,
            width:          `${W}px`,
            height:         '100vh',
            zIndex:         50,
            background:     C.bg,
            borderRight:    `1px solid ${C.border}`,
            display:        'flex',
            flexDirection:  'column',
            fontFamily:     "'Inter', system-ui, sans-serif",
            transition:     'width 0.18s ease-out',
            overflow:       'hidden',
        }}>
            {/* Gold breathing stripe — right edge */}
            <div style={{
                position:       'absolute',
                top:            0,
                right:          0,
                width:          '1px',
                height:         '100%',
                background:     `linear-gradient(180deg, transparent 0%, ${C.gold} 35%, ${C.goldText} 50%, ${C.gold} 65%, transparent 100%)`,
                opacity:        0.45,
                animation:      'nvGoldStripe 4s ease-in-out infinite',
                pointerEvents:  'none',
            }} />

            {/* ── Logo ── */}
            <button
                onClick={() => navigate('/')}
                style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            '10px',
                    padding:        isRail ? '18px 0' : '18px 16px',
                    justifyContent: isRail ? 'center' : 'flex-start',
                    background:     'transparent',
                    borderTop:      'none',
                    borderLeft:     'none',
                    borderRight:    'none',
                    borderBottom:   `1px solid ${C.border}`,
                    cursor:         'pointer',
                    flexShrink:     0,
                    width:          '100%',
                    transition:     'opacity 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.72')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
                {/* Diamond mark */}
                <div style={{ position: 'relative', width: '22px', height: '22px', flexShrink: 0 }}>
                    <div style={{
                        position:   'absolute',
                        inset:      '5px',
                        background: `linear-gradient(135deg, ${C.gold}, #D4A843)`,
                        transform:  'rotate(45deg)',
                        boxShadow:  `0 0 12px rgba(201,150,42,0.55)`,
                    }} />
                    <div style={{
                        position:   'absolute',
                        inset:      '2px',
                        border:     `1px solid rgba(201,150,42,0.28)`,
                        transform:  'rotate(45deg)',
                    }} />
                </div>

                {!isRail && (
                    <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: C.white, letterSpacing: '0.13em', lineHeight: 1.2 }}>
                            NEUROVAULT
                        </div>
                        <div style={{ fontSize: '6.5px', color: C.gold, letterSpacing: '0.22em', lineHeight: 1, fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
                            INTELLIGENCE
                        </div>
                    </div>
                )}
            </button>

            {/* ── Tab list ── */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none', padding: '8px 0' }}>
                {sectionLabel('Intelligence')}
                {INTEL_TABS.map(renderTab)}

                <div style={{ margin: isRail ? '8px 14px' : '8px 16px', height: '1px', background: C.border }} />

                {sectionLabel('Toolkit')}
                {TOOL_TABS.map(renderTab)}
            </div>

            {/* ── Footer: clock + user ── */}
            <div style={{
                borderTop:      `1px solid ${C.border}`,
                padding:        isRail ? '14px 0' : '14px 16px',
                flexShrink:     0,
                display:        'flex',
                flexDirection:  'column',
                gap:            '10px',
                alignItems:     isRail ? 'center' : 'stretch',
            }}>
                {/* Clock */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{
                        width:      '5px',
                        height:     '5px',
                        borderRadius: '50%',
                        background: C.sage,
                        flexShrink: 0,
                        boxShadow:  `0 0 6px rgba(76,175,130,0.85)`,
                        animation:  'nvPing 2s ease-in-out infinite',
                    }} />
                    {!isRail && (
                        <span style={{
                            fontFamily:    "'JetBrains Mono', monospace",
                            fontSize:      '9px',
                            color:         C.muted,
                            letterSpacing: '0.06em',
                        }}>
                            {time}
                        </span>
                    )}
                </div>

                {/* User */}
                {user ? (
                    <div style={{
                        display:        'flex',
                        alignItems:     'center',
                        gap:            '8px',
                        justifyContent: isRail ? 'center' : 'space-between',
                    }}>
                        {!isRail && (
                            <span style={{
                                fontSize:      '11px',
                                color:         C.platinum,
                                overflow:      'hidden',
                                textOverflow:  'ellipsis',
                                whiteSpace:    'nowrap',
                                flex:          1,
                            }}>
                                {user.name}
                            </span>
                        )}
                        <button
                            onClick={logout}
                            title="Logout"
                            style={{
                                display:        'flex',
                                alignItems:     'center',
                                justifyContent: 'center',
                                padding:        '6px',
                                border:         `1px solid ${C.border}`,
                                background:     'transparent',
                                color:          C.muted,
                                borderRadius:   '6px',
                                cursor:         'pointer',
                                flexShrink:     0,
                                transition:     'all 0.12s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'rgba(201,79,79,0.45)';
                                e.currentTarget.style.color       = '#C94F4F';
                                e.currentTarget.style.background  = 'rgba(201,79,79,0.06)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = C.border;
                                e.currentTarget.style.color       = C.muted;
                                e.currentTarget.style.background  = 'transparent';
                            }}
                        >
                            <LogOut size={13} />
                        </button>
                    </div>
                ) : (
                    !isRail && (
                        <button
                            onClick={() => navigate('/register')}
                            style={{
                                width:         '100%',
                                padding:       '7px 0',
                                background:    'transparent',
                                border:        `1px solid ${C.gold}`,
                                color:         C.goldText,
                                fontFamily:    "'Inter', sans-serif",
                                fontSize:      '11px',
                                fontWeight:    500,
                                borderRadius:  '6px',
                                cursor:        'pointer',
                                letterSpacing: '0.03em',
                                transition:    'all 0.12s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(201,150,42,0.09)';
                                e.currentTarget.style.boxShadow  = `0 0 14px ${C.goldGlow}`;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.boxShadow  = 'none';
                            }}
                        >
                            Get Access
                        </button>
                    )
                )}
            </div>

            <style>{`
                @keyframes nvGoldStripe { 0%,100%{opacity:0.28} 50%{opacity:0.65} }
                @keyframes nvPing       { 0%{transform:scale(1);opacity:1} 70%{transform:scale(2.4);opacity:0} 100%{transform:scale(1);opacity:0} }
                nav ::-webkit-scrollbar { display:none; }
            `}</style>
        </nav>
    );
}
