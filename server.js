#!/usr/bin/env node

require('dotenv').config();
const express = require('express');
const FulltextSearch = require('./search/FullTextSearch');
const { createLogger, format, transports } = require('winston');
const LogToResponse = require('./utils/logToResponse');
const { checkSite, getSearchData } = require('./extractor/checkSite');
const { generateMap } = require('./extractor/mapGenerator');

const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH;
const TOKEN_PATH = process.env.TOKEN_PATH;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const EDU_MAP_SPREADSHEET_ID = process.env.EDU_MAP_SPREADSHEET_ID;
const AUTO_SPREADSHEET_ID = process.env.AUTO_SPREADSHEET_ID;
const SPREADSHEET_PAGE = process.env.SPREADSHEET_PAGE;
const SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];
const BASE_URL = process.env.BASE_URL;
const AUTH_SECRET = process.env.AUTH_SECRET;
const LOG_FILE = process.env.LOG_FILE;
const LOG_CONSOLE = process.env.LOG_CONSOLE !== 'false';
const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';
const APP_PORT = process.env.APP_PORT || 8080;

// Winston transports used by the main logger
const logTransports = [];
if (LOG_CONSOLE)
  logTransports.push(new transports.Console());
if (LOG_FILE)
  logTransports.push(new transports.File({ filename: LOG_FILE }));

// App logger
const logger = createLogger({
  format: format.combine(
    format.splat(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`),
  ),
  level: LOG_LEVEL,
  handleExceptions: true,
  transports: logTransports,
});

// The main search engine, built at server startup
let searchEngine = null;

// Prepare the full-text search engine
async function buildSearchEngine() {
  logger.info('Building the search engine');
  // const siteData = await getSearchData(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger);
  const siteData = await getSearchData(CREDENTIALS_PATH, TOKEN_PATH, AUTO_SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger);
  searchEngine = new FulltextSearch(siteData);
  logger.info(`Search engine ready with ${siteData.length} pages indexed.`);
};

// The main app
const app = express();

// Re-scan the entire site, updating data on the Google spreadsheet
app.get('/build-index-page', async (req, res, next) => {

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.info(`/build-index-page called from ${ip}`);

  const logtr = new LogToResponse({ response: res, html: true, num: false, eol: '\n', meta: ['timestamp'] });
  logger.add(logtr);

  try {
    if (AUTH_SECRET !== req.query.auth)
      throw new Error('Invalid request!');

    res.append('content-type', 'text/html; charset=utf-8');
    res.flushHeaders();
    res.write(`<html>\n<head>\n${LogToResponse.CSS}\n</head>\n<body>\n`);
    logtr.startLog(true);

    await generateMap(CREDENTIALS_PATH, TOKEN_PATH, AUTO_SPREADSHEET_ID, EDU_MAP_SPREADSHEET_ID, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger)

    // This is the real job: check the site for updated pages and reload strings on the search engine
    // const rows = await checkSite(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger);
    // await buildSearchEngine();
    // ----

    logtr.endLog();
    // res.write(`<p>${rows.length} pages have been processed</p>\n`);
    res.write('</body>\n</html>');
    res.end();

  } catch (err) {
    next(err.toString());
  } finally {
    logger.remove(logtr);
  }

});
// Re-scan the entire site, updating data on the Google spreadsheet
app.get('/build-index', async (req, res, next) => {

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.info(`/build-index called from ${ip}`);

  const logtr = new LogToResponse({ response: res, html: true, num: false, eol: '\n', meta: ['timestamp'] });
  logger.add(logtr);

  try {
    if (AUTH_SECRET !== req.query.auth)
      throw new Error('Invalid request!');

    res.append('content-type', 'text/html; charset=utf-8');
    res.flushHeaders();
    res.write(`<html>\n<head>\n${LogToResponse.CSS}\n</head>\n<body>\n`);
    logtr.startLog(true);

    // This is the real job: check the site for updated pages and reload strings on the search engine
    const rows = await checkSite(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger);
    await buildSearchEngine();
    // ----

    logtr.endLog();
    res.write(`<p>${rows.length} pages have been processed</p>\n`);
    res.write('</body>\n</html>');
    res.end();

  } catch (err) {
    next(err.toString());
  } finally {
    logger.remove(logtr);
  }

});

// Reload the full-text search engine (used when data has been updated)
app.get('/refresh', async (req, res, next) => {

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.info(`/refresh called from ${ip}`);

  const logtr = new LogToResponse({ response: res, html: true, num: false, eol: '\n', meta: ['timestamp'] });
  logger.add(logtr);

  try {
    if (AUTH_SECRET !== req.query.auth)
      throw new Error('Invalid request!');

    res.append('content-type', 'text/html; charset=utf-8');
    res.flushHeaders();
    res.write(`<html>\n<head>\n${LogToResponse.CSS}\n</head>\n<body>\n`);
    logtr.startLog(true);

    // Update the search engine:
    await buildSearchEngine();

    logtr.endLog();
    res.write('</body>\n</html>');
    res.end();

  } catch (err) {
    next(err.toString());
  } finally {
    logger.remove(logtr);
  }

});

// Perform a search
app.get('/', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const q = req.query.q || '';

  // Perform the query and collect only URL, title and language for each result:
  const result = (q && searchEngine ? searchEngine.search(q) : [])
    .map(({ Etapa, Area, Activitat, Descriptors, Url }) => ({ Etapa, Area, Activitat, Descriptors, Url }));

  logger.info(`Query "${q}" from ${ip} returned ${result.length} results`);
  res.append('Access-Control-Allow-Origin', '*');
  res.append('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(result, null, 1));
});

// Return 500 for catched errors
app.use((err, _req, res, _next) => {
  logger.error(err.toString());
  res.status(500).send(err.toString());
});

// Start the express server and initialize the search engine
app.listen(APP_PORT, async () => {
  await buildSearchEngine();
  logger.info(`App running on port ${APP_PORT}`);
});
