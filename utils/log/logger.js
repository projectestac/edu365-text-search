const { createLogger, format, transports } = require('winston');

/**
   * Creates an app logger with proper defaults
   * 
   * @param {string} logLevel - Log level: 'debug', 'info', etc.
   * @param {bool} logToConsole - Whether to log to console or not.
   * @param {string|false} logFile - The path to the log file or false.
   * 
   * @returns The logger object
   */
function newLogger(logLevel, logToConsole, logFile = false) {

  const logTransports = [];
  if (logToConsole)
    logTransports.push(new transports.Console());
  if (logFile)
    logTransports.push(new transports.File({ filename: logFile }));

  const logger = createLogger({
    format: format.combine(
      format.splat(),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`),
    ),
    level: logLevel,
    handleExceptions: true,
    transports: logTransports,
  });

  return logger;
}

module.exports = {
  newLogger,
};