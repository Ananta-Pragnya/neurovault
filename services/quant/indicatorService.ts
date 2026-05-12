
import { StockDataPoint } from '../../types';

export const calculateTechnicalIndicators = (data: StockDataPoint[]): StockDataPoint[] => {
  const result = [...data];

  // SMA calculation
  const calcSMA = (period: number, key: keyof StockDataPoint) => {
    for (let i = period - 1; i < result.length; i++) {
      const window = result.slice(i - period + 1, i + 1);
      const sum = window.reduce((acc, val) => acc + (val[key] as number), 0);
      const smaKey = `sma${period}` as keyof StockDataPoint;
      (result[i] as any)[smaKey] = sum / period;
    }
  };

  calcSMA(20, 'close');
  calcSMA(50, 'close');

  // RSI calculation
  const period = 14;
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < result.length; i++) {
    const diff = result[i].close - result[i - 1].close;
    if (diff > 0) gains += diff;
    else losses -= diff;

    if (i >= period) {
      if (i > period) {
        const prevDiff = result[i - 1].close - result[i - 2].close;
        const avgGain = (gains * (period - 1) + (diff > 0 ? diff : 0)) / period;
        const avgLoss = (losses * (period - 1) + (diff < 0 ? -diff : 0)) / period;
        result[i].rsi = 100 - (100 / (1 + avgGain / (avgLoss || 1)));
      } else {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        result[i].rsi = 100 - (100 / (1 + avgGain / (avgLoss || 1)));
      }
    }
  }

  // Bollinger Bands
  const bbPeriod = 20;
  for (let i = bbPeriod - 1; i < result.length; i++) {
    const window = result.slice(i - bbPeriod + 1, i + 1);
    const sma = result[i].sma20 || 0;
    const squareDiffs = window.map(v => Math.pow(v.close - sma, 2));
    const stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b) / bbPeriod);
    result[i].upperBand = sma + 2 * stdDev;
    result[i].lowerBand = sma - 2 * stdDev;
  }

  return result;
};
