/*!
 *  File    : checkSite.js
 *  Created : 19/06/2019
 *  By      : Francesc Busquets <francesc@gmail.com>
 *
 *  Checks a full web site, based on the information collected on a Google Spreadsheet
 *
 *  @license EUPL-1.2
 *  @licstart
 *  (c) 2019 Educational Telematic Network of Catalonia (XTEC)
 *
 *  Licensed under the EUPL, Version 1.2 or -as soon they will be approved by
 *  the European Commission- subsequent versions of the EUPL (the "Licence");
 *  You may not use this work except in compliance with the Licence.
 *
 *  You may obtain a copy of the Licence at:
 *  https://joinup.ec.europa.eu/software/page/eupl
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis, WITHOUT
 *  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 *  Licence for the specific language governing permissions and limitations
 *  under the Licence.
 *  @licend
 */

const http = require('http');
const https = require('https');
const { getOauth2Client } = require('../utils/oAuth2Utils');
const { getSheetData, updateSingleCell } = require('../utils/gSpreadsheetUtils');
const { checkPages } = require('./pageChecker');

// extend the Array prototype with the `asyncForEach` method
Array.prototype.asyncForEach = async function (fn) {
  for (let index = 0; index < this.length; index++) {
    await fn(this[index], index, this);
  }
};

/**
 * Check all URLs collected in a spreadsheet for possible updates. When newer content is detected (new `etag`),
 * scan the content the page and store on the spreadsheet a list with all the words detected.
 * @param {String} CREDENTIALS_PATH - JSON file containing the OAuth2 credentials
 * @param {String} TOKEN_PATH - File with the token provided by the Google APIs when authorized for first time
 * @param {String} SPREADSHEET_ID - The Google spreadsheet ID
 * @param {String} SPREADSHEET_PAGE - The sheet name
 * @param {String[]} SCOPE - Array of API scopes for wich this credentials are requested 
 * @param {String} BASE_URL - Base used to build the full URLs adding `path`
 * @param {Object} logger - A Winston object
 * @returns {Object[]} - An array with the content of the sheet rows.
 */
async function checkSite(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger) {

  if (!CREDENTIALS_PATH)
    throw new Error('Path to credentials file not set!');

  if (!SPREADSHEET_ID || !SPREADSHEET_PAGE)
    throw new Error('Invalid spreadsheet ID or range!');

  if (!BASE_URL)
    throw new Error('Base URL not set!');

  const auth = await getOauth2Client(CREDENTIALS_PATH, TOKEN_PATH, SCOPE, logger);

  const { keys, rows } = await getSitePages(auth, SPREADSHEET_ID, SPREADSHEET_PAGE, BASE_URL, logger);

  const pages = rows.filter(p => p._updated);
  logger.info(`%d page(s) should be updated`, pages.length);

  await checkPages(pages, BASE_URL, logger);

  await updateEtags(auth, SPREADSHEET_ID, SPREADSHEET_PAGE, keys, pages, logger);
  logger.info('%d page(s) have been updated', pages.length);

  return rows;
}

/**
 * Read the page info records stored on a Google spreadsheet
 * @param {String} CREDENTIALS_PATH - JSON file containing the OAuth2 credentials
 * @param {String} TOKEN_PATH - File with the token provided by the Google APIs when authorized for first time
 * @param {String} SPREADSHEET_ID - The Google spreadsheet ID
 * @param {String} SPREADSHEET_PAGE - The sheet name
 * @param {String[]} SCOPE - Array of API scopes for wich this credentials are requested 
 * @param {Object} logger - A Winston object
 * @returns - An array of page info objects
 */
async function getSearchData(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, logger) {

  if (!CREDENTIALS_PATH)
    throw new Error('Path to credentials file not set!');

  if (!SPREADSHEET_ID || !SPREADSHEET_PAGE)
    throw new Error('Invalid spreadsheet ID or range!');

  const auth = await getOauth2Client(CREDENTIALS_PATH, TOKEN_PATH, SCOPE, logger);

  logger.info('Getting the list of site pages from Google spreadsheet');
  const { rows } = await getSheetData(auth, SPREADSHEET_ID, SPREADSHEET_PAGE, true);

  const result = rows.filter(p => p.enabled && p.url && p.text).map(p => ({
    url: p.url,
    title: p.title || p.url,
    descriptors: p.descriptors || '',
    lang: p.lang,
    text: p.text,
  }));

  logger.info('%d page(s) available for full-text search', result.length);

  return result;
}

/**
 * 
 * @param {Object} auth - A valid OAuth2 object
 * @param {*} spreadsheetId 
 * @param {*} page 
 * @param {*} root 
 * @param {*} logger 
 */
async function getSitePages(auth, spreadsheetId, page, root, logger) {

  logger.info('Getting the list of site pages from Google spreadsheet');
  const { keys, rows } = await getSheetData(auth, spreadsheetId, page, true);

  await rows.filter(row => row.enabled).asyncForEach(async row => {
    const url = `${root}${row.path}`;
    logger.info('Getting the "etag" of %s', url);
    const etag = await getEtagHeader(url);
    row._updated = row.etag && row.etag === etag ? false : true;
    if (row._updated) {
      logger.info('This page should be updated: %s', url);
      row.etag = etag;
    }
  });

  return {
    keys,
    rows,
  };
}

async function updateEtags(auth, spreadsheetId, spreadsheetPage, keys, pages, logger) {
  const etagCol = keys.indexOf('etag') + 1;
  if (etagCol < 1)
    throw new Error('The spreadsheet has no "etag" column!');

  const textCol = keys.indexOf('text') + 1;
  if (textCol < 1)
    throw new Error('The spreadsheet has no "text" column!');

  await pages.asyncForEach(async page => {
    if (page._row && page.etag) {
      logger.info('Updating etag and text on the spreadsheet for: %s', page.path);
      await updateSingleCell(auth, spreadsheetId, spreadsheetPage, etagCol, page._row, page.etag);
      await updateSingleCell(auth, spreadsheetId, spreadsheetPage, textCol, page._row, page._text || '');
    }
  });

  return pages;
}

async function getEtagHeader(url) {

  if (!url || !url.startsWith('http'))
    throw new Error(`Invalid URL: ${url}`);

  const httpPackage = url.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    httpPackage.request(
      url,
      { method: 'HEAD' },
      res => {
        if (res.statusMessage !== 'OK')
          reject(`Error getting response from ${url}. Expected "OK", got "${res.statusMessage}"`);
        resolve((res.headers && res.headers.etag) || '');
      }
    )
      .on('error', err => {
        reject(`Error getting ${url}: ${err}`);
      })
      .end();
  });
}

module.exports = {
  checkSite,
  getSearchData,
  getSitePages,
  getEtagHeader,
  updateEtags,
};