#!/usr/bin/env node

const express = require('express');
const S_ = require('sequelize');
const addDays = require('date-fns/addDays');
const parse = require('date-fns/parse');
const { zonedTimeToUtc } = require('date-fns-tz');

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

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
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

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
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
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let q = req.query.q || '';

  // TODO: Clean also accents ??
  q = q.trim().substring(0, config.QUERY_MAX_LENGTH).trim();

  // Perform the query and collect only needed fields for each result:
  const result = (q && searchEngine ? searchEngine.search(q) : [])
    .map(({ item }) => (
      { 
        Etapa: item.Etapa, 
        Area: item.Area, 
        Activitat: item.Activitat, 
        Descriptors: item.Descriptors, 
        Url: item.Url,
      }));

  // Add search to db
  SearchModel.create({ text: q, ip: ip, num_results: result.length });

  logger.info(`Query "${q}" from ${ip} returned ${result.length} results`);

  res.append('Access-Control-Allow-Origin', '*');
  res.append('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(result, null, 1));
});

// Search STATS
app.get('/search-stats', async (req, res, next) => {

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  logger.info(`/search/stats called from ${ip}`);

  try {
    // Check auth
    if (config.AUTH_SECRET !== req.query.auth)
      throw new Error('Invalid request!');
    
    logger.info(req.query);
    const pageSize = req.query.page_size || 10;
    const page = req.query.page || 1;
    const offset = req.query.offset || page * pageSize - pageSize;
    const order = req.query.order || ["createdAt", "DESC"];
    const search = req.query.search || [];
    const tz = req.query.tz || "Europe/Madrid";
    
    let startDate;
    if (req.query.start_date)
      startDate = new Date(req.query.start_date);
    else
      startDate = new Date('1900-01-01');
    
    let endDate;
    if (req.query.end_date)
      endDate = new Date(req.query.end_date);
    else
      endDate = new Date();

    // Add a day as time will be always 0:00
    endDate = addDays(endDate, 1);

    const Op = S_.Op;
    
    const filters = {
      createdAt: {
        [Op.gte]: startDate,
        [Op.lt]: endDate
      }
    };
    
    console.log(`Search: ${JSON.stringify(search)}`);

    search.forEach(function(filter) {
      switch (filter[0]) {
        case 'id':
          filters.id = { [Op.like]: `%${filter[1]}%` };
          break;
        case 'text':
          filters.text =  { [Op.like]: `%${filter[1]}%` };
          break;
        case 'ip':
          filters.ip =  { [Op.like]: `%${filter[1]}%` };
          break;
        case 'num_results':
          let parts = filter[1].split('-');
          let start = parseInt(parts[0]);
          let end = parseInt(parts[2]);

          if (start || end) {
            filters.num_results = {};
            if (start) 
              filters.num_results = {...filters.num_results, ...{ [Op.gte]: start }};
            if (end)
              filters.num_results = {...filters.num_results, ...{ [Op.lte]: end }};
          }
          break;
        case 'createdAt':
          let dateParts = filter[1].split('-');
          let startDate = dateParts[0];
          if (startDate)
            startDate = parse(startDate, 'dd/MM/yyyy', new Date());

          let endDate = dateParts[2];
          if (endDate) {
            endDate = parse(endDate, 'dd/MM/yyyy', new Date());
            // Add a day as time will be always 0:00
            endDate = addDays(endDate, 1);
          }
                        
          if (startDate || endDate) {
            if (startDate) {
              startDate = zonedTimeToUtc(startDate, tz);
              filters.createdAt = {...filters.createdAt, ...{ [Op.gte]: startDate }};
            }
            if (endDate) {
              endDate = zonedTimeToUtc(endDate, tz);
              filters.createdAt = {...filters.createdAt, ...{ [Op.lt]: endDate }};
            }
          }
          break;
      }
    });

    console.log(`Filtros: ${JSON.stringify(filters)}`);


    const result = await SearchModel.findAndCountAll({
      limit: pageSize,
      offset: offset,
      attributes: { exclude: ['updatedAt'] },
      where: filters,
      order: order
    });
    logger.info(`Number of results: ${result.count}`);  
    res.append('content-type', 'application/json; charset=utf-8');

    const response = {
      draw: req.query.draw || 0,
      recordsTotal: result.count,
      recordsFiltered: result.count,
      data: result.rows,
    };
    res.end(JSON.stringify(response, null, 1));

  } catch (err) {
    next(err.toString());
  } finally {
    
  }

});

