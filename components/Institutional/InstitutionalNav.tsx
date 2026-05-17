// NEUROVAULT — Meridian Navigation Bar
// Precision terminal aesthetic: IBM Plex Mono, electric teal, near-black

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
    { id: 'intel',      label: 'MKT INTEL',   path: '/terminal/intel'      },
    { id: 'news-intel', label: 'DEEP INTEL',   path: '/terminal/news-intel' },
    { id: 'forecasting',label: 'FORECAST',     path: '/terminal/forecasting'},
    { id: 'signals',    label: 'AI SIGNALS',   path: '/terminal/signals'    },
    { id: 'options',    label: 'OPTIONS',      path: '/terminal/options'    },
    { id: 'portfolio',  label: 'PORTFOLIO',    path: '/terminal/portfolio'  },
    { id: 'lab',        label: 'SIM LAB',      path: '/terminal/lab'        },
    { id: 'edge',       label: 'EDGE',         path: '/terminal/edge'       },
];

export function InstitutionalNav({ user, logout }: { user: any; logout: () => void }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [time, setTime] = useState('');
    const [hovered, setHovered] = useState<string | null>(null);

    const activeTab = tabs.find(t => t.path === location.pathname)?.id || 'intel';

    useEffect(() => {
        const tick = () => {
            const now = new Date();
            const iso = now.toISOString();
            setTime(`${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`);
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
                background: '#020204',
                borderBottom: '1px solid #1C1C26',
                fontFamily: "'IBM Plex Mono', monospace",
            }}
        >
            {/* System info strip */}
            <div style={{
                height: '22px',
                background: '#0C0C10',
                borderBottom: '1px solid #1C1C26',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '8px', color: '#00E8C8', letterSpacing: '0.2em', fontWeight: 600 }}>
                        NEUROVAULT
                    </span>
                    <span style={{ width: '1px', height: '10px', background: '#1C1C26', display: 'inline-block' }} />
                    <span style={{ fontSize: '8px', color: '#505060', letterSpacing: '0.15em' }}>
                        PRECISION INTELLIGENCE PLATFORM · v5.0A · SECURE CHANNEL
                    </span>
                </div>
                <span style={{ fontSize: '8px', color: '#505060', letterSpacing: '0.1em' }}>
                    {time}
                </span>
            </div>

            {/* Main nav bar */}
            <div style={{
                height: '42px',
                display: 'flex',
                alignItems: 'stretch',
            }}>
                {/* Logo */}
                <button
                    onClick={() => navigate('/')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '0 20px',
                        background: 'transparent',
                        border: 'none',
                        borderRight: '1px solid #1C1C26',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,232,200,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                    {/* Diamond logo mark */}
                    <div style={{
                        position: 'relative',
                        width: '16px',
                        height: '16px',
                        flexShrink: 0,
                    }}>
                        <div style={{
                            position: 'absolute',
                            inset: '3px',
                            border: '1px solid #00E8C8',
                            transform: 'rotate(45deg)',
                            boxShadow: '0 0 6px rgba(0, 232, 200, 0.4)',
                        }} />
                        <div style={{
                            position: 'absolute',
                            inset: '6px',
                            background: '#00E8C8',
                            transform: 'rotate(45deg)',
                            boxShadow: '0 0 4px rgba(0, 232, 200, 0.6)',
                        }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#00E8C8',
                            letterSpacing: '0.2em',
                            lineHeight: 1,
                        }}>
                            NEUROVAULT
                        </span>
                        <span style={{
                            fontSize: '7px',
                            color: '#505060',
                            letterSpacing: '0.15em',
                            lineHeight: 1,
                        }}>
                            INTELLIGENCE
                        </span>
                    </div>
                </button>

                {/* Tab strip */}
                <div style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
                    {tabs.map((tab, i) => {
                        const isActive = activeTab === tab.id;
                        const isHovered = hovered === tab.id && !isActive;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => navigate(tab.path)}
                                onMouseEnter={() => setHovered(tab.id)}
                                onMouseLeave={() => setHovered(null)}
                                style={{
                                    position: 'relative',
                                    padding: '0 14px',
                                    fontSize: '9px',
                                    fontWeight: isActive ? 600 : 400,
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    letterSpacing: '0.15em',
                                    color: isActive ? '#00E8C8' : isHovered ? '#A8A8C0' : '#505060',
                                    background: isActive
                                        ? 'rgba(0, 232, 200, 0.06)'
                                        : isHovered
                                            ? 'rgba(255,255,255,0.02)'
                                            : 'transparent',
                                    border: 'none',
                                    borderRight: i < tabs.length - 1 ? '1px solid #1C1C26' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.12s',
                                    textTransform: 'uppercase',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {/* Active indicator — top bar */}
                                {isActive && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '2px',
                                        background: '#00E8C8',
                                        boxShadow: '0 0 8px rgba(0, 232, 200, 0.7), 0 2px 12px rgba(0, 232, 200, 0.2)',
                                    }} />
                                )}
                                {tab.label}
                                {/* Active dot */}
                                {isActive && (
                                    <span style={{
                                        display: 'inline-block',
                                        marginLeft: '6px',
                                        width: '3px',
                                        height: '3px',
                                        background: '#00E8C8',
                                        borderRadius: '50%',
                                        verticalAlign: 'middle',
                                        boxShadow: '0 0 4px rgba(0, 232, 200, 0.8)',
                                    }} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* User section */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0 16px',
                    borderLeft: '1px solid #1C1C26',
                    flexShrink: 0,
                }}>
                    {user ? (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                                <span style={{ fontSize: '8px', color: '#00E8C8', letterSpacing: '0.1em', fontWeight: 600 }}>
                                    {(user.name || 'OPERATOR').toUpperCase()}
                                </span>
                                <span style={{ fontSize: '7px', color: '#505060', letterSpacing: '0.1em' }}>
                                    AUTHORIZED
                                </span>
                            </div>
                            <button
                                onClick={logout}
                                style={{
                                    fontSize: '8px',
                                    color: '#505060',
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    letterSpacing: '0.15em',
                                    background: 'transparent',
                                    border: '1px solid #1C1C26',
                                    padding: '5px 12px',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = '#00E8C8';
                                    e.currentTarget.style.color = '#00E8C8';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = '#1C1C26';
                                    e.currentTarget.style.color = '#505060';
                                }}
                            >
                                EXIT
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                fontSize: '9px',
                                fontWeight: 600,
                                color: '#020204',
                                background: '#00E8C8',
                                fontFamily: "'IBM Plex Mono', monospace",
                                letterSpacing: '0.15em',
                                border: 'none',
                                padding: '7px 16px',
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                                transition: 'all 0.15s',
                                boxShadow: '0 0 12px rgba(0, 232, 200, 0.3)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 232, 200, 0.5)')}
                            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 232, 200, 0.3)')}
                        >
                            ACCESS
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
