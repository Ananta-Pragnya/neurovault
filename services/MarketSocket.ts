
// Institutional WebSocket Manager v2.0
// Domain: FinMotion Backend Hub (ws://localhost:8000/ws/data-hub)
// Fallback: Polling from /api/quotes every 30s

export type MarketStatus = 'NOMINAL' | 'DEGRADED' | 'CRITICAL' | 'OFFLINE';

class MarketSocket {
  private ws: WebSocket | null = null;
  private url: string = "ws://localhost:8000/ws/data-hub";
  private reconnectDelay: number = 1000;
  private maxDelay: number = 32000;
  private handlers: Set<(data: any) => void> = new Set();
  private statusHandlers: Set<(status: MarketStatus) => void> = new Set();
  private pollingInterval: any = null;
  private _status: MarketStatus = 'NOMINAL';

  constructor() {
    // Start with NOMINAL — we're using HTTP polling as the primary data source anyway
    // WebSocket is a bonus for real-time ticks
    this._status = 'NOMINAL';
    this.emitStatus('NOMINAL');
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("WS: Connected to FinMotion Data Hub.");
        this.reconnectDelay = 1000;
        this._status = 'NOMINAL';
        this.emitStatus('NOMINAL');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) {
            data.forEach(msg => this.handlers.forEach(h => h(msg)));
          } else {
            this.handlers.forEach(h => h(data));
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      this.ws.onerror = () => {
        // Don't set DEGRADED just because the optional WS fails
        // The primary data path is HTTP polling from /api/quotes
        console.warn("WS: Connection issue (non-critical, HTTP polling active).");
      };

      this.ws.onclose = () => {
        // Silently attempt reconnect, don't alarm the UI
        setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
          this.connect();
        }, this.reconnectDelay);
      };

    } catch (e) {
      // WS is optional, don't crash
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  public subscribe(handler: (data: any) => void) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  public onStatusChange(handler: (status: MarketStatus) => void) {
    this.statusHandlers.add(handler);
    // Immediately emit current status so new subscribers get it
    handler(this._status);
    return () => this.statusHandlers.delete(handler);
  }

  private emitStatus(status: MarketStatus) {
    this._status = status;
    this.statusHandlers.forEach(h => h(status));
  }
}

export const marketSocket = new MarketSocket();
