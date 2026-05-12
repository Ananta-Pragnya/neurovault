import numpy as np
import pandas as pd
import os
from backend.warehouse.storage import DataWarehouse
from backend.models.engine import ModelEngine

class Predictor:
    def __init__(self, warehouse: DataWarehouse, model_engine: ModelEngine):
        self.warehouse = warehouse
        self.model_engine = model_engine
        self.weights = {
            'rf': 0.4,
            'svr': 0.3,
            'lr': 0.2,
            'knn': 0.1
        }

    def predict(self, symbol):
        """
        Fast inference using cached features and models.
        """
        # 1. Get latest features
        features_df = self.warehouse.get_features(symbol)
        market_df = self.warehouse.get_market_data(symbol)
        
        if features_df.empty or market_df.empty:
            return {"error": "Missing data for prediction"}
        
        # Merge to get full feature set for the latest timestamp
        df = pd.concat([market_df, features_df], axis=1).sort_index()
        latest_data = df.iloc[-1:]
        
        # 2. Load scaler and scale data
        scaler = self.model_engine.load_scaler(symbol)
        if not scaler:
            return {"error": "Model not trained for this symbol"}
        
        X_scaled = scaler.transform(latest_data)
        
        # 3. Get predictions from all models
        individual_preds = {}
        for name in self.weights.keys():
            model = self.model_engine.load_model(symbol, name)
            if model:
                pred = model.predict(X_scaled)[0]
                individual_preds[name] = float(pred)
        
        if not individual_preds:
            return {"error": "No models found"}
        
        # 4. Ensemble (Weighted Average)
        final_prediction = sum(individual_preds[m] * self.weights.get(m, 0.25) for m in individual_preds)
        
        # 5. Trend Classification
        current_price = float(latest_data['close'].iloc[0])
        trend = "Bullish" if final_prediction > current_price else "Bearish"
        confidence = 0.85 # Placeholder for actual confidence logic
        
        return {
            "symbol": symbol,
            "current_price": current_price,
            "predicted_price": final_prediction,
            "trend": trend,
            "confidence": confidence,
            "individual_predictions": individual_preds,
            "timestamp": str(latest_data.index[0])
        }

if __name__ == "__main__":
    dw = DataWarehouse()
    me = ModelEngine(dw)
    predictor = Predictor(dw, me)
    print(predictor.predict("AAPL"))
