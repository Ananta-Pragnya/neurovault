// Math utilities for standard normal distribution
function cdfNormal(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
}

function pdfNormal(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export const QuantEngine = {
    // 1. Historical Volatility (from daily prices)
    calculateHistoricalVolatility: (prices: number[], lookbackDays?: number): number => {
        const slice = lookbackDays ? prices.slice(-lookbackDays) : prices;
        if (slice.length < 2) return 0.2; // default 20%
        const logReturns = slice.slice(1).map((p, i) => Math.log(p / slice[i]));
        const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
        const variance = logReturns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / logReturns.length;
        const dailyVol = Math.sqrt(variance);
        return dailyVol * Math.sqrt(252); // Annualized sigma
    },

    // 2. Black-Scholes-Merton + Greeks
    blackScholes: (S: number, K: number, T: number, r: number, sigma: number) => {
        let timeToExpiry = T <= 0 ? 0.0001 : T;
        const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * timeToExpiry) / (sigma * Math.sqrt(timeToExpiry));
        const d2 = d1 - sigma * Math.sqrt(timeToExpiry);

        const callPrice = S * cdfNormal(d1) - K * Math.exp(-r * timeToExpiry) * cdfNormal(d2);
        const putPrice = K * Math.exp(-r * timeToExpiry) * cdfNormal(-d2) - S * cdfNormal(-d1);

        const deltaCall = cdfNormal(d1);
        const deltaPut = deltaCall - 1;
        
        const gamma = pdfNormal(d1) / (S * sigma * Math.sqrt(timeToExpiry));
        
        const thetaCall = -(S * pdfNormal(d1) * sigma) / (2 * Math.sqrt(timeToExpiry)) - r * K * Math.exp(-r * timeToExpiry) * cdfNormal(d2);
        const thetaPut = -(S * pdfNormal(d1) * sigma) / (2 * Math.sqrt(timeToExpiry)) + r * K * Math.exp(-r * timeToExpiry) * cdfNormal(-d2);
        
        const vega = S * Math.sqrt(timeToExpiry) * pdfNormal(d1);
        const rhoCall = K * timeToExpiry * Math.exp(-r * timeToExpiry) * cdfNormal(d2);
        const rhoPut = -K * timeToExpiry * Math.exp(-r * timeToExpiry) * cdfNormal(-d2);

        return {
            callPrice,
            putPrice,
            delta: deltaCall,
            gamma,
            theta: thetaCall / 365, // per day
            vega: vega / 100, // per 1% change
            rho: rhoCall / 100
        };
    },

    // 3. Monte Carlo GBM
    monteCarloGBM: (S: number, mu: number, sigma: number, days: number, paths: number = 10000): number[][] => {
        const dt = 1 / 252;
        const allPaths: number[][] = [];
        
        for (let i = 0; i < paths; i++) {
            const path = [S];
            let currentPrice = S;
            for (let d = 1; d <= days; d++) {
                // Box-Muller transform
                let u1 = Math.random();
                let u2 = Math.random();
                if(u1 === 0) u1 = 1e-5;
                const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
                
                currentPrice = currentPrice * Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
                path.push(currentPrice);
            }
            allPaths.push(path);
        }
        return allPaths;
    },

    // Extract Percentiles and StdDev from terminal prices
    extractPercentiles: (paths: number[][]) => {
        const terminals = paths.map(p => p[p.length - 1]).sort((a,b) => a - b);
        const mean = terminals.reduce((a,b) => a+b, 0) / terminals.length;
        const variance = terminals.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / terminals.length;
        
        return {
            p5: terminals[Math.floor(terminals.length * 0.05)],
            p25: terminals[Math.floor(terminals.length * 0.25)],
            p50: terminals[Math.floor(terminals.length * 0.50)],
            p75: terminals[Math.floor(terminals.length * 0.75)],
            p95: terminals[Math.floor(terminals.length * 0.95)],
            mean: mean,
            stdDev: Math.sqrt(variance)
        };
    },

    // 4. Risk Metrics
    calculateVaR: (terminalPrices: number[], S: number, confidenceLevel: number = 0.95): number => {
        const sorted = [...terminalPrices].sort((a, b) => a - b);
        const percentileIndex = Math.floor(sorted.length * (1 - confidenceLevel));
        const varPrice = sorted[percentileIndex];
        return Math.max(0, S - varPrice); // VaR in dollar terms
    },

    calculateCVaR: (terminalPrices: number[], S: number, confidenceLevel: number = 0.95): number => {
        const sorted = [...terminalPrices].sort((a, b) => a - b);
        const tailLength = Math.floor(sorted.length * (1 - confidenceLevel));
        if (tailLength === 0) return 0;
        const tailLosses = sorted.slice(0, tailLength).map(p => Math.max(0, S - p));
        return tailLosses.reduce((a, b) => a + b, 0) / tailLength;
    },

    calculateSharpeRatio: (returns: number[], rfr: number): number => {
        if (returns.length === 0) return 0;
        const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const excessReturn = meanReturn - (rfr / 252);
        const variance = returns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) / returns.length;
        const dailyStdDev = Math.sqrt(variance);
        return dailyStdDev > 0 ? (excessReturn / dailyStdDev) * Math.sqrt(252) : 0;
    },

    calculateMaxDrawdown: (prices: number[]): number => {
        if (prices.length === 0) return 0;
        let maxPeak = prices[0];
        let maxDrawdown = 0;
        for (const p of prices) {
            if (p > maxPeak) maxPeak = p;
            const drawdown = (maxPeak - p) / maxPeak;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }
        return maxDrawdown;
    },

    // 5. Kelly Criterion
    kellyCriterion: (winProbability: number, odds: number): number => {
        // odds = b (multiplier of bet, 1 = 1:1)
        const q = 1 - winProbability;
        if(odds <= 0) return 0;
        const kelly = (winProbability * odds - q) / odds;
        return Math.max(0, kelly); 
    }
};
