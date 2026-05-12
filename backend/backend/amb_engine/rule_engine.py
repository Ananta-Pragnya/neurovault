def eval_condition(condition, metrics):
    metric_path = condition['metric'].split('.')
    value = metrics
    for key in metric_path:
        value = value.get(key)
        if value is None:
            return False
            
    op = condition['op']
    target = condition['value']
    
    if op == '>': return value > target
    if op == '<': return value < target
    if op == '>=': return value >= target
    if op == '<=': return value <= target
    if op == '==': return value == target
    if op == '!=': return value != target
    
    return False

def evaluate_rules(rules: list, metrics: dict):
    """
    Execute distilled rules, return prioritized recommendations
    
    Rules format:
    {
      "id": "rule_tech_overexposed",
      "if": [{"metric": "portfolio.tech_exposure", "op": ">", "value": 0.60}],
      "then": [{"action": "recommend", "text": "...", "confidence": 0.85}],
      "priority": 0.8
    }
    """
    recommendations = []
    
    for rule in rules:
        try:
            if all(eval_condition(c, metrics) for c in rule.get('if', [])):
                for action in rule.get('then', []):
                    recommendations.append({
                        'rule_id': rule['id'],
                        'action': action.get('action', 'info'),
                        'text': action.get('text', ''),
                        'confidence': action.get('confidence', 0.5),
                        'priority': rule.get('priority', 0.5)
                    })
        except Exception as e:
            # Log error but continue
            print(f"Error evaluating rule {rule.get('id')}: {e}")
            continue
    
    return sorted(recommendations, key=lambda x: x['priority'], reverse=True)
