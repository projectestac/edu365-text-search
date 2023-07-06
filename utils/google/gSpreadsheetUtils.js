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
 * Retrieve the content of a sheet or cell range as an array of complex objects.
 * When `firstRowAsKeys` is true, the first non-empty row should contain the field names.
 * String values "TRUE" and "FALSE" are always converted to boolean.
 * A field named '_row', containing the row number, will be added to each row object.
 * @param {google.auth.OAuth2} auth - A valid OAuth2 object
 * @param {string} spreadsheetId - The Google Spreadsheet ID
 * @param {string} range - Sheet name or range in 'A1' format
 * @param {boolean+} firstRowAsKeys - When `true`, the key names are on the first row
 * @return {object} - An object with two entries:
 *                    - `keys`: Ordered array of key names
 *                    - `rows`: Array of objects (one object per row) with the cell values
 */
async function getSheetData(auth, spreadsheetId, range, firstRowAsKeys = true) {

  const data = await getRawSpreadsheetData(auth, spreadsheetId, range, 'ROWS');
  if (!data || !data.values)
    throw new Error('Unable to read the requested spredsheet data!');

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
 * Get the values of a sheet as an array of arrays.
 * @param {google.auth.OAuth2} auth - A valid OAuth2 object
 * @param {string} spreadsheetId - The Google Spredsheets ID
 * @param {string} range - Sheet name or range in 'A1' format
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
      else
        resolve(res.data);
    });
  });
}

/**
 * Updates a single cell on a Google spreadsheet
 * @param {google.auth.OAuth2} auth - A valid OAuth2 object
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} page - Sheet name
 * @param {number} col - Column number (one-based index)
 * @param {number} row  - Row number (one-based index)
 * @param {any} value  - Value to be assigned to the cell
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
      else
        resolve(res);
    });
  });
}

/**
 * Returns title and url of a spreadsheet
 * @param {google.auth.OAuth2} auth - A valid OAuth2 object
 * @param {string} spreadsheetId - Spreadsheet ID
 *
 * @returns {{title: string, url: string}} - Object containign the title and the url of the spreedsheet
 */
async function getSpreadSheetTitleAndUrl(auth, spreadsheetId) {
  return new Promise(function (resolve, reject) {
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [],
      includeGridData: false
    }, (err, res) => {
      if (err)
        reject(err);
      else
        resolve({
          title: res.data.properties.title,
          url: res.data.spreadsheetUrl
        });
    }
    );
  });
}

/**
 * Deletes the data in the 'range' of the spreadsheet
 * @param {google.auth.OAuth2} auth - A valid OAuth2 object
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} range - Sheet name or range in 'A1' format to delete
 *
 * @returns {{spreadsheetId: string, clearedRange: string}} - Object containign the spreadsheetId and the range cleared
 */
async function cleanSpreadSheetData(auth, spreadsheetId, range) {
  return new Promise(function (resolve, reject) {
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: range
    }, (err, res) => {
      if (err)
        reject(err);
      else
        resolve({
          spreadsheetId: res.data.spreadsheetId,
          clearedRange: res.data.clearedRange
        });
    }
    );
  });
}

/**
 * Write an array of rows on a page of a Google spreadsheet
 * @param {google.auth.OAuth2} auth - A valid OAuth2 object
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} page - Sheet name
 * @param {string[][]} data - Array of arrays with the data of each cell to write on
 * @param {number} [rowIndex=1] - Starting row number (one-based index)
 */
async function writeRows(auth, spreadsheetId, page, data, rowIndex = 1) {
  return new Promise(function (resolve, reject) {
    const sheets = google.sheets({ version: 'v4', auth });
    const range = `${page}!${rowIndex}:${rowIndex + data.length}`;
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: range,
      valueInputOption: 'RAW',
      resource: {
        range,
        "majorDimension": "ROWS",
        values: data,
      },
    }, (err, res) => {
      if (err)
        reject(err);
      else
        resolve(res);
    }
    );
  });
}

module.exports = {
  getRawSpreadsheetData,
  getSheetData,
  updateSingleCell,
  getSpreadSheetTitleAndUrl,
  cleanSpreadSheetData,
  writeRows,
};
