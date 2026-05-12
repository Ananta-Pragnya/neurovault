"""
Institutional-Grade Scheduler
Batch processing to minimize API usage
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class InstitutionalScheduler:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.setup_jobs()
    
    def setup_jobs(self):
        """Setup scheduled tasks with minimal API usage"""
        
        # Market data fetch - every 15 minutes during market hours
        self.scheduler.add_job(
            func=self.fetch_market_batch,
            trigger=CronTrigger(
                day_of_week='mon-fri',
                hour='9-16',
                minute='*/15',
                timezone='America/New_York'
            ),
            id='market_fetch',
            name='Batch Market Data Fetch',
            replace_existing=True
        )
        
        # Morning intelligence brief - 9:45 AM ET
        self.scheduler.add_job(
            func=self.generate_morning_brief,
            trigger=CronTrigger(
                day_of_week='mon-fri',
                hour=9,
                minute=45,
                timezone='America/New_York'
            ),
            id='morning_brief',
            name='Morning Intelligence Brief',
            replace_existing=True
        )
        
        # Evening recap - 6:00 PM ET
        self.scheduler.add_job(
            func=self.generate_evening_recap,
            trigger=CronTrigger(
                day_of_week='mon-fri',
                hour=18,
                minute=0,
                timezone='America/New_York'
            ),
            id='evening_recap',
            name='Evening Recap',
            replace_existing=True
        )
        
        logger.info("✅ Scheduler initialized with minimal API usage strategy")
    
    def fetch_market_batch(self):
        """Single batch fetch for all symbols"""
        from backend.compute.batch_fetcher import fetch_all_data
        logger.info("📊 Fetching market data batch...")
        fetch_all_data()
    
    def generate_morning_brief(self):
        """Generate morning intelligence - ONE AI call"""
        from backend.intelligence.ai_digest import create_morning_brief
        logger.info("🌅 Generating morning brief...")
        create_morning_brief()
    
    def generate_evening_recap(self):
        """Generate evening recap - ONE AI call"""
        from backend.intelligence.ai_digest import create_evening_recap
        logger.info("🌙 Generating evening recap...")
        create_evening_recap()
    
    def start(self):
        """Start the scheduler"""
        self.scheduler.start()
        logger.info("🚀 Institutional scheduler started")
    
    def shutdown(self):
        """Graceful shutdown"""
        self.scheduler.shutdown()
        logger.info("🛑 Scheduler stopped")

# Global instance
scheduler = InstitutionalScheduler()
