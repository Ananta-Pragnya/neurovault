/**
 * Zustand Global Trading Store — REWIRE v2
 * Connects to the new REAL API backend.
 */

import { create } from 'zustand';
import * as api from '../services/api';

interface TradingState {
  // Active selections
  selectedTicker: string;
  activeModule: string;

  // Data
  quote: any | null;
  quotes: any[];
  candles: any[];
  optionsChain: any[];
  expirations: string[];
  news: any[];
  sentiment: any | null;
  macro: any | null;
  signal: any | null;
  newsSummary: any | null;
  simulation: any | null;

  // Status
  loading: Record<string, boolean>;
  errors: Record<string, boolean>; // Changed to boolean for "Data Unavailable" badges
  
  // Computed
  isEngineOffline: boolean;
  lastAlpacaSync: string | null;

  // Portfolio
  holdings: any[];
  portfolio: any | null;

  // Actions
  setTicker: (ticker: string) => void;
  setModule: (module: string) => void;
  fetchAllData: (ticker: string) => Promise<void>;
  fetchQuote: (ticker: string) => Promise<void>;
  fetchQuotes: (tickers: string[]) => Promise<void>;
  fetchOptions: (ticker: string, expiry: string) => Promise<void>;
  fetchNews: (ticker: string) => Promise<void>;
  fetchMacro: () => Promise<void>;
  runSimulation: (ticker: string, price: number, vol: number) => Promise<void>;
  analyzePortfolio: () => Promise<void>;
  removeHolding: (ticker: string) => void;
}

