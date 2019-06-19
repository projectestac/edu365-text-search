/*!
 *  File    : checkSite.js
 *  Created : 19/06/2019
 *  By      : Francesc Busquets <francesc@gmail.com>
 *
 *  Checks a full web site, based on the inforation compiled on a Google Spreadsheet
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

async function checkSite(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger) {

  if (!CREDENTIALS_PATH)
    throw 'Path to credentials file not set!';

  if (!SPREADSHEET_ID || !SPREADSHEET_PAGE)
    throw 'Invalid spreadsheet ID or range!';

  if (!BASE_URL)
    throw ('Base URL not set!');

  const auth = await getOauth2Client(CREDENTIALS_PATH, TOKEN_PATH, SCOPE, logger);

  const { keys, rows } = await getSitePages(auth, SPREADSHEET_ID, SPREADSHEET_PAGE, BASE_URL, logger);

  const pages = rows.filter(p => p._updated);
  logger.info(`%d page(s) should be updated`, pages.length);

  await checkPages(pages, BASE_URL, logger);

  await updateEtags(auth, SPREADSHEET_ID, SPREADSHEET_PAGE, keys, pages, logger);
  logger.info('%d page(s) have been updated', pages.length);

  return rows;
}


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
    throw 'The spreadsheet has no "etag" column!';

  await pages.asyncForEach(async page => {
    if (page._row && page.etag) {
      logger.info('Updating etag on the spreadsheet for: %s', page.path);
      await updateSingleCell(auth, spreadsheetId, spreadsheetPage, etagCol, page._row, page.etag);
    }
  });

  return pages;
}

async function getEtagHeader(url) {

  if (!url || !url.startsWith('http'))
    throw `Invalid URL: ${url}`;

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
  getSitePages,
  getEtagHeader,
  updateEtags,
};