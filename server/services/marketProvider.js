import axios from 'axios';
import config from '../config/env.js';
import throttler from '../utils/throttler.js';
import logger from '../utils/logger.js';

class MarketProvider {
    constructor() {
        this.finnhubBaseUrl = 'https://finnhub.io/api/v1';
        this.apiKey = config.apiKeys.finnhub;
    }

    async fetchQuote(symbol) {
        if (!this.apiKey || this.apiKey === 'your_finnhub_key_here') {
            logger.warn('Finnhub API Key missing - providing fallback mock data');
            return this.getMockQuote(symbol);
        }

        try {
            await throttler.throttle();
            logger.info(`Fetching live data for ${symbol} from Finnhub`);

            const response = await axios.get(`${this.finnhubBaseUrl}/quote`, {
                params: {
                    symbol: symbol.toUpperCase(),
                    token: this.apiKey
                }
            });

            const data = response.data;

            if (!data.c) {
                throw new Error(`Invalid symbol or no data for ${symbol}`);
            }

            return {
                symbol: symbol.toUpperCase(),
                price: data.c,
                open: data.o,
                high: data.h,
                low: data.l,
                previousClose: data.pc,
                timestamp: Date.now()
            };
        } catch (error) {
            logger.error(`Error fetching from Finnhub for ${symbol}:`, error.message);
            throw error;
        }
    }

    getMockQuote(symbol) {
        const base = 150 + Math.random() * 100;
        return {
            symbol: symbol.toUpperCase(),
            price: parseFloat(base.toFixed(2)),
            open: parseFloat((base - 2).toFixed(2)),
            high: parseFloat((base + 5).toFixed(2)),
            low: parseFloat((base - 3).toFixed(2)),
            previousClose: parseFloat((base - 1).toFixed(2)),
            timestamp: Date.now(),
            isMock: true
        };
    }
}

export default new MarketProvider();
