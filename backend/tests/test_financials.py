import pytest
from backend.engines.execution import TrailingStopEngine, VolatilityClassifier
from backend.engines.black_scholes import price_option

def test_trailing_stop_logic():
    engine = TrailingStopEngine()
    entry = 100.0
    
    # At entry, floor should be 0 (no gains yet)
    result = engine.process_tick(100.0, entry, 100.0, "Moderate")
    assert result["floor_price"] == 0.0
    assert not result["trigger_sell"]
    
    # Price rises to 110 (10% gain)
    result = engine.process_tick(110.0, entry, 100.0, "Moderate")
    assert result["peak_price"] == 110.0
    assert result["floor_price"] == 105.0 # 100 + 5% of 100
    assert not result["trigger_sell"]
    
    # Price drops to 106, peak remains 110, floor remains 105 (Ratchet lock)
    result = engine.process_tick(106.0, entry, 110.0, "Moderate")
    assert result["peak_price"] == 110.0
    assert result["floor_price"] == 105.0
    assert not result["trigger_sell"]
    
    # Price falls to 104 (Hits floor)
    result = engine.process_tick(104.0, entry, 110.0, "Moderate")
    assert result["trigger_sell"] == True
    
    # Test High Volatility tier (+3% steps)
    # Peak 120 (20% gain) -> 2 steps of 3%
    result = engine.process_tick(120.0, entry, 100.0, "High")
    assert result["floor_price"] == 106.0 # 100 + 2 * 3.0
    
    # Test Stable tier (+7% steps)
    # Peak 120 (20% gain) -> 2 steps of 7%
    result = engine.process_tick(120.0, entry, 100.0, "Stable")
    assert result["floor_price"] == 114.0 # 100 + 2 * 7.0

def test_volatility_classification():
    v = VolatilityClassifier()
    
    # High: Beta > 1.5 or ATR > 3%
    assert v.classify(1.6, 1.0) == "High"
    assert v.classify(1.0, 3.5) == "High"
    
    # Stable: Beta < 0.8 and ATR < 1%
    assert v.classify(0.7, 0.5) == "Stable"
    
    # Moderate
    assert v.classify(1.0, 1.5) == "Moderate"
    assert v.classify(0.7, 1.5) == "Moderate" # Beta low but ATR not low enough

def test_black_scholes_reference():
    # S=100, K=100, T=1, r=0.05, sigma=0.2
    # Standard values for BS Call should be ~10.45
    call_price = price_option(100, 100, 1.0, 0.05, 0.2, "call")
    assert 10.40 < call_price < 10.50
    
    # Put should be ~5.57
    put_price = price_option(100, 100, 1.0, 0.05, 0.2, "put")
    assert 5.50 < put_price < 5.65
