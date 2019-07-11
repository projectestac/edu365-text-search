#!/usr/bin/env node

require('dotenv').config();

const { createLogger, format, transports } = require('winston');
const { checkSite } = require('./extractor/checkSite');

const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH;
const TOKEN_PATH = process.env.TOKEN_PATH;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SPREADSHEET_PAGE = process.env.SPREADSHEET_PAGE;
const SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];
const BASE_URL = process.env.BASE_URL;

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
  const rows = await checkSite(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger);
  console.log(`Received ${rows.length} pages!`);
}

try {
  main();
} catch (err) {
  logger.error('ERROR: %s', err);
}