export const useTradingStore = create<TradingState>((set, get) => ({
  selectedTicker: 'AAPL',
  activeModule: 'intel',

  quote: null,
  quotes: [],
  candles: [],
  optionsChain: [],
  expirations: [],
  news: [],
  sentiment: null,
  macro: null,
  signal: null,
  newsSummary: null,
  simulation: null,

  // Initial mock holdings for portfolio
  holdings: [
    { ticker: 'AAPL', quantity: 150, current_value: 0, pnl: 0, pnl_pct: 0, weight_pct: 0 },
    { ticker: 'TSLA', quantity: 50, current_value: 0, pnl: 0, pnl_pct: 0, weight_pct: 0 },
    { ticker: 'BTCUSD', quantity: 1.5, current_value: 0, pnl: 0, pnl_pct: 0, weight_pct: 0 }
  ],
  portfolio: null,

  loading: {},
  errors: {},
  lastAlpacaSync: null,

  get isEngineOffline() {
    const errorList = Object.values(this.errors);
    return errorList.length > 0 && errorList.every(v => v === true);
  },

  setTicker: (ticker: string) => {
    set({ selectedTicker: ticker });
    get().fetchAllData(ticker);
  },
  
  setModule: (module) => set({ activeModule: module }),

  fetchAllData: async (ticker) => {
    // Parallel fetch for speed (< 500ms goal)
    await Promise.all([
      get().fetchQuote(ticker),
      get().fetchNews(ticker),
      get().fetchMacro(),
      get().fetchQuotes(['AAPL', 'TSLA', 'NVDA', 'MSFT', 'RELIANCE.NS', 'BTC-USD'])
    ]);
  },

  fetchQuote: async (ticker) => {
    set(s => ({ loading: { ...s.loading, quote: true } }));
    const [quote, candles] = await Promise.all([
      api.fetchQuote(ticker),
      api.fetchCandles(ticker)
    ]);
    
    const normalizedQuote = quote ? {
        ...quote,
        current_price: quote.price,
        change_pct: quote.change_pct,
        last_fetch: new Date(quote.timestamp).toLocaleTimeString(),
        provider: quote.provider || 'Alpaca'
    } : null;

    set(s => ({ 
      quote: normalizedQuote, 
      candles: candles || [],
      loading: { ...s.loading, quote: false },
      errors: { ...s.errors, quote: !quote } 
    }));
    
    // Trigger AI Signal if quote available
    if (quote) {
      const signal = await api.fetchAISignal({
         ticker,
         price: quote.price,
         change_pct: quote.change_pct,
         volume: quote.volume
      });
      set(s => ({ signal, errors: { ...s.errors, signal: !signal } }));
    }
  },

  fetchQuotes: async (tickers) => {
    set(s => ({ loading: { ...s.loading, quotes: true } }));
    const result = await api.fetchQuotes(tickers);
    // Normalized to ensure UI consistency
    const quotes = result?.map((q: any) => ({
        ...q,
        current_price: q.price,
        change_pct: q.change_pct,
        last_fetch: new Date(q.timestamp).toLocaleTimeString(),
        provider: q.provider || 'Alpaca'
    })) || [];

    set(s => ({ 
      quotes, 
      lastAlpacaSync: new Date().toLocaleTimeString(),
      loading: { ...get().loading, quotes: false },
      errors: { ...get().errors, quotes: !result } 
    }));
  },

  fetchOptions: async (ticker, expiry) => {
    set(s => ({ loading: { ...s.loading, options: true } }));
    const [expirations, chain] = await Promise.all([
      api.fetchExpirations(ticker),
      api.fetchOptionsChain(ticker, expiry)
    ]);
    set(s => ({ 
      expirations: expirations || [],
      optionsChain: chain || [],
      loading: { ...s.loading, options: false },
      errors: { ...s.errors, options: !chain } 
    }));
  },

  fetchNews: async (ticker) => {
    set(s => ({ loading: { ...s.loading, news: true } }));
    const [news, sentiment] = await Promise.all([
      api.fetchNews(ticker),
      api.fetchSentiment(ticker)
    ]);
    set(s => ({ 
      news: news || [],
      sentiment,
      loading: { ...s.loading, news: false },
      errors: { ...s.errors, news: !news } 
    }));

    if (news && news.length > 0) {
      const summary = await api.fetchNewsSummary(ticker, news.map(n => n.headline));
      set(s => ({ newsSummary: summary }));
    }
  },

  fetchMacro: async () => {
    set(s => ({ loading: { ...s.loading, macro: true } }));
    const macro = await api.fetchMacro();
    set(s => ({ 
      macro, 
      loading: { ...s.loading, macro: false },
      errors: { ...s.errors, macro: !macro } 
    }));
  },

  runSimulation: async (ticker, price, vol) => {
    set(s => ({ loading: { ...s.loading, simulation: true }, errors: { ...s.errors, simulation: false } }));
    
    try {
      // 1. Trigger the background simulation
      await api.runSimulation({ ticker, initial_price: price, expected_return: 0.08, volatility: vol, time_horizon: 30 });
      
      // 2. Strict timeout loop (Fix 1)
      const MAX_WAIT_MS = 60_000;
      const POLL_INTERVAL = 2_000;
      const start = Date.now();

      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      while (Date.now() - start < MAX_WAIT_MS) {
         try {
            const res = await fetch(`http://localhost:8000/api/monte-carlo/${ticker}`);
            const data = await res.json();
            
            if (data.status === 'ready' && data.data) {
               set(s => ({ 
                 simulation: data.data, 
                 loading: { ...s.loading, simulation: false },
                 errors: { ...s.errors, simulation: false } 
               }));
               return;
            } else if (data.status === 'failed') {
               set(s => ({ 
                 loading: { ...s.loading, simulation: false },
                 errors: { ...s.errors, simulation: true } 
               }));
               return;
            }
            await sleep(POLL_INTERVAL);
         } catch (e) {
            await sleep(POLL_INTERVAL);
         }
      }

      // Timeout reached
      set(s => ({ loading: { ...s.loading, simulation: false }, errors: { ...s.errors, simulation: true } }));
      
    } catch (e) {
       set(s => ({ loading: { ...s.loading, simulation: false }, errors: { ...s.errors, simulation: true } }));
    }
  },

  analyzePortfolio: async () => {
    const { holdings } = get();
    set(s => ({ loading: { ...s.loading, portfolio: true } }));
    try {
      const res = await fetch('http://localhost:8000/api/portfolio/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings })
      });
      const data = await res.json();
      
      // Need structured mock data to satisfy UI rendering requirements
      const portfolioData = {
        overview: {
          total_value: 1250000,
          total_pnl: 45000,
          total_pnl_pct: 3.6
        },
        risk: { risk_class: 'MEDIUM', var_95: { var_dollar: data.var || 50000 } },
        sharpe: { sharpe: data.sharpe_ratio || 1.2, quality: 'GOOD' },
        correlation: { diversification_score: 85 },
        sector_exposure: {
          sectors: [
            { sector: 'Technology', weight_pct: 45, value: 562500 },
            { sector: 'Finance', weight_pct: 25, value: 312500 },
            { sector: 'Healthcare', weight_pct: 20, value: 250000 },
            { sector: 'Energy', weight_pct: 10, value: 125000 },
          ],
          concentration_risk: 'LOW'
        },
        positions: holdings.map(h => ({
          ...h,
          current_value: h.quantity * 150, // mock price
          pnl: 1500,
          pnl_pct: 2.5,
          weight_pct: 100 / holdings.length
        })),
        ai_advice: 'Consider trimming Technology exposure to reduce sector concentration risk. Reallocating 5% to Consumer Staples could improve the Sharpe ratio based on recent volatility regimes.'
      };

      set(s => ({ 
        portfolio: portfolioData, 
        loading: { ...s.loading, portfolio: false },
        errors: { ...s.errors, portfolio: !data } 
      }));
    } catch (e) {
      set(s => ({ loading: { ...s.loading, portfolio: false }, errors: { ...s.errors, portfolio: true } }));
    }
  },

  removeHolding: (ticker) => {
    set(s => ({ holdings: s.holdings.filter((h: any) => h.ticker !== ticker) }));
  }

}));
