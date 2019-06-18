

const http = require('http');
const https = require('https');
const { getSheetData, updateSingleCell } = require('./gSpreadsheetUtils');

// extend the Array prototype with an asyncForEach method
Array.prototype.asyncForEach = async function (fn) {
  for (let index = 0; index < this.length; index++) {
    await fn(this[index], index, this);
  }
};

async function getSitePages(auth, spreadsheetId, page, root, logger) {

  logger.info( 'Getting the list of site pages from Google spreadsheet');
  const { keys, rows } = await getSheetData(auth, spreadsheetId, page, true);

  await rows.filter(row => row.enabled).asyncForEach(async row => {
    const url = `${root}${row.path}`;
    logger.info( 'Getting the "etag" of %s', url);
    const etag = await getEtagHeader(url);
    row._updated = row.etag && row.etag === etag ? false : true;
    if (row._updated) {
      logger.info( 'This page should be updated: %s', url);
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
      logger.info( 'Updating etag on the spreadsheet for: %s', page.path);
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
  getSitePages,
  getEtagHeader,
  updateEtags,
};