// NEUROVAULT — Institutional Navigation
// Gold on obsidian · Outfit · Premium terminal nav

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const tabs = [
    { id: 'intel',       label: 'Market Intel',   path: '/terminal/intel'       },
    { id: 'news-intel',  label: 'Deep Intel',     path: '/terminal/news-intel'  },
    { id: 'forecasting', label: 'Forecasting',    path: '/terminal/forecasting' },
    { id: 'signals',     label: 'AI Signals',     path: '/terminal/signals'     },
    { id: 'options',     label: 'Options Intel',  path: '/terminal/options'     },
    { id: 'portfolio',   label: 'Portfolio',      path: '/terminal/portfolio'   },
    { id: 'lab',         label: 'Sim Lab',        path: '/terminal/lab'         },
    { id: 'edge',        label: 'Edge',           path: '/terminal/edge'        },
];

export function InstitutionalNav({ user, logout }: { user: any; logout: () => void }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [time, setTime] = useState('');

    const activeTab = tabs.find(t => t.path === location.pathname)?.id || 'intel';

    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
            }) + ' EST');
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <nav
            style={{
                position: 'fixed',
                top: 0,
                width: '100%',
                zIndex: 50,
                background: 'rgba(8, 12, 20, 0.92)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
                fontFamily: "'Outfit', sans-serif",
            }}
        >
            {/* Breathing gold top stripe */}
            <div style={{
                height: '2px',
                background: 'linear-gradient(90deg, transparent 0%, #D4AF37 20%, #FFD966 50%, #D4AF37 80%, transparent 100%)',
                animation: 'nvGoldBreathe 4s ease-in-out infinite',
            }} />

            <div style={{
                maxWidth: '1600px',
                margin: '0 auto',
                padding: '0 20px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                gap: '0',
            }}>
                {/* Logo */}
                <button
                    onClick={() => navigate('/')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0 20px 0 0',
                        marginRight: '20px',
                        borderRight: '1px solid rgba(255,255,255,0.06)',
                        flexShrink: 0,
                    }}
                >
                    {/* Diamond mark */}
                    <div style={{ position: 'relative', width: '28px', height: '28px', flexShrink: 0 }}>
                        <div style={{
                            position: 'absolute',
                            inset: '6px',
                            background: 'linear-gradient(135deg, #D4AF37, #FFD966)',
                            transform: 'rotate(45deg)',
                            boxShadow: '0 0 16px rgba(212, 175, 55, 0.7), 0 0 40px rgba(212, 175, 55, 0.2)',
                        }} />
                        <div style={{
                            position: 'absolute',
                            inset: '2px',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            transform: 'rotate(45deg)',
                        }} />
                    </div>
                    <div>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#E8ECF4',
                            letterSpacing: '0.08em',
                            lineHeight: 1.1,
                            fontFamily: "'Outfit', sans-serif",
                        }}>
                            NEUROVAULT
                        </div>
                        <div style={{
                            fontSize: '8px',
                            color: '#D4AF37',
                            letterSpacing: '0.2em',
                            lineHeight: 1,
                            fontFamily: "'JetBrains Mono', monospace",
                        }}>
                            INTELLIGENCE
                        </div>
                    </div>
                </button>

                {/* Tab strip */}
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, height: '100%' }}>
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => navigate(tab.path)}
                                style={{
                                    position: 'relative',
                                    height: '100%',
                                    padding: '0 14px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: isActive ? '#F9E2AF' : 'rgba(136, 146, 164, 0.8)',
                                    fontSize: '12px',
                                    fontWeight: isActive ? 600 : 400,
                                    fontFamily: "'Outfit', sans-serif",
                                    letterSpacing: '0.02em',
                                    transition: 'color 0.2s ease',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) (e.currentTarget as HTMLElement).style.color = '#E2E8F0';
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(136, 146, 164, 0.8)';
                                }}
                            >
                                {tab.label}
                                {isActive && (
                                    <motion.div
                                        layoutId="nvActiveTab"
                                        style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            height: '2px',
                                            background: 'linear-gradient(90deg, #D4AF37, #FFD966, #D4AF37)',
                                            boxShadow: '0 0 12px rgba(212, 175, 55, 0.8), 0 -2px 16px rgba(212, 175, 55, 0.2)',
                                        }}
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Right: clock + user */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    paddingLeft: '20px',
                    borderLeft: '1px solid rgba(255,255,255,0.06)',
                    flexShrink: 0,
                }}>
                    {/* Live clock */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}>
                        <div style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: '#10B981',
                            boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)',
                            animation: 'nvPing 1.5s ease-in-out infinite',
                        }} />
                        <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '10px',
                            color: 'rgba(136, 146, 164, 0.7)',
                            letterSpacing: '0.05em',
                        }}>
                            {time}
                        </span>
                    </div>

                    {user ? (
                        <>
                            <span style={{
                                fontSize: '11px',
                                color: 'rgba(212, 175, 55, 0.7)',
                                fontWeight: 500,
                                letterSpacing: '0.02em',
                            }}>
                                {user.name}
                            </span>
                            <button
                                onClick={logout}
                                style={{
                                    padding: '6px 14px',
                                    border: '1px solid rgba(212, 175, 55, 0.25)',
                                    background: 'transparent',
                                    color: 'rgba(212, 175, 55, 0.7)',
                                    fontFamily: "'Outfit', sans-serif",
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={e => {
                                    const el = e.currentTarget;
                                    el.style.background = 'rgba(212, 175, 55, 0.1)';
                                    el.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                                    el.style.color = '#D4AF37';
                                }}
                                onMouseLeave={e => {
                                    const el = e.currentTarget;
                                    el.style.background = 'transparent';
                                    el.style.borderColor = 'rgba(212, 175, 55, 0.25)';
                                    el.style.color = 'rgba(212, 175, 55, 0.7)';
                                }}
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => navigate('/register')}
                            style={{
                                padding: '8px 20px',
                                background: 'linear-gradient(135deg, #D4AF37 0%, #F9E2AF 50%, #9A7B2C 100%)',
                                border: 'none',
                                color: '#000',
                                fontFamily: "'Outfit', sans-serif",
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                borderRadius: '7px',
                                letterSpacing: '0.04em',
                                boxShadow: '0 0 20px rgba(212, 175, 55, 0.35)',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.boxShadow = '0 0 36px rgba(212, 175, 55, 0.6), 0 4px 20px rgba(212, 175, 55, 0.3)';
                                e.currentTarget.style.transform = 'scale(1.03)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.35)';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            Get Access
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes nvGoldBreathe {
                    0%, 100% { opacity: 0.5; }
                    50%       { opacity: 1; }
                }
                @keyframes nvPing {
                    0%   { transform: scale(1);   opacity: 1; }
                    70%  { transform: scale(2.2); opacity: 0; }
                    100% { transform: scale(1);   opacity: 0; }
                }
            `}</style>
        </nav>
    );
}
