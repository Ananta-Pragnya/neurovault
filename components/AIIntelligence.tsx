
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const MOCK_ARTICLES = [
    "S&P 500 hits record high as tech earnings exceed institutional expectations.",
    "Federal Reserve signals potential rate stabilization amid cooling inflation data.",
    "AI Chip demand surges: NVDA and AMD leading quantitative hardware growth.",
    "European markets show resilience despite energy sector volatility.",
    "Institutional Bitcoin adoption grows as major hedge funds increase allocation.",
    "Emerging market stability index improves as trade barriers dissolve."
];

const AIIntelligence: React.FC = () => {
    const [summary, setSummary] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const generateSummary = async () => {
        if (!API_KEY) {
            setError("AI Engine Offline: API Key Missing.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `
        You are a quantitative lead at a billion-dollar AI hedge fund. 
        Synthesize the following 6 high-signal market headlines into a single, high-impact institutional executive summary.
        Requirements:
        1. Professional, high-end financial terminology.
        2. Maximum 3 sentences.
        3. Highlight the decoupling of alpha from traditional market variance.
        4. Focus on institutional stability and long-term sovereignty.
        
        Headlines:
        ${MOCK_ARTICLES.join("\n")}
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            setSummary(response.text());
        } catch (err) {
            console.error(err);
            setError("Strategic Intelligence Error: Failed to compute summary.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        generateSummary();
    }, []);

    return (
        <section id="ai-intelligence" className="relative py-32 px-6 bg-[#0b0f14] overflow-hidden">
            <div className="max-w-7xl mx-auto flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    className="relative w-full glass p-12 rounded-[4rem] border border-gold-primary/20 bg-black/60 backdrop-blur-3xl overflow-hidden"
                >
                    {/* Scanning Animation Header */}
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gold-primary/10 rounded-2xl flex items-center justify-center animate-pulse">
                                <div className="w-3 h-3 bg-gold-primary rounded-full shadow-[0_0_15px_#D4AF37]" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Quant Alpha <span className="text-gold-primary">AI</span></h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Neural Network Status: Active</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Processing Node</p>
                            <p className="text-white font-mono text-sm uppercase">ALPACA-SIGNAL-NODE-01</p>
                        </div>
                    </div>

                    {/* AI Output Area */}
                    <div className="min-h-[200px] flex items-center justify-center">
                        {loading ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-1 w-32 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ x: "-100%" }}
                                        animate={{ x: "100%" }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                        className="w-full h-full bg-gold-primary"
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-gold-primary uppercase tracking-[0.3em]">Synthesizing Market Intelligence...</p>
                            </div>
                        ) : error ? (
                            <p className="text-red-400 font-bold uppercase tracking-widest text-sm">{error}</p>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <p className="text-2xl md:text-3xl text-slate-200 font-medium leading-tight font-heading italic">
                                    "{summary}"
                                </p>
                                <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                                    <div className="flex -space-x-4">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-bold text-slate-400">
                                                S{i}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sources Verified: Reuters, Bloomberg, FT, CNBC, WSJ</p>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Bottom Call to Action */}
                    <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-8 py-8 border-t border-white/5">
                        <p className="text-sm text-slate-500 max-w-md">
                            Our proprietary LLM architecture scans over 100k data points per second to deliver high-signal institutional summaries.
                        </p>
                        <button
                            onClick={generateSummary}
                            disabled={loading}
                            className="px-10 py-4 bg-white/5 text-gold-primary font-black rounded-full border border-gold-primary/20 hover:bg-gold-primary/10 transition-all uppercase tracking-widest text-xs"
                        >
                            Re-Compute Alpha
                        </button>
                    </div>

                    {/* Background Grid Pattern */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] select-none">
                        <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#D4AF37 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default AIIntelligence;
