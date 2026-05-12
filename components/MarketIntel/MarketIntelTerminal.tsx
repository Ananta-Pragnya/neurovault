
import React, { useState, useEffect, useCallback } from 'react';
import { fetchNewsIntelligence } from '../../services/intel/geminiService';
import { NewsIntelligenceResponse, AppStatus, CachedData } from '../../types';
import { SentimentBadge } from './components/ui/Badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CACHE_KEY = 'market_intel_cache';
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [data, setData] = useState<NewsIntelligenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    // Check Cache
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsedCache: CachedData = JSON.parse(cached);
      const cachedItem = parsedCache[query.toLowerCase()];
      if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_EXPIRY) {
        setData(cachedItem);
        setStatus(AppStatus.SUCCESS);
        return;
      }
    }

    setStatus(AppStatus.LOADING);
    setError(null);
    try {
      const result = await fetchNewsIntelligence(query);
      setData(result);
      
      // Update Cache
      const currentCache = cached ? JSON.parse(cached) : {};
      currentCache[query.toLowerCase()] = result;
      localStorage.setItem(CACHE_KEY, JSON.stringify(currentCache));
      
      setStatus(AppStatus.SUCCESS);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch intelligence. Please try again.');
      setStatus(AppStatus.ERROR);
    }
  };

  const sentimentChartData = data ? [
    { name: 'Sentiment', value: data.sentiment === 'Bullish' ? 80 : data.sentiment === 'Bearish' ? 20 : 50 }
  ] : [];

  const COLORS = data?.sentiment === 'Bullish' ? ['#10b981'] : data?.sentiment === 'Bearish' ? ['#ef4444'] : ['#6366f1'];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-200 p-4 md:p-8">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-indigo-500">Market</span>Intel AI
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Institutional-grade news intelligence engine</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stock (e.g. Tesla, NVDA, BTC)"
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full md:w-64"
          />
          <button
            type="submit"
            disabled={status === AppStatus.LOADING}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-all"
          >
            {status === AppStatus.LOADING ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>
      </header>

      <main className="max-w-6xl mx-auto space-y-6">
        {status === AppStatus.IDLE && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Ready for Analysis</h2>
            <p className="text-zinc-500 mt-2 max-w-sm">
              Enter a ticker or market theme above to generate deep intelligence from the latest global news.
            </p>
          </div>
        )}

        {status === AppStatus.LOADING && (
          <div className="space-y-6 animate-pulse">
            <div className="h-64 bg-zinc-900 rounded-2xl border border-zinc-800"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-48 bg-zinc-900 rounded-2xl border border-zinc-800"></div>
              <div className="h-48 bg-zinc-900 rounded-2xl border border-zinc-800"></div>
            </div>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="bg-red-900/10 border border-red-900/50 p-4 rounded-xl flex items-center gap-3 text-red-400">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
          </div>
        )}

        {status === AppStatus.SUCCESS && data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Summary & Key Points */}
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider text-xs">Executive Summary</h3>
                  <SentimentBadge type={data.sentiment} />
                </div>
                <p className="text-zinc-300 leading-relaxed text-lg">
                  {data.summary}
                </p>
              </section>

              <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl backdrop-blur-sm">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider text-xs mb-4">Key Intel Points</h3>
                <ul className="space-y-4">
                  {data.keyPoints.map((point, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="flex-shrink-0 w-6 h-6 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-mono text-xs border border-indigo-500/20">
                        {i + 1}
                      </span>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                        {point}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Sidebar Stats & Prediction */}
            <div className="space-y-6">
              <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl backdrop-blur-sm h-full flex flex-col">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider text-xs mb-6">Prediction Engine</h3>
                
                <div className="flex-grow flex flex-col items-center justify-center py-4">
                    <div className="w-full h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sentimentChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            startAngle={180}
                            endAngle={0}
                          >
                            <Cell key={`cell-0`} fill={COLORS[0]} />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-center -mt-8 mb-6">
                      <div className={`text-2xl font-bold ${data.sentiment === 'Bullish' ? 'text-green-400' : data.sentiment === 'Bearish' ? 'text-red-400' : 'text-indigo-400'}`}>
                        {data.sentiment}
                      </div>
                      <div className="text-zinc-500 text-xs uppercase tracking-widest mt-1">Current Momentum</div>
                    </div>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-xl p-4 mt-auto">
                   <h4 className="text-white text-xs font-bold uppercase mb-2">Short-term Outlook</h4>
                   <p className="text-zinc-400 text-sm italic">
                     "{data.prediction}"
                   </p>
                </div>
              </section>

              <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl backdrop-blur-sm">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider text-xs mb-4">Verified Sources</h3>
                <div className="space-y-3">
                  {data.sources.map((source, i) => (
                    <a
                      key={i}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg bg-black/20 border border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-300 font-medium line-clamp-1 flex-grow">
                          {source.title}
                        </span>
                        <svg className="w-3 h-3 text-zinc-600 group-hover:text-indigo-400 transition-colors ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <span className="text-[10px] text-zinc-600 font-mono mt-1 block overflow-hidden text-ellipsis whitespace-nowrap">
                        {new URL(source.uri).hostname}
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            </div>

          </div>
        )}
      </main>

    </div>
  );
};

export default App;
