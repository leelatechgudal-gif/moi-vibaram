/**
 * logger.js — Centralized Winston logger
 * =======================================
 * Levels: error > warn > info > debug
 *
 * In production (NODE_ENV=production):
 *   - Console: JSON format (machine-readable)
 *   - Files: logs/app-YYYY-MM-DD.log (all), logs/error-YYYY-MM-DD.log (errors only)
 *   - Files rotate daily, kept for 14 days, max 20mb per file
 *
 * In development:
 *   - Console: colorized pretty format with timestamps
 *   - No file output (keeps dev clean)
 */

const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

// Pretty format for development console
const devFormat = format.combine(
    format.colorize({ all: true }),
    format.timestamp({ format: 'HH:mm:ss' }),
    format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
    })
);

// Structured JSON format for production
const prodFormat = format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
);

const logTransports = [];

// Console transport — always on
logTransports.push(
    new transports.Console({
        format: isProduction ? prodFormat : devFormat,
        level: isProduction ? 'info' : 'debug',
    })
);

// File transports — production only
if (isProduction) {
    const logsDir = path.join(__dirname, '../logs');

    logTransports.push(
        new DailyRotateFile({
            dirname: logsDir,
            filename: 'app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            maxSize: '20m',
            level: 'debug',
            format: prodFormat,
            zippedArchive: true,
        })
    );

    logTransports.push(
        new DailyRotateFile({
            dirname: logsDir,
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
            maxSize: '20m',
            level: 'error',
            format: prodFormat,
            zippedArchive: true,
        })
    );
}

const logger = createLogger({
    level: isProduction ? 'info' : 'debug',
    transports: logTransports,
    exitOnError: false,
});

module.exports = logger;
