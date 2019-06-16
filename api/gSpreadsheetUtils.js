/*!
 *  File    : gSpreadseetUtils.js
 *  Created : 15/06/2019
 *  By      : Francesc Busquets <francesc@gmail.com>
 *
 *  Asynchronous utilities to deal with Google Spreadsheets
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

const { google } = require('googleapis');

/**
 * First row has field names!
 * @param {*} auth 
 * @param {*} sheetId 
 * @param {*} range 
 */
async function getSheetData(auth, sheetId, range) {

  const data = await getRawSpreadsheetData(auth, sheetId, range);
  if (!data || !data.values)
    throw 'Unable to read the requested spredsheet data!';

  // TODO: Pass structure as param
  const keys = data.values[0].map((k, n) => k || `val${n}`);
  const result = [];
  for (let i = 1; i < data.values.length; i++) {
    const row = data.values[i].reduce((acc, val, n) => {
      acc[keys[n]] = val === 'TRUE' ? true : val === 'FALSE' ? false : val;
      return acc;
    }, {});

    row._row = i;
    result.push(row);
  }

  return result;
}

/**
 * 
 * @param {*} auth 
 * @param {*} spreadsheetId 
 * @param {*} range 
 * @param {*} majorDimension 
 */
async function getRawSpreadsheetData(auth, spreadsheetId, range, majorDimension = 'ROWS') {
  return new Promise(function (resolve, reject) {
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      majorDimension,
    }, (err, res) => {
      if (err)
        reject(err);
      resolve(res.data);
    });
  });
}

module.exports = {
  getRawSpreadsheetData,
  getSheetData,
};
