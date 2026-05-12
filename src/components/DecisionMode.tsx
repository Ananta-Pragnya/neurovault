import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarketDigest } from '../lib/types';

interface DecisionModeProps {
    isActive: boolean;
    digest: MarketDigest;
    onExit: () => void;
}

export const DecisionMode: React.FC<DecisionModeProps> = ({ isActive, digest, onExit }) => {
    const [step, setStep] = useState<'analyzing' | 'ready'>('analyzing');

    useEffect(() => {
        if (isActive) {
            setStep('analyzing');
            const timer = setTimeout(() => setStep('ready'), 1500); // Cinematic delay
            return () => clearTimeout(timer);
        }
    }, [isActive]);

    if (!isActive) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-[#05070A] bg-opacity-95 backdrop-blur-xl flex items-center justify-center"
            >
                <div className="absolute top-8 right-8">
                    <button onClick={onExit} className="text-text-secondary hover:text-white uppercase tracking-widest text-xs border border-white/10 px-4 py-2 rounded-full">
                        Exit Focus Mode [ESC]
                    </button>
                </div>

                <div className="max-w-4xl w-full p-8">

                    {step === 'analyzing' ? (
                        <div className="flex flex-col items-center justify-center space-y-8">
                            <div className="w-16 h-16 border-t-2 border-primary rounded-full animate-spin"></div>
                            <div className="text-xl font-heading text-primary animate-pulse">DISTILLING MARKET NOISE...</div>
                            <div className="text-sm font-mono text-text-secondary">
                                Processing 142 Tickers • Checking 3,400 Correlations • Simulating Counterfactuals
                            </div>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-12"
                        >
                            <div className="text-center space-y-4">
                                <h2 className="text-label text-primary tracking-[0.3em]">PRIORITIZED ACTION PLAN</h2>
                                <h1 className="text-5xl font-heading font-bold text-white">
                                    3 HIGH-CONVICTION SIGNALS
                                </h1>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {digest.recommendations.map((rec, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.2 }}
                                        className="bg-white/5 border border-primary/20 p-8 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                            <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_#D4AF37]"></div>
                                        </div>
                                        <div className="text-4xl font-bold text-primary mb-2">{rec.action}</div>
                                        <div className="text-lg text-white mb-6 leading-relaxed">{rec.text}</div>

                                        <div className="flex justify-between items-end border-t border-white/10 pt-4">
                                            <div>
                                                <div className="text-label text-text-secondary mb-1">CONFIDENCE</div>
                                                <div className="text-2xl font-mono text-white">{(rec.confidence * 100).toFixed(0)}%</div>
                                            </div>
                                            <button className="bg-primary text-black px-6 py-2 rounded-lg font-bold hover:bg-white transition-colors">
                                                EXECUTE
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                </div>
            </motion.div>
        </AnimatePresence>
    );
};
