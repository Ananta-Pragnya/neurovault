
import React from 'react';
import { motion } from 'framer-motion';

const InstitutionalContact: React.FC = () => {
    return (
        <section id="contact" className="py-32 px-6 bg-[#0b0f14] overflow-hidden">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div>
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        className="space-y-8"
                    >
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gold-primary mb-4 block">Strategic Onboarding</span>
                        <h2 className="text-7xl font-black font-heading text-white tracking-tighter leading-none mb-6">
                            FORM A <br /> <span className="text-gold">MANDATE.</span>
                        </h2>
                        <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-lg">
                            Initiate a formal review process for institutional capital partnership. Our investment committee evaluates opportunities on a rolling monthly cycle.
                        </p>

                        <div className="space-y-4 pt-12">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preferred Channels</p>
                            <div className="flex flex-col gap-2 font-black text-white uppercase tracking-tighter text-2xl">
                                <a href="mailto:mandate@fintech.inst" className="hover:text-gold transition-colors">MANDATE@FINTECH.INST</a>
                                <p>+1 (800) QUANT-ALPHA</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    className="glass p-12 rounded-[4rem] border border-white/5 bg-black/40 backdrop-blur-3xl"
                >
                    <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Institution Name</label>
                                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white focus:outline-none focus:border-gold-primary/50 transition-colors uppercase tracking-widest text-xs" placeholder="ETHEREUM FOUNDATION" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Executive Contact</label>
                                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white focus:outline-none focus:border-gold-primary/50 transition-colors uppercase tracking-widest text-xs" placeholder="VIT@ALIK.INST" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Capital Pool ($USD)</label>
                            <select className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white focus:outline-none focus:border-gold-primary/50 transition-colors uppercase tracking-widest text-xs appearance-none">
                                <option>$10M - $50M</option>
                                <option>$50M - $250M</option>
                                <option>$250M - $1B</option>
                                <option>$1B+</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Strategic Objectives</label>
                            <textarea rows={4} className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white focus:outline-none focus:border-gold-primary/50 transition-colors uppercase tracking-widest text-xs" placeholder="DESCRIBE YOUR ALPHA MANDATE..." />
                        </div>

                        <button className="w-full py-6 bg-gold-gradient text-black font-black rounded-full uppercase tracking-[0.2em] text-sm hover:scale-[1.02] transition-transform shadow-[0_0_40px_rgba(212,175,55,0.2)]">
                            Request Formal Onboarding
                        </button>
                    </form>
                </motion.div>
            </div>

            {/* Footer Branding */}
            <div className="max-w-7xl mx-auto mt-32 pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 opacity-40">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">© FINTECH INSTITUTIONAL INTELLIGENCE. ALL RIGHTS RESERVED.</p>
                <div className="flex gap-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <a href="#" className="hover:text-white transition-colors">Terms of Trust</a>
                    <a href="#" className="hover:text-white transition-colors">Privacy Alpha</a>
                    <a href="#" className="hover:text-white transition-colors">Regulatory Status</a>
                </div>
            </div>
        </section>
    );
};

export default InstitutionalContact;
