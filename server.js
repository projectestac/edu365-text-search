
require('dotenv').config();
const express = require('express');
const FulltextSearch = require('./search/FullTextSearch');
const { createLogger, format, transports } = require('winston');
const LogToResponse = require('./utils/logToResponse');
const { checkSite, getSearchData } = require('./extractor/checkSite');

const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH;
const TOKEN_PATH = process.env.TOKEN_PATH;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SPREADSHEET_PAGE = process.env.SPREADSHEET_PAGE;
const SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];
const BASE_URL = process.env.BASE_URL;
const AUTH_SECRET = process.env.AUTH_SECRET;
const LOG_FILE = process.env.LOG_FILE;
const APP_PORT = process.env.APP_PORT || 8080;

// Winston transports used by the app logger
const logTransports = [
  new transports.Console(),
];

if (LOG_FILE)
  logTransports.push(new transports.File({ filename: LOG_FILE }));

// App logger
const logger = createLogger({
  format: format.combine(
    format.splat(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`),
  ),
  level: 'debug',
  handleExceptions: true,
  transports: logTransports,
});

// The main search engine, built at server startup
let searchEngine = null;

// Builds the full-text search engine
async function buildSearchEngine() {
  logger.info('Building the search engine');
  const siteData = await getSearchData(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, logger);
  searchEngine = new FulltextSearch(siteData);
  logger.info(`Search engine ready with ${siteData.length} pages indexed.`);
};

// Build the main app
const app = express();

// Re-scan the entire site, rebuilding the main index on the spreadsheet
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
    const rows = await checkSite(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger);
    logtr.endLog();
    res.write(`<p>${rows.length} pages have been processed</p>\n`);
    res.write('</body>\n</html>');
    res.end();

  } catch (err) {
    next(err.toString());
  }

  logger.remove(logtr);

});

// Perform a text search
app.get('/search', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const q = req.query.q;
  const result = q && searchEngine ? searchEngine.search(q) : [];
  logger.info(`Query "${q}" from ${ip} returned ${result.length} results`);
  res.append('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(result, null, 1));
});

// Reload the full-text search engine
app.get('/refresh', async (req, res, next) => {

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.info(`/refresh called from ${ip}`)

  const logtr = new LogToResponse({ response: res, html: true, num: false, eol: '\n', meta: ['timestamp'] });
  logger.add(logtr);

  try {
    if (AUTH_SECRET !== req.query.auth)
      throw new Error('Invalid request!');

    res.append('content-type', 'text/html; charset=utf-8');
    res.flushHeaders();
    res.write(`<html>\n<head>\n${LogToResponse.CSS}\n</head>\n<body>\n`);
    logtr.startLog(true);
    await buildSearchEngine();
    logtr.endLog();
    res.write('</body>\n</html>');
    res.end();

  } catch (err) {
    next(err.toString());
  }

  logger.remove(logtr);
});

app.use((err, _req, res, _next) => {
  logger.error(err.toString());
  res.status(500).send(err.toString());
});

app.listen(APP_PORT, async () => {
  await buildSearchEngine();
  logger.info(`App running on port ${APP_PORT}`);
});

