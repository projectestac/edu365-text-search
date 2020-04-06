const { createLogger, format, transports } = require('winston');

function newLogger(logLevel, logToConsole, logFile) {

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