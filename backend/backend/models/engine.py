import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.svm import SVR
from sklearn.linear_model import LinearRegression
from sklearn.neighbors import KNeighborsRegressor
from sklearn.preprocessing import MinMaxScaler
import joblib
import os
from backend.warehouse.storage import DataWarehouse

class ModelEngine:
    def __init__(self, warehouse: DataWarehouse, models_dir="backend/models/saved"):
        self.warehouse = warehouse
        self.models_dir = models_dir
        os.makedirs(self.models_dir, exist_ok=True)
        self.scalers = {}

    def prepare_data(self, symbol, target_col='close', lookback=60):
        # Get OHLCV + Features
        market_data = self.warehouse.get_market_data(symbol)
        features_data = self.warehouse.get_features(symbol)
        
        if market_data.empty or features_data.empty:
            return None, None
        
        # Merge
        df = pd.concat([market_data, features_data], axis=1).dropna()
        
        # Prepare X, y
        y = df[target_col].shift(-1).dropna() # Predict next day
        X = df.loc[y.index]
        
        return X, y

    def train_classical_models(self, symbol):
        X, y = self.prepare_data(symbol)
        if X is None: return
        
        print(f"[{symbol}] Training classical models...")
        
        # Scale data
        scaler = MinMaxScaler()
        X_scaled = scaler.fit_transform(X)
        self.scalers[symbol] = scaler
        joblib.dump(scaler, os.path.join(self.models_dir, f"{symbol}_scaler.pkl"))
        
        models = {
            'rf': RandomForestRegressor(n_estimators=100),
            'svr': SVR(kernel='rbf'),
            'lr': LinearRegression(),
            'knn': KNeighborsRegressor(n_neighbors=5)
        }
        
        for name, model in models.items():
            model.fit(X_scaled, y)
            joblib.dump(model, os.path.join(self.models_dir, f"{symbol}_{name}.pkl"))
            print(f"[{symbol}] Trained and saved {name} model.")

    def load_model(self, symbol, name):
        path = os.path.join(self.models_dir, f"{symbol}_{name}.pkl")
        if os.path.exists(path):
            return joblib.load(path)
        return None

    def load_scaler(self, symbol):
        path = os.path.join(self.models_dir, f"{symbol}_scaler.pkl")
        if os.path.exists(path):
            return joblib.load(path)
        return None

if __name__ == "__main__":
    dw = DataWarehouse()
    me = ModelEngine(dw)
    me.train_classical_models("AAPL")
