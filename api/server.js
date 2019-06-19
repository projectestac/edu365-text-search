
require('dotenv').config();
const express = require('express');

const test = require('./test');

const { createLogger, format, transports } = require('winston');
const LogToResponse = require('./utils/logToResponse');

const { checkSite } = require('./extractor/checkSite');

const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH;
const TOKEN_PATH = process.env.TOKEN_PATH;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SPREADSHEET_PAGE = process.env.SPREADSHEET_PAGE;
const SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];
const BASE_URL = process.env.BASE_URL;

const logger = createLogger({
  format: format.combine(
    format.splat(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`),
  ),
  level: 'debug',
  handleExceptions: true,
  transports: [
    new transports.File({ filename: 'log/combined.log' }),
    new transports.Console(),
  ],
});


const app = express();
const port = 8765;

app.get('/', async (req, res) => {

  const logtr = new LogToResponse({ response: res, html: true, num: false, eol: '\n', meta: ['timestamp'] });
  logger.add(logtr);

  res.append('content-type', 'text/html; charset=utf-8');

  res.flushHeaders();

  res.write(`Session ID: "${req.sessionID}"\n`)

  logtr.startLog(true);

  //const rows = await checkSite(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger);
  await test(logger, 3000);

  logtr.endLog();
  logger.remove(logtr);

  //res.write(`<p>S'han processat ${rows.length} registres</p>`);
  res.write('<p>Hello World!</p>\n');
  res.end();

  logger.info('Procés acabat!');
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

