import pandas as pd
import pandas_ta as ta
from backend.warehouse.storage import DataWarehouse

class FeatureFactory:
    def __init__(self, warehouse: DataWarehouse):
        self.warehouse = warehouse

    def compute_features(self, symbol):
        """
        Computes technical indicators for a symbol and saves them.
        """
        df = self.warehouse.get_market_data(symbol)
        if df.empty:
            print(f"[{symbol}] No data found in warehouse for feature computation.")
            return None
        
        print(f"[{symbol}] Computing features locally...")
        
        # Ensure correct column names for pandas_ta
        df.columns = [col.lower() for col in df.columns]
        
        # Technical Indicators
        # SMA/EMA
        df.ta.sma(length=20, append=True)
        df.ta.sma(length=50, append=True)
        df.ta.ema(length=20, append=True)
        
        # RSI
        df.ta.rsi(length=14, append=True)
        
        # MACD
        df.ta.macd(append=True)
        
        # Bollinger Bands
        df.ta.bbands(length=20, std=2, append=True)
        
        # Volatility & Returns
        df['returns'] = df['close'].pct_change()
        df['volatility_30d'] = df['returns'].rolling(window=30).std()
        
        # Lag features
        for lag in [1, 3, 5]:
            df[f'close_lag_{lag}'] = df['close'].shift(lag)
        
        # Cleanup: Remove rows with NaN (due to indicators needing window)
        df = df.dropna()
        
        # We only want to save the new features, not OHLCV again
        # Actually, let's just save the specific TA columns
        ta_columns = [col for col in df.columns if col not in ['symbol', 'open', 'high', 'low', 'close', 'volume']]
        features_df = df[ta_columns]
        
        self.warehouse.save_features(symbol, features_df)
        print(f"[{symbol}] Computed and saved {len(ta_columns)} features.")
        return features_df

if __name__ == "__main__":
    dw = DataWarehouse()
    ff = FeatureFactory(dw)
    ff.compute_features("AAPL")
