#!/usr/bin/env node

const config = require('./config');
const { createLogger, format, transports } = require('winston');
const { checkSite } = require('./extractor/checkSite');

const logger = createLogger({
  format: format.combine(
    format.splat(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`),
  ),
  level: 'debug',
  handleExceptions: true,
  transports: [
    new transports.File({ filename: 'log/combined.log' }),
    new transports.Console(),
  ],
});

async function main() {
  const rows = await checkSite(
    config.CREDENTIALS_PATH, 
    config.TOKEN_PATH, 
    config.SPREADSHEET_ID, 
    config.SPREADSHEET_PAGE, 
    config.SCOPE, 
    config.BASE_URL, 
    logger
  );
  console.log(`Received ${rows.length} pages!`);
}

try {
  main();
} catch (err) {
  logger.error('ERROR: %s', err);
}
