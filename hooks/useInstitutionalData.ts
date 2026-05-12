// Custom hook for market data
// Fetches from cached endpoints

import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';

interface MarketOverview {
    regime: {
        status: string;
        description: string;
        metrics: any;
    };
    indices: any;
    opportunities: any[];
    timestamp: string;
    market_hours: boolean;
}

interface IntelligenceBrief {
    type: string;
    data: {
        summary: string[];
        outlook: {
            short: string;
            medium: string;
            long: string;
        };
        probabilities: {
            sideways: number;
            bullish: number;
            bearish: number;
        };
        timestamp?: string;
    };
}

export function useMarketOverview() {
    const [data, setData] = useState<MarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/market/overview`);
            if (!response.ok) throw new Error('Failed to fetch market overview');
            const json = await response.json();
            setData(json);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            console.error('Market overview error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Refresh every 5 minutes (data updates every 15 min on server)
        const interval = setInterval(fetchData, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    return { data, loading, error, refetch: fetchData };
}

export function useIntelligenceBrief() {
    const [brief, setBrief] = useState<IntelligenceBrief | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBrief = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/intelligence/brief`);
            if (!response.ok) throw new Error('Failed to fetch intelligence brief');
            const json = await response.json();
            setBrief(json);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            console.error('Intelligence brief error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrief();

        // Refresh every 10 minutes
        const interval = setInterval(fetchBrief, 10 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    return { brief, loading, error, refetch: fetchBrief };
}
