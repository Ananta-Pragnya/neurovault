
import React from 'react';
import { motion } from 'framer-motion';

const PlanCard = ({ title, min, returns, type, risk, delay }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="group relative glass p-10 rounded-[3rem] border border-white/5 hover:border-gold-primary/30 transition-all duration-700 bg-black/40 backdrop-blur-xl overflow-hidden"
    >
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gold-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <div className="relative z-10">
            <div className="mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gold-primary mb-2">{type}</p>
                <h3 className="text-3xl font-black font-heading text-white group-hover:text-gold transition-colors">{title}</h3>
            </div>

            <div className="space-y-6 mb-12">
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Min. Capital</p>
                    <p className="text-xl font-black text-white">{min}</p>
                </div>
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Yield Range</p>
                    <p className="text-xl font-black text-gold-primary">{returns}</p>
                </div>
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Risk Index</p>
                    <p className="text-xl font-black text-white">{risk}/10</p>
                </div>
            </div>

            <button className="w-full py-5 bg-gold-gradient text-black font-black rounded-full text-sm uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                Partner Now
            </button>
        </div>

        {/* Glow Corner */}
        <div className="absolute -right-20 -bottom-20 w-40 h-40 bg-gold-primary/10 blur-[80px] group-hover:bg-gold-primary/20 transition-all duration-700" />
    </motion.div>
);

const ElitePlans: React.FC = () => {
    const plans = [
        { title: "Institutional Prime", min: "$50M", returns: "18-24%", type: "Multi-Strategy", risk: "4", delay: 0 },
        { title: "Quant Alpha", min: "$10M", returns: "28-35%", type: "HFT / Stat Arb", risk: "7", delay: 0.1 },
        { title: "Sovereign Edge", min: "$100M", returns: "12-16%", type: "Macro Hedge", risk: "2", delay: 0.2 },
        { title: "Global Macro Elite", min: "$250M", returns: "15-20%", type: "Sovereign Trust", risk: "3", delay: 0.3 }
    ];

    return (
        <section id="plans" className="relative py-32 px-6 bg-[#0b0f14]">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-24">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-6xl md:text-8xl font-black font-heading text-white tracking-tighter uppercase mb-6"
                    >
                        Elite <span className="text-gold">Plans.</span>
                    </motion.h2>
                    <p className="text-slate-400 font-medium max-w-2xl mx-auto text-lg leading-relaxed">
                        Tailored mandates designed for global family offices, sovereign wealth trusts, and institutional capital partners.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {plans.map((p, i) => (
                        <PlanCard key={i} {...p} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ElitePlans;
