#!/usr/bin/env node

const express = require('express');
const config = require('./config');
const LogToResponse = require('./utils/log/logToResponse');
const { newLogger } = require('./utils/log/logger');
const { generateMap } = require('./searchEngine/mapGenerator');
const buildSearchEngine = require('./searchEngine/searchEngineBuilder');
const { db, initDb, SearchModel } = require('./db/db');

// App logger
const logger = newLogger(config.LOG_LEVEL, config.LOG_CONSOLE, config.LOG_FILE);

// Prepare the full-text search engine
async function buildAppSearchEngine() {
  const searchEngine =  await buildSearchEngine(
    config.CREDENTIALS_PATH, 
    config.TOKEN_PATH, 
    config.AUTO_SPREADSHEET_ID, 
    config.SPREADSHEET_PAGE, 
    config.SCOPE, 
    config.SEARCH_OPTIONS,
    logger,
  );
  return searchEngine;
};

// The main search engine, built at app.listen
let searchEngine = null;

// Initialize DB
initDb(db);

// The main app
const app = express();

// Generates the Google spreadsheet and creates the Search Engine
app.get('/build-index-page', async (req, res, next) => {

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.info(`/build-index-page called from ${ip}`);

  const logtr = new LogToResponse({ response: res, html: true, num: false, eol: '\n', meta: ['timestamp'] });
  logger.add(logtr);

  try {
    // Check auth
    if (config.AUTH_SECRET !== req.query.auth)
      throw new Error('Invalid request!');

    // Headers and HTML init boilerplate
    res.append('content-type', 'text/html; charset=utf-8');
    res.flushHeaders();
    res.write(`<html>\n<head>\n${LogToResponse.CSS}\n</head>\n<body>\n`);
    logtr.startLog(true);

    // Do the magic
    await generateMap(
      config.CREDENTIALS_PATH, 
      config.TOKEN_PATH, 
      config.AUTO_SPREADSHEET_ID, 
      config.EDU_MAP_SPREADSHEET_ID, 
      config.SPREADSHEET_PAGE, 
      config.SCOPE, 
      logger
    );
    logger.info('--------------------------------------------------------------');
    
    // Update Search engine with auto generated map
    searchEngine = await buildAppSearchEngine();
   
    logtr.endLog();
    
    // HTML end boilerplate
    res.write('</body>\n</html>');
    res.end();

  } catch (err) {
    next(err.toString());
  } finally {
    logger.remove(logtr);
  }

});

// Creates/Updates the Search Engine without regenerating the Google spreadsheet
app.get('/refresh', async (req, res, next) => {

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.info(`/refresh called from ${ip}`);

  const logtr = new LogToResponse({ response: res, html: true, num: false, eol: '\n', meta: ['timestamp'] });
  logger.add(logtr);

  try {
    // Check auth
    if (config.AUTH_SECRET !== req.query.auth)
      throw new Error('Invalid request!');

    // Headers and HTML init boilerplate
    res.append('content-type', 'text/html; charset=utf-8');
    res.flushHeaders();
    res.write(`<html>\n<head>\n${LogToResponse.CSS}\n</head>\n<body>\n`);
    logtr.startLog(true);

    // Update the search engine
    searchEngine = await buildAppSearchEngine();

    logtr.endLog();

    // HTML end boilerplate
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

  // Perform the query and collect only needed fields for each result:
  const result = (q && searchEngine ? searchEngine.search(q) : [])
    .map(({ item }) => (
      { 
        Etapa: item.Etapa, 
        Area: item.Area, 
        Activitat: item.Activitat, 
        // Descriptors: item.Descriptors, 
        Url: item.Url,
      }));

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
  searchEngine = await buildAppSearchEngine();
  logger.info(`App running on port ${config.APP_PORT}`);
});
