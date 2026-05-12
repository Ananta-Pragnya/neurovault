// Institutional Navigation
// 5 tabs with premium gold aesthetic matching landing page

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const tabs = [
    { id: 'intel', label: 'Market Intel', path: '/terminal/intel' },
    { id: 'news-intel', label: 'Deep Intel', path: '/terminal/news-intel' },
    { id: 'forecasting', label: 'Forecasting', path: '/terminal/forecasting' },
    { id: 'signals', label: 'AI Signals', path: '/terminal/signals' },
    { id: 'options', label: 'Options Intel', path: '/terminal/options' },
    { id: 'portfolio', label: 'Portfolio', path: '/terminal/portfolio' },
    { id: 'lab', label: 'Simulation Lab', path: '/terminal/lab' }
];

export function InstitutionalNav({ user, logout }: { user: any; logout: () => void }) {
    const navigate = useNavigate();
    const location = useLocation();

    const activeTab = tabs.find(t => t.path === location.pathname)?.id || 'overview';

    return (
        <nav className="fixed top-0 w-full z-50 bg-[#0B0F14]/90 backdrop-blur-xl border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo - Click to go back to landing */}
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <div className="w-2 h-2 rounded-full bg-gold-primary" />
                        <span className="text-sm font-semibold text-white tracking-tight">
                            FINMOTION
                        </span>
                        <span className="text-xs text-slate-500 uppercase tracking-wider ml-2">
                            Intelligence
                        </span>
                    </button>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => navigate(tab.path)}
                                className="relative px-4 py-2 text-sm font-medium transition-colors duration-300"
                            >
                                <span className={`${activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                                    }`}>
                                    {tab.label}
                                </span>

                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-primary"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* User Actions */}
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                <span className="text-xs text-slate-500">{user.name}</span>
                                <button
                                    onClick={logout}
                                    className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 border border-white/10 rounded-lg hover:border-gold-primary/30"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="px-4 py-1.5 text-xs font-medium text-black bg-gold-primary rounded-lg hover:bg-gold-primary/90 transition-colors"
                            >
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
