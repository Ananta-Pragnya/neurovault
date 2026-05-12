import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from backend.warehouse.storage import DataWarehouse
import time

class MarketFetcher:
    def __init__(self, warehouse: DataWarehouse):
        self.warehouse = warehouse

    def fetch_symbol(self, symbol, period="max", interval="1d"):
        """
        Fetches data for a single symbol. 
        Implements incremental fetch: only gets data since last_update.
        """
        last_update = self.warehouse.get_last_update(symbol)
        
        if last_update:
            # If we have data, fetch from last_update + 1 day
            start_date = (pd.to_datetime(last_update) + timedelta(days=1)).strftime('%Y-%m-%d')
            today = datetime.now().strftime('%Y-%m-%d')
            
            if start_date >= today:
                print(f"[{symbol}] Already up to date. Skipping fetch.")
                return None
            
            print(f"[{symbol}] Fetching incremental data desde {start_date}...")
            df = yf.download(symbol, start=start_date, interval=interval, progress=False)
        else:
            print(f"[{symbol}] Cold start: Fetching full history...")
            df = yf.download(symbol, period=period, interval=interval, progress=False)
        
        if not df.empty:
            self.warehouse.save_market_data(symbol, df)
            print(f"[{symbol}] Saved {len(df)} new rows to warehouse.")
            return df
        else:
            print(f"[{symbol}] No new data found.")
            return None

    def update_symbols(self, symbols):
        """
        Batch update multiple symbols.
        """
        for symbol in symbols:
            try:
                self.fetch_symbol(symbol)
                # Avoid hitting API rate limits
                time.sleep(0.5)
            except Exception as e:
                print(f"Error fetching {symbol}: {e}")

if __name__ == "__main__":
    # Test run
    dw = DataWarehouse()
    fetcher = MarketFetcher(dw)
    fetcher.update_symbols(["AAPL", "TSLA", "MSFT", "GOOGL"])
