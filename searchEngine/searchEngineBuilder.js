const Fuse = require('fuse.js');
const { getOauth2Client } = require('../utils/google/oAuth2Utils');
const { getSheetData } = require('../utils/google/gSpreadsheetUtils');

/**
 * Reads the page info records stored on a Google spreadsheet
 * 
 * @param {String} credentialsPath - JSON file containing the OAuth2 credentials
 * @param {String} tokenPath - File with the token provided by the Google APIs when authorized for first time
 * @param {String} spreadSheetId - The Google spreadsheet ID
 * @param {String} spreadSheetPage - The sheet name
 * @param {String[]} scope - Array of API scopes for wich this credentials are requested
 * @param {Object} logger - A Winston object
 * 
 * @returns - An array of page info objects
 */
async function getSearchData(credentialsPath, tokenPath, spreadSheetId, spreadSheetPage, scope, logger) {

  if (!credentialsPath)
    throw new Error('Path to credentials file not set!');

  if (!spreadSheetId || !spreadSheetPage)
    throw new Error('Invalid spreadsheet ID or range!');

  const auth = await getOauth2Client(credentialsPath, tokenPath, scope, logger);

  logger.info('Getting the list of site pages from Google spreadsheet');
  const { rows } = await getSheetData(auth, spreadSheetId, spreadSheetPage, true);

  const result = rows;
  logger.info('%d page(s) available for full-text search', result.length);

  return result;
}

/**
 * Builds the Search Engine using the data in a Google Spreadsheet
 * 
 * @param {String} credentialsPath - JSON file containing the OAuth2 credentials
 * @param {String} tokenPath - File with the token provided by the Google APIs when authorized for first time
 * @param {String} spreadSheetId - The Google spreadsheet ID
 * @param {String} spreadSheetPage - The sheet name
 * @param {String[]} scope - Array of API scopes for wich this credentials are requested
 * @param {Object} logger - A Winston object
 * @param {Object} searchOptions - Fuse.js search options object. See: https://fusejs.io
 * 
 * @returns {Object} - The Search Engine object ready to be used
 */
async function buildSearchEngine(credentialsPath, tokenPath, spreadSheetId, spreadSheetPage, scope, searchOptions, logger) {
  logger.info('Building the search engine');

  // Read data from a Google Spreadsheet
  const siteData = await getSearchData(
    credentialsPath,
    tokenPath,
    spreadSheetId,
    spreadSheetPage,
    scope,
    logger
  );
  logger.info(`Search engine ready with ${siteData.length} pages indexed.`);

  // Create and return the Search Engine object
  return new Fuse(siteData, searchOptions);
};

module.exports = buildSearchEngine;