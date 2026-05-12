import 'dotenv/config';

const config = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  apiKeys: {
    gemini: process.env.GEMINI_API_KEY || process.env.API_KEY, // Supporting both conventions
    finnhub: process.env.FINNHUB_API_KEY,
  },
  throttleMs: parseInt(process.env.GLOBAL_API_THROTTLE_MS) || 1000,
  cacheTtl: {
    price: parseInt(process.env.PRICE_CACHE_TTL) || 60,
    intel: parseInt(process.env.INTEL_CACHE_TTL) || 300,
  }
};

export default config;
