#!/usr/bin/env node

require('dotenv').config();
const { getOauth2Client } = require('./oAuth2Utils');
const { getSitePages } = require('./checkSite');

const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH;
const TOKEN_PATH = process.env.TOKEN_PATH;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SPREADSHEET_PAGE = process.env.SPREADSHEET_PAGE;
const SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];
const BASE_URL = process.env.BASE_URL;

async function main() {

  if (!CREDENTIALS_PATH)
    throw 'Path to credentials file not set!';

  if (!SPREADSHEET_ID || !SPREADSHEET_PAGE)
    throw 'Invalid spreadsheet ID or range!';

  if (!BASE_URL)
    throw ('Base URL not set!');

  try {
    const auth = await getOauth2Client(CREDENTIALS_PATH, TOKEN_PATH, SCOPE);
    const pages = await getSitePages(auth, SPREADSHEET_ID, SPREADSHEET_PAGE, BASE_URL, true);
    const n = pages.filter(p => p._updated).length;
    console.log(`${n} pages will be updated`);
  } catch (err) {
    throw err;
  }

}

try {
  main();
} catch (err) {
  console.error(`ERROR: ${err}`);
}
