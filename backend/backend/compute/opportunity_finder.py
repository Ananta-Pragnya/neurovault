"""
Opportunity Finder - Auto-detect anomalies
NO AI - pure mathematical detection
"""

import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

class OpportunityFinder:
    """
    Detect opportunities automatically:
    - Unusual volume
    - Large moves
    - Breakouts
    
    Returns top 5 only
    """
    
    @staticmethod
    def find_opportunities(market_data: Dict) -> List[Dict]:
        """Find and rank opportunities"""
        opportunities = []
        
        symbols = market_data.get("symbols", {})
        
        for symbol, data in symbols.items():
            # Skip indices
            if symbol in ["SPY", "QQQ", "IWM", "DIA"]:
                continue
            
            price = data.get("price", 0)
            change = data.get("change", 0)
            volume = data.get("volume", 0)
            history_volume = data.get("history_5d", {}).get("volume", [])
            
            # Calculate average volume
            avg_volume = sum(history_volume) / len(history_volume) if history_volume else 1
            
            # Unusual volume (2x average)
            if volume > avg_volume * 2 and avg_volume > 0:
                opportunities.append({
                    "type": "VOLUME_SPIKE",
                    "symbol": symbol,
                    "magnitude": round(volume / avg_volume, 1),
                    "description": f"{symbol}: {volume / avg_volume:.1f}x average volume",
                    "priority": volume / avg_volume
                })
            
            # Large move (>3%)
            if abs(change) > 3:
                opportunities.append({
                    "type": "BIG_MOVE",
                    "symbol": symbol,
                    "magnitude": abs(change),
                    "description": f"{symbol}: {change:+.1f}% move",
                    "priority": abs(change)
                })
            
            # Strong breakout (>5% up)
            if change > 5:
                opportunities.append({
                    "type": "BREAKOUT",
                    "symbol": symbol,
                    "magnitude": change,
                    "description": f"{symbol}: Strong breakout +{change:.1f}%",
                    "priority": change * 1.5  # Give breakouts higher weight
                })
        
        # Sort by priority and return top 5
        opportunities.sort(key=lambda x: x.get("priority", 0), reverse=True)
        top_5 = opportunities[:5]
        
        logger.info(f"✨ Found {len(top_5)} opportunities from {len(opportunities)} signals")
        
        return top_5
    
    @staticmethod
    def get_opportunity_summary(opportunities: List[Dict]) -> str:
        """Plain English summary of opportunities"""
        if not opportunities:
            return "No significant opportunities detected. Market stable."
        
        summary_parts = []
        for opp in opportunities[:3]:  # Top 3 for summary
            summary_parts.append(opp.get("description", ""))
        
        return " | ".join(summary_parts)

# Global instance
finder = OpportunityFinder()
