#!/usr/bin/env node

require('dotenv').config();
const { getOauth2Client } = require('./oAuth2Utils');
const { getSheetData } = require('./gSpreadsheetUtils');
//const updateCell = require('./updateCell');

const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH;
const TOKEN_PATH = process.env.TOKEN_PATH;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SPREADSHEET_PAGE = process.env.SPREADSHEET_PAGE;
const SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];


async function main() {

  if (!SPREADSHEET_ID || !SPREADSHEET_PAGE)
    throw 'Invalid spreadsheet ID or range!';

  const auth = await getOauth2Client(CREDENTIALS_PATH, TOKEN_PATH, SCOPE);
  const pages = await getSheetData(auth, SPREADSHEET_ID, SPREADSHEET_PAGE);

  pages.filter(p => p.enabled).forEach(page => {
    const { path, title, descriptors, lang, js, etag, _row } = page;
    console.log(`path: ${path} - row: ${_row}`);
    page.etag = "abcdekjhkjlkjh7645hgf";
  });

  //await updateCell(auth, SPREADSHEET_ID, SPREADSHEET_PAGE, 'G4', 'Hello world!');

  console.log('done!');

}

main();
