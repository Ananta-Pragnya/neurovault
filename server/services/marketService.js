import marketProvider from './marketProvider.js';
import cacheService from './cacheService.js';
import aiService from './aiService.js';
import logger from '../utils/logger.js';

class MarketService {
    constructor() {
        this.pendingRequests = new Map();
    }

    async getPrice(symbol) {
        const cachedData = cacheService.getPrice(symbol);
        if (cachedData) {
            logger.debug(`Cache hit for price: ${symbol}`);
            return { ...cachedData, cached: true };
        }

        if (this.pendingRequests.has(symbol)) {
            logger.debug(`Deduplicating request for: ${symbol}`);
            return await this.pendingRequests.get(symbol);
        }

        const requestPromise = (async () => {
            try {
                const liveData = await marketProvider.fetchQuote(symbol);
                cacheService.setPrice(symbol, liveData);
                return { ...liveData, cached: false };
            } finally {
                this.pendingRequests.delete(symbol);
            }
        })();

        this.pendingRequests.set(symbol, requestPromise);
        return await requestPromise;
    }

    async getMarketIntel(symbol) {
        const cachedIntel = cacheService.getIntel(symbol);
        if (cachedIntel) {
            logger.debug(`Cache hit for intel: ${symbol}`);
            return { ...cachedIntel, cached: true };
        }

        try {
            const data = await this.getPrice(symbol);

            const percentChange = ((data.price - data.previousClose) / data.previousClose) * 100;
            const sentiment = this.calculateSentiment(percentChange);
            const summaryText = await aiService.generateMarketIntel(symbol, data, percentChange, sentiment);

            const intelResponse = {
                symbol: data.symbol,
                price: data.price,
                percentChange: parseFloat(percentChange.toFixed(2)),
                dayRange: `${data.low} – ${data.high}`,
                sentiment,
                summaryText,
                timestamp: data.timestamp
            };

            cacheService.setIntel(symbol, intelResponse);
            return { ...intelResponse, cached: false };
        } catch (error) {
            logger.error(`Failed to generate intel for ${symbol}:`, error.message);
            throw error;
        }
    }

    calculateSentiment(percentChange) {
        if (percentChange > 2) return 'bullish';
        if (percentChange < -2) return 'bearish';
        return 'neutral';
    }
}

export default new MarketService();
