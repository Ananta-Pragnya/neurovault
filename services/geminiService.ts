
import { AnalysisSignal, NewsSentiment, Stock } from "../types";

// AI Integration paused for institutional stability. Returning high-signal mock data.

export async function analyzeStock(stock: Stock): Promise<AnalysisSignal> {
  return {
    ticker: stock.ticker,
    signal: 'BUY',
    confidence: 85,
    indicators: {
      rsi: 58,
      sma20: stock.price * 0.98,
      sma50: stock.price * 0.95,
      macd: 'Bullish Crossover'
    } as any,
    reasoning: "Quantitative indicators suggest a strong support level with positive momentum. High-conviction entry signal based on institutional flow."
  };
}

export async function getMarketSentiment(): Promise<NewsSentiment> {
  return {
    score: 0.75,
    label: "Positive",
    summary: "Market sentiment remains resilient as institutional liquidity stabilizes. Alpha generation opportunities are high in the tech and energy sectors.",
    headlines: [
      "S&P 500 maintains support above key psychological levels.",
      "VIX identifies historical lows in market volatility.",
      "Global liquidity index signals continued growth trajectory."
    ]
  };
}
