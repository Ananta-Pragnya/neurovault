from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)  # bcrypt hash — added by 0001 migration
    created_at = Column(DateTime, default=datetime.utcnow)
    
    watchlists = relationship("Watchlist", back_populates="user")
    positions = relationship("Position", back_populates="user")
    trade_history = relationship("TradeHistory", back_populates="user")

class Watchlist(Base):
    __tablename__ = "watchlists"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    symbol = Column(String, index=True)
    volatility_tier = Column(String, default="Moderate") # High, Moderate, Stable
    added_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="watchlists")

class Position(Base):
    """
    CRITICAL: Tracks entry_price and peak_price for the Trailing Stop Engine
    floor_price should be calculated on the fly or stored here
    """
    __tablename__ = "positions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    symbol = Column(String, index=True)
    entry_price = Column(Float, nullable=False)
    peak_price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    volatility_tier = Column(String, default="Moderate")
    is_active = Column(Boolean, default=True)
    opened_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="positions")

class TradeHistory(Base):
    __tablename__ = "trade_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    symbol = Column(String, index=True)
    entry_price = Column(Float)
    peak_price = Column(Float)
    floor_price = Column(Float)
    exit_price = Column(Float)
    pnl = Column(Float)
    closed_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="trade_history")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    trigger_ticker = Column(String, index=True)
    severity = Column(Integer) # 1 to 5
    event_type = Column(String)
    action_taken = Column(String)
    pnl_impact = Column(Float, nullable=True)

class EnsembleWeight(Base):
    __tablename__ = "ensemble_weights"
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, unique=True, index=True)
    weight_value = Column(Float, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PriceAlert(Base):
    """User-defined price threshold alerts (fires when price crosses trigger_price)."""
    __tablename__ = "price_alerts"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    trigger_price = Column(Float, nullable=False)
    direction = Column(String, nullable=False)  # "above" or "below"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    triggered_at = Column(DateTime, nullable=True)
