/**
 * API Service Layer — Typed client for all /api/v2/* endpoints
 * Every call goes through here. No direct fetch() in components.
 */

import type {
  FusedSignal, TickerSearchResult, QuoteData, OptionsIntelligence,
  SentimentData, MonteCarloResult, PortfolioAnalytics, MacroData, PayoffPoint
} from '../types';

const API_BASE = `${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/api/v2`;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// --- Search ---
export async function searchTickers(query: string): Promise<{ results: TickerSearchResult[] }> {
  return apiFetch(`/search?q=${encodeURIComponent(query)}`);
}

// --- Signals ---
export async function getSignal(ticker: string, timeframe = '6mo'): Promise<FusedSignal> {
  return apiFetch(`/signal/${encodeURIComponent(ticker)}?timeframe=${timeframe}`);
}

// --- Quotes ---
export async function getBatchQuotes(tickers: string[]): Promise<{ quotes: QuoteData[] }> {
  return apiFetch(`/quotes?tickers=${tickers.join(',')}`);
}

// --- Options ---
export async function getOptions(ticker: string, expiryDays = 30): Promise<OptionsIntelligence> {
  return apiFetch(`/options/${encodeURIComponent(ticker)}?expiry_days=${expiryDays}`);
}

// --- News & Sentiment ---
export async function getNewsSentiment(ticker: string): Promise<SentimentData> {
  return apiFetch(`/news/${encodeURIComponent(ticker)}`);
}

// --- Portfolio ---
export async function analyzePortfolio(holdings: any[]): Promise<PortfolioAnalytics> {
  return apiFetch('/portfolio/analyze', {
    method: 'POST',
    body: JSON.stringify({ holdings }),
  });
}

// --- Simulation ---
export async function runSimulation(params: {
  ticker?: string;
  initial_price: number;
  expected_return: number;
  volatility: number;
  time_horizon: number;
  n_paths?: number;
  scenario?: string;
}): Promise<MonteCarloResult> {
  return apiFetch('/simulate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// --- Payoff ---
export async function getPayoff(params: {
  strategy: string;
  stock_price: number;
  strike: number;
  premium: number;
  strike2?: number;
  premium2?: number;
}): Promise<{ strategy: string; payoff: PayoffPoint[] }> {
  return apiFetch('/payoff', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// --- Macro ---
export async function getMacroData(): Promise<MacroData> {
  return apiFetch('/macro');
}

// --- AI Q&A ---
export async function askAI(question: string, ticker?: string): Promise<{ answer: string }> {
  return apiFetch('/ai/query', {
    method: 'POST',
    body: JSON.stringify({ question, ticker }),
  });
}

// --- Technicals ---
export async function getTechnicals(ticker: string, period = '6mo') {
  return apiFetch(`/technicals/${encodeURIComponent(ticker)}?period=${period}`);
}
