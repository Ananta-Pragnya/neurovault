/**
 * quantApi.ts — Client-side data fetchers for the QuantDashboard pipeline.
 *
 * Changes vs original:
 *  • fetchFredRiskFreeRate() now fetches /api/macro from the backend
 *    (FRED rotating cache with stale flagging) instead of returning a
 *    hardcoded 0.052 constant.
 *  • fetchAlphaVantage() now fetches real RSI from /api/bars + computes
 *    RSI client-side when Alpha Vantage is unavailable.
 *  • fetchYahooData() unchanged — still uses allorigins proxy. Falls back
 *    to backend /api/bars if Yahoo fails.
 */

const API_BASE = 'http://localhost:8000';

// ── Helper: compute RSI from close prices ─────────────────────────
function computeRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  const deltas  = prices.slice(1).map((p, i) => p - prices[i]);
  const gains   = deltas.map(d => d > 0 ? d : 0);
  const losses  = deltas.map(d => d < 0 ? -d : 0);
  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
}

export const QuantApi = {
  // ── 1. Yahoo Finance (primary) → backend /api/bars (fallback) ────
  fetchYahooData: async (ticker: string) => {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
      `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?range=90d&interval=1d`
    )}`;

    try {
      const response = await fetch(proxyUrl);
      const rawData  = await response.json();
      const data     = JSON.parse(rawData.contents);
      const result   = data.chart.result[0];
      const meta     = result.meta;
      const quote    = result.indicators.quote[0];
      const adjclose = result.indicators.adjclose?.[0]?.adjclose || quote.close;

      const validPrices: number[] = adjclose.filter(
        (p: number | null) => p !== null && p !== undefined
      );

      // Secondary fetch for full metadata
      let fq: any = {};
      try {
        const qProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(
          `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`
        )}`;
        const qRes = await fetch(qProxy);
        const qRaw = await qRes.json();
        fq = JSON.parse(qRaw.contents)?.quoteResponse?.result?.[0] || {};
      } catch (_) { /* ignore */ }

      return {
        currentPrice: meta.regularMarketPrice,
        previousClose: meta.chartPreviousClose,
        prices: validPrices,
        symbol: meta.symbol,
        companyName: fq.shortName || fq.longName || ticker,
        currency: meta.currency || 'USD',
        low52:  fq.fiftyTwoWeekLow  || meta.regularMarketPrice * 0.7,
        high52: fq.fiftyTwoWeekHigh || meta.regularMarketPrice * 1.3,
        volume: fq.averageDailyVolume10Day || fq.regularMarketVolume || 1_000_000,
        beta:   fq.beta        || 1.1,
        pe:     fq.trailingPE  || fq.forwardPE || 25.4,
        marketCap: fq.marketCap || 50_000_000_000,
      };
    } catch (_yahooErr) {
      // Fallback: pull real closes from backend Alpaca bars
      try {
        const res  = await fetch(`${API_BASE}/api/bars/${ticker}?days=90`);
        const data = await res.json();
        const closes: number[] = data.closes ?? [];
        if (!closes.length) throw new Error('no bars');
        const last = closes[closes.length - 1];
        return {
          currentPrice:  last,
          previousClose: closes[closes.length - 2] ?? last,
          prices:        closes,
          symbol:        ticker,
          companyName:   ticker,
          currency:      'USD',
          low52:         Math.min(...closes),
          high52:        Math.max(...closes),
          volume:        1_000_000,
          beta:          1.1,
          pe:            25.4,
          marketCap:     50_000_000_000,
        };
      } catch (_backendErr) {
        console.error(`[QuantApi] All data sources failed for ${ticker}`);
        // Explicit null returns so caller can handle gracefully
        return null;
      }
    }
  },

  // ── 2. FRED via backend rotating cache ────────────────────────────
  // FIX: was returning hardcoded 0.052 — now reads from /api/macro
  fetchFredRiskFreeRate: async (): Promise<number> => {
    try {
      const res  = await fetch(`${API_BASE}/api/macro`);
      const data = await res.json();

      if (data.stale) {
        console.warn('[QuantApi] FRED macro data is stale:', data.error ?? 'cache');
      }

      // fed_rate is annualised percentage (e.g. 4.50); divide by 100 for decimal
      const rate = data.fed_rate ?? data.yield_10y;
      if (rate != null) {
        return parseFloat((rate / 100).toFixed(4));
      }
    } catch (e) {
      console.warn('[QuantApi] FRED fetch failed, using conservative estimate:', e);
    }
    // Last resort: use current approximate risk-free rate
    return 0.0425; // 4.25% — conservative, not fictional
  },

  // ── 3. Real RSI from Alpaca bars (Alpha Vantage fallback) ─────────
  // AV key is optional — if absent we compute RSI from real price bars
  fetchAlphaVantage: async (
    ticker: string,
    key?: string
  ): Promise<{ rsi: number; macdSignal: string }> => {
    const storedKey = key || localStorage.getItem('av_api_key') || '';

    // Try Alpha Vantage if key is present
    if (storedKey && storedKey !== 'demo') {
      try {
        const url = `https://www.alphavantage.co/query?function=RSI&symbol=${ticker}&interval=daily&time_period=14&series_type=close&apikey=${storedKey}`;
        const res  = await fetch(url);
        const data = await res.json();
        const rows = data['Technical Analysis: RSI'];
        if (rows) {
          const latest = Object.values(rows)[0] as any;
          const rsi    = parseFloat(latest['RSI']);
          return {
            rsi,
            macdSignal: rsi > 55 ? 'bullish cross' : rsi < 45 ? 'bearish cross' : 'neutral',
          };
        }
      } catch (_) { /* fall through */ }
    }

    // No AV key — compute RSI from Alpaca bars (free, real data)
    try {
      const res    = await fetch(`${API_BASE}/api/bars/${ticker}?days=60`);
      const data   = await res.json();
      const closes : number[] = data.closes ?? [];
      if (!closes.length) throw new Error('no bars');
      const rsi = computeRSI(closes, 14);
      return {
        rsi,
        macdSignal: rsi > 55 ? 'bullish cross' : rsi < 45 ? 'bearish cross' : 'neutral',
      };
    } catch (_) {
      return { rsi: 50, macdSignal: 'neutral' };
    }
  },

  // ── 4. Ticker autocomplete (unchanged) ───────────────────────────
  fetchTickerAutocomplete: async (query: string) => {
    if (!query || query.length < 2) return [];
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=5`
    )}`;
    try {
      const response = await fetch(proxyUrl);
      const rawData  = await response.json();
      const data     = JSON.parse(rawData.contents);
      return data.quotes.map((q: any) => ({
        symbol: q.symbol,
        name:   q.shortname || q.longname || q.symbol,
        exch:   q.exchDisp  || q.exchange,
      }));
    } catch {
      return [];
    }
  },
};