app.get('/stats/most-wanted', async (req, res, next) => {

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  logger.info(`/stats/most-wanted called from ${ip}`);

  try {
    // Check auth
    if (config.AUTH_SECRET !== req.query.auth)
      throw new Error('Invalid request!');
    
    logger.info(req.query);
    const pageSize = req.query.page_size || 10;
    const page = req.query.page || 1;
    const offset = req.query.offset || page * pageSize - pageSize;
    const order = req.query.order || ["num_searches", "DESC"];
    const search = req.query.search || [];
    const tz = req.query.tz || "Europe/Madrid";
    
    let startDate;
    if (req.query.start_date)
      startDate = new Date(req.query.start_date);
    else
      startDate = new Date('1900-01-01');
    
    let endDate;
    if (req.query.end_date)
      endDate = new Date(req.query.end_date);
    else
      endDate = new Date();

    // Add a day as time will be always 0:00
    endDate = addDays(endDate, 1);

    const Op = S_.Op;
    
    const filters = {
      createdAt: {
        [Op.gte]: startDate,
        [Op.lt]: endDate
      }
    };
    const having = [];
    
    console.log(`Search: ${JSON.stringify(search)}`);

    search.forEach(function(filter) {
      switch (filter[0]) {
        case 'text':
          filters.text =  { [Op.like]: `%${filter[1]}%` };
          break;
        case 'num_searches':
          let parts = filter[1].split('-');
          let start = parseInt(parts[0]);
          let end = parseInt(parts[2]);

          if (start || end) {
            if (start) {
              having.push(S_.where(S_.fn('COUNT', S_.col('text')), '>=', start));
            }
            if (end) {
              having.push(S_.where(S_.fn('COUNT', S_.col('text')), '<=', end));
            }
          }
          break;
        case 'createdAt':
          let dateParts = filter[1].split('-');
          let startDate = dateParts[0];
          if (startDate)
            startDate = parse(startDate, 'dd/MM/yyyy', new Date());

          let endDate = dateParts[2];
          if (endDate) {
            endDate = parse(endDate, 'dd/MM/yyyy', new Date());
            // Add a day as time will be always 0:00
            endDate = addDays(endDate, 1);
          }
                        
          if (startDate || endDate) {
            if (startDate) {
              startDate = zonedTimeToUtc(startDate, tz);
              filters.createdAt = {...filters.createdAt, ...{ [Op.gte]: startDate }};
            }
            if (endDate) {
              endDate = zonedTimeToUtc(endDate, tz);
              filters.createdAt = {...filters.createdAt, ...{ [Op.lt]: endDate }};
            }
          }
          break;
      }
    });

    console.log(`Filtros: ${JSON.stringify(filters)}`);
    console.log(`Orden: ${JSON.stringify(order)}`);
    
    // Fix ordering by an aggregate column
    order.forEach(function(o) {
      if (o[0] === 'num_searches') {
        o[0] = S_.col(o[0]);
      }
    });

    let lower_trim_text = S_.fn('lower', S_.fn('trim', S_.col('text')));
    const result = await SearchModel.findAndCountAll({
      offset: offset,
      attributes:  [
        [lower_trim_text, 'text'],
        [S_.fn('COUNT', S_.col('text')), 'num_searches'],
        'createdAt'
      ],
      where: filters,
      having: having,
      order: order,
      group: [lower_trim_text],
      limit: pageSize,
    });
    logger.info(`Number of results: ${result.count.length}`);  
    res.append('content-type', 'application/json; charset=utf-8');

    const response = {
      draw: req.query.draw || 0,
      recordsTotal: result.count.length,
      recordsFiltered: result.count.length,
      data: result.rows,
    };
    res.end(JSON.stringify(response, null, 1));

  } catch (err) {
    next(err.toString());
  } finally {
    
  }

});

// Return 500 for catched errors
app.use((err, _req, res, _next) => {
  logger.error(err.toString());
  res.status(500).send(err.toString());
});

app.use(express.static('frontend'));

// Start the express server and initialize the search engine
app.listen(config.APP_PORT, async () => {
  searchEngine = await buildAppSearchEngine();
  logger.info(`App running on port ${config.APP_PORT}`);
});
