/**
 * Logger Utility — CALTRC
 * Provides structured logging with timestamps and levels.
 */

const levels = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG'
};

function log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? JSON.stringify(args) : '';
    console.log(`[${timestamp}] [${level}] ${message}`, formattedArgs);
}

const logger = {
    info: (msg, ...args) => log(levels.INFO, msg, ...args),
    warn: (msg, ...args) => log(levels.WARN, msg, ...args),
    error: (msg, ...args) => log(levels.ERROR, msg, ...args),
    debug: (msg, ...args) => log(levels.DEBUG, msg, ...args)
};

module.exports = logger;
