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
            const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/api/monte-carlo/${ticker}`);
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
      // Map holdings to backend Pydantic model shape
      const backendHoldings = holdings.map((h: any) => ({
        symbol:   h.ticker || h.symbol,
        quantity: h.quantity,
        avg_cost: h.avg_cost || h.buy_price || 0,
      }));

      const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/api/portfolio/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings: backendHoldings })
      });
      const data = await res.json();

      const risk      = data.risk_metrics || {};
      const sharpeData = data.sharpe || {};

      const positions = (data.positions || []).map((p: any) => ({
        ticker:        p.ticker || p.symbol,
        quantity:      p.quantity,
        current_value: p.current_value || 0,
        pnl:           p.pnl || 0,
        pnl_pct:       p.pnl_pct || 0,
        weight_pct:    p.weight_pct || 0,
      }));

      const sectorData = (data.sector_exposure?.sectors || []).map((s: any) => ({
        sector:     s.sector,
        weight_pct: s.weight_pct,
        value:      s.value,
      }));

      const divScore = Math.min(100, positions.length * 15 + sectorData.length * 10);

      const portfolioData = {
        overview: {
          total_value:    data.total_current_value || 0,
          total_pnl:      data.total_pnl || 0,
          total_pnl_pct:  data.total_pnl_pct || 0,
        },
        risk: {
          risk_class: risk.risk_class || 'MEDIUM',
          var_95:     { var_dollar: typeof risk.var_95 === 'number' ? risk.var_95 : (risk.var_95?.var_dollar || 0) },
        },
        sharpe: {
          sharpe:  sharpeData.sharpe ?? risk.sharpe_ratio ?? 1.2,
          quality: sharpeData.quality || 'GOOD',
        },
        correlation: { diversification_score: divScore },
        sector_exposure: {
          sectors:            sectorData,
          concentration_risk: data.sector_exposure?.concentration_risk || 'LOW',
        },
        positions,
        ai_advice: data.ai_advice || `Portfolio holds ${positions.length} position${positions.length !== 1 ? 's' : ''} across ${sectorData.length} sector${sectorData.length !== 1 ? 's' : ''}. Review position sizing for optimal risk-adjusted returns.`,
      };

      set(s => ({
        portfolio: portfolioData,
        loading:   { ...s.loading, portfolio: false },
        errors:    { ...s.errors,  portfolio: false },
      }));
    } catch (e) {
      set(s => ({ loading: { ...s.loading, portfolio: false }, errors: { ...s.errors, portfolio: true } }));
    }
  },

  removeHolding: (ticker) => {
    set(s => ({ holdings: s.holdings.filter((h: any) => h.ticker !== ticker) }));
  }

}));
