import numpy as np

def detect_shock(ticker: str, price: float, volume: float, history: dict):
    """
    Rolling z-score anomaly detection
    
    Config:
    - window_size = 60 minutes
    - z_threshold_price = 3.0
    - z_threshold_volume = 3.0
    - combined_severity_threshold = 0.7
    """
    
    price_history = np.array(history.get('price', []))
    volume_history = np.array(history.get('volume', []))
    
    if len(price_history) < 2 or len(volume_history) < 2:
        return {'shock': False}
        
    mean_p = np.mean(price_history)
    std_p = np.std(price_history)
    
    mean_v = np.mean(volume_history)
    std_v = np.std(volume_history)
    
    # Avoid division by zero
    std_p = max(std_p, 1e-6)
    std_v = max(std_v, 1e-6)
    
    z_price = (price - mean_p) / std_p
    z_volume = (volume - mean_v) / std_v
    
    # Sigmoid function for normalization
    def sigmoid(x):
        return 1 / (1 + np.exp(-x))
    
    severity = sigmoid(abs(z_price)) * 0.6 + sigmoid(z_volume) * 0.4
    
    if abs(z_price) >= 3.0 or z_volume >= 3.0 or severity >= 0.7:
        return {
            'shock': True,
            'ticker': ticker,
            'severity': float(severity),
            'z_price': float(z_price),
            'z_volume': float(z_volume),
            'price': price,
            'trigger_time': history.get('timestamp', None)
        }
    
    return {'shock': False}
