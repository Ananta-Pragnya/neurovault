import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const C = {
  bg:       '#0A0A0B',
  surface:  '#111113',
  surface2: '#161618',
  border:   '#1E1E21',
  gold:     '#C9962A',
  platinum: '#9EA8B3',
  sage:     '#4CAF82',
  coral:    '#C94F4F',
  ice:      '#5B9BD5',
  muted:    '#4A5260',
};

const SECTOR_LABELS: Record<string, string> = {
  XLK:  'Technology',
  XLF:  'Financials',
  XLE:  'Energy',
  XLV:  'Health Care',
  XLY:  'Cons. Discret.',
  XLP:  'Cons. Staples',
  XLI:  'Industrials',
  XLB:  'Materials',
  XLRE: 'Real Estate',
  XLU:  'Utilities',
  XLC:  'Comm. Services',
};

type Timeframe = '1W' | '1M' | '3M';

interface SectorRow {
  symbol:    string;
  name:      string;
  return_1w: number;
  return_1m: number;
  return_3m: number;
  rank:      number;
}

function colorForReturn(pct: number): string {
  if (pct > 5)   return 'rgba(76,175,130,0.55)';
  if (pct > 2)   return 'rgba(76,175,130,0.30)';
  if (pct > 0)   return 'rgba(76,175,130,0.15)';
  if (pct > -2)  return 'rgba(201,79,79,0.15)';
  if (pct > -5)  return 'rgba(201,79,79,0.30)';
  return 'rgba(201,79,79,0.55)';
}

function textColorForReturn(pct: number): string {
  return pct >= 0 ? C.sage : C.coral;
}

export const SectorHeatmap: React.FC = () => {
  const [data, setData]         = useState<SectorRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await fetch(`${API_BASE}/api/sectors`);
      if (!res.ok) throw new Error('sectors endpoint error');
      const json = await res.json();
      setData(json.sectors || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const key = timeframe === '1W' ? 'return_1w' : timeframe === '1M' ? 'return_1m' : 'return_3m';
  const sorted = [...data].sort((a, b) => (b as any)[key] - (a as any)[key]);

  return (
    <div style={{ padding: '24px', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: C.gold, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Sector Rotation Heatmap
            </span>
          </div>
          <p style={{ fontSize: '12px', color: C.muted }}>
            S&P 500 sectors ranked by relative strength
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {(['1W', '1M', '3M'] as Timeframe[]).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                padding: '5px 12px', borderRadius: '6px', fontSize: '11px',
                fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
                transition: 'all 0.15s',
                border: timeframe === tf ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
                background: timeframe === tf ? 'rgba(201,150,42,0.12)' : C.surface,
                color: timeframe === tf ? C.gold : C.muted,
              }}
            >
              {tf}
            </button>
          ))}
          <button
            onClick={load}
            style={{
              padding: '5px 8px', borderRadius: '6px',
              border: `1px solid ${C.border}`, background: C.surface,
              color: C.muted, cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px' }}>
          <Loader2 size={24} color={C.gold} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '12px', color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
            Fetching sector data...
          </span>
        </div>
      )}

      {error && !loading && (
        <div style={{
          background: C.surface, border: `1px dashed ${C.border}`, borderRadius: '10px',
          padding: '40px', textAlign: 'center',
        }}>
          <p style={{ color: C.coral, fontSize: '13px' }}>Failed to load sector data</p>
          <p style={{ color: C.muted, fontSize: '11px', marginTop: '4px' }}>Backend may be offline. Ensure the server is running.</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Heatmap Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '24px' }}>
            {sorted.map((s, idx) => {
              const ret = (s as any)[key] as number;
              return (
                <div
                  key={s.symbol}
                  style={{
                    background: colorForReturn(ret),
                    border: `1px solid ${ret >= 0 ? 'rgba(76,175,130,0.25)' : 'rgba(201,79,79,0.25)'}`,
                    borderRadius: '8px', padding: '14px',
                    position: 'relative',
                    transition: 'transform 0.15s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <div style={{ position: 'absolute', top: '8px', right: '10px', fontSize: '9px', color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                    #{idx + 1}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 700, color: '#E2E8F0', marginBottom: '2px' }}>
                    {s.symbol}
                  </div>
                  <div style={{ fontSize: '10px', color: C.platinum, marginBottom: '8px' }}>
                    {s.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {ret >= 0 ? <TrendingUp size={12} color={C.sage} /> : <TrendingDown size={12} color={C.coral} />}
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', fontWeight: 700, color: textColorForReturn(ret) }}>
                      {ret > 0 ? '+' : ''}{ret.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bar chart style ranking */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '20px' }}>
            <p style={{ fontSize: '11px', color: C.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', marginBottom: '14px', textTransform: 'uppercase' }}>
              Relative Strength Ranking — {timeframe}
            </p>
            {sorted.map(s => {
              const ret = (s as any)[key] as number;
              const maxAbs = Math.max(...sorted.map(x => Math.abs((x as any)[key])), 1);
              const pct = Math.abs(ret) / maxAbs * 100;
              return (
                <div key={s.symbol} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ width: '36px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: C.platinum, textAlign: 'right', flexShrink: 0 }}>
                    {s.symbol}
                  </div>
                  <div style={{ flex: 1, height: '16px', background: C.surface2, borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: ret >= 0 ? `rgba(76,175,130,0.5)` : `rgba(201,79,79,0.5)`,
                      borderRadius: '3px', transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ width: '60px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: textColorForReturn(ret), textAlign: 'right', flexShrink: 0 }}>
                    {ret > 0 ? '+' : ''}{ret.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
