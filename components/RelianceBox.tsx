
import React from 'react';
import { motion } from 'framer-motion';

const RelianceBox: React.FC = () => {
    return (
        <div className="py-16 px-6 flex justify-center bg-[#0b0f14]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="glass max-w-5xl w-full py-6 px-8 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gold-primary/10 flex items-center justify-center text-gold-primary flex-shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm">Sovereign Custody</p>
                        <p className="text-slate-400 text-xs mt-0.5">Multi-party computation security</p>
                    </div>
                </div>

                <div className="h-px w-8 bg-white/10 hidden md:block" />

                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gold-primary/10 flex items-center justify-center text-gold-primary flex-shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm">Audit Transparency</p>
                        <p className="text-slate-400 text-xs mt-0.5">Real-time on-chain verification</p>
                    </div>
                </div>

                <div className="h-px w-8 bg-white/10 hidden md:block" />

                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gold-primary/10 flex items-center justify-center text-gold-primary flex-shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm">Global Compliance</p>
                        <p className="text-slate-400 text-xs mt-0.5">Tier-1 financial regulation</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default RelianceBox;
