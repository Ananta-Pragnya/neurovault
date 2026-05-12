import NodeCache from 'node-cache';
import config from '../config/env.js';

const cache = new NodeCache({ stdTTL: config.cacheTtl.price, checkperiod: 120 });

const cacheService = {
  get: (key) => cache.get(key),
  set: (key, value, ttl) => cache.set(key, value, ttl),
  del: (key) => cache.del(key),
  flush: () => cache.flushAll(),

  getPrice: (symbol) => cache.get(`price_${symbol}`),
  setPrice: (symbol, data) => cache.set(`price_${symbol}`, data, config.cacheTtl.price),

  getIntel: (symbol) => cache.get(`intel_${symbol}`),
  setIntel: (symbol, data) => cache.set(`intel_${symbol}`, data, config.cacheTtl.intel)
};

export default cacheService;
