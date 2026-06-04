import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Plus, Trash2, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useTradingStore } from '../../src/stores/tradingStore';

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

export const AlertPanel: React.FC = () => {
  const { alerts, fetchAlerts, createAlert, deleteAlert, selectedTicker, quote } = useTradingStore();
  const [symbol, setSymbol]   = useState('');
  const [price, setPrice]     = useState('');
  const [dir, setDir]         = useState<'above' | 'below'>('above');
  const [saving, setSaving]   = useState(false);
  const [triggered, setTriggered] = useState<string | null>(null);

  useEffect(() => { fetchAlerts(); }, []);

  // Listen for WebSocket alert_triggered events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.type === 'alert_triggered') {
        setTriggered(`${e.detail.symbol} crossed $${e.detail.trigger} (${e.detail.direction})`);
        fetchAlerts();
        setTimeout(() => setTriggered(null), 6000);
      }
    };
    window.addEventListener('market-alert' as any, handler);
    return () => window.removeEventListener('market-alert' as any, handler);
  }, []);

  const handleCreate = async () => {
    if (!symbol || !price) return;
    setSaving(true);
    await createAlert(symbol.toUpperCase(), parseFloat(price), dir);
    setSymbol(''); setPrice('');
    setSaving(false);
  };

  const currentPrice = quote?.current_price || quote?.price;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Bell size={18} color={C.gold} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: C.gold, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Price Alerts
        </span>
      </div>

      {/* Triggered notification */}
      {triggered && (
        <div style={{
          background: 'rgba(201, 150, 42, 0.12)', border: `1px solid ${C.gold}55`,
          borderRadius: '8px', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <Bell size={14} color={C.gold} />
          <span style={{ fontSize: '12px', color: C.gold, fontFamily: "'JetBrains Mono', monospace" }}>
            ALERT TRIGGERED — {triggered}
          </span>
        </div>
      )}

      {/* Create Alert Form */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '20px' }}>
        <p style={{ fontSize: '11px', color: C.platinum, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px', fontFamily: "'JetBrains Mono', monospace" }}>
          New Alert
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '10px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '10px', color: C.muted, display: 'block', marginBottom: '4px', fontFamily: "'JetBrains Mono', monospace" }}>SYMBOL</label>
            <input
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder={selectedTicker}
              style={{
                width: '100%', padding: '8px 10px',
                background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: '6px', color: '#E2E8F0',
                fontSize: '13px', fontFamily: "'JetBrains Mono', monospace",
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '10px', color: C.muted, display: 'block', marginBottom: '4px', fontFamily: "'JetBrains Mono', monospace" }}>
              PRICE {currentPrice ? <span style={{ color: C.ice }}>· now ${currentPrice.toFixed(2)}</span> : null}
            </label>
            <input
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00"
              type="number"
              style={{
                width: '100%', padding: '8px 10px',
                background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: '6px', color: '#E2E8F0',
                fontSize: '13px', fontFamily: "'JetBrains Mono', monospace",
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '10px', color: C.muted, display: 'block', marginBottom: '4px', fontFamily: "'JetBrains Mono', monospace" }}>DIRECTION</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['above', 'below'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDir(d)}
                  style={{
                    padding: '8px 12px', borderRadius: '6px', fontSize: '11px',
                    fontFamily: "'JetBrains Mono', monospace",
                    cursor: 'pointer', transition: 'all 0.15s',
                    border: dir === d ? `1px solid ${d === 'above' ? C.sage : C.coral}` : `1px solid ${C.border}`,
                    background: dir === d ? (d === 'above' ? 'rgba(76,175,130,0.12)' : 'rgba(201,79,79,0.12)') : C.surface2,
                    color: dir === d ? (d === 'above' ? C.sage : C.coral) : C.muted,
                  }}
                >
                  {d === 'above' ? '↑' : '↓'} {d}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={saving || !symbol || !price}
            style={{
              padding: '8px 16px', borderRadius: '6px',
              background: saving || !symbol || !price ? 'rgba(201,150,42,0.05)' : 'rgba(201,150,42,0.12)',
              border: `1px solid ${saving || !symbol || !price ? C.border : C.gold}`,
              color: saving || !symbol || !price ? C.muted : C.gold,
              cursor: saving || !symbol || !price ? 'not-allowed' : 'pointer',
              fontSize: '12px', fontFamily: "'JetBrains Mono', monospace",
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />}
            Add
          </button>
        </div>
      </div>

      {/* Active Alerts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ fontSize: '11px', color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
          Active Alerts ({alerts.length})
        </p>

        {alerts.length === 0 ? (
          <div style={{
            background: C.surface, border: `1px dashed ${C.border}`, borderRadius: '10px',
            padding: '32px', textAlign: 'center',
          }}>
            <BellOff size={32} color={C.muted} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: C.muted }}>No active alerts</p>
            <p style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>Set a price threshold above to get notified instantly.</p>
          </div>
        ) : (
          alerts.map((alert: any) => (
            <div
              key={alert.id}
              style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: '8px', padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {alert.direction === 'above'
                  ? <TrendingUp size={14} color={C.sage} />
                  : <TrendingDown size={14} color={C.coral} />
                }
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 600, color: '#E2E8F0' }}>
                      {alert.symbol}
                    </span>
                    <span style={{
                      fontSize: '10px', padding: '2px 7px', borderRadius: '4px',
                      background: alert.direction === 'above' ? 'rgba(76,175,130,0.12)' : 'rgba(201,79,79,0.12)',
                      color: alert.direction === 'above' ? C.sage : C.coral,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {alert.direction.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: C.platinum, marginTop: '2px', fontFamily: "'JetBrains Mono', monospace" }}>
                    ${alert.trigger_price.toLocaleString(undefined, { minimumFractionDigits: 2 })} trigger
                  </p>
                </div>
              </div>

              <button
                onClick={() => deleteAlert(alert.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: C.muted, padding: '4px', borderRadius: '4px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = C.coral)}
                onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
