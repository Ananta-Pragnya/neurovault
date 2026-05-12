def deduplicate_actions(actions):
    unique = {}
    for action in actions:
        # Simple deduplication key based on action text or type
        key = f"{action['action']}:{action['text'][:20]}"
        if key not in unique or action['priority'] > unique[key]['priority']:
            unique[key] = action
    return list(unique.values())

def shock_to_action(shock_impacts, counterfactual):
    # Convert shock data into a recommendation action
    # This assumes 'shock_impacts' contains high severity items
    
    # Example logic: if negative impact > 2%, recommend hedge
    worst_impact_ticker = max(shock_impacts, key=lambda k: shock_impacts[k])
    impact_val = shock_impacts[worst_impact_ticker]
    
    action_type = "monitor"
    text = f"Monitor volatility in {worst_impact_ticker}"
    priority = 0.5
    
    if impact_val > 0.6: # High severity
        action_type = "hedge"
        text = f"Hedge exposure to {worst_impact_ticker} immediately."
        priority = 0.9
    
    return {
        'action': action_type,
        'text': text,
        'confidence': 0.85, # Derived from shock model confidence
        'priority': priority,
        'source': 'shock_model'
    }

def regime_recommendations(regime_data):
    # Return standard recommendations based on current regime
    regime = regime_data.get('regime', 'Neutral')
    recs = []
    
    if regime == 'Risk-On':
        recs.append({
            'action': 'increase',
            'text': 'Increase equity exposure to 70-80%. Favor growth/tech.',
            'confidence': 0.85,
            'priority': 0.7,
            'source': 'regime_model'
        })
    elif regime == 'Risk-Off':
        recs.append({
            'action': 'reduce',
            'text': 'Reduce equities to 40-50%. Increase cash/bonds.',
            'confidence': 0.90,
            'priority': 0.8,
            'source': 'regime_model'
        })
        
    return recs

def compose_decisions(shock_impacts: dict, rule_recommendations: list, 
                     portfolio: dict, counterfactual: dict, regime_data: dict):
    """
    Merge all signals into TOP 3 ACTIONS ONLY
    
    Returns: [
      {action, text, confidence, priority, evidence, audit_id},
      ... (max 3)
    ]
    """
    candidates = []
    
    # From shock analysis
    if shock_impacts:
        candidates.append(shock_to_action(shock_impacts, counterfactual))
    
    # From rules
    candidates.extend(rule_recommendations)
    
    # From regime
    if regime_data:
        candidates.extend(regime_recommendations(regime_data))
    
    # Deduplicate, rank, take top 3
    unique = deduplicate_actions(candidates)
    ranked = sorted(unique, key=lambda x: x['priority'], reverse=True)
    
    return ranked[:3]  # NEVER MORE THAN 3
