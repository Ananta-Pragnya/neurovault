/**
 * predictionService.ts
 * Fetches the real TA ensemble result from the backend /api/forecast endpoint.
 * Replaces the old axios-based POST to /api/intelligence/forecast.
 */

import { StockDataPoint, PredictionResult } from '../../types';
import { EnsembleWeights } from '../../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export const getPredictions = async (
  symbol: string,
  _data: StockDataPoint[],         // kept for API compat — data now fetched server-side
  _weights: EnsembleWeights = {} as EnsembleWeights
): Promise<PredictionResult> => {
  try {
    const res = await fetch(`${API_BASE}/api/forecast/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();

    // Map backend real-TA shape → PredictionResult contract
    const step      = (json.price_target - json.last_close) / 7;
    const forecast7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      return {
        date:  d.toISOString().split('T')[0],
        price: parseFloat((json.last_close + step * (i + 1)).toFixed(2)),
      };
    });

    return {
      symbol:     json.symbol,
      nextDayPrice: json.price_target,
      forecast7Day: forecast7,
      trend:      json.direction === 'bullish' ? 'Bullish'
                : json.direction === 'bearish' ? 'Bearish'
                : 'Neutral',
      confidence:              json.confidence / 100,
      rmse:                    0,
      mae:                     0,
      individualPredictions: {
        'SMA Trend':    json.signals?.sma_trend?.value    ?? 0,
        'RSI Momentum': json.signals?.rsi_momentum?.value ?? 0,
        'Bollinger':    json.signals?.bollinger?.value    ?? 0,
      },
      marketAnalysis: json.market_analysis ?? 'Ensemble processing complete.',
    };
  } catch (error) {
    console.error('[predictionService] Forecast fetch failed:', error);
    throw new Error('Failed to fetch real TA forecast from backend.');
  }
};
