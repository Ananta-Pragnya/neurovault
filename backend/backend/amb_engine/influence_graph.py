import pandas as pd
import numpy as np
from sklearn.linear_model import Lasso

def prepare_lagged_features(df, target, max_lag):
    n = len(df)
    X = []
    y = df[target].iloc[max_lag:].values
    
    for i in range(max_lag, n):
        row = []
        for col in df.columns:
            for lag in range(1, max_lag + 1):
                row.append(df[col].iloc[i - lag])
        X.append(row)
        
    return np.array(X), y

def extract_edges(coefs, target, columns, max_lag, threshold=1e-6):
    edges = []
    idx = 0
    for col in columns:
        for lag in range(1, max_lag + 1):
            weight = coefs[idx]
            if abs(weight) > threshold:
                edges.append({
                    'from': col,
                    'to': target,
                    'weight': float(weight),
                    'lag': lag
                })
            idx += 1
    return edges

def build_graph(returns_df: pd.DataFrame, max_lag=5, top_k=20):
    """
    Sparse causal graph using Lasso VAR
    
    For each asset:
    - Regress on lagged returns of others (L1 penalty)
    - Keep top-K edges by weight magnitude
    
    Output: {edges: [{from, to, weight, lag}]}
    """
    graph = {'edges': []}
    columns = returns_df.columns
    
    # Need sufficient data
    if len(returns_df) <= max_lag + 5:
        return graph

    for target in columns:
        # Simplified lag feature prep for demonstration - in prod use optimized matrix ops
        # Here we assume returns_df is small enough for this iterative approach
        
        # Prepare X (lagged features of ALL columns) and y (target column)
        # Note: This checks 'granger' like causality
        
        # Create lagged features
        lags = []
        feature_names = []
        for col in columns:
            for lag in range(1, max_lag + 1):
                lagged_col = returns_df[col].shift(lag)
                lags.append(lagged_col)
                feature_names.append((col, lag))
        
        X_df = pd.concat(lags, axis=1)
        X_df.columns = [f"{c}_L{l}" for c, l in feature_names]
        
        # Align X and y
        y = returns_df[target]
        valid_idx = ~X_df.isnull().any(axis=1) & ~y.isnull()
        
        if valid_idx.sum() < 10:
            continue
            
        X_clean = X_df.loc[valid_idx]
        y_clean = y.loc[valid_idx]
        
        model = Lasso(alpha=0.01)
        model.fit(X_clean, y_clean)
        
        # Extract significant edges
        coefs = model.coef_
        current_edges = []
        
        for idx, coef in enumerate(coefs):
            if abs(coef) > 1e-6:
                source_col, lag = feature_names[idx]
                current_edges.append({
                    'from': source_col,
                    'to': target,
                    'weight': float(coef),
                    'lag': lag
                })
        
        # Add top-k edges for this target
        sorted_edges = sorted(current_edges, key=lambda x: abs(x['weight']), reverse=True)
        graph['edges'].extend(sorted_edges[:top_k])
    
    return graph
