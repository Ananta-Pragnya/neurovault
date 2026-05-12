
export interface StockDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // Indicators
  sma20?: number;
  sma50?: number;
  rsi?: number;
  macd?: number;
  signal?: number;
  upperBand?: number;
  lowerBand?: number;
}

export interface PredictionResult {
  symbol: string;
  nextDayPrice: number;
  forecast7Day: { date: string; price: number }[];
  trend: 'Bullish' | 'Bearish' | 'Sideways';
  confidence: number;
  rmse: number;
  mae: number;
  individualPredictions: Record<string, number>;
  marketAnalysis: string;
}

export enum ModelType {
  LSTM = 'LSTM',
  SVR = 'SVR',
  RandomForest = 'RandomForest',
  LinearRegression = 'LinearRegression',
  KNN = 'KNN'
}

export interface EnsembleWeights {
  [ModelType.LSTM]: number;
  [ModelType.RandomForest]: number;
  [ModelType.SVR]: number;
  [ModelType.KNN]: number;
  [ModelType.LinearRegression]: number;
}
