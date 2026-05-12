from typing import Dict, Optional, Tuple
from datetime import datetime

class TrailingStopEngine:
    """
    Core execution mechanism for profit protection.
    Tracks entry price and peak price separately for each position.
    Implements a ratchet lock mechanism where the floor never drops.
    """
    
    @staticmethod
    def calculate_floor(
        entry_price: float, 
        peak_price: float, 
        volatility_tier: str = "Moderate"
    ) -> float:
        """
        Calculate the sell floor based on the peak price reached since entry.
        
        Step sizes per 10% gain:
        - High: 3%
        - Moderate: 5%
        - Stable: 7%
        """
        if peak_price < entry_price:
            # Initial floor could be set here, but typically we wait for first gain threshold
            # or use a default stop loss. Prompt implies floor is set after gains.
            return 0.0 
            
        # Determine step percentage based on tier
        step_mapping = {
            "High": 0.03,
            "Moderate": 0.05,
            "Stable": 0.07
        }
        step_pct = step_mapping.get(volatility_tier, 0.05)
        
        # Calculate how many 10% milestones we've hit
        gain_pct = (peak_price - entry_price) / entry_price
        num_steps = int(gain_pct / 0.10)
        
        if num_steps <= 0:
            return 0.0 # Or entry_price * (1 - default_stop_pct)
            
        floor_price = entry_price + (num_steps * (entry_price * step_pct))
        return round(floor_price, 2)

    def process_tick(
        self, 
        current_price: float, 
        entry_price: float, 
        current_peak: float, 
        volatility_tier: str = "Moderate"
    ) -> Dict:
        """
        Processes a single price update for a position.
        Returns updated state and signal.
        """
        # 1. Update peak price (ratchet lock)
        new_peak = max(current_peak, current_price)
        
        # 2. Recalculate floor based on peak
        floor_price = self.calculate_floor(entry_price, new_peak, volatility_tier)
        
        # 3. Check for exit trigger
        trigger_sell = False
        if floor_price > 0 and current_price <= floor_price:
            trigger_sell = True
            
        return {
            "current_price": current_price,
            "peak_price": new_peak,
            "floor_price": floor_price,
            "trigger_sell": trigger_sell,
            "pnl_pct": round(((current_price - entry_price) / entry_price) * 100, 2)
        }

class VolatilityClassifier:
    """
    Classifies stocks into tiers based on risk profile (Beta and ATR).
    Adjusts position sizing and trailing stop parameters.
    """
    
    @staticmethod
    def classify(beta: float, atr_pct: float) -> str:
        """
        beta: relative volatility to market
        atr_pct: Average True Range as percentage of price (daily)
        """
        # High Volatility: Beta > 1.5 or ATR > 3%
        if beta > 1.5 or atr_pct > 3.0:
            return "High"
            
        # Stable: Beta < 0.8 and ATR < 1%
        if beta < 0.8 and atr_pct < 1.0:
            return "Stable"
            
        # Else: Moderate
        return "Moderate"
    
    @staticmethod
    def get_tier_rules(tier: str) -> Dict:
        rules = {
            "High": {
                "max_position_pct": 5.0,
                "floor_step_pct": 3.0,
                "emergency_action": "exit_immediate"
            },
            "Moderate": {
                "max_position_pct": 15.0,
                "floor_step_pct": 5.0,
                "emergency_action": "exit_review"
            },
            "Stable": {
                "max_position_pct": 30.0,
                "floor_step_pct": 7.0,
                "emergency_action": "exit_partial_50"
            }
        }
        return rules.get(tier, rules["Moderate"])
