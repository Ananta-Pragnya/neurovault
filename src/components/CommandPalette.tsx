import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const CommandPalette: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-2xl bg-[#0B0F14] border border-primary/20 rounded-xl shadow-gold-glow overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center px-4 py-3 border-b border-white/10">
                        <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input
                            autoFocus
                            className="flex-1 bg-transparent text-lg text-text-primary placeholder-text-secondary focus:outline-none"
                            placeholder="Type a command or search..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <div className="text-xs text-text-secondary px-2 py-1 bg-white/5 rounded border border-white/5">ESC</div>
                    </div>
                    <div className="p-2">
                        <div className="text-label text-text-secondary mb-2 px-2">SUGGESTIONS</div>
                        <div className="space-y-1">
                            {['Show Portfolio Heatmap', 'Toggle Decision Mode', 'Search Ticker...'].map((item, i) => (
                                <div key={i} className="px-3 py-2 hover:bg-white/5 rounded-lg text-text-primary cursor-pointer flex justify-between items-center group">
                                    <span>{item}</span>
                                    <span className="text-xs text-text-secondary opacity-0 group-hover:opacity-100">Jump to</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
