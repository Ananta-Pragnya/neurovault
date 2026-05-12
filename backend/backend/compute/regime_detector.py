"""
Market Regime Detector
Pure mathematics - NO AI required
Institutional-grade classification
"""

import logging
from typing import Dict, Tuple

logger = logging.getLogger(__name__)

class RegimeDetector:
    """
    Detect market regime using pure math
    Categories: RISK-ON, RISK-OFF, VOLATILE, NEUTRAL
    """
    
    @staticmethod
    def detect(market_data: Dict) -> Tuple[str, str]:
        """
        Returns: (regime, description)
        
        Logic:
        - VIX < 15 + SPY up trend = RISK-ON
        - VIX > 25 = VOLATILE
        - SPY down trend = RISK-OFF
        - Default = NEUTRAL
        """
        try:
            # Get key metrics
            vix = market_data.get("indices", {}).get("^VIX", {}).get("price", 20)
            spy_data = market_data.get("symbols", {}).get("SPY", {})
            spy_change = spy_data.get("change", 0)
            
            # Calculate trend from 5-day history
            spy_history = spy_data.get("history_5d", {}).get("close", [])
            trend = "up" if len(spy_history) >= 2 and spy_history[-1] > spy_history[0] else "down"
            
            # Calculate market breadth (% of stocks up)
            symbols = market_data.get("symbols", {})
            up_stocks = sum(1 for s in symbols.values() if s.get("change", 0) > 0)
            total_stocks = len(symbols)
            breadth = up_stocks / total_stocks if total_stocks > 0 else 0.5
            
            # Regime detection
            if vix < 15 and trend == "up" and breadth > 0.6:
                regime = "RISK-ON"
                description = "Market showing strength. Low volatility. Broad participation."
            
            elif vix > 25:
                regime = "VOLATILE"
                description = "Elevated uncertainty. High volatility. Proceed with caution."
            
            elif trend == "down" and breadth < 0.4:
                regime = "RISK-OFF"
                description = "Defensive positioning. Risk aversion. Weak breadth."
            
            else:
                regime = "NEUTRAL"
                description = "Mixed signals. Sideways consolidation. Wait for clarity."
            
            logger.info(f"📊 Regime detected: {regime} (VIX: {vix:.1f}, Breadth: {breadth:.1%})")
            
            return regime, description
            
        except Exception as e:
            logger.error(f"❌ Regime detection failed: {e}")
            return "NEUTRAL", "Unable to determine market regime. Data pending."
    
    @staticmethod
    def get_regime_metrics(market_data: Dict) -> Dict:
        """Return detailed metrics for regime"""
        try:
            vix = market_data.get("indices", {}).get("^VIX", {}).get("price", 20)
            spy_change = market_data.get("symbols", {}).get("SPY", {}).get("change", 0)
            
            symbols = market_data.get("symbols", {})
            up_stocks = sum(1 for s in symbols.values() if s.get("change", 0) > 0)
            total_stocks = len(symbols)
            breadth = (up_stocks / total_stocks * 100) if total_stocks > 0 else 50
            
            return {
                "vix": round(vix, 2),
                "spy_change": round(spy_change, 2),
                "breadth": round(breadth, 1),
                "up_stocks": up_stocks,
                "total_stocks": total_stocks
            }
        except Exception as e:
            logger.error(f"Error getting metrics: {e}")
            return {}

# Global instance
detector = RegimeDetector()
