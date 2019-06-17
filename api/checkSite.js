

const http = require('http');
const https = require('https');
const { getSheetData, updateSingleCell } = require('./gSpreadsheetUtils');

// extend the Array prototype with an asyncForEach method
Array.prototype.asyncForEach = async function (fn) {
  for (let index = 0; index < this.length; index++) {
    await fn(this[index], index, this);
  }
};


async function getSitePages(auth, spreadsheetId, page, root, updateEtag = true) {

  console.log('Getting the list of pages from spreadsheet');
  const { keys, rows } = await getSheetData(auth, spreadsheetId, page, true);

  const etagCol = keys.indexOf('etag') + 1;
  if (etagCol < 1)
    throw 'The spreadsheet has no "etag" column!';

  await rows.filter(row => row.enabled).asyncForEach(async row => {
    const url = `${root}${row.path}`;
    console.log(`Checking ${url}`);
    const etag = await getEtagHeader(url);
    row._updated = row.etag && row.etag === etag ? false : true;
    if (row._updated) {
      // TODO: read page text!
      if (updateEtag) {
        console.log(`Updating etag for ${row.path}`);
        await updateSingleCell(auth, spreadsheetId, page, etagCol, row._row, etag);
      }
    }
  });

  return rows;
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
};