/*!
 *  File    : gSpreadsheetUtils.js
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
const excelColumnName = require('excel-column-name');

/**
 * Retrieve the content of a spreadsheet page or cells range, as an array of complex objects.
 * When `firstRowAsKeys` is true, the first non-empty row should contain the field names.
 * The string values "TRUE" and "FALSE" are always converted to booleans.
 * A field named '_row', containing the row number, will be added to each row object.
 * @param {google.auth.OAuth2} auth - A valid OAuth2 object
 * @param {string} spreadsheetId - The Google Spreadsheet ID
 * @param {string} range - The page name, or the range in 'A1' format
 * @param {boolean+} firstRowAsKeys - Indicates that the key names are located on the first row.
 * @return {object} - A composite object with two entries:
 *                    - `keys`: Ordered array of key names
 *                    - `rows`: Array of objects (one object per row) with cell values
 */
async function getSheetData(auth, spreadsheetId, range, firstRowAsKeys = true) {

  const data = await getRawSpreadsheetData(auth, spreadsheetId, range, 'ROWS');
  if (!data || !data.values)
    throw 'Unable to read the requested spredsheet data!';

  const keys = data.values[0].map((k, n) => (firstRowAsKeys && k) || excelColumnName.intToExcelCol(n));
  const rows = [];
  for (let i = firstRowAsKeys ? 1 : 0; i < data.values.length; i++) {
    const row = data.values[i].reduce((acc, val, n) => {
      acc[keys[n]] = val === 'TRUE' ? true : val === 'FALSE' ? false : val;
      return acc;
    }, {});

    row._row = i + 1;
    rows.push(row);
  }

  return {
    keys,
    rows,
  };
}

/**
 * Get the values of a Google spreadsheet page as an array of arrays.
 * @param {google.auth.OAuth2} auth - A valid OAuth2 object
 * @param {string} spreadsheetId - The Google Sheet ID
 * @param {string} range - The page name, or the range in 'A1' format
 * @param {string+} majorDimension - Optional param indicating if the result sould contain
 *                                   an array of rows (`ROWS`) or columns (`COLUMNS`). Default is `ROWS`.
 * @returns {Array[]}
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

/**
 * Updates a single cell on a Google Spreadsheet
 * @param {google.auth.OAuth2} auth - A valid OAuth2 object
 * @param {string} spreadsheetId - The Google Sheet ID
 * @param {string} page - The spreadsheet page name
 * @param {number} col - The column number (one-based index)
 * @param {number} row  - The row number (one-based index)
 * @param {any} value  - The value to be assigned to the specified cell
 */
async function updateSingleCell(auth, spreadsheetId, page, col, row, value) {

  const cellId = `${excelColumnName.intToExcelCol(col)}${row}`;
  const range = `${page}!${cellId}`;

  return new Promise(function (resolve, reject) {
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        range,
        values: [
          [value]
        ],
      },
      auth,
    }, (err, res) => {
      if (err)
        reject(err);
      resolve(res);
    });
  });
}

module.exports = {
  getRawSpreadsheetData,
  getSheetData,
  updateSingleCell,
};
