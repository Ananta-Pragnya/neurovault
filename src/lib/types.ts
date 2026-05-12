export interface MarketDigest {
    market_mood: "Risk-On" | "Risk-Off" | "Neutral" | "Euphoria" | "Panic";
    top_bullets: string[];
    probabilities: {
        short_week: number;
        medium_month: number;
        long_quarter: number;
    };
    top_shock_candidates: {
        ticker: string;
        reason: string;
        severity: number;
    }[];
    recommendations: {
        action: string;
        text: string;
        confidence: number;
    }[];
}

export interface TickerSnapshot {
    ticker: string;
    name?: string;
    price: number;
    change: number;
    change_dollars?: number;
    volume: number;
    bid?: number;
    ask?: number;
    timestamp: string;
    commentary?: string;
}
