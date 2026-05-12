
export interface Stock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  market: string;
  history: { time: string; price: number; volume: number }[];
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  status: 'up' | 'down';
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface PortfolioItem {
  id: string;
  ticker: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
}

// === NEW: Trading Intelligence Types ===

export interface FusedSignal {
  ticker: string;
  market: string;
  signal: string;
  confidence: number;
  risk_level: string;
  sentiment: string;
  trend: string;
  trend_strength: number;
  iv_rank: number | null;
  macro_context: string;
  ai_reasoning: string;
  price: number;
  change_pct: number;
  volume: number;
  timestamp: number;
  signals: TechnicalSignal[];
  quality: string;
}

export interface TechnicalSignal {
  name: string;
  value: string;
  detail: string;
}

export interface TickerSearchResult {
  ticker: string;
  name: string;
  market: string;
}

export interface QuoteData {
  ticker: string;
  name: string;
  market: string;
  current_price: number;
  previous_close: number;
  change: number;
  change_pct: number;
  volume: number;
  avg_volume: number;
  market_cap: number;
  day_high: number;
  day_low: number;
  fifty_two_week_high: number;
  fifty_two_week_low: number;
  sparkline: number[];
  sector: string;
  currency: string;
  volume_spike: { spike: boolean; ratio: number; label: string };
}

export interface OptionsChainItem {
  strike: number;
  call_price: number;
  put_price: number;
  call_greeks: OptionGreeks;
  put_greeks: OptionGreeks;
  itm_call: boolean;
  itm_put: boolean;
}

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface OptionsIntelligence {
  ticker: string;
  current_price: number;
  chain: OptionsChainItem[];
  iv_rank: number;
  iv_environment: string;
  strategy_recommendation: StrategyRecommendation;
  summary: string;
}

export interface StrategyRecommendation {
  context: {
    iv_rank: number;
    trend: string;
    days_to_expiry: number;
    earnings_soon: boolean;
    iv_environment: string;
  };
  primary: {
    name: string;
    action: string;
    rationale: string;
    risk: string;
    ideal_dte: string;
    confidence: number;
  };
  alternatives: Array<{
    name: string;
    action: string;
    rationale: string;
    confidence: number;
  }>;
}

export interface SentimentData {
  ticker: string;
  sentiment: {
    score: number;
    label: string;
    confidence: number;
    count: number;
    breakdown: { positive: number; negative: number; neutral: number };
  };
  headlines: Array<{
    text: string;
    score: number;
    label: string;
    confidence: number;
  }>;
  events: Array<{
    type: string;
    priority: string;
    headline: string;
  }>;
  market_mood: string;
}

export interface MonteCarloResult {
  paths: number[][];
  time_labels: string[];
  final_prices: number[];
  statistics: {
    mean: number;
    median: number;
    std_dev: number;
    min: number;
    max: number;
    percentile_5: number;
    percentile_25: number;
    percentile_75: number;
    percentile_95: number;
    prob_above_start: number;
    prob_loss_10pct: number;
    prob_gain_20pct: number;
  };
  parameters: {
    initial_price: number;
    expected_return: number;
    volatility: number;
    time_horizon_years: number;
    n_paths: number;
  };
  scenario?: {
    name: string;
    label: string;
  };
}

export interface PortfolioAnalytics {
  overview: {
    total_value: number;
    total_pnl: number;
    total_pnl_pct: number;
    positions_count: number;
    winners: number;
    losers: number;
  };
  positions: PortfolioPosition[];
  risk: {
    var_95?: { var_pct: number; var_dollar: number };
    var_99?: { var_pct: number; var_dollar: number };
    daily_volatility?: number;
    annual_volatility?: number;
    max_drawdown?: { max_drawdown_pct: number; peak: number; trough: number };
    risk_class?: string;
    risk_label?: string;
  };
  correlation: {
    matrix?: number[][];
    tickers?: string[];
    diversification_score?: number;
    most_correlated?: { pair: string[]; correlation: number };
    least_correlated?: { pair: string[]; correlation: number };
  };
  sector_exposure: {
    sectors?: Array<{ sector: string; value: number; weight_pct: number }>;
    concentration_risk?: string;
  };
  sharpe: { sharpe?: number; quality?: string; annualized_return?: number; annualized_vol?: number };
  ai_advice: string;
}

export interface PortfolioPosition {
  ticker: string;
  quantity: number;
  invested: number;
  current_value: number;
  pnl: number;
  pnl_pct: number;
  weight_pct: number;
  status: string;
}

export interface MacroData {
  fed_rate: number;
  fed_rate_direction: string;
  cpi: number;
  cpi_trend: string;
  gdp_growth: number;
  unemployment: number;
  yield_curve: string;
  ten_year_yield: number;
  two_year_yield: number;
  spread_10y_2y: number;
  vix: number;
  dollar_index: number;
  outlook: string;
}

export interface PayoffPoint {
  price: number;
  total_pnl: number;
  stock_pnl?: number;
  option_pnl?: number;
  call_pnl?: number;
  put_pnl?: number;
}

export interface AnalysisSignal {
  ticker: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  indicators: {
    rsi: number;
    sma20: number;
    sma50: number;
    macd: string;
  };
  reasoning: string;
}

export interface NewsSentiment {
  score: number;
  label: 'Positive' | 'Neutral' | 'Negative';
  summary: string;
  headlines: string[];
}

// === NEW: Federated Intelligence Types (Phase 2) ===

export interface StockDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20?: number;
  sma50?: number;
  rsi?: number;
  macd?: number;
  upperBand?: number;
  lowerBand?: number;
  forecastClose?: number;
}

export interface PredictionResult {
  symbol?: string;
  nextDayPrice: number;
  forecast7Day: { date: string; price: number }[];
  trend: 'Bullish' | 'Bearish' | 'Sideways' | 'Neutral';
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

export interface NewsIntelligenceResponse {
  summary: string;
  keyPoints: string[];
  sentiment: 'Bullish' | 'Bearish' | 'Neutral' | 'Mixed';
  prediction: string;
  sources: Array<{ title: string; uri: string }>;
  timestamp: number;
}

export interface CachedData {
  [query: string]: NewsIntelligenceResponse;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}


