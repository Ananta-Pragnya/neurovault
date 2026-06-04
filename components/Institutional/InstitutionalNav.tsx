// NEUROVAULT — Institutional Navigation
// 48px · Inter · Text-only tabs · Ghost CTA

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const TABS = [
    { id: 'intel',       label: 'Market Intel',  path: '/terminal/intel'       },
    { id: 'news-intel',  label: 'Deep Intel',    path: '/terminal/news-intel'  },
    { id: 'forecasting', label: 'Forecasting',   path: '/terminal/forecasting' },
    { id: 'signals',     label: 'AI Signals',    path: '/terminal/signals'     },
    { id: 'options',     label: 'Options',       path: '/terminal/options'     },
    { id: 'portfolio',   label: 'Portfolio',     path: '/terminal/portfolio'   },
    { id: 'lab',         label: 'Sim Lab',       path: '/terminal/lab'         },
    { id: 'edge',        label: 'Edge',          path: '/terminal/edge'        },
    { id: 'sectors',     label: 'Sectors',       path: '/terminal/sectors'     },
    { id: 'backtest',    label: 'Backtest',      path: '/terminal/backtest'    },
    { id: 'alerts',      label: 'Alerts',        path: '/terminal/alerts'      },
];

const C = {
    bg:           'rgba(10, 10, 11, 0.96)',
    border:       '#1E1E21',
    gold:         '#C9962A',
    goldText:     '#D4A843',
    platinum:     '#9EA8B3',
    muted:        '#4A5260',
};

export function InstitutionalNav({ user, logout }: { user: any; logout: () => void }) {
    const navigate  = useNavigate();
    const location  = useLocation();
    const [time, setTime]       = useState('');
    const [hovered, setHovered] = useState<string | null>(null);

    const activeId = TABS.find(t => t.path === location.pathname)?.id || 'intel';

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

    return (
        <nav style={{
            position:  'fixed',
            top:       0,
            width:     '100%',
            zIndex:    50,
            background: C.bg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${C.border}`,
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            {/* 2px gold breathing stripe */}
            <div style={{
                height:     '2px',
                background: `linear-gradient(90deg, transparent, ${C.gold} 25%, #D4A843 50%, ${C.gold} 75%, transparent)`,
                animation:  'nvGoldStripe 4s ease-in-out infinite',
            }} />

            {/* Main bar — 46px */}
            <div style={{
                height:  '46px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                gap: '0',
            }}>
                {/* Logo */}
                <button
                    onClick={() => navigate('/')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '0 20px 0 0',
                        marginRight: '12px',
                        borderRight: `1px solid ${C.border}`,
                        flexShrink: 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                    {/* Diamond logomark */}
                    <div style={{ position: 'relative', width: '22px', height: '22px', flexShrink: 0 }}>
                        <div style={{
                            position: 'absolute', inset: '5px',
                            background: `linear-gradient(135deg, ${C.gold}, #D4A843)`,
                            transform: 'rotate(45deg)',
                            boxShadow: `0 0 12px rgba(201,150,42,0.55)`,
                        }} />
                        <div style={{
                            position: 'absolute', inset: '2px',
                            border: `1px solid rgba(201,150,42,0.3)`,
                            transform: 'rotate(45deg)',
                        }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#EDF2F7', letterSpacing: '0.12em', lineHeight: 1.2 }}>
                            NEUROVAULT
                        </div>
                        <div style={{ fontSize: '7px', color: C.gold, letterSpacing: '0.2em', lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                            INTELLIGENCE
                        </div>
                    </div>
                </button>

                {/* Tab strip — scrolls horizontally on mobile */}
                <div style={{
                    display: 'flex', alignItems: 'stretch', flex: 1, height: '100%',
                    overflowX: 'auto', scrollbarWidth: 'none',
                }}
                    // Hide webkit scrollbar
                    ref={el => { if (el) el.style.cssText += '-webkit-overflow-scrolling:touch;'; }}
                >
                    {TABS.map(tab => {
                        const isActive  = tab.id === activeId;
                        const isHovered = hovered === tab.id && !isActive;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => navigate(tab.path)}
                                onMouseEnter={() => setHovered(tab.id)}
                                onMouseLeave={() => setHovered(null)}
                                style={{
                                    position:   'relative',
                                    display:    'flex',
                                    alignItems: 'center',
                                    padding:    '0 14px',
                                    height:     '100%',
                                    background: 'transparent',
                                    border:     'none',
                                    cursor:     'pointer',
                                    color:      isActive  ? '#FFFFFF'
                                              : isHovered ? '#C8D0DC'
                                              : C.platinum,
                                    fontSize:   '13px',
                                    fontWeight: isActive ? 500 : 400,
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    letterSpacing: '0',
                                    whiteSpace: 'nowrap',
                                    transition: 'color 0.15s ease-out',
                                }}
                            >
                                {tab.label}
                                {/* 2px gold underline slides between active tabs */}
                                {isActive && (
                                    <motion.div
                                        layoutId="nvTabLine"
                                        style={{
                                            position:   'absolute',
                                            bottom:     0,
                                            left:       '12px',
                                            right:      '12px',
                                            height:     '2px',
                                            background: C.gold,
                                            boxShadow:  `0 0 8px rgba(201,150,42,0.7)`,
                                        }}
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Right — clock + user */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    paddingLeft: '16px',
                    borderLeft: `1px solid ${C.border}`,
                    flexShrink: 0,
                }}>
                    {/* Live clock */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            background: '#4CAF82',
                            boxShadow:  '0 0 7px rgba(76,175,130,0.85)',
                            animation:  'nvPing 2s ease-in-out infinite',
                        }} />
                        <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize:   '10px',
                            color:      C.muted,
                            letterSpacing: '0.05em',
                        }}>
                            {time}
                        </span>
                    </div>

                    {user ? (
                        <>
                            <span style={{ fontSize: '12px', color: C.platinum, fontWeight: 400 }}>
                                {user.name}
                            </span>
                            <button
                                onClick={logout}
                                style={{
                                    padding: '5px 12px',
                                    border: `1px solid ${C.border}`,
                                    background: 'transparent',
                                    color: C.platinum,
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease-out',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = C.gold;
                                    e.currentTarget.style.color = C.gold;
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = C.border;
                                    e.currentTarget.style.color = C.platinum;
                                }}
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        /* Ghost CTA — gold border, transparent fill */
                        <button
                            onClick={() => navigate('/register')}
                            style={{
                                padding: '6px 18px',
                                background: 'transparent',
                                border: `1px solid ${C.gold}`,
                                color: C.goldText,
                                fontFamily: "'Inter', sans-serif",
                                fontSize: '13px',
                                fontWeight: 500,
                                borderRadius: '7px',
                                cursor: 'pointer',
                                letterSpacing: '0.01em',
                                transition: 'all 0.15s ease-out',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(201,150,42,0.10)';
                                e.currentTarget.style.boxShadow  = '0 0 16px rgba(201,150,42,0.22)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.boxShadow  = 'none';
                            }}
                        >
                            Get Access
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes nvGoldStripe { 0%,100%{opacity:0.4} 50%{opacity:1} }
                @keyframes nvPing { 0%{transform:scale(1);opacity:1} 70%{transform:scale(2.4);opacity:0} 100%{transform:scale(1);opacity:0} }
            `}</style>
        </nav>
    );
}
