#!/usr/bin/env node

const express = require('express');
const config = require('./config');
const FulltextSearch = require('./search/FullTextSearch');
const LogToResponse = require('./utils/logToResponse');
const { newLogger } = require('./logger');
const { checkSite, getSearchData } = require('./extractor/checkSite');
const { generateMap } = require('./extractor/mapGenerator');
const { db, initDb, SearchModel } = require('./db/models');

// App logger
const logger = newLogger(config.LOG_LEVEL, config.LOG_CONSOLE, config.LOG_FILE);

// The main search engine, built at server startup
let searchEngine = null;

// Prepare the full-text search engine
async function buildSearchEngine() {
  logger.info('Building the search engine');
  // const siteData = await getSearchData(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger);
  const siteData = await getSearchData(
    config.CREDENTIALS_PATH, 
    config.TOKEN_PATH, 
    config.AUTO_SPREADSHEET_ID, 
    config.SPREADSHEET_PAGE, 
    config.SCOPE, 
    config.BASE_URL, 
    logger
  );
  searchEngine = new FulltextSearch(siteData);
  logger.info(`Search engine ready with ${siteData.length} pages indexed.`);
};

// Initialize DB
initDb(db);

// The main app
const app = express();

// Re-scan the entire site, updating data on the Google spreadsheet
app.get('/build-index-page', async (req, res, next) => {

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.info(`/build-index-page called from ${ip}`);

  const logtr = new LogToResponse({ response: res, html: true, num: false, eol: '\n', meta: ['timestamp'] });
  logger.add(logtr);

  try {
    if (config.AUTH_SECRET !== req.query.auth)
      throw new Error('Invalid request!');

    res.append('content-type', 'text/html; charset=utf-8');
    res.flushHeaders();
    res.write(`<html>\n<head>\n${LogToResponse.CSS}\n</head>\n<body>\n`);
    logtr.startLog(true);

    await generateMap(
      config.CREDENTIALS_PATH, 
      config.TOKEN_PATH, 
      config.AUTO_SPREADSHEET_ID, 
      config.EDU_MAP_SPREADSHEET_ID, 
      config.SPREADSHEET_ID, 
      config.SPREADSHEET_PAGE, 
      config.SCOPE, 
      config.BASE_URL, 
      logger
    );
    logger.info('--------------------------------------------------------------');
    // This is the real job: check the site for updated pages and reload strings on the search engine
    // const rows = await checkSite(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger);

    await buildSearchEngine();
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
    if (config.AUTH_SECRET !== req.query.auth)
      throw new Error('Invalid request!');

    res.append('content-type', 'text/html; charset=utf-8');
    res.flushHeaders();
    res.write(`<html>\n<head>\n${LogToResponse.CSS}\n</head>\n<body>\n`);
    logtr.startLog(true);

    // This is the real job: check the site for updated pages and reload strings on the search engine
    const rows = await checkSite(
      config.CREDENTIALS_PATH, 
      config.TOKEN_PATH, 
      config.SPREADSHEET_ID, 
      config.SPREADSHEET_PAGE, 
      config.SCOPE, 
      config.BASE_URL, 
      logger
    );
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
    if (config.AUTH_SECRET !== req.query.auth)
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

  // Add search to db
  SearchModel.create({ text: q, ip: ip, num_results: result.length });

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
app.listen(config.APP_PORT, async () => {
  await buildSearchEngine();
  logger.info(`App running on port ${config.APP_PORT}`);
});
