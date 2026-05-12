
import React, { useMemo } from 'react';
import { motion, useTransform, MotionValue } from 'framer-motion';
import data from '../data/financialData.json';

interface ScrollVisualizerProps {
    progress: MotionValue<number>;
}

const ScrollVisualizer: React.FC<ScrollVisualizerProps> = ({ progress }) => {
    // --- Section 1: Line Chart (AUM) ---
    const linePath = useMemo(() => {
        const points = data.monthlyPerformance.map((d, i) => {
            const x = (i / (data.monthlyPerformance.length - 1)) * 1000;
            const y = 400 - ((d.aum - 800) / (1320 - 800)) * 300;
            return `${x},${y}`;
        }).join(' L ');
        return `M ${points}`;
    }, []);

    const lineDraw = useTransform(progress, [0, 0.15], [0, 1]);
    const lineOpacity = useTransform(progress, [0.15, 0.2], [1, 0]);

    // --- Section 2: Bar Chart (Returns) ---
    const barsOpacity = useTransform(progress, [0.2, 0.25, 0.35, 0.4], [0, 1, 1, 0]);

    // --- Section 3: Donut Chart (Allocation) ---
    const donutOpacity = useTransform(progress, [0.4, 0.45, 0.55, 0.6], [0, 1, 1, 0]);
    const donutRotate = useTransform(progress, [0.4, 0.6], [0, 180]);

    // --- Section 4: Scatter Plot (AI Models) ---
    const scatterOpacity = useTransform(progress, [0.6, 0.65, 0.75, 0.8], [0, 1, 1, 0]);

    // --- Section 5: Stacked Bars (Financials) ---
    const financialsOpacity = useTransform(progress, [0.8, 0.85, 0.95, 1], [0, 1, 1, 0]);

    return (
        <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
            <svg
                viewBox="0 0 1000 600"
                className="w-full h-full preserve-3d"
                style={{ filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.2))' }}
            >
                {/* Grid Background */}
                <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(212, 175, 55, 0.05)" strokeWidth="0.5" />
                    </pattern>
                    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#D4AF37" />
                        <stop offset="100%" stopColor="#F9E2AF" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* --- Line Chart (AUM) --- */}
                <motion.path
                    d={linePath}
                    fill="none"
                    stroke="url(#goldGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    pathLength={lineDraw}
                    style={{ opacity: lineOpacity }}
                />

                {/* --- Bar Chart (Returns) --- */}
                <motion.g style={{ opacity: barsOpacity }}>
                    {data.monthlyPerformance.map((d, i) => {
                        const x = (i / (data.monthlyPerformance.length - 1)) * 900 + 50;
                        const h = Math.abs(d.return) * 20;
                        const y = d.return >= 0 ? 300 - h : 300;
                        return (
                            <motion.rect
                                key={`bar-${i}`}
                                x={x - 10}
                                y={y}
                                width="20"
                                height={h}
                                fill={d.return >= 0 ? '#10b981' : '#f43f5e'}
                                initial={{ scaleY: 0 }}
                                whileInView={{ scaleY: 1 }}
                                style={{ transformOrigin: 'center' }}
                                className="opacity-60"
                            />
                        );
                    })}
                    <line x1="50" y1="300" x2="950" y2="300" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                </motion.g>

                {/* --- Donut Chart (Strategies) --- */}
                <motion.g
                    style={{ opacity: donutOpacity, rotate: donutRotate, x: 500, y: 300 }}
                >
                    {data.strategies.map((s, i) => {
                        const startAngle = (data.strategies.slice(0, i).reduce((acc, curr) => acc + curr.allocation, 0) / 100) * Math.PI * 2;
                        const endAngle = startAngle + (s.allocation / 100) * Math.PI * 2;
                        const largeArc = s.allocation > 50 ? 1 : 0;
                        const x1 = Math.cos(startAngle) * 150;
                        const y1 = Math.sin(startAngle) * 150;
                        const x2 = Math.cos(endAngle) * 150;
                        const y2 = Math.sin(endAngle) * 150;

                        return (
                            <motion.path
                                key={`donut-${i}`}
                                d={`M ${x1} ${y1} A 150 150 0 ${largeArc} 1 ${x2} ${y2}`}
                                fill="none"
                                stroke={i % 2 === 0 ? '#D4AF37' : '#E5E4E2'}
                                strokeWidth="40"
                                strokeLinecap="butt"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1, delay: i * 0.1 }}
                                className="opacity-80"
                            />
                        );
                    })}
                </motion.g>

                {/* --- Scatter Plot (AI Models) --- */}
                <motion.g style={{ opacity: scatterOpacity }}>
                    {data.aiModels.map((m, i) => {
                        const x = (m.accuracy / 100) * 800 + 100;
                        const y = 500 - (m.pnl / 80) * 400;
                        return (
                            <motion.circle
                                key={`model-${i}`}
                                cx={x}
                                cy={y}
                                r="10"
                                fill="#D4AF37"
                                className="glow-dot"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                            />
                        );
                    })}
                </motion.g>

                {/* --- Stacked Bars (Financials) --- */}
                <motion.g style={{ opacity: financialsOpacity }}>
                    {data.monthlyPerformance.filter((_, i) => i % 2 === 0).map((d, i) => {
                        const x = (i / 11) * 800 + 100;
                        const revH = (d.revenue / 40) * 300;
                        const costH = (d.cost / 40) * 300;
                        return (
                            <g key={`fin-${i}`}>
                                <rect x={x} y={500 - revH} width="30" height={revH} fill="rgba(212, 175, 55, 0.3)" />
                                <rect x={x} y={500 - costH} width="30" height={costH} fill="rgba(244, 63, 94, 0.4)" />
                            </g>
                        );
                    })}
                </motion.g>
            </svg>
        </div>
    );
};

export default ScrollVisualizer;
