
export interface Source {
  title: string;
  uri: string;
}

export interface NewsIntelligenceResponse {
  summary: string;
  keyPoints: string[];
  sentiment: 'Bullish' | 'Bearish' | 'Neutral' | 'Mixed';
  prediction: string;
  sources: Source[];
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
