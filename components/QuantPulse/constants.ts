
import { EnsembleWeights, ModelType } from './types';

export const DEFAULT_WEIGHTS: EnsembleWeights = {
  [ModelType.LSTM]: 0.4,
  [ModelType.RandomForest]: 0.25,
  [ModelType.SVR]: 0.2,
  [ModelType.KNN]: 0.1,
  [ModelType.LinearRegression]: 0.05
};

export const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'BTC/USD', 'ETH/USD'];

export const INDICATOR_COLORS = {
  price: '#10b981',
  prediction: '#8b5cf6',
  sma20: '#f59e0b',
  sma50: '#3b82f6',
  upper: '#ef4444',
  lower: '#ef4444'
};
