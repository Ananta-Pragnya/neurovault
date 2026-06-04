import { API_BASE } from '../config';

/**
 * Live API Service Layer — REWIRE v2
 * Connects FINMOTION to real Polygon, Tradier, Finnhub, FRED, and Claude endpoints.
 */

const handleResponse = async (name, res) => {
  if (!res.ok) {
    console.error(`[API ERROR] ${name}: ${res.status} ${await res.text()}`);
    return null;
  }
  return res.json();
};

export const fetchQuote = async (ticker) => {
  try {
    const res = await fetch(`${API_BASE}/api/quote/${ticker}`);
    return await handleResponse('fetchQuote', res);
  } catch (e) {
    console.error('[API ERROR] fetchQuote:', e);
    return null;
  }
};

export const searchTickers = async (q) => {
  try {
    const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`);
    return await handleResponse('searchTickers', res);
  } catch (e) {
    console.error('[API ERROR] searchTickers:', e);
    return null;
  }
};

export const fetchQuotes = async (tickers) => {
  try {
    const res = await fetch(`${API_BASE}/api/quotes?tickers=${tickers.join(',')}`);
    return await handleResponse('fetchQuotes', res);
  } catch (e) {
    console.error('[API ERROR] fetchQuotes:', e);
    return null;
  }
};

export const fetchCandles = async (ticker, timeframe = 'day', limit = 90) => {
  try {
    const res = await fetch(`${API_BASE}/api/candles/${ticker}?timeframe=${timeframe}&limit=${limit}`);
    return await handleResponse('fetchCandles', res);
  } catch (e) {
    console.error('[API ERROR] fetchCandles:', e);
    return null;
  }
};

export const fetchOptionsChain = async (ticker, expiry) => {
  try {
    const res = await fetch(`${API_BASE}/api/options/chain/${ticker}?expiry=${expiry}`);
    return await handleResponse('fetchOptionsChain', res);
  } catch (e) {
    console.error('[API ERROR] fetchOptionsChain:', e);
    return null;
  }
};

export const fetchExpirations = async (ticker) => {
  try {
    const res = await fetch(`${API_BASE}/api/options/expirations/${ticker}`);
    return await handleResponse('fetchExpirations', res);
  } catch (e) {
    console.error('[API ERROR] fetchExpirations:', e);
    return null;
  }
};

export const fetchNews = async (ticker) => {
  try {
    const res = await fetch(`${API_BASE}/api/news/${ticker}`);
    const data = await handleResponse('fetchNews', res);
    // Backend returns {articles, sentiment, score, count} — extract the array
    return data?.articles || null;
  } catch (e) {
    console.error('[API ERROR] fetchNews:', e);
    return null;
  }
};

export const fetchSentiment = async (ticker) => {
  try {
    // Sentiment is embedded in the news response — reuse the same endpoint
    const res = await fetch(`${API_BASE}/api/news/${ticker}`);
    const data = await handleResponse('fetchSentiment', res);
    if (!data) return null;
    return {
      sentiment: (data.score + 1) / 2,                 // normalize -1..1 → 0..1 (0.5 = neutral)
      buzz: Math.min(1, Math.abs(data.score) + 0.2),   // rough social buzz proxy
      label: data.sentiment,                            // 'bullish'|'bearish'|'neutral'
    };
  } catch (e) {
    console.error('[API ERROR] fetchSentiment:', e);
    return null;
  }
};

export const fetchMacro = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/macro`);
    return await handleResponse('fetchMacro', res);
  } catch (e) {
    console.error('[API ERROR] fetchMacro:', e);
    return null;
  }
};

export const fetchAISignal = async (marketData) => {
  try {
    const res = await fetch(`${API_BASE}/api/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(marketData),
    });
    return await handleResponse('fetchAISignal', res);
  } catch (e) {
    console.error('[API ERROR] fetchAISignal:', e);
    return null;
  }
};

export const fetchNewsSummary = async (_ticker, _headlines) => {
  // No dedicated summary endpoint — AI summary comes from the intelligence endpoint
  return null;
};

export const fetchEarnings = async (ticker) => {
  try {
    const res = await fetch(`${API_BASE}/api/earnings/${ticker}`);
    return await handleResponse('fetchEarnings', res);
  } catch (e) {
    console.error('[API ERROR] fetchEarnings:', e);
    return null;
  }
};

export const runSimulation = async ({ ticker, initial_price, volatility, time_horizon = 30 } = {}) => {
  try {
    const res = await fetch(`${API_BASE}/api/simulate/${encodeURIComponent(ticker)}`, { method: 'POST' });
    return await handleResponse('runSimulation', res);
  } catch (e) {
    console.error('[API ERROR] runSimulation:', e);
    return null;
  }
};
