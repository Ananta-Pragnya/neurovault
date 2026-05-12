import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import config from './config/env.js';
import marketRoutes from './routes/market.routes.js';
import errorHandler from './middleware/error.middleware.js';
import logger from './utils/logger.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

app.use('/api', marketRoutes);

app.get('/', (req, res) => {
    res.json({
        name: 'Market-Intel AI Backend',
        version: '1.1.0',
        status: 'production-ready',
        features: ['Real-time Quotes', 'AI Market Intel', 'Grounding (Google Search)']
    });
});

app.use(errorHandler);

const server = app.listen(config.port, () => {
    logger.info(`Market-Intel Backend running on port ${config.port}`);
    logger.info(`Environment: ${config.env}`);
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        logger.info('Process terminated.');
    });
});
