#!/usr/bin/env node

const config = require('./config');
const { newLogger } = require('./logger');
const { checkSite } = require('./extractor/checkSite');

// App logger
const logger = newLogger('debug', true, 'log/combined.log');

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
  logger.info(`Received ${rows.length} pages!`);
}

try {
  main();
} catch (err) {
  logger.error('ERROR: %s', err);
}
