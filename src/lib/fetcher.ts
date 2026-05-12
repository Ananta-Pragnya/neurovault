import { TickerSnapshot } from './types';
import { redis } from './store';

// Configuration
const BATCH_INTERVAL_MS = 120000; // 2 minutes as requested
const PRIORITY_TICKERS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AMD', 'SPY', 'QQQ'];

export class BulkFetcher {
    private isRunning: boolean = false;
    private lastFetch: number = 0;

    constructor() {}

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log(`[Fetcher] Started. Interval: ${BATCH_INTERVAL_MS}ms`);
        this.cycle();
    }

    stop() {
        this.isRunning = false;
        console.log('[Fetcher] Stopped.');
    }

    private async cycle() {
        if (!this.isRunning) return;

        try {
            const snapshot = await this.fetchBatch(PRIORITY_TICKERS);
            if (snapshot.length > 0) {
                await this.saveSnapshot(snapshot);
                window.dispatchEvent(new CustomEvent('market-update', { 
                    detail: { data: snapshot, timestamp: new Date().toISOString() } 
                }));
                this.lastFetch = Date.now();
            }
        } catch (e) {
            console.error('[Fetcher] Error:', e);
        }

        if (this.isRunning) {
            setTimeout(() => this.cycle(), BATCH_INTERVAL_MS);
        }
    }

    private async fetchBatch(tickers: string[]): Promise<TickerSnapshot[]> {
        try {
            const response = await fetch(`http://localhost:8000/api/alpaca/snapshots?tickers=${tickers.join(',')}`);
            const data = await response.json();
            
            return tickers.map(t => {
                const s = data[t];
                if (!s) return null;
                
                const price = s.latestTrade.p;
                const prevClose = s.prevDailyBar.c;
                const changeP = ((price - prevClose) / prevClose) * 100;

                return {
                    ticker: t,
                    price: price,
                    change: changeP,
                    volume: s.dailyBar.v,
                    bid: s.latestQuote.bp,
                    ask: s.latestQuote.ap,
                    timestamp: s.latestTrade.t
                } as any;
            }).filter(Boolean);
        } catch (err) {
            console.error('[Fetcher] API Error:', err);
            return [];
        }
    }

    private async saveSnapshot(data: TickerSnapshot[]) {
        // Save to Store (Redis/S3)
        // console.log('[Fetcher] Saving snapshot to store...');
        await redis.set('latest_snapshot', JSON.stringify(data));
    }
}

export const fetcherService = new BulkFetcher();
