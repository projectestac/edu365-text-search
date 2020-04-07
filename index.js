#!/usr/bin/env node

/**
 * This file generates the Google spreadsheet with the data that
 * the Search Engine needs
 */

const config = require('./config');
const { newLogger } = require('./utils/log/logger');
const { generateMap } = require('./searchEngine/mapGenerator');

// App logger
const logger = newLogger('debug', true, 'log/combined.log');

// Generates the Google spreadsheet with the data that the Search Engine needs
async function main() {
  await generateMap(
    config.CREDENTIALS_PATH, 
    config.TOKEN_PATH, 
    config.AUTO_SPREADSHEET_ID, 
    config.EDU_MAP_SPREADSHEET_ID, 
    config.SPREADSHEET_PAGE, 
    config.SCOPE, 
    logger
  );
}

try {
  // Generate the Google spreadsheet with the data that the Search Engine needs
  main();
} catch (err) {
  logger.error('ERROR: %s', err);
}
