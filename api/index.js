#!/usr/bin/env node

require('dotenv').config();
const { getOauth2Client } = require('./oAuth2Utils');
const { getSitePages, updateEtags } = require('./checkSite');
const { checkPages } = require('./pageChecker');

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
    const { keys, rows } = await getSitePages(auth, SPREADSHEET_ID, SPREADSHEET_PAGE, BASE_URL);
    const pages = rows.filter(p => p._updated);
    await checkPages(pages, BASE_URL);

    saveResults(pages, `data${(0x10000 + Math.random() * 0x10000).toString(16).substring(0, 4).toUpperCase()}.json`);

    await updateEtags(auth, SPREADSHEET_ID, SPREADSHEET_PAGE, keys, pages);
    console.log(`${pages.length} pages updated!`);
  } catch (err) {
    throw err;
  }

}

const { promisify } = require('util');
const fs = require('fs');
//const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function saveResults(pages, fileName) {
  console.log(`Saving result into ${fileName}`);
  const result = pages.map(({ path, title, lang, descriptors, _text }) => {
    return {
      path,
      title,
      lang,
      descriptors,
      text: _text,
    };
  });

  await writeFile(fileName, JSON.stringify(result, null, ' '), 'utf8');
}


try {
  main();
} catch (err) {
  console.error(`ERROR: ${err}`);
}
