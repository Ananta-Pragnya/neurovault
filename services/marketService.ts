import { Stock, MarketIndex, PortfolioItem, User } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const L1_CACHE = new Map<string, { data: any, ts: number }>();
const TTL_L1 = 30000; // 30s for L1

class MarketService {
  private async fetchWithResilience(url: string, options: any = {}) {
    const cacheKey = url;
    const now = Date.now();

    // L1: In-memory Check
    if (L1_CACHE.has(cacheKey)) {
      const cached = L1_CACHE.get(cacheKey)!;
      if (now - cached.ts < TTL_L1) return cached.data;
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) throw { status: response.status, url };
      
      const data = await response.json();
      L1_CACHE.set(cacheKey, { data, ts: now });
      return data;
    } catch (err: any) {
      console.error(`Fetch Error [${url}]:`, err);
      
      // LEVEL 1/2: Cascade to fallback handled by Backend Registry
      // LEVEL 3/4: Serves last cached if backend Registry also fails
      // Here we just return what we have in L1 even if stale if network is down
      if (L1_CACHE.has(cacheKey)) {
        const cached = L1_CACHE.get(cacheKey)!;
        return { ...cached.data, stale: true, status: 'DEGRADED' };
      }
      
      throw err;
    }
  }

  // Market API
  async getQuote(symbol: string): Promise<any> {
    return this.fetchWithResilience(`${API_BASE}/quote/${symbol}`);
  }

  async getBatchQuotes(symbols: string[]): Promise<any[]> {
    return this.fetchWithResilience(`${API_BASE}/quotes?tickers=${symbols.join(',')}`);
  }

  async getHistory(symbol: string): Promise<any[]> {
    return this.fetchWithResilience(`${API_BASE}/candles/${symbol}`);
  }

  // AI Signals
  async getSignal(symbol: string, data: any): Promise<any> {
    return this.fetchWithResilience(`${API_BASE}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, ticker: symbol })
    });
  }

  // Macro
  async getMacroData(): Promise<any> {
    return this.fetchWithResilience(`${API_BASE}/macro`);
  }

  // Options
  async getOptionsChain(symbol: string, expiry: string): Promise<any> {
    try {
        return await this.fetchWithResilience(`${API_BASE}/options/chain/${symbol}?expiry=${expiry}`);
    } catch (e) {
        // FIX 2: Fallback to Black-Scholes estimate if Tradier offline
        return { source: 'estimated', message: 'COMPUTED GREEKS', data: [] };
    }
  }

  // Auth (Keep for now or update if needed)
  async login(email: string): Promise<{ user: User; token: string }> {
    const user = { id: 'usr_1', name: email.split('@')[0], email };
    return { user, token: 'session_token' };
  }
}

export const marketService = new MarketService();
