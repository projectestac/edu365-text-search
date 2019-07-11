
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
const APP_PORT=process.env.APP_PORT || 8080;

const logTransports = [
  new transports.Console(),
];

if (LOG_FILE)
  logTransports.push(new transports.File({ filename: LOG_FILE }));

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

// Search engine will be build at `app` startup
let fts = null;

async function buildSearchEngine() {
  logger.info('Building the search engine');
  const siteData = await getSearchData(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, logger);
  fts = new FulltextSearch(siteData);
  logger.info(`Search engine ready with ${siteData.length} pages indexed.`);
};

const app = express();

app.get('/build-index', async (req, res, next) => {
  try {

    if (AUTH_SECRET !== req.query.auth)
      throw new Error('Invalid request!');

    const logtr = new LogToResponse({ response: res, html: true, num: false, eol: '\n', meta: ['timestamp'] });
    logger.add(logtr);

    res.append('content-type', 'text/html; charset=utf-8');
    res.flushHeaders();

    res.write(`<html>\n<head>\n${LogToResponse.CSS}\n</head>\n<body>`);
    logtr.startLog(true);

    const rows = await checkSite(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger);

    logtr.endLog();
    logger.remove(logtr);

    res.write(`<p>S'han processat ${rows.length} registres</p>`);
    res.write('</body>\n</html>');
    res.end();

    logger.info('Procés acabat!');

  } catch (err) {
    next(err.toString());
    logger.remove(logtr);
  }
});

app.get('/search', (req, res) => {
  const q = req.query.q;
  const result = q && fts ? fts.search(q) : [];
  logger.info(`Query "${q}" - ${result.length} results`);
  res.append('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(result, null, 1));
});

app.get('/refresh', async (req, res, next) => {
  try {
    if (AUTH_SECRET !== req.query.auth)
      throw new Error('Invalid request!');

    const logtr = new LogToResponse({ response: res, html: true, num: false, eol: '\n', meta: ['timestamp'] });
    logger.add(logtr);

    res.append('content-type', 'text/html; charset=utf-8');
    res.flushHeaders();

    res.write(`<html>\n<head>\n${LogToResponse.CSS}\n</head>\n<body>`);
    logtr.startLog(true);

    await buildSearchEngine();

    logtr.endLog();
    logger.remove(logtr);
    res.end();

  } catch (err) {
    next(err.toString());
    logger.remove(logtr);
  }
});

app.use((err, req, res, next) => {
  console.log('Hi ha un error!')
  console.error(err.toString());
  res.status(500).send(err.toString());
});

app.listen(APP_PORT, async () => {
  await buildSearchEngine();
  console.log(`App running on port ${APP_PORT}`);
});

