import express from 'express';
import marketService from '../services/marketService.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/price/:symbol', async (req, res, next) => {
    try {
        const { symbol } = req.params;
        const data = await marketService.getPrice(symbol);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

router.get('/market-intel/:symbol', async (req, res, next) => {
    try {
        const { symbol } = req.params;
        const data = await marketService.getMarketIntel(symbol);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

import aiService from '../services/aiService.js';

router.post('/quantmind', async (req, res, next) => {
    try {
        const { prompt } = req.body;
        const text = await aiService.generateQuantMindAnalysis(prompt);
        res.json({ text });
    } catch (error) {
        next(error);
    }
});

router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

export default router;
