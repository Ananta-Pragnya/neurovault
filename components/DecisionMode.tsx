import React from 'react';
import CardGlass from './CardGlass';

export interface Action {
    action: string;
    text: string;
    priority: number;
    confidence: number;
}

interface DecisionProps {
    actions: Action[];
}

const DecisionMode: React.FC<DecisionProps> = ({ actions }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {actions.map((item, idx) => (
                <CardGlass
                    key={idx}
                    className={`
                min-h-[180px] flex flex-col justify-between
                ${idx === 0 ? 'border-[#C6A85A]/30 shadow-[0_0_30px_rgba(198,168,90,0.1)]' : ''}
            `}
                >
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <span className={`
                    px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest
                    ${idx === 0 ? 'bg-[#C6A85A] text-[#0B0F14]' : 'bg-white/10 text-[#9CA3AF]'}
                `}>
                                Action {idx + 1}
                            </span>
                            {idx === 0 && (
                                <span className="text-[10px] font-bold text-[#C6A85A] flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#C6A85A]"></span>
                                    PRIORITY
                                </span>
                            )}
                        </div>

                        <p className="text-lg font-medium text-[#EAEAEA] leading-snug">
                            {item.text}
                        </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-end">
                        <div>
                            <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">Confidence</p>
                            <p className="text-xl font-bold text-[#EAEAEA]">{(item.confidence * 100).toFixed(0)}%</p>
                        </div>
                        <button className="text-[10px] font-bold text-[#C6A85A] hover:text-[#F6E27A] uppercase tracking-widest transition-colors">
                            View Logic →
                        </button>
                    </div>
                </CardGlass>
            ))}
        </div>
    );
};

export default DecisionMode;
