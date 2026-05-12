import sqlite3
import pandas as pd
from datetime import datetime
import os

class DataWarehouse:
    def __init__(self, db_path="quant_data.db"):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        return sqlite3.connect(self.db_path)

    def _init_db(self):
        with self._get_connection() as conn:
            # Table for OHLCV data
            conn.execute("""
                CREATE TABLE IF NOT EXISTS market_data (
                    symbol TEXT,
                    timestamp DATETIME,
                    open REAL,
                    high REAL,
                    low REAL,
                    close REAL,
                    volume INTEGER,
                    PRIMARY KEY (symbol, timestamp)
                )
            """)
            # Table for metadata (last update)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS metadata (
                    symbol TEXT PRIMARY KEY,
                    last_updated DATETIME
                )
            """)
            # Table for features
            conn.execute("""
                CREATE TABLE IF NOT EXISTS features (
                    symbol TEXT,
                    timestamp DATETIME,
                    feature_name TEXT,
                    feature_value REAL,
                    PRIMARY KEY (symbol, timestamp, feature_name)
                )
            """)
            # Table for predictions
            conn.execute("""
                CREATE TABLE IF NOT EXISTS predictions (
                    symbol TEXT,
                    timestamp DATETIME,
                    model_name TEXT,
                    predicted_value REAL,
                    confidence REAL,
                    PRIMARY KEY (symbol, timestamp, model_name)
                )
            """)

    def save_market_data(self, symbol, df):
        if df.empty:
            return
        
        df = df.copy()
        df['symbol'] = symbol
        df = df.reset_index()
        # Rename index to timestamp if necessary
        if 'Date' in df.columns:
            df = df.rename(columns={'Date': 'timestamp'})
        elif 'Datetime' in df.columns:
            df = df.rename(columns={'Datetime': 'timestamp'})
        
        # Ensure timestamp is string for sqlite
        df['timestamp'] = df['timestamp'].astype(str)
        
        with self._get_connection() as conn:
            df.to_sql('market_data', conn, if_exists='append', index=False, method='multi')
            # Update metadata
            last_date = df['timestamp'].max()
            conn.execute("INSERT OR REPLACE INTO metadata (symbol, last_updated) VALUES (?, ?)", (symbol, last_date))

    def get_market_data(self, symbol, start_date=None):
        query = "SELECT * FROM market_data WHERE symbol = ?"
        params = [symbol]
        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date)
        
        with self._get_connection() as conn:
            df = pd.read_sql_query(query, conn, params=params, parse_dates=['timestamp'])
            return df.set_index('timestamp')

    def get_last_update(self, symbol):
        with self._get_connection() as conn:
            res = conn.execute("SELECT last_updated FROM metadata WHERE symbol = ?", (symbol,)).fetchone()
            return res[0] if res else None

    def save_features(self, symbol, df):
        """
        Expects a dataframe with timestamp index and feature columns.
        """
        if df.empty:
            return
        
        # Melt dataframe to long format for features table
        df_reset = df.reset_index()
        if 'timestamp' not in df_reset.columns:
            # Handle cases where index name might be different
            cols = df_reset.columns.tolist()
            if 'Date' in cols:
                df_reset = df_reset.rename(columns={'Date': 'timestamp'})
            elif 'Datetime' in cols:
                df_reset = df_reset.rename(columns={'Datetime': 'timestamp'})
            else:
                df_reset = df_reset.rename(columns={cols[0]: 'timestamp'})
            
        df_reset['timestamp'] = df_reset['timestamp'].astype(str)
        
        # Melt all columns except timestamp
        df_melted = df_reset.melt(id_vars=['timestamp'], var_name='feature_name', value_name='feature_value')
        df_melted['symbol'] = symbol
        
        # Reorder columns to match DB
        df_melted = df_melted[['symbol', 'timestamp', 'feature_name', 'feature_value']]
        
        with self._get_connection() as conn:
            df_melted.to_sql('features', conn, if_exists='append', index=False, method='multi')

    def get_features(self, symbol, feature_names=None):
        query = "SELECT * FROM features WHERE symbol = ?"
        params = [symbol]
        
        if feature_names:
            placeholders = ','.join(['?'] * len(feature_names))
            query += f" AND feature_name IN ({placeholders})"
            params.extend(feature_names)
            
        with self._get_connection() as conn:
            df = pd.read_sql_query(query, conn, params=params, parse_dates=['timestamp'])
            # Pivot back to wide format
            if not df.empty:
                df = df.pivot(index='timestamp', columns='feature_name', values='feature_value')
            return df
