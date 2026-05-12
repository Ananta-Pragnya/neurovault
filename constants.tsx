
import React from 'react';

export const MARKETS = [
  { id: 'NASDAQ', name: 'NASDAQ Composite' },
  { id: 'NYSE', name: 'NYSE' },
  { id: 'NIFTY', name: 'NIFTY 50' },
  { id: 'SENSEX', name: 'SENSEX' },
  { id: 'ASX', name: 'ASX 200' },
  { id: 'SSE', name: 'SSE Composite' }
];

export const MOCK_INDICES = [
  { name: 'S&P 500 Institutional', value: 5123.69, change: 45.12, changePercent: 0.89, status: 'up' },
  { name: 'Euro Stoxx 50', value: 4982.15, change: 22.40, changePercent: 0.45, status: 'up' },
  { name: 'NIFTY 50 Elite', value: 22478.30, change: -89.45, changePercent: -0.40, status: 'down' },
  { name: 'ASX 200 Quant', value: 7789.10, change: 12.30, changePercent: 0.16, status: 'up' },
];

export const MOCK_STOCKS = [
  { ticker: 'AAPL', name: 'Apple Inc.', price: 182.52, change: 1.25, changePercent: 0.69, volume: '54.2M', market: 'NASDAQ' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 875.28, change: 15.42, changePercent: 1.79, volume: '42.1M', market: 'NASDAQ' },
  { ticker: 'RELIANCE', name: 'Reliance Ind.', price: 2984.10, change: -12.40, changePercent: -0.41, volume: '8.2M', market: 'NIFTY' },
  { ticker: 'TSLA', name: 'Tesla Inc.', price: 175.40, change: -4.12, changePercent: -2.29, volume: '89.4M', market: 'NASDAQ' },
  { ticker: 'BHP', name: 'BHP Group', price: 44.12, change: 0.85, changePercent: 1.96, volume: '12.5M', market: 'ASX' },
];

export const ICONS = {
  TrendingUp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  TrendingDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  Wallet: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  Analysis: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Performance: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

// === NEW: Quant Engine Constants (Phase 2) ===

export const SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'BTC/USD', 'ETH/USD', 'MSFT', 'GOOGL', 'AMZN'];

export const DEFAULT_WEIGHTS = {
  LSTM: 0.4,
  RandomForest: 0.3,
  SVR: 0.1,
  KNN: 0.1,
  LinearRegression: 0.1
};

export const INDICATOR_COLORS = {
  sma20: '#f59e0b',
  sma50: '#ec4899',
  rsi: '#a855f7',
  macd: '#22d3ee'
};

