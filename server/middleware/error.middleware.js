import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    logger.error(`[${req.method}] ${req.url} - ${statusCode}`, err.stack);

    res.status(statusCode).json({
        error: true,
        message,
        status: statusCode,
        timestamp: new Date().toISOString()
    });
};

export default errorHandler;
